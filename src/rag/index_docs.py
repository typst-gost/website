import os
import re
import json
import hashlib
from pathlib import Path
import yaml
import lancedb
from openai import OpenAI, BadRequestError
from slugify import slugify
from dotenv import load_dotenv

load_dotenv()

# --- ПУТИ ---
CURRENT_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = CURRENT_DIR.parent.parent
DOCS_DIR = WEBSITE_DIR / "content" / "docs"
DB_PATH = WEBSITE_DIR / "docs_vector_db"
CACHE_FILE = CURRENT_DIR / "embeddings_cache.jsonl"

# --- КОНФИГУРАЦИЯ POLZA.AI ---
POLZA_API_KEY = os.getenv("POLZA_AI_API_KEY")
if not POLZA_API_KEY or "ТВОЙ" in POLZA_API_KEY:
    raise ValueError("❌ Не найден POLZA_AI_API_KEY в .env!")

BASE_URL = "https://polza.ai/api/v1"
EMBEDDING_MODEL = "baai/bge-m3"
BASE_SITE_URL = "https://typst-gost.ru/docs"

# Лимиты для нарезки чанков
MAX_CHUNK_CHARS = 2500  # Идеальный размер для семантического поиска
CHUNK_OVERLAP = 250     # Перекрытие между частями, чтобы не терять контекст

client = OpenAI(base_url=BASE_URL, api_key=POLZA_API_KEY)


def get_text_hash(text: str) -> str:
    """Хэш текста для поиска в кэше."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_cache() -> dict[str, list[float]]:
    """Загружает сохраненные эмбеддинги с диска."""
    cache = {}
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    cache[item["hash"]] = item["vector"]
    return cache


def save_to_cache(text_hash: str, vector: list[float]):
    """Сохраняет один вектор в файл кэша."""
    with open(CACHE_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps({"hash": text_hash, "vector": vector}) + "\n")


def parse_frontmatter(content: str):
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                fm = yaml.safe_load(parts[1])
                return fm or {}, parts[2].strip()
            except Exception:
                pass
    return {}, content.strip()


def clean_mdx_content(text: str) -> str:
    # Достаем полезный код из кастомных компонентов TypstRender
    text = re.sub(
        r'<TypstRender[\s\S]*?code=\{`([\s\S]*?)`\}[\s\S]*?/>',
        r'```typst\n\1\n```',
        text,
    )
    # Удаляем JSX и HTML теги
    text = re.sub(r'<[^>]+>', '', text)
    # Удаляем нулевые байты
    text = text.replace('\x00', '')
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def create_slug(title: str) -> str:
    return slugify(title, allow_unicode=True)


def split_text_into_chunks(text: str, max_chars: int = MAX_CHUNK_CHARS, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Разбивает длинный текст на части по параграфам и строкам
    с сохранением смысловых блоков и перекрытием.
    """
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    # Сначала пробуем разделить по двойному переносу строки (абзацы)
    paragraphs = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]
    if not paragraphs:
        paragraphs = [text]

    chunks = []
    current_parts = []
    current_len = 0

    for p in paragraphs:
        p_len = len(p)

        # Если один абзац сам по себе больше max_chars (например, большая таблица или листинг кода)
        if p_len > max_chars:
            if current_parts:
                chunks.append("\n\n".join(current_parts))
                current_parts = []
                current_len = 0

            step = max_chars - overlap
            for start in range(0, p_len, step):
                sub = p[start:start + max_chars].strip()
                if sub:
                    chunks.append(sub)
            continue

        if current_len + p_len + 2 > max_chars and current_parts:
            chunk_str = "\n\n".join(current_parts)
            chunks.append(chunk_str)

            # Берем хвост для overlap
            tail = chunk_str[-overlap:] if len(chunk_str) > overlap else chunk_str
            current_parts = [tail, p]
            current_len = len(tail) + p_len + 2
        else:
            current_parts.append(p)
            current_len += p_len + 2

    if current_parts:
        chunks.append("\n\n".join(current_parts))

    return chunks


def chunk_document(file_path: str, rel_path: str) -> list[dict]:
    """Разбивает MDX-документ на чанки по заголовкам с поддержкой деления длинных секций."""
    with open(file_path, "r", encoding="utf-8") as f:
        raw_content = f.read()

    frontmatter, body = parse_frontmatter(raw_content)
    doc_title = frontmatter.get("title", os.path.splitext(os.path.basename(file_path))[0])
    doc_desc = frontmatter.get("description", "")

    clean_route = os.path.splitext(rel_path)[0]
    if clean_route.endswith("/index"):
        clean_route = clean_route[:-6]

    heading_pattern = re.compile(r'^(#{1,4})\s+(.+)$', re.MULTILINE)
    chunks = []
    matches = list(heading_pattern.finditer(body))

    def add_section_chunks(section_title: str, anchor: str, raw_text: str):
        """Вспомогательная функция для нарезки и добавления секции."""
        cleaned = clean_mdx_content(raw_text)
        if len(cleaned) < 20:
            return

        sub_chunks = split_text_into_chunks(cleaned)
        total_parts = len(sub_chunks)
        url = f"{BASE_SITE_URL}/{clean_route}" + (f"#{anchor}" if anchor else "")

        for idx, sub_text in enumerate(sub_chunks, start=1):
            if total_parts > 1:
                section_name = f"{section_title} (часть {idx} из {total_parts})"
                header = f"Документ: {doc_title} > {section_title} (часть {idx} из {total_parts})"
            else:
                section_name = section_title
                header = f"Документ: {doc_title} > {section_title}"

            full_text = f"{header}\n{sub_text}".strip()

            chunks.append({
                "title": doc_title,
                "section": section_name,
                "url": url,
                "text": full_text,
                "source": rel_path,
            })

    # Если в файле нет заголовков
    if not matches:
        desc_prefix = f"Описание: {doc_desc}\n\n" if doc_desc else ""
        add_section_chunks(doc_title, "", desc_prefix + body)
        return chunks

    # Контент до первого заголовка (введение)
    first_heading_start = matches[0].start()
    intro = body[:first_heading_start]
    if len(intro.strip()) >= 20:
        desc_prefix = f"Описание: {doc_desc}\n\n" if doc_desc else ""
        add_section_chunks("Введение", "", desc_prefix + intro)

    # Контент по каждому заголовку
    for i, match in enumerate(matches):
        heading_text = match.group(2).strip()
        clean_heading = re.sub(r'\{#.*?\}', '', heading_text).strip()
        anchor = create_slug(clean_heading)

        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        section_content = body[start:end]

        add_section_chunks(clean_heading, anchor, section_content)

    return chunks


def fetch_embeddings_safe(texts: list[str]) -> list[list[float] | None]:
    """Отправляет батч, а при ошибке 400 отправляет поштучно с логированием."""
    try:
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts,
        )
        return [item.embedding for item in response.data]
    except BadRequestError as e:
        print(f"\n⚠️ Ошибка в батче ({e.message}). Пробую поштучно...")
        results = []
        for single_text in texts:
            if not single_text.strip():
                results.append(None)
                continue
            try:
                res = client.embeddings.create(
                    model=EMBEDDING_MODEL,
                    input=[single_text],
                )
                results.append(res.data[0].embedding)
            except Exception as single_err:
                print(f"❌ Пропуск ошибочного чанка: {single_err}")
                print(f"Текст чанка: {repr(single_text[:120])}")
                results.append(None)
        return results


def build_vector_db():
    print(f"🔍 Сканирование папки: {DOCS_DIR}")
    if not DOCS_DIR.exists():
        print(f"❌ Папка {DOCS_DIR} не найдена!")
        return

    all_chunks = []
    for root, _, files in os.walk(DOCS_DIR):
        for file in files:
            if file.endswith((".md", ".mdx")):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, DOCS_DIR)
                chunks = chunk_document(full_path, rel_path)
                all_chunks.extend(chunks)

    print(f"📊 Всего сформировано чанков с учетом разбивки: {len(all_chunks)}")

    # 1. Загрузка дискового кэша
    cache = load_cache()
    print(f"💾 Загружено из кэша: {len(cache)} уже готовых векторов")

    # 2. Фильтруем то, что ещё не посчитано
    chunks_to_embed = []
    for c in all_chunks:
        h = get_text_hash(c["text"])
        if h not in cache:
            chunks_to_embed.append((h, c["text"]))

    print(f"🚀 Требуется досчитать новых эмбеддингов: {len(chunks_to_embed)}")

    batch_size = 16
    for i in range(0, len(chunks_to_embed), batch_size):
        batch = chunks_to_embed[i:i + batch_size]
        hashes = [item[0] for item in batch]
        texts = [item[1] for item in batch]

        vectors = fetch_embeddings_safe(texts)

        for h, vec in zip(hashes, vectors):
            if vec is not None:
                cache[h] = vec
                save_to_cache(h, vec)

        processed = min(i + batch_size, len(chunks_to_embed))
        print(f"  Готово: {processed}/{len(chunks_to_embed)} новых чанков")

    # 3. Сохранение в LanceDB
    print("\n📦 Запись в векторную базу LanceDB...")
    data_to_insert = []
    for c in all_chunks:
        h = get_text_hash(c["text"])
        if h in cache:
            data_to_insert.append({
                "title": c["title"],
                "section": c["section"],
                "url": c["url"],
                "text": c["text"],
                "source": c["source"],
                "vector": cache[h],
            })

    db = lancedb.connect(str(DB_PATH))
    table = db.create_table("docs", data=data_to_insert, mode="overwrite")
    print(f"✅ База готова в {DB_PATH}!")
    print(f"📊 Всего записей в LanceDB: {table.count_rows()}")


if __name__ == "__main__":
    build_vector_db()