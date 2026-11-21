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
const EMBEDDING_MODEL = 'baai/bge-m3';
const CHAT_MODEL = 'deepseek/deepseek-v4.1-flash-1017';

const polza = createOpenAI({
  baseURL: POLZA_BASE_URL,
  apiKey: POLZA_API_KEY,
});

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

// --- Кэшированное подключение к LanceDB ---
let tablePromise: Promise<lancedb.Table> | null = null;

function getDocsTable(): Promise<lancedb.Table> {
  if (!tablePromise) {
    const dbPath = path.join(process.cwd(), 'docs_vector_db');
    tablePromise = lancedb
      .connect(dbPath)
      .then((db) => db.openTable('docs'))
      .catch((err) => {
        tablePromise = null;
        throw err;
      });
  }
  return tablePromise;
}

async function searchLanceDB(vector: number[], topK = 6) {
  const table = await getDocsTable();
  const results = await table.vectorSearch(vector).limit(topK).toArray();
  return results as Array<{
    title: string;
    section: string;
    url: string;
    text: string;
  }>;
}

function extractMessageText(message: any): string {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p: any) => p.type === 'text' && typeof p.text === 'string')
      .map((p: any) => p.text)
      .join('\n');
  }
  if (Array.isArray(message.content)) {
    return message.content
      .filter((c: any) => c.type === 'text' && typeof c.text === 'string')
      .map((c: any) => c.text)
      .join('\n');
  }
  return '';
}

function extractClientContext(message: any): string {
  if (!Array.isArray(message?.parts)) return '';
  const clientPart = message.parts.find((p: any) => p.type === 'data-client');
  if (!clientPart?.data) return '';
  const { title, location } = clientPart.data;
  return `\nПользователь сейчас читает страницу: «${title}» (${location})`;
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

  const data = await res.json();
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
    const body = await req.json();
    const rawMessages = body.messages || [];

    const rawUserMessages = rawMessages.filter((m: any) => m.role === 'user');
    const lastRawUserMsg = rawUserMessages.at(-1);

    const cleanMessages = rawMessages
      .map((m: any) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: extractMessageText(m).trim(),
      }))
      .filter((m: { content: string }) => m.content.length > 0);

    const lastUserMessage = cleanMessages.filter((m: any) => m.role === 'user').pop();
    if (!lastUserMessage) {
      return new NextResponse('Сообщение пользователя не найдено', { status: 400 });
    }

    const query = lastUserMessage.content;
    if (query.length > 1500) {
      return new NextResponse('Запрос слишком длинный (максимум 1500 символов).', { status: 400 });
    }

    // 1. Поиск релевантных чанков
    const queryVector = await getQueryEmbedding(query);
    const rawChunks = await searchLanceDB(queryVector, 6);

    // 2. Дедуплицируем по URL и присваиваем номера [1], [2]...
    const groupedByUrl = new Map<
      string,
      { label: string; url: string; title: string; texts: string[] }
    >();

    for (const chunk of rawChunks) {
      // Переводим абсолютный URL в относительный (/docs/...), чтобы работала быстрая SPA-навигация
      const localUrl = chunk.url.replace(/^https?:\/\/(www\.)?typst-gost\.ru/, '');
      const cleanSection = chunk.section.replace(/\s*\(часть \d+ из \d+\)$/, '');

      const displayTitle =
        cleanSection === chunk.title || cleanSection === 'Введение'
          ? chunk.title
          : `${chunk.title} · ${cleanSection}`;

      if (!groupedByUrl.has(localUrl)) {
        groupedByUrl.set(localUrl, {
          label: String(groupedByUrl.size + 1),
          url: localUrl,
          title: displayTitle,
          texts: [chunk.text],
        });
      } else {
        groupedByUrl.get(localUrl)!.texts.push(chunk.text);
      }
    }

    const uniqueSources = Array.from(groupedByUrl.values());
    const sourcesForClient = uniqueSources.map(({ url, title, label }) => ({
      url,
      title,
      label,
    }));

    const contextText = uniqueSources
      .map(
        (src) =>
          `[Источник ${src.label}] (${src.title}):\n${src.texts.join('\n\n')}`,
      )
      .join('\n---\n');

    const currentPageContext = extractClientContext(lastRawUserMsg);

    const systemPrompt = `Ты — официальный AI-ассистент по системе вёрстки Typst и шаблону typst-gost (ГОСТ 7.32-2017).
Отвечай точно, лаконично и строго на основе переданного контекста документации.${currentPageContext}

Если ответа нет в документации, честно скажи: «В документации нет информации по этому вопросу».

ПРАВИЛА ЦИТИРОВАНИЯ И ОФОРМЛЕНИЯ:
1. В тексте ответа ставь сноски строго в виде числа в квадратных скобках: [1], [2].
2. Ставь каждую цифру отдельно (пиши [1][2] или [1], [2], а не [1, 2]).
3. НЕ пиши URL-адреса в тексте и НЕ добавляй список «Источники» в конце ответа — карточки со ссылками отобразятся под твоим ответом автоматически.
4. Примеры кода Typst оформляй в блоках \`\`\`typst ... \`\`\`.

КОНТЕКСТ ИЗ ДОКУМЕНТАЦИИ:
${contextText}`;

    // 3. Отправляем источники + поток текста в едином UIMessageStream
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
      onError: (error) => {
        console.error('Stream error:', error);
        return error instanceof Error ? error.message : 'Ошибка генерации ответа';
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error: any) {
    console.error('Chat route error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}