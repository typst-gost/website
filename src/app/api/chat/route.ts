import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import * as lancedb from '@lancedb/lancedb';
import { createOpenAI } from '@ai-sdk/openai';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from 'ai';

export const maxDuration = 30;

// --- НАСТРОЙКИ ---
const POLZA_BASE_URL = 'https://polza.ai/api/v1';
const POLZA_API_KEY = process.env.POLZA_AI_API_KEY || '';
const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'qwen/qwen3-embedding-8b';
const CHAT_MODEL = 'deepseek/deepseek-v4.1-flash-1017';

const MAX_SOURCES = 5;
const MAX_PAGE_CHARS = 10000;
const MAX_TOTAL_CONTEXT_CHARS = 24000;

const polza = createOpenAI({
  baseURL: POLZA_BASE_URL,
  apiKey: POLZA_API_KEY,
});

// --- ТИПЫ ДАННЫХ ---
interface ClientContextData {
  title?: string;
  location?: string;
}

interface MessagePart {
  type: string;
  text?: string;
  data?: ClientContextData;
}

interface ContentObject {
  type?: string;
  text?: string;
}

interface IncomingMessage {
  role?: string;
  content?: string | ContentObject[];
  parts?: MessagePart[];
}

interface CleanChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DocChunk {
  chunk_id?: string;
  title: string;
  section: string;
  heading_path?: string;
  description?: string;
  category?: string;
  doc_url?: string;
  chunk_order?: number;
  part_index?: number;
  parts_total?: number;
  url: string;
  text: string;
  source?: string;
  _relevance_score?: number;
  _distance?: number;
}

interface SourceGroup {
  label: string;
  url: string;
  docUrl: string;
  title: string;
  category: string;
  score: number;
  matchedOrders: Set<number>;
  fallbackChunks: DocChunk[];
  assembledText?: string;
}

interface EmbeddingApiResponse {
  data: Array<{
    embedding: number[];
  }>;
}

// --- Локальное расширение терминов (0 токенов, 0 лишних запросов) ---
const SYNONYM_MAP: Array<[RegExp, string]> = [
  [/реферат/i, 'abstract keywords count body modern-g7-32'],
  [/титул|титульник|гриф|утверждаю|согласовано/i, 'title gost.with hide-title approved-by agreed-by title-template'],
  [/исполнител|соисполнител|нормоконтрол/i, 'performers co-performer force-performers'],
  [/содержан|оглавлен|отточ/i, 'outline depth indent'],
  [/введен|структурн\w+ заголов/i, 'introduction structure-heading'],
  [/основн\w+ част|заголовк|раздел|подраздел/i, 'body add-pagebreaks heading'],
  [/заключен/i, 'conclusion'],
  [/источник|литератур|библиограф|bib/i, 'references bibliography gost-r-705-2008-numeric'],
  [/приложен/i, 'appendixes appendix-heading'],
  [/листинг|исходн\w+ код|raw/i, 'code raw breakable'],
  [/перечислен|спис[оа]к|маркер/i, 'enum list enum-numbering'],
  [/таблиц/i, 'table figure header'],
  [/рисун|иллюстрац|картинк|схем/i, 'image figure caption'],
  [/формул|уравнен/i, 'equation math numbering'],
  [/сноск|примечан/i, 'footnote'],
  [/шрифт|полях|поля|отступ|интервал|настро|кастом/i, 'customization text-size margin indent leading pagination-align'],
  [/word|docx|ворд|экспорт/i, 'export docx'],
];

const FOLLOWUP_HINT_RE =
  /^(?:а\s+)?(?:как|что|какие|какой|какая|где|почему|зачем|можно\s+ли|покажи|приведи|подробнее|ещё|еще)\b|\b(?:он|его|её|ее|их|ним|нём|ней|это|этого|этом|этой|там|туда|сюда|параметр|пример)\b/i;

const VERSION_QUERY_RE = /\b0\.\d{1,2}(?:\.\d+)?\b|changelog|список изменений|что нового|миграц|верси/i;
const SYMBOL_QUERY_RE = /символ|эмодзи|emoji|\bsym\b|значок|иконк/i;

// --- In-memory Rate Limiter ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count += 1;
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// --- Кэшированное подключение к LanceDB и RRF-ранкеру ---
let tablePromise: Promise<lancedb.Table> | null = null;
let rerankerPromise: Promise<lancedb.rerankers.RRFReranker> | null = null;

function getDocsTable(): Promise<lancedb.Table> {
  if (!tablePromise) {
    const dbPath = path.join(process.cwd(), 'docs_vector_db');
    tablePromise = lancedb
      .connect(dbPath)
      .then((db) => db.openTable('docs'))
      .catch((err: unknown) => {
        tablePromise = null;
        throw err;
      });
  }
  return tablePromise;
}

