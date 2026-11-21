import os
import re
from pathlib import Path
import lancedb
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# --- ПУТИ ---
CURRENT_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = CURRENT_DIR.parent.parent
DB_PATH = WEBSITE_DIR / "docs_vector_db"

# --- КОНФИГУРАЦИЯ POLZA.AI ---
POLZA_API_KEY = os.getenv("POLZA_AI_API_KEY")
if not POLZA_API_KEY:
    raise ValueError("❌ Не найден POLZA_AI_API_KEY в окружении или в .env файле!")

BASE_URL = "https://polza.ai/api/v1"
EMBEDDING_MODEL = "baai/bge-m3"
CHAT_MODEL = "deepseek/deepseek-v4.1-flash-1017"

client = OpenAI(base_url=BASE_URL, api_key=POLZA_API_KEY)


def search_similar_chunks(query: str, top_k: int = 4) -> list[dict]:
    """Ищет релевантные чанки в векторной базе LanceDB."""
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"База {DB_PATH} не найдена! Сначала запустите index_docs.py"
        )

    db = lancedb.connect(str(DB_PATH))
    table = db.open_table("docs")

    # Получаем эмбеддинг запроса
    q_emb = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[query],
    ).data[0].embedding

    results = table.search(q_emb).limit(top_k).to_list()
    return results


def ask_rag(query: str, top_k: int = 4):
    """Выполняет поиск и генерирует ответ со ссылками на источники."""
    print(f"\n❓ Вопрос: {query}")
    print("=" * 60)

    # 1. Поиск чанков
    chunks = search_similar_chunks(query, top_k=top_k)

    print(f"🔍 Найдено {len(chunks)} релевантных чанков:")
    context_blocks = []
    sources = []

    for idx, c in enumerate(chunks, start=1):
        url = c["url"]
        section = c["section"]
        title = c["title"]
        sources.append({"id": idx, "url": url, "title": f"{title} > {section}"})

        print(f"  [{idx}] {title} > {section}")
        print(f"      URL: {url}")

        context_blocks.append(
            f"Источник [{idx}]:\nURL: {url}\nРаздел: {title} > {section}\nТекст:\n{c['text']}\n"
        )

    context_str = "\n---\n".join(context_blocks)

    # 2. Промпт для LLM
    system_prompt = f"""Ты — официальный AI-ассистент по Typst и пакету typst-gost (ГОСТ 7.32).
Отвечай точно, структурированно и только на основе переданного контекста.

ПРАВИЛА ОФОРМЛЕНИЯ ССЫЛОК:
1. Когда приводишь факт или инструкцию, ОБЯЗАТЕЛЬНО ставь номер источника в тексте, например: «Согласно ГОСТу [1]...».
2. В конце ответа сформируй раздел «### Источники» со списком источников в формате:
   - [1] [Название раздела](URL)
   - [2] [Название раздела](URL)

КОНТЕКСТ ИЗ ДОКУМЕНТАЦИИ:
{context_str}
"""

    print("\n🤖 Запрос к нейросети (Polza.ai)...")
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
        temperature=0.2,
    )

    answer = response.choices[0].message.content
    print("\n📝 Ответ модели:\n")
    print(answer)
    print("\n" + "=" * 60)

    # 3. Валидация наличия ссылок
    validate_links(answer, sources)


def validate_links(answer: str, sources: list[dict]):
    """Проверяет, проставила ли модель цитаты и корректные URL."""
    print("🧪 Проверка качества ответа:")

    # Проверка на наличие маркеров [1], [2] и т.д.
    found_citations = re.findall(r'\[(\d+)\]', answer)
    if found_citations:
        print(f"  ✅ Найдены цитаты в тексте: {set(found_citations)}")
    else:
        print("  ⚠️ Внимание: модель не вставила маркеры источников [1] в тексте.")

    # Проверка на присутствие ссылок из базы
    matched_urls = [s["url"] for s in sources if s["url"] in answer]
    if matched_urls:
        print(f"  ✅ Модель включила {len(matched_urls)} из {len(sources)} URL-адресов документации.")
    else:
        print("  ⚠️ Внимание: в тексте ответа не найдено прямых URL-ссылок на документацию.")


if __name__ == "__main__":
    # Тестовый запрос по вашей документации
    test_query = input("Ваш вопрос: ")
    ask_rag(test_query, top_k=4)