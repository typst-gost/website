"""Индексация MD/MDX-документации Typst в LanceDB.

Установка:
    pip install openai lancedb pyyaml python-dotenv python-slugify

.env рядом со скриптом:
    POLZA_AI_API_KEY=...

Запуск:
    python build_typst_docs_db.py
    python build_typst_docs_db.py --dry-run   # проверить чанки без API и БД

Разместите файл в той же папке, где находился исходный скрипт:
DOCS_DIR по умолчанию = CURRENT_DIR.parent.parent / 'content/docs'.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import textwrap
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

try:
    from slugify import slugify
except ImportError:
    def slugify(value: str, allow_unicode: bool = True) -> str:
        value = re.sub(r"[^\w\s-]", "", value.lower(), flags=re.UNICODE)
        return re.sub(r"[-\s]+", "-", value).strip("-")

CURRENT_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = CURRENT_DIR.parent.parent
DOCS_DIR = WEBSITE_DIR / "content" / "docs"
DB_PATH = WEBSITE_DIR / "docs_vector_db"
CACHE_FILE = CURRENT_DIR / "embeddings_cache.jsonl"

BASE_URL = "https://polza.ai/api/v1"
EMBEDDING_MODEL = "qwen/qwen3-embedding-8b"
BASE_SITE_URL = "https://typst-gost.ru/docs"
MAX_CHUNK_CHARS = 2500
CHUNK_OVERLAP = 250
BATCH_SIZE = 16

HEADING_RE = re.compile(r"^ {0,3}(#{1,6})[ \t]+(.+?)\s*$")
EXPLICIT_ID_RE = re.compile(r"\s*\{#([^}]+)\}\s*$")
FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
TYPST_RENDER_RE = re.compile(r"<TypstRender\b(?P<attrs>[\s\S]*?)\s*/>")
TYPST_CODE_RE = re.compile(r"\bcode\s*=\s*\{\s*`([\s\S]*?)`\s*\}")


def text_hash(text: str) -> str:
    # Модель включена в ключ: векторы другой модели не переиспользуются.
    return hashlib.sha256(f"{EMBEDDING_MODEL}\0{text}".encode("utf-8")).hexdigest()


def parse_frontmatter(raw: str) -> tuple[dict[str, Any], str]:
    m = re.match(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", raw, re.S)
    if not m:
        return {}, raw
    try:
        metadata = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        metadata = {}
    return (metadata if isinstance(metadata, dict) else {}), raw[m.end():]


def update_fence(line: str, opened: tuple[str, int] | None) -> tuple[str, int] | None:
    m = FENCE_RE.match(line)
    if not m:
        return opened
    marks, rest = m.groups()
    if opened is None:
        return (marks[0], len(marks))
    if marks[0] == opened[0] and len(marks) >= opened[1] and not rest.strip():
        return None
    return opened


def normalize_mdx(body: str) -> str:
    """Сохраняем Typst-код, удаляем лишь обёртки известных JSX-компонентов."""
    def typst_render(m: re.Match[str]) -> str:
        code = TYPST_CODE_RE.search(m.group("attrs"))
        if code:
            return "\n\n```typst\n" + code.group(1).strip("\n") + "\n```\n\n"
        return m.group(0)  # неизвестная форма code={...}: данные не теряем

    body = TYPST_RENDER_RE.sub(typst_render, body)
    result = []
    fence = None
    for line in body.splitlines():
        if fence is None:
            # Не используем r'<[^>]+>': это удалило бы типстовские метки.
            line = re.sub(r"</?[A-Z][\w.]*\b[^>]*>", "", line)
        result.append(line)
        fence = update_fence(line, fence)
    return "\n".join(result).replace("\x00", "").strip()


def get_sections(body: str) -> list[dict[str, Any]]:
    """Заголовки Markdown (вне кода) + полный путь H1 > H2 > ... ."""
    sections = []
    parents: list[tuple[int, str]] = []
    current = {"path": ["Введение"], "heading": "Введение", "anchor": "", "lines": []}
    fence = None
    slug_counts: dict[str, int] = {}

    for line in body.splitlines():
        m = HEADING_RE.match(line) if fence is None else None
        if m:
            if current["lines"]:
                sections.append(current)
            level = len(m.group(1))
            raw_title = re.sub(r"\s+#+\s*$", "", m.group(2)).strip()
            explicit_match = EXPLICIT_ID_RE.search(raw_title)
            title = EXPLICIT_ID_RE.sub("", raw_title).strip()
            while parents and parents[-1][0] >= level:
                parents.pop()
            parents.append((level, title))
            auto_slug = slugify(title, allow_unicode=True)
            count = slug_counts.get(auto_slug, 0)
            slug_counts[auto_slug] = count + 1
            anchor = (explicit_match.group(1) if explicit_match else
                      (f"{auto_slug}-{count}" if count else auto_slug))
            current = {"path": [name for _, name in parents],
                       "heading": title, "anchor": anchor, "lines": []}
        else:
            current["lines"].append(line)
            fence = update_fence(line, fence)

    if current["lines"]:
        sections.append(current)
    return sections


def get_blocks(text: str) -> list[str]:
    """Абзацы/примеры; пустые строки внутри ``` ... ``` не делят блок."""
    blocks, lines = [], []
    fence = None
    for line in text.splitlines():
        if not line.strip() and fence is None:
            if lines:
                blocks.append("\n".join(lines).strip())
                lines = []
        else:
            lines.append(line)
            fence = update_fence(line, fence)
    if lines:
        blocks.append("\n".join(lines).strip())
    return [b for b in blocks if b]


def join_examples(blocks: list[str], budget: int) -> list[str]:
    """Короткое пояснение и следующий код — единый смысловой блок."""
    result: list[str] = []
    for block in blocks:
        if (result and block.startswith(("```", "~~~"))
                and not result[-1].startswith(("```", "~~~"))
                and len(result[-1]) <= 600
                and len(result[-1]) + len(block) + 2 <= budget):
            result[-1] += "\n\n" + block
        else:
            result.append(block)
    return result


def split_plain(text: str, limit: int) -> list[str]:
    """Разделение длинного текста по предложениям, затем пробелам."""
    if len(text) <= limit:
        return [text]
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-ZА-ЯЁ0-9#`])", text)
    pieces = []
    for sentence in sentences:
        if len(sentence) <= limit:
            pieces.append(sentence)
        else:
            pieces.extend(textwrap.wrap(
                sentence, width=limit, break_long_words=False,
                break_on_hyphens=False, replace_whitespace=False,
            ))
    result, current = [], ""
    for piece in pieces:
        if current and len(current) + len(piece) + 1 > limit:
            result.append(current)
            current = ""
        current = (current + " " + piece).strip()
    if current:
        result.append(current)
    return result


def split_long_block(block: str, limit: int) -> list[str]:
    if len(block) <= limit:
        return [block]

    # В длинном fenced code block режем по строкам и закрываем каждый фрагмент.
    m = re.search(r"(?m)^(`{3,}|~{3,})[^\n]*\n", block)
    if not m:
        return split_plain(block, limit)
    prefix = block[:m.start()].strip()
    opener, closing = m.group(0).rstrip("\n"), m.group(1)
    rest = block[m.end():]
    end = re.search(rf"(?m)^\s*{re.escape(closing)}\s*$", rest)
    if not end:
        return split_plain(block, limit)
    code, suffix = rest[:end.start()].strip("\n"), rest[end.end():].strip()
    capacity = limit - len(opener) - len(closing) - 3
    if capacity < 100:
        return [block]  # не портим пример ради формального лимита

    groups, group, size = [], [], 0
    for line in code.splitlines():
        if group and size + len(line) + 1 > capacity:
            groups.append("\n".join(group))
            group, size = [], 0
        group.append(line)
        size += len(line) + 1
    if group:
        groups.append("\n".join(group))

    result = split_plain(prefix, limit) if prefix else []
    result.extend(f"{opener}\n{g}\n{closing}" for g in groups)
    result.extend(split_plain(suffix, limit) if suffix else [])
    return result


def pack_blocks(blocks: list[str], limit: int, overlap: int) -> list[str]:
    pieces = [p for b in join_examples(blocks, limit)
              for p in split_long_block(b, limit)]
    chunks, current, size = [], [], 0
    for piece in pieces:
        addition = len(piece) + (2 if current else 0)
        if current and size + addition > limit:
            chunks.append("\n\n".join(current))
            # Только полный предыдущий блок, не 250 символов из середины кода.
            carry = current[-1] if len(current[-1]) <= overlap else None
            if carry and len(carry) + len(piece) + 2 <= limit:
                current, size = [carry], len(carry)
            else:
                current, size = [], 0
        size += len(piece) + (2 if current else 0)
        current.append(piece)
    if current:
        chunks.append("\n\n".join(current))
    return chunks


def chunk_document(file_path: str | Path, rel_path: str | Path,
                   max_chars: int = MAX_CHUNK_CHARS,
                   overlap: int = CHUNK_OVERLAP) -> list[dict[str, Any]]:
    """Возвращает чанки с полями для LanceDB и URL разделов."""
    if max_chars < 500:
        raise ValueError("max_chars должен быть >= 500")
    if not 0 <= overlap < max_chars:
        raise ValueError("overlap должен быть >= 0 и < max_chars")

    raw = Path(file_path).read_text(encoding="utf-8")
    fm, body = parse_frontmatter(raw)
    doc_title = str(fm.get("title") or Path(file_path).stem)
    description = str(fm.get("description") or "").strip()
    rel = str(rel_path).replace("\\", "/")
    route = re.sub(r"\.(md|mdx)$", "", rel, flags=re.I)
    if route.endswith("/index"):
        route = route[:-6]
    elif route == "index":
        route = ""
    doc_url = f"{BASE_SITE_URL.rstrip('/')}/{route}".rstrip("/")

    chunks: list[dict[str, Any]] = []
    for section in get_sections(normalize_mdx(body)):
        content = "\n".join(section["lines"]).strip()
        if not content:
            continue
        path = section["path"]
        header = f"Документ: {doc_title} > " + " > ".join(path)
        if description and path == ["Введение"]:
            header += "\nОписание: " + description
        budget = max_chars - len(header) - 1
        if budget < 200:
            raise ValueError(f"Заголовок слишком длинный: {rel} — {header[:100]}")
        parts = pack_blocks(get_blocks(content), budget, overlap)
        url = doc_url + ("#" + section["anchor"] if section["anchor"] else "")
        for idx, part in enumerate(parts):
            full_text = header + "\n" + part
            chunk_id = hashlib.sha256(
                f"{rel}\0{header}\0{idx}\0{part}".encode("utf-8")
            ).hexdigest()[:20]
            chunks.append({
                "chunk_id": chunk_id,
                "title": doc_title,
                "section": section["heading"],
                "heading_path": " > ".join(path),
                "part_index": idx + 1,
                "parts_total": len(parts),
                "url": url,
                "text": full_text,
                "source": rel,
            })
    return chunks


def load_cache() -> dict[str, list[float]]:
    cache: dict[str, list[float]] = {}
    if not CACHE_FILE.exists():
        return cache
    with CACHE_FILE.open("r", encoding="utf-8") as file:
        for line in file:
            if not line.strip():
                continue
            try:
                item = json.loads(line)
                cache[item["hash"]] = item["vector"]
            except (ValueError, KeyError, TypeError):
                continue
    return cache


def save_to_cache(hash_value: str, vector: list[float]) -> None:
    with CACHE_FILE.open("a", encoding="utf-8") as file:
        file.write(json.dumps({"hash": hash_value, "vector": vector}) + "\n")


def fetch_embeddings_safe(client: Any, texts: list[str]) -> list[list[float] | None]:
    """Если batch вернул 400, поштучно определяем проблемные входы."""
    from openai import BadRequestError
    try:
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
        vectors: list[list[float] | None] = [None] * len(texts)
        for item in response.data:
            vectors[item.index] = item.embedding
        return vectors
    except BadRequestError as exc:
        print(f"⚠️ Ошибка в батче: {exc}. Проверяю по одному...")
        vectors = []
        for t in texts:
            try:
                result = client.embeddings.create(model=EMBEDDING_MODEL, input=[t])
                vectors.append(result.data[0].embedding)
            except BadRequestError as error:
                print(f"❌ Не удалось получить embedding: {error}; начало: {t[:120]!r}")
                vectors.append(None)
        return vectors


def build_vector_db(dry_run: bool = False) -> None:
    print(f"🔍 Документы: {DOCS_DIR}")
    if not DOCS_DIR.exists():
        raise FileNotFoundError(f"Папка документации не найдена: {DOCS_DIR}")

    all_chunks: list[dict[str, Any]] = []
    for file_path in sorted(DOCS_DIR.rglob("*")):
        if file_path.is_file() and file_path.suffix.lower() in (".md", ".mdx"):
            all_chunks.extend(chunk_document(file_path, file_path.relative_to(DOCS_DIR)))

    print(f"📊 Создано чанков: {len(all_chunks)}")
    if not all_chunks:
        print("⚠️ Нет чанков — существующая таблица НЕ изменена.")
        return
    if dry_run:
        for c in all_chunks[:5]:
            print(f"\n{c['url']} [{c['part_index']}/{c['parts_total']}]\n{c['text'][:500]}")
        return

    load_dotenv(CURRENT_DIR / ".env")
    api_key = os.getenv("POLZA_AI_API_KEY")
    if not api_key:
        raise ValueError("Не найден POLZA_AI_API_KEY (.env или переменные окружения)")
    from openai import OpenAI  # не требуется для --dry-run
    client = OpenAI(base_url=BASE_URL, api_key=api_key)
    cache = load_cache()
    print(f"💾 Векторов в кэше: {len(cache)}")

    # Уникальные входы: один и тот же текст не отправляется повторно.
    missing = {text_hash(c["text"]): c["text"] for c in all_chunks
               if text_hash(c["text"]) not in cache}
    print(f"🚀 Требуется эмбеддингов: {len(missing)}")
    items = list(missing.items())
    for i in range(0, len(items), BATCH_SIZE):
        batch = items[i:i + BATCH_SIZE]
        embeddings = fetch_embeddings_safe(client, [t for _, t in batch])
        for (h, _), vector in zip(batch, embeddings):
            if vector is not None:
                cache[h] = vector
                save_to_cache(h, vector)
        print(f"  Готово {min(i + BATCH_SIZE, len(items))}/{len(items)}")

    rows = []
    for c in all_chunks:
        vector = cache.get(text_hash(c["text"]))
        if vector is not None:
            rows.append({**c, "vector": vector})
    if not rows:
        print("❌ Нет эмбеддингов — таблица не перезаписывается.")
        return
    print(f"📦 Записываю {len(rows)} записей в LanceDB...")
    import lancedb  # не требуется для --dry-run
    db = lancedb.connect(str(DB_PATH))
    table = db.create_table("docs", data=rows, mode="overwrite")
    print(f"✅ Готово: {table.count_rows()} чанков, база {DB_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Индексация документации Typst в LanceDB")
    parser.add_argument("--dry-run", action="store_true", help="Нарезать, но не вызывать API и не писать БД")
    args = parser.parse_args()
    build_vector_db(dry_run=args.dry_run)