function getReranker(): Promise<lancedb.rerankers.RRFReranker> {
  if (!rerankerPromise) {
    rerankerPromise = lancedb.rerankers.RRFReranker.create().catch((err: unknown) => {
      rerankerPromise = null;
      throw err;
    });
  }
  return rerankerPromise;
}

function sanitizeFtsQuery(input: string): string {
  return input
    .replace(/[?!@#$%^&*()[\]{}"'`,;:<>\\/+=~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchQueries(
  cleanMessages: CleanChatMessage[],
  clientData: ClientContextData | null,
): { embeddingQuery: string; ftsQuery: string; rawQuery: string; activeDocUrl: string | null } {
  const userMessages = cleanMessages.filter((m) => m.role === 'user');
  const rawQuery = userMessages.at(-1)?.content ?? '';
  const prevUserQuery = userMessages.length > 1 ? userMessages.at(-2)?.content ?? '' : '';

  const wordCount = rawQuery.split(/\s+/).filter(Boolean).length;
  const isFollowUp = wordCount <= 6 || FOLLOWUP_HINT_RE.test(rawQuery);

  let activeDocUrl: string | null = null;
  if (clientData?.location) {
    try {
      const parsed = new URL(clientData.location);
      activeDocUrl = `https://typst-gost.ru${parsed.pathname.replace(/\/$/, '')}`;
    } catch {
      activeDocUrl = null;
    }
  }

  const parts: string[] = [rawQuery];
  if (isFollowUp && prevUserQuery) {
    parts.push(prevUserQuery);
  } else if (isFollowUp && clientData?.title) {
    parts.push(clientData.title);
  }

  const combined = parts.join(' ');
  const expansions: string[] = [];
  for (const [regex, extra] of SYNONYM_MAP) {
    if (regex.test(combined)) {
      expansions.push(extra);
    }
  }

  const expansionStr = expansions.join(' ');
  const embeddingQuery = expansionStr ? `${combined} (${expansionStr})` : combined;
  const ftsQuery = sanitizeFtsQuery(`${combined} ${expansionStr}`);

  return { embeddingQuery, ftsQuery, rawQuery, activeDocUrl };
}

async function searchHybrid(
  queryVector: number[],
  ftsQuery: string,
  limit = 24,
): Promise<DocChunk[]> {
  const table = await getDocsTable();

  if (ftsQuery.length > 0) {
    try {
      const reranker = await getReranker();
      const rows = await table
        .query()
        .nearestTo(queryVector)
        .fullTextSearch(ftsQuery)
        .rerank(reranker)
        .limit(limit)
        .toArray();
      return rows as unknown as DocChunk[];
    } catch (err) {
      // Fallback на чистый vector search, если FTS-индекс отсутствует на старой БД
      console.warn('Hybrid FTS fallback to vectorSearch:', err);
    }
  }

  const rows = await table.query().nearestTo(queryVector).limit(limit).toArray();
  return rows as unknown as DocChunk[];
}

function inferCategory(chunk: DocChunk): string {
  if (chunk.category) return chunk.category;
  if (chunk.url.includes('/docs/typst-gost')) return 'typst-gost';
  if (chunk.url.includes('/docs/typst/changelog')) return 'typst-changelog';
  if (chunk.url.includes('/docs/typst/symbols')) return 'typst-symbols';
  return 'typst-reference';
}

function rerankCandidates(
  chunks: DocChunk[],
  rawQuery: string,
  activeDocUrl: string | null,
): DocChunk[] {
  const wantsChangelog = VERSION_QUERY_RE.test(rawQuery);
  const wantsSymbols = SYMBOL_QUERY_RE.test(rawQuery);
  const readingTypstGost = activeDocUrl?.includes('/docs/typst-gost') ?? false;
  const mentionsGost = /гост|gost|modern-g7-32|реферат|титул|исполнител|приложен|нормоконтрол/i.test(
    rawQuery,
  );

  return chunks
    .map((chunk, idx) => {
      const category = inferCategory(chunk);
      const docUrl = chunk.doc_url ?? chunk.url.split('#')[0];

      // Базовый ранг из RRF или позиции в выдаче
      let score =
        typeof chunk._relevance_score === 'number'
          ? chunk._relevance_score
          : 1 / (idx + 1);

      if (category === 'typst-changelog' && !wantsChangelog) {
        score *= 0.25;
      }
      if (category === 'typst-symbols' && !wantsSymbols) {
        score *= 0.3;
      }
      if (category === 'typst-gost' && (mentionsGost || readingTypstGost)) {
        score *= 1.45;
      }
      if (activeDocUrl && docUrl === activeDocUrl) {
        score *= 1.25;
      }
      if (/параметр|аргумент|свойств|опци/i.test(rawQuery) && /параметр|свойств|таблиц/i.test(chunk.section)) {
        score *= 1.2;
      }

      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.chunk);
}

async function fetchSiblingChunks(docUrl: string): Promise<DocChunk[]> {
  const table = await getDocsTable();
  const safeDocUrl = docUrl.replace(/'/g, "''");
  try {
    const rows = (await table
      .query()
      .where(`doc_url = '${safeDocUrl}'`)
      .toArray()) as unknown as DocChunk[];
    return rows.sort((a, b) => (a.chunk_order ?? 0) - (b.chunk_order ?? 0));
  } catch {
    return [];
  }
}

async function expandContextSources(rankedChunks: DocChunk[]): Promise<SourceGroup[]> {
  const groups = new Map<string, SourceGroup>();

  for (let i = 0; i < rankedChunks.length; i++) {
    const chunk = rankedChunks[i];
    const docUrl = chunk.doc_url ?? chunk.url.split('#')[0];
    const localUrl = chunk.url.replace(/^https?:\/\/(www\.)?typst-gost\.ru/, '');
    const cleanSection = chunk.section.replace(/\s*\(часть \d+ из \d+\)$/, '');
    const displayTitle =
      cleanSection === chunk.title || cleanSection === 'Введение'
        ? chunk.title
        : `${chunk.title} · ${cleanSection}`;

    let group = groups.get(docUrl);
    if (!group) {
      if (groups.size >= MAX_SOURCES) continue;
      group = {
        label: String(groups.size + 1),
        url: localUrl,
        docUrl,
        title: displayTitle,
        category: inferCategory(chunk),
        score: rankedChunks.length - i,
        matchedOrders: new Set<number>(),
        fallbackChunks: [],
      };
      groups.set(docUrl, group);
    }

    if (typeof chunk.chunk_order === 'number') {
      group.matchedOrders.add(chunk.chunk_order);
    }
    group.fallbackChunks.push(chunk);
  }

  const result = Array.from(groups.values());
  let totalBudget = MAX_TOTAL_CONTEXT_CHARS;

  await Promise.all(
    result.map(async (group) => {
      const siblings = await fetchSiblingChunks(group.docUrl);
      if (siblings.length === 0) {
        group.assembledText = group.fallbackChunks.map((c) => c.text).join('\n\n');
        return;
      }

      // Для страниц typst-gost (и компактных страниц) отдаём страницу целиком,
      // чтобы вместе с примером кода сразу подтягивалась таблица параметров и ГОСТ.
      const fullPageCandidate = siblings.map((c) => c.text).join('\n\n');
      if (
        (group.category === 'typst-gost' || siblings.length <= 6) &&
        fullPageCandidate.length <= MAX_PAGE_CHARS
      ) {
        group.assembledText = fullPageCandidate;
        return;
      }

      // Для больших страниц Typst берём найденные чанки + ±1 соседний чанк
      const wantedOrders = new Set<number>();
      for (const order of group.matchedOrders) {
        wantedOrders.add(order - 1);
        wantedOrders.add(order);
        wantedOrders.add(order + 1);
      }

      const selected = siblings.filter((c) =>
        typeof c.chunk_order === 'number' ? wantedOrders.has(c.chunk_order) : true,
      );
      const text = (selected.length > 0 ? selected : group.fallbackChunks)
        .map((c) => c.text)
        .join('\n\n');
      group.assembledText = text.slice(0, MAX_PAGE_CHARS);
    }),
  );

  for (const group of result) {
    const txt = group.assembledText ?? '';
    if (txt.length > totalBudget) {
      group.assembledText = txt.slice(0, Math.max(800, totalBudget));
    }
    totalBudget = Math.max(0, totalBudget - (group.assembledText?.length ?? 0));
  }

  return result;
}

function extractMessageText(message: IncomingMessage | undefined): string {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(
        (p): p is MessagePart & { text: string } =>
          p.type === 'text' && typeof p.text === 'string',
      )
      .map((p) => p.text)
      .join('\n');
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((c): c is ContentObject & { text: string } => typeof c.text === 'string')
      .map((c) => c.text)
      .join('\n');
  }

  return '';
}

function extractClientData(message: IncomingMessage | undefined): ClientContextData | null {
  if (!Array.isArray(message?.parts)) return null;
  const clientPart = message.parts.find((p) => p.type === 'data-client');
  return clientPart?.data ?? null;
}

async function getQueryEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${POLZA_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${POLZA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Embedding API error: ${res.status} - ${errorText}`);
  }

  const data = (await res.json()) as EmbeddingApiResponse;
  return data.data[0].embedding;
}

export async function POST(req: NextRequest) {
  if (!POLZA_API_KEY) {
    return new NextResponse('POLZA_AI_API_KEY не настроен на сервере', { status: 500 });
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && !origin.includes(host)) {
    return new NextResponse('Forbidden: Cross-origin requests blocked', { status: 403 });
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
  if (isRateLimited(clientIp)) {
    return new NextResponse('Слишком много запросов. Подождите минуту.', { status: 429 });
  }

  try {
    const body = (await req.json()) as { messages?: IncomingMessage[] };
    const rawMessages: IncomingMessage[] = body.messages || [];

    const rawUserMessages = rawMessages.filter((m) => m.role === 'user');
    const lastRawUserMsg = rawUserMessages.at(-1);

    const cleanMessages: CleanChatMessage[] = rawMessages
      .map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: extractMessageText(m).trim(),
      }))
      .filter((m) => m.content.length > 0);

    const lastUserMessage = cleanMessages.filter((m) => m.role === 'user').pop();
    if (!lastUserMessage) {
      return new NextResponse('Сообщение пользователя не найдено', { status: 400 });
    }

    if (lastUserMessage.content.length > 1500) {
      return new NextResponse('Запрос слишком длинный (максимум 1500 символов).', {
        status: 400,
      });
    }

    const clientData = extractClientData(lastRawUserMsg);
    const { embeddingQuery, ftsQuery, rawQuery, activeDocUrl } = buildSearchQueries(
      cleanMessages,
      clientData,
    );

    // 1. Один вызов embedding API + бесплатный гибридный поиск (Vector + FTS BM25 + RRF)
    const queryVector = await getQueryEmbedding(embeddingQuery);
    const candidates = await searchHybrid(queryVector, ftsQuery, 24);
    const ranked = rerankCandidates(candidates, rawQuery, activeDocUrl);

    // 2. Расширяем контекст до полной страницы (для typst-gost) или соседних чанков
    const expandedSources = await expandContextSources(ranked);

    const sourcesForClient = expandedSources.map(({ url, title, label }) => ({
      url,
      title,
      label,
    }));

    const contextText = expandedSources
      .map(
        (src) =>
          `[Источник ${src.label}] (${src.title}):\n${src.assembledText ?? ''}`,
      )
      .join('\n---\n');

    const currentPageContext =
      clientData?.title && clientData?.location
        ? `\nПользователь сейчас читает страницу: «${clientData.title}» (${clientData.location}).`
        : '';

    const systemPrompt = `Ты — официальный AI-ассистент по системе вёрстки Typst и пакету modern-g7-32 (typst-gost, оформление по ГОСТ 7.32-2017).
Отвечай точно, структурированно и строго на основе переданного контекста документации.${currentPageContext}

УЧИТЫВАЙ СТРУКТУРУ ДОКУМЕНТАЦИИ:
- Вопросы про «реферат», «титульник», «исполнителей», «содержание», «приложения», «оформление по ГОСТ» относятся к пакету \`modern-g7-32\` (раздел typst-gost): в нём например реферату соответствует функция \`#abstract\`, титульнику — \`gost.with(...)\`, приложениям — \`#show: appendixes\`.
- Вопросы про синтаксис языка, \`table\`, \`figure\`, \`set\`/\`show\`-правила, функции стандартной библиотеки относятся к базовому \`Typst\`.
- Если вопрос про параметры функции, перечисли все найденные в контексте параметры, их типы, значения по умолчанию и покажи краткий пример кода.
- Не выдумывай параметры и функции, которых нет в контексте. Если в контексте есть только часть ответа (например, пример использования без описания параметра), опиши то, что точно есть в источниках, и честно отметь, чего в них нет. Если ответа нет совсем — скажи: «В документации нет информации по этому вопросу».

ПРАВИЛА ЦИТИРОВАНИЯ И ОФОРМЛЕНИЯ:
1. В тексте ответа ставь сноски строго в виде числа в квадратных скобках: [1], [2].
2. Ставь каждую цифру отдельно (пиши [1][2] или [1], [2], а не [1, 2]).
3. НЕ пиши URL-адреса в тексте и НЕ добавляй список «Источники» в конце ответа — карточки со ссылками отобразятся под твоим ответом автоматически.
4. Примеры кода Typst оформляй в блоках \`\`\`typst ... \`\`\`.

КОНТЕКСТ ИЗ ДОКУМЕНТАЦИИ:
${contextText}`;

    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: 'start' });

        if (sourcesForClient.length > 0) {
          writer.write({
            type: 'data-sources',
            data: sourcesForClient,
          });
        }

        const result = streamText({
          model: polza.chat(CHAT_MODEL),
          system: systemPrompt,
          messages: cleanMessages,
          temperature: 0.2,
        });

        writer.merge(result.toUIMessageStream({ sendStart: false }));
      },
      onError: (error: unknown) => {
        console.error('Stream error:', error);
        return error instanceof Error ? error.message : 'Ошибка генерации ответа';
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error: unknown) {
    console.error('Chat route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(errorMessage, { status: 500 });
  }
}