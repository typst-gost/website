import { NextRequest, NextResponse } from 'next/server';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';

export const maxDuration = 60;

const AI_GATEWAY_URL = (process.env.AI_GATEWAY_URL || 'http://127.0.0.1:8080').replace(
  /\/+$/,
  '',
);
const VISITOR_COOKIE_NAME = 'ai_visitor_id';

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

interface GatewaySourceItem {
  label: number | string;
  title: string;
  url: string;
}

interface GatewaySsePayload {
  sources?: GatewaySourceItem[];
  text?: string;
  debug_markdown?: string | null;
  detail?: string;
  blocked_by_guard?: boolean;
  no_docs_found?: boolean;
}

function isPrivateOrLocalIp(ip: string): boolean {
  const clean = ip.replace(/^::ffff:/i, '');
  return (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(clean) ||
    clean.startsWith('fc') ||
    clean.startsWith('fd') ||
    clean.startsWith('fe80:')
  );
}

function extractClientIp(req: NextRequest): string | undefined {
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp && !isPrivateOrLocalIp(cfIp)) {
    return cfIp;
  }

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const publicIp = ips.find((ip) => !isPrivateOrLocalIp(ip));
    if (publicIp) return publicIp;
    if (ips[0]) return ips[0];
  }

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp && !isPrivateOrLocalIp(realIp)) {
    return realIp;
  }

  return undefined;
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

