"""Индексация MD/MDX-документации Typst и typst-gost в LanceDB.

Запуск:
    python src/rag/index_docs.py --dry-run   # проверить чанки без API и БД
    python src/rag/index_docs.py             # собрать эмбеддинги, таблицу и FTS-индекс
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import textwrap
from collections import Counter
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

load_dotenv(CURRENT_DIR / ".env")
load_dotenv(WEBSITE_DIR / ".env")

BASE_URL = "https://polza.ai/api/v1"
EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "qwen/qwen3-embedding-8b")
BASE_SITE_URL = "https://typst-gost.ru/docs"
MAX_CHUNK_CHARS = 2500
CHUNK_OVERLAP = 250
BATCH_SIZE = 16

HEADING_RE = re.compile(r"^ {0,3}(#{1,6})[ \t]+(.+?)\s*$")
EXPLICIT_ID_RE = re.compile(r"\s*(?:\{#([^}]+)\}|\[#([^\]]+)\])\s*$")
FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")

CALLOUT_LABELS = {
    "info": "Примечание",
    "tip": "Совет",
    "warning": "Важно",
    "error": "Предупреждение",
    "success": "Готово",
}


def text_hash(text: str) -> str:
    return hashlib.sha256(f"{EMBEDDING_MODEL}\0{text}".encode("utf-8")).hexdigest()


def classify_doc(rel_path: str) -> str:
    norm = rel_path.replace("\\", "/")
    if norm.startswith("typst-gost/"):
        return "typst-gost"
    if norm.startswith("typst/changelog/"):
        return "typst-changelog"
    if norm.startswith("typst/symbols/"):
        return "typst-symbols"
    if norm.startswith("typst/guides/"):
        return "typst-guides"
    if norm.startswith("typst/tutorial/"):
        return "typst-tutorial"
    return "typst-reference"


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


# --- Парсинг JSX-компонентов вне fenced-блоков ---


def _skip_quoted(src: str, idx: int, quote: str) -> tuple[str, int]:
    """Читает строку в кавычках или backtick-литерале с учётом экранирования."""
    out: list[str] = []
    i = idx + 1
    n = len(src)
    while i < n:
        ch = src[i]
        if ch == "\\":
            if i + 1 < n:
                nxt = src[i + 1]
                if nxt == "n":
                    out.append("\n")
                elif nxt == "t":
                    out.append("\t")
                elif nxt in (quote, "\\", "$"):
                    out.append(nxt)
                else:
                    out.append("\\" + nxt)
                i += 2
                continue
        if ch == quote:
            return "".join(out), i + 1
        out.append(ch)
        i += 1
    return "".join(out), n


def _extract_balanced_braces(src: str, idx: int) -> tuple[str, int]:
    """Извлекает {...}, корректно игнорируя скобки внутри кавычек и backtick."""
    assert src[idx] == "{"
    depth = 0
    i = idx
    n = len(src)
    while i < n:
        ch = src[i]
        if ch in ('"', "'", "`"):
            _, i = _skip_quoted(src, i, ch)
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return src[idx : i + 1], i + 1
        i += 1
    return src[idx:], n


def _find_self_closing_tag_end(src: str, idx: int) -> int:
    """Находит закрывающее '/>' у JSX-тега с учётом {...} и строк."""
    i = idx
    n = len(src)
    while i < n:
        ch = src[i]
        if ch in ('"', "'", "`"):
            _, i = _skip_quoted(src, i, ch)
            continue
        if ch == "{":
            _, i = _extract_balanced_braces(src, i)
            continue
        if src.startswith("/>", i):
            return i + 2
        if ch == ">":
            return i + 1
        i += 1
    return n


def _parse_js_object_fields(obj_body: str) -> dict[str, str]:
    """Разбирает поля одного параметра внутри TypeTable (description, type, default, required)."""
    fields: dict[str, str] = {}
    i = 0
    n = len(obj_body)
    while i < n:
        while i < n and obj_body[i] in " \t\r\n,":
            i += 1
        if i >= n:
            break
        if obj_body.startswith("//", i):
            nl = obj_body.find("\n", i)
            i = n if nl == -1 else nl + 1
            continue
        if obj_body[i] in ('"', "'"):
            key, i = _skip_quoted(obj_body, i, obj_body[i])
        else:
            m = re.match(r"[A-Za-z_][\w-]*", obj_body[i:])
            if not m:
                i += 1
                continue
            key = m.group(0)
            i += len(key)
        while i < n and obj_body[i] in " \t\r\n":
            i += 1
        if i >= n or obj_body[i] != ":":
            continue
        i += 1
        while i < n and obj_body[i] in " \t\r\n":
            i += 1
        if i >= n:
            break
        if obj_body[i] in ('"', "'", "`"):
            val, i = _skip_quoted(obj_body, i, obj_body[i])
            fields[key] = re.sub(r"\s+", " ", val).strip()
        elif obj_body[i] == "{":
            raw_obj, i = _extract_balanced_braces(obj_body, i)
            fields[key] = re.sub(r"\s+", " ", raw_obj).strip()
        else:
            m = re.match(r"[^,\n}]+", obj_body[i:])
            if m:
                fields[key] = m.group(0).strip()
                i += len(m.group(0))
            else:
                i += 1
    return fields


def _format_type_table(type_attr_raw: str) -> str:
    """Конвертирует type={{ ... }} в читаемый Markdown-список параметров."""
    inner = type_attr_raw.strip()
    if inner.startswith("{{") and inner.endswith("}}"):
        inner = inner[2:-2]
    elif inner.startswith("{") and inner.endswith("}"):
        inner = inner[1:-1]

    lines: list[str] = []
    i = 0
    n = len(inner)
    while i < n:
        while i < n and inner[i] in " \t\r\n,":
            i += 1
        if i >= n:
            break
        if inner.startswith("//", i):
            nl = inner.find("\n", i)
            i = n if nl == -1 else nl + 1
            continue
        if inner[i] in ('"', "'"):
            param_name, i = _skip_quoted(inner, i, inner[i])
        else:
            m = re.match(r"[A-Za-z_][\w-]*", inner[i:])
            if not m:
                i += 1
                continue
            param_name = m.group(0)
            i += len(param_name)

        while i < n and inner[i] in " \t\r\n":
            i += 1
        if i >= n or inner[i] != ":":
            continue
        i += 1
        while i < n and inner[i] in " \t\r\n":
            i += 1
        if i >= n or inner[i] != "{":
            continue

        raw_param_obj, i = _extract_balanced_braces(inner, i)
        fields = _parse_js_object_fields(raw_param_obj[1:-1])

        meta: list[str] = []
        if fields.get("type"):
            meta.append(f"тип: `{fields['type']}`")
        if fields.get("required", "").lower() == "true":
            meta.append("обязательный")
        if fields.get("default"):
            meta.append(f"по умолчанию: `{fields['default']}`")

        meta_str = f" ({', '.join(meta)})" if meta else ""
        desc = fields.get("description", "").strip()
        if desc:
            lines.append(f"- **`{param_name}`**{meta_str}: {desc}")
        else:
            lines.append(f"- **`{param_name}`**{meta_str}")

    if not lines:
        return ""
    return "\n\nПараметры:\n" + "\n".join(lines) + "\n\n"


def _extract_jsx_attr_template(attrs: str, attr_name: str) -> str | None:
    m = re.search(rf"\b{attr_name}\s*=\s*\{{", attrs)
    if not m:
        return None
    brace_start = m.end() - 1
    raw_brace, _ = _extract_balanced_braces(attrs, brace_start)
    inner = raw_brace[1:-1].strip()
    if inner.startswith("`") and inner.endswith("`") and len(inner) >= 2:
        val, _ = _skip_quoted(inner, 0, "`")
        return val
    if (inner.startswith('"') and inner.endswith('"')) or (
        inner.startswith("'") and inner.endswith("'")
    ):
        val, _ = _skip_quoted(inner, 0, inner[0])
        return val
    return None


def _replace_typst_renders_and_type_tables(text: str) -> str:
    """Обрабатывает <TypstRender ... /> и <TypeTable ... /> вне fenced-блоков."""
    out: list[str] = []
    i = 0
    n = len(text)

    while i < n:
        # Не трогаем fenced code blocks
        if (i == 0 or text[i - 1] == "\n"):
            line_end = text.find("\n", i)
            line = text[i:] if line_end == -1 else text[i:line_end]
            fm = FENCE_RE.match(line)
            if fm:
                fence_char, fence_len = fm.group(1)[0], len(fm.group(1))
                close_re = re.compile(
                    rf"(?m)^ {{0,3}}{re.escape(fence_char)}{{{fence_len},}}[ \t]*$"
                )
                search_from = len(text) if line_end == -1 else line_end + 1
                cm = close_re.search(text, search_from)
                end_pos = cm.end() if cm else n
                out.append(text[i:end_pos])
                i = end_pos
                continue

        if text.startswith("<TypstRender", i) and (
            i + 12 < n and text[i + 12] in " \t\r\n/>"
        ):
            end_pos = _find_self_closing_tag_end(text, i)
            tag_src = text[i:end_pos]
            code = _extract_jsx_attr_template(tag_src, "code")
            hidden_prefix = _extract_jsx_attr_template(tag_src, "hiddenPrefix")
            if code is not None:
                cleaned = textwrap.dedent(code).strip("\n")
                if hidden_prefix and "#import" in hidden_prefix and "#import" not in cleaned:
                    imports = [
                        ln.strip()
                        for ln in hidden_prefix.splitlines()
                        if ln.strip().startswith("#import")
                    ]
                    if imports:
                        cleaned = "\n".join(imports) + "\n\n" + cleaned
                out.append(f"\n\n```typst\n{cleaned}\n```\n\n")
            i = end_pos
            continue

        if text.startswith("<TypeTable", i) and (
            i + 10 < n and text[i + 10] in " \t\r\n/>"
        ):
            end_pos = _find_self_closing_tag_end(text, i)
            tag_src = text[i:end_pos]
            m = re.search(r"\btype\s*=\s*\{", tag_src)
            if m:
                raw_type, _ = _extract_balanced_braces(tag_src, m.end() - 1)
                formatted = _format_type_table(raw_type[1:-1])
                out.append(formatted)
            i = end_pos
            continue

        out.append(text[i])
        i += 1

    return "".join(out)


def _format_gost_quote(m: re.Match[str]) -> str:
    attrs = m.group(1) or ""
    body = m.group(2).strip()
    page_m = re.search(r"\bpage\s*=\s*\{?(\d+)\}?", attrs)
    id_m = re.search(r'\bid\s*=\s*["\']([^"\']+)["\']', attrs)
    meta_parts = ["ГОСТ 7.32-2017"]
    if id_m:
        meta_parts.append(f"п. {id_m.group(1)}")
    if page_m:
        meta_parts.append(f"стр. {page_m.group(1)}")
    quoted_lines = [f"> {line}" if line.strip() else ">" for line in body.splitlines()]
    return f"\n\n> **[{', '.join(meta_parts)}]**\n" + "\n".join(quoted_lines) + "\n\n"


def _format_callout(m: re.Match[str]) -> str:
    attrs = m.group(1) or ""
    body = textwrap.dedent(m.group(2)).strip()
    type_m = re.search(r'\btype\s*=\s*["\']([^"\']+)["\']', attrs)
    label = CALLOUT_LABELS.get((type_m.group(1) if type_m else "").lower(), "Примечание")
    lines = [f"> {ln}" if ln.strip() else ">" for ln in body.splitlines()]
    return f"\n\n> **{label}:**\n" + "\n".join(lines) + "\n\n"


def normalize_mdx(body: str) -> str:
    """Конвертирует MDX-компоненты в чистый Markdown без потери семантики."""
    body = _replace_typst_renders_and_type_tables(body)
    body = re.sub(
        r"<GostQuote\b([^>]*)>([\s\S]*?)</GostQuote>",
        _format_gost_quote,
        body,
    )
    body = re.sub(
        r"<Callout\b([^>]*)>([\s\S]*?)</Callout>",
        _format_callout,
        body,
    )
    body = re.sub(r"<summary[^>]*>([\s\S]*?)</summary>", r"\n**\1**\n", body)

    result: list[str] = []
    fence: tuple[str, int] | None = None
    for line in body.splitlines():
        if fence is None:
            # Убираем MDX import-ы верхнего уровня
            if re.match(r"^\s*import\s+.+?\s+from\s+['\"][^'\"]+['\"]\s*;?\s*$", line):
                continue
            # Убираем только JSX-теги с заглавной буквы и известные HTML-обёртки,
            # чтобы не задеть Typst-метки вида <glacier> или <intro>
            line = re.sub(r"</?[A-Z][\w.]*\b[^>]*>", "", line)
            line = re.sub(
                r"</?(?:details|span|img|br|sup|sub|div)\b[^>]*>",
                "",
                line,
                flags=re.IGNORECASE,
            )
        result.append(line)
        fence = update_fence(line, fence)

    cleaned = "\n".join(result).replace("\x00", "")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def get_sections(body: str) -> list[dict[str, Any]]:
    """Заголовки Markdown (вне кода) + полный путь H1 > H2 > ... ."""
    sections: list[dict[str, Any]] = []
    parents: list[tuple[int, str]] = []
    current: dict[str, Any] = {
        "path": ["Введение"],
        "heading": "Введение",
        "anchor": "",
        "lines": [],
    }
    fence: tuple[str, int] | None = None
    slug_counts: dict[str, int] = {}

    for line in body.splitlines():
        m = HEADING_RE.match(line) if fence is None else None
        if m:
            if any(ln.strip() for ln in current["lines"]):
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
            if explicit_match:
                anchor = explicit_match.group(1) or explicit_match.group(2)
            else:
                anchor = f"{auto_slug}-{count}" if count else auto_slug
            current = {
                "path": [name for _, name in parents],
                "heading": title,
                "anchor": anchor,
                "lines": [],
            }
        else:
            current["lines"].append(line)
            fence = update_fence(line, fence)

    if any(ln.strip() for ln in current["lines"]):
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
        if (
            result
            and block.startswith(("```", "~~~"))
            and not result[-1].startswith(("```", "~~~"))
            and len(result[-1]) <= 600
            and len(result[-1]) + len(block) + 2 <= budget
        ):
            result[-1] += "\n\n" + block
        else:
            result.append(block)
    return result


def split_plain(text: str, limit: int) -> list[str]:
    if len(text) <= limit:
        return [text]
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-ZА-ЯЁ0-9#`])", text)
    pieces = []
    for sentence in sentences:
        if len(sentence) <= limit:
            pieces.append(sentence)
        else:
            pieces.extend(
                textwrap.wrap(
                    sentence,
                    width=limit,
                    break_long_words=False,
                    break_on_hyphens=False,
                    replace_whitespace=False,
                )
            )
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

    m = re.search(r"(?m)^(`{3,}|~{3,})[^\n]*\n", block)
    if not m:
        return split_plain(block, limit)
    prefix = block[: m.start()].strip()
    opener, closing = m.group(0).rstrip("\n"), m.group(1)
    rest = block[m.end() :]
    end = re.search(rf"(?m)^\s*{re.escape(closing)}\s*$", rest)
    if not end:
        return split_plain(block, limit)
    code, suffix = rest[: end.start()].strip("\n"), rest[end.end() :].strip()
    capacity = limit - len(opener) - len(closing) - 3
    if capacity < 100:
        return [block]

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
    pieces = [
        p for b in join_examples(blocks, limit) for p in split_long_block(b, limit)
    ]
    chunks, current, size = [], [], 0
    for piece in pieces:
        addition = len(piece) + (2 if current else 0)
        if current and size + addition > limit:
            chunks.append("\n\n".join(current))
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


def chunk_document(
    file_path: str | Path,
    rel_path: str | Path,
    max_chars: int = MAX_CHUNK_CHARS,
    overlap: int = CHUNK_OVERLAP,
) -> list[dict[str, Any]]:
    if max_chars < 500:
        raise ValueError("max_chars должен быть >= 500")
    if not 0 <= overlap < max_chars:
        raise ValueError("overlap должен быть >= 0 и < max_chars")

    raw = Path(file_path).read_text(encoding="utf-8")
    fm, body = parse_frontmatter(raw)
    doc_title = str(fm.get("title") or Path(file_path).stem)
    description = re.sub(r"\s+", " ", str(fm.get("description") or "")).strip()

    rel = str(rel_path).replace("\\", "/")
    category = classify_doc(rel)
    route = re.sub(r"\.(md|mdx)$", "", rel, flags=re.I)
    if route.endswith("/index"):
        route = route[:-6]
    elif route == "index":
        route = ""
    doc_url = f"{BASE_SITE_URL.rstrip('/')}/{route}".rstrip("/")

    chunks: list[dict[str, Any]] = []
    chunk_order = 0
    for section in get_sections(normalize_mdx(body)):
        content = "\n".join(section["lines"]).strip()
        if not content:
            continue
        path = section["path"]
        header = f"Документ: {doc_title} [{category}] > " + " > ".join(path)
        if description:
            header += f"\nОписание страницы: {description[:240]}"
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
            chunks.append(
                {
                    "chunk_id": chunk_id,
                    "title": doc_title,
                    "section": section["heading"],
                    "heading_path": " > ".join(path),
                    "description": description,
                    "category": category,
                    "doc_url": doc_url,
                    "chunk_order": chunk_order,
                    "part_index": idx + 1,
                    "parts_total": len(parts),
                    "url": url,
                    "text": full_text,
                    "source": rel,
                }
            )
            chunk_order += 1
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
    print(f"🧠 Модель эмбеддингов: {EMBEDDING_MODEL}")
    if not DOCS_DIR.exists():
        raise FileNotFoundError(f"Папка документации не найдена: {DOCS_DIR}")

    all_chunks: list[dict[str, Any]] = []
    for file_path in sorted(DOCS_DIR.rglob("*")):
        if file_path.is_file() and file_path.suffix.lower() in (".md", ".mdx"):
            all_chunks.extend(chunk_document(file_path, file_path.relative_to(DOCS_DIR)))

    print(f"📊 Создано чанков: {len(all_chunks)}")
    counts = Counter(c["category"] for c in all_chunks)
    print("📂 По категориям:", dict(counts))

    if not all_chunks:
        print("⚠️ Нет чанков — существующая таблица НЕ изменена.")
        return

    if dry_run:
        sample = [
            c for c in all_chunks
            if "abstract.mdx" in c["source"] and "Параметры" in c["section"]
        ]
        preview = sample or all_chunks[:5]
        for c in preview[:5]:
            print(f"\n[{c['category']}] {c['url']} (#{c['chunk_order']})\n{c['text'][:1200]}")
        return

    api_key = os.getenv("POLZA_AI_API_KEY")
    if not api_key:
        raise ValueError("Не найден POLZA_AI_API_KEY (.env или переменные окружения)")

    from openai import OpenAI

    client = OpenAI(base_url=BASE_URL, api_key=api_key)
    cache = load_cache()
    print(f"💾 Векторов в кэше: {len(cache)}")

    missing = {
        text_hash(c["text"]): c["text"]
        for c in all_chunks
        if text_hash(c["text"]) not in cache
    }
    print(f"🚀 Требуется эмбеддингов: {len(missing)}")
    items = list(missing.items())
    for i in range(0, len(items), BATCH_SIZE):
        batch = items[i : i + BATCH_SIZE]
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
    import lancedb
    from lancedb.index import FTS

    db = lancedb.connect(str(DB_PATH))
    table = db.create_table("docs", data=rows, mode="overwrite")

    print("🔎 Создаю нативный FTS-индекс (BM25, Russian)...")
    table.create_index(
        "text",
        config=FTS(language="Russian", with_position=False),
        replace=True,
    )
    print(f"✅ Готово: {table.count_rows()} чанков, база {DB_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Индексация документации Typst в LanceDB")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Нарезать, но не вызывать API и не писать БД",
    )
    args = parser.parse_args()
    build_vector_db(dry_run=args.dry_run)