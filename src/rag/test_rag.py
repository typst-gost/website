import argparse
import os
import re
from pathlib import Path

import lancedb
from dotenv import load_dotenv
from lancedb.rerankers import RRFReranker
from openai import OpenAI

CURRENT_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = CURRENT_DIR.parent.parent
DB_PATH = WEBSITE_DIR / "docs_vector_db"

load_dotenv(CURRENT_DIR / ".env")
load_dotenv(WEBSITE_DIR / ".env")

POLZA_API_KEY = os.getenv("POLZA_AI_API_KEY")
if not POLZA_API_KEY:
    raise ValueError("❌ Не найден POLZA_AI_API_KEY в окружении или в .env файле!")

BASE_URL = "https://polza.ai/api/v1"
EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "qwen/qwen3-embedding-8b")
CHAT_MODEL = "deepseek/deepseek-v4.1-flash-1017"

client = OpenAI(base_url=BASE_URL, api_key=POLZA_API_KEY)
reranker = RRFReranker()

SYNONYMS = [
    (re.compile(r"реферат", re.I), "abstract keywords count body"),
    (re.compile(r"титул|титульник|гриф", re.I), "title gost.with hide-title"),
    (re.compile(r"исполнител|нормоконтрол", re.I), "performers co-performer"),
    (re.compile(r"приложен", re.I), "appendixes appendix-heading"),
    (re.compile(r"содержан|оглавлен", re.I), "outline depth indent"),
    (re.compile(r"источник|библиограф", re.I), "references bibliography"),
    (re.compile(r"перечислен|списк", re.I), "enum list enum-numbering"),
    (re.compile(r"листинг|код", re.I), "code raw"),
]

EVAL_CASES = [
    ("какие параметры есть у реферата", "/typst-gost/reference/abstract"),
    ("как отключить автоматическую статистику в реферате", "/typst-gost/reference/abstract"),
    ("как скрыть стандартный титульный лист и вставить pdf", "/typst-gost/reference/title"),
    ("как указать соисполнителя из другой организации", "/typst-gost/reference/performers"),
    ("как оформить приложения с буквой и статусом", "/typst-gost/reference/appendixes"),
    ("как сделать кириллическую нумерацию перечислений", "/typst-gost/reference/elements/enum"),
    ("как вставить листинг кода из файла", "/typst-gost/reference/elements/code"),
    ("как экспортировать документ в word docx", "/typst-gost/advanced_usage/export"),
]


def expand_query(query: str) -> tuple[str, str]:
    extras = [extra for pattern, extra in SYNONYMS if pattern.search(query)]
    extra_str = " ".join(extras)
    emb_query = f"{query} ({extra_str})" if extra_str else query
    fts_query = re.sub(r"[?!@#$%^&*()[\]{}\"'`,;:<>\\/+=~|]+", " ", f"{query} {extra_str}")
    fts_query = re.sub(r"\s+", " ", fts_query).strip()
    return emb_query, fts_query


def search_hybrid_chunks(query: str, top_k: int = 5) -> list[dict]:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"База {DB_PATH} не найдена! Запустите index_docs.py")

    db = lancedb.connect(str(DB_PATH))
    table = db.open_table("docs")

    emb_query, fts_query = expand_query(query)
    q_emb = client.embeddings.create(model=EMBEDDING_MODEL, input=[emb_query]).data[0].embedding

    try:
        results = (
            table.search(query_type="hybrid", vector_column_name="vector", fts_columns="text")
            .vector(q_emb)
            .text(fts_query)
            .rerank(reranker)
            .limit(20)
            .to_list()
        )
    except Exception as exc:
        print(f"⚠️ Hybrid fallback to vector: {exc}")
        results = table.search(q_emb).limit(20).to_list()

    # Дедупликация по doc_url и расширение для typst-gost
    pages: list[dict] = []
    seen_docs: set[str] = set()
    for row in results:
        doc_url = row.get("doc_url") or row["url"].split("#")[0]
        if doc_url in seen_docs:
            continue
        seen_docs.add(doc_url)
        if row.get("category") == "typst-gost":
            safe_url = doc_url.replace("'", "''")
            siblings = table.search().where(f"doc_url = '{safe_url}'").to_list()
            siblings.sort(key=lambda r: r.get("chunk_order", 0))
            full_text = "\n\n".join(s["text"] for s in siblings)
            row = {**row, "text": full_text[:10000]}
        pages.append(row)
        if len(pages) >= top_k:
            break
    return pages


def run_eval() -> None:
    print(f"🧪 Проверка retrieval (модель: {EMBEDDING_MODEL})...\n")
    passed = 0
    for query, expected_fragment in EVAL_CASES:
        hits = search_hybrid_chunks(query, top_k=5)
        urls = [h.get("doc_url") or h["url"] for h in hits]
        ok = any(expected_fragment in u for u in urls)
        passed += int(ok)
        status = "✅" if ok else "❌"
        print(f"{status} {query}")
        print(f"   Ожидалось: *{expected_fragment}* | Найдено: {urls[:3]}")
    print(f"\nИтог: {passed}/{len(EVAL_CASES)}")


def ask_rag(query: str, top_k: int = 5) -> None:
    print(f"\n❓ Вопрос: {query}")
    print("=" * 60)

    chunks = search_hybrid_chunks(query, top_k=top_k)
    context_blocks = []
    for idx, c in enumerate(chunks, start=1):
        print(f"  [{idx}] {c['title']} > {c['section']} ({c['url']})")
        context_blocks.append(f"[Источник {idx}] ({c['title']}):\n{c['text']}")

    system_prompt = (
        "Ты — официальный AI-ассистент по Typst и пакету modern-g7-32 (ГОСТ 7.32-2017).\n"
        "Отвечай строго по контексту, при вопросе о параметрах указывай имена, типы, "
        "значения по умолчанию и пример.\n\n"
        + "\n---\n".join(context_blocks)
    )
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
        temperature=0.2,
    )
    print("\n📝 Ответ:\n")
    print(response.choices[0].message.content)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--eval", action="store_true", help="Прогнать автотесты поиска")
    args = parser.parse_args()
    if args.eval:
        run_eval()
    else:
        ask_rag(input("Ваш вопрос: "))