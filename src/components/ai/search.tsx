'use client';
import type { ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type InferUITool, type Tool, type UIMessage } from 'ai';
import { type AIChatClientData, AIChatProvider, AIChatSearch } from './chat';

export { AIChatPanel, AIChatTrigger, useAIChat } from './chat';

export type SearchTool = Tool<
  { query: string; limit: number },
  { doc?: { url: string; title: string } | null }[]
>;

export type ChatUIMessage = UIMessage<
  never,
  {
    client: AIChatClientData;
    sources: { url: string; title?: string | null; label?: string | null }[];
  },
  { search: InferUITool<SearchTool> }
>;

export function AIChat({ children }: { children: ReactNode }) {
  const chat = useChat<ChatUIMessage>({
    id: 'search',
    throttle: 40,
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <AIChatProvider
      chat={chat}
      renderPart={renderPart}
      description="Ищу ответы прямо по документации typst-gost и Typst."
      suggestions={[
        'Как оформить реферат по ГОСТ 7.32?',
        'Как настроить титульный лист?',
        'Как добавить приложения и рисунки?',
      ]}
    >
      {children}
    </AIChatProvider>
  );
}

function renderPart(part: ChatUIMessage['parts'][number], live: boolean) {
  if (part.type === 'tool-search') return <AIChatSearch part={part} live={live} />;
}