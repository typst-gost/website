'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock, Pre as CodePre } from '../../codeblock';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

export interface SourceItem {
  url: string;
  title?: string | null;
  label?: string | null;
}

export interface MarkdownProps {
  text: string;
  live?: boolean;
  sources?: SourceItem[];
}

/** Превращает [1], [2] в тексте в кликабельные Markdown-ссылки, не затрагивая блоки кода */
function injectCitationLinks(text: string, sources: SourceItem[]): string {
  if (!sources.length) return text;

  const sourceMap = new Map<string, string>();
  sources.forEach((s, idx) => {
    const label = s.label ?? String(idx + 1);
    sourceMap.set(label, s.url);
  });

  // Разбиваем по fenced code blocks и inline code, чтобы не трогать код
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g);

  return parts
    .map((part, i) => {
      // Нечетные элементы — это блоки кода
      if (i % 2 === 1) return part;

      // Меняем [1] (если после него нет скобки ссылки `(`) на [[1]](url)
      return part.replace(/\[(\d+)\](?!\()/g, (match, num) => {
        const url = sourceMap.get(num);
        return url ? `[\[${num}\]](${url})` : match;
      });
    })
    .join('');
}

export const Markdown = memo(function Markdown({ text, sources = [] }: MarkdownProps) {
  const processedText = useMemo(
    () => injectCitationLinks(text, sources),
    [text, sources],
  );

  return (
    <div className="prose prose-sm prose-no-margin text-fd-foreground max-w-none wrap-break-word">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, href, children, ...props }) => {
            const localPath = href?.replace(/^https?:\/\/(www\.)?typst-gost\.ru/, '');
            const isInternal = localPath?.startsWith('/');
            const textContent = String(children ?? '').trim();
            const isCitation = /^\[\d+\]$/.test(textContent);

            const linkClass = isCitation
              ? 'no-underline! text-blue-400 hover:text-blue-300 font-mono text-[12px] font-semibold mx-0.5 transition-colors'
              : 'text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors font-medium';
            
            if (isInternal && localPath) {
              return (
                <Link href={localPath} className={linkClass}>
                  {children}
                </Link>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                {...props}
              >
                {children}
              </a>
            );
          },
          pre: ({ children }) => {
            const codeProps = (children as any)?.props;
            const codeContent = codeProps?.children;
            if (typeof codeContent === 'string') {
              const lang = /language-(\S+)/.exec(codeProps?.className ?? '')?.[1] ?? 'text';
              return (
                <DynamicCodeBlock
                  lang={lang === 'mdx' ? 'md' : lang}
                  code={codeContent.trimEnd()}
                />
              );
            }
            return (
              <CodeBlock className="my-2">
                <CodePre>{children}</CodePre>
              </CodeBlock>
            );
          },
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
});