async function readErrorDetail(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown };
    if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
      return parsed.detail;
    }
  } catch {
    // Ошибка пришла в виде обычного текста
  }
  return raw.trim() || `AI Gateway HTTP ${res.status}`;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && !origin.includes(host)) {
    return new NextResponse('Forbidden: Cross-origin requests blocked', { status: 403 });
  }

  const existingVisitorId = req.cookies.get(VISITOR_COOKIE_NAME)?.value?.trim();
  const isNewVisitor = !existingVisitorId;
  const visitorId = existingVisitorId || crypto.randomUUID();
  const clientIp = extractClientIp(req);

  try {
    const body = (await req.json()) as { id?: string; messages?: IncomingMessage[] };
    const rawMessages: IncomingMessage[] = body.messages || [];

    const rawUserMessages = rawMessages.filter((m) => m.role === 'user');
    const lastRawUserMsg = rawUserMessages.at(-1);

    const cleanMessages: CleanChatMessage[] = rawMessages
      .map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: extractMessageText(m).trim(),
      }))
      .filter((m) => m.content.length > 0);

    const lastUserMessage = cleanMessages.filter((m) => m.role === 'user').at(-1);
    if (!lastUserMessage) {
      return new NextResponse('Сообщение пользователя не найдено', { status: 400 });
    }

    const clientData = extractClientData(lastRawUserMsg);
    const rawChatId =
      typeof body.id === 'string' && body.id.trim() ? body.id.trim() : 'default';
    const conversationId = rawChatId.startsWith(`${visitorId}:`)
      ? `website:${rawChatId}`
      : `website:${visitorId}:${rawChatId}`;

    const gatewayHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (clientIp) {
      gatewayHeaders['X-Forwarded-For'] = clientIp;
    }

    const gatewayRes = await fetch(`${AI_GATEWAY_URL}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: gatewayHeaders,
      signal: req.signal,
      body: JSON.stringify({
        channel: 'website',
        conversation_id: conversationId,
        messages: cleanMessages,
        page_context: clientData
          ? {
              title: clientData.title ?? null,
              location: clientData.location ?? null,
            }
          : null,
        external_user_id: `web:${visitorId}`,
        metadata: {
          user_agent: req.headers.get('user-agent') || undefined,
          client_ip: clientIp,
        },
        stream: true,
        save_history: true,
      }),
    });

    if (!gatewayRes.ok) {
      const detail = await readErrorDetail(gatewayRes);
      return new NextResponse(detail, { status: gatewayRes.status });
    }

    if (!gatewayRes.body) {
      return new NextResponse('Empty response stream from AI Gateway', { status: 502 });
    }

    const gatewayBody = gatewayRes.body;

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const reader = gatewayBody.getReader();
        const decoder = new TextDecoder('utf-8');
        const textPartId = 'gateway-answer';

        let lineBuffer = '';
        let currentEvent = '';
        let dataLines: string[] = [];
        let textStarted = false;
        let finished = false;

        writer.write({ type: 'start' });

        const handleGatewayEvent = (eventName: string, payload: GatewaySsePayload) => {
          if (eventName === 'meta') {
            if (Array.isArray(payload.sources) && payload.sources.length > 0) {
              writer.write({
                type: 'data-sources',
                data: payload.sources.map((src) => ({
                  url: String(src.url),
                  title: String(src.title),
                  label: String(src.label),
                })),
              });
            }
            return;
          }

          if (eventName === 'delta') {
            if (typeof payload.text === 'string' && payload.text.length > 0) {
              if (!textStarted) {
                writer.write({ type: 'text-start', id: textPartId });
                textStarted = true;
              }
              writer.write({
                type: 'text-delta',
                id: textPartId,
                delta: payload.text,
              });
            }
            return;
          }

          if (eventName === 'done') {
            if (typeof payload.debug_markdown === 'string' && payload.debug_markdown.trim()) {
              if (!textStarted) {
                writer.write({ type: 'text-start', id: textPartId });
                textStarted = true;
              }
              writer.write({
                type: 'text-delta',
                id: textPartId,
                delta: `\n\n${payload.debug_markdown}`,
              });
            }
            if (textStarted) {
              writer.write({ type: 'text-end', id: textPartId });
              textStarted = false;
            }
            if (!finished) {
              writer.write({ type: 'finish' });
              finished = true;
            }
            return;
          }

          if (eventName === 'error') {
            throw new Error(payload.detail || 'Ошибка генерации ответа');
          }
        };

        const processLine = (rawLine: string) => {
          const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
          if (line === '') {
            if (dataLines.length > 0) {
              const parsed = JSON.parse(dataLines.join('\n')) as GatewaySsePayload;
              handleGatewayEvent(currentEvent, parsed);
            }
            currentEvent = '';
            dataLines = [];
            return;
          }
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
        };

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            lineBuffer += decoder.decode(value, { stream: true });
            let newlineIdx = lineBuffer.indexOf('\n');
            while (newlineIdx !== -1) {
              const line = lineBuffer.slice(0, newlineIdx);
              lineBuffer = lineBuffer.slice(newlineIdx + 1);
              processLine(line);
              newlineIdx = lineBuffer.indexOf('\n');
            }
          }

          lineBuffer += decoder.decode();
          if (lineBuffer.length > 0) {
            processLine(lineBuffer);
          }
          if (dataLines.length > 0) {
            processLine('');
          }

          if (textStarted) {
            writer.write({ type: 'text-end', id: textPartId });
            textStarted = false;
          }
          if (!finished) {
            writer.write({ type: 'finish' });
            finished = true;
          }
        } finally {
          await reader.cancel().catch(() => undefined);
        }
      },
      onError: (error: unknown) => {
        console.error('AI Gateway stream error:', error);
        return error instanceof Error ? error.message : 'Ошибка генерации ответа';
      },
    });

    const response = createUIMessageStreamResponse({ stream });

    if (isNewVisitor) {
      const isHttps =
        req.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'https' ||
        req.nextUrl.protocol === 'https:';
      const cookieParts = [
        `${VISITOR_COOKIE_NAME}=${encodeURIComponent(visitorId)}`,
        'Path=/',
        'Max-Age=31536000',
        'HttpOnly',
        'SameSite=Lax',
      ];
      if (isHttps) {
        cookieParts.push('Secure');
      }
      response.headers.append('Set-Cookie', cookieParts.join('; '));
    }

    return response;
  } catch (error: unknown) {
    console.error('Chat route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(errorMessage, { status: 500 });
  }
}