'use client';

import { isValidElement, memo, useMemo, type ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { CodeBlock, Pre as CodePre } from '@/components/codeblock';
import type { MessageSourceItem } from '@/lib/admin/types';

interface AdminMarkdownMessageProps {
  text: string;
  sources?: MessageSourceItem[];
  docsBaseUrl?: string;
}

function resolveDocHref(href: string | undefined, docsBaseUrl: string): string {
  if (!href) return '#';
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }
  if (href.startsWith('/')) {
    return `${docsBaseUrl.replace(/\/+$/, '')}${href}`;
  }
  return href;
}

function injectCitationLinks(
  text: string,
  sources: MessageSourceItem[],
  docsBaseUrl: string,
): string {
  if (!sources.length) return text;

  const sourceMap = new Map<string, string>();
  sources.forEach((src, idx) => {
    const label = String(src.label ?? idx + 1);
    sourceMap.set(label, resolveDocHref(src.url || src.path, docsBaseUrl));
  });

  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part.replace(/\[(\d+)\](?!\()/g, (match, num) => {
        const url = sourceMap.get(num);
        return url ? `[\\[${num}\\]](${url})` : match;
      });
    })
    .join('');
}

export const AdminMarkdownMessage = memo(function AdminMarkdownMessage({
  text,
  sources = [],
  docsBaseUrl = 'https://typst-gost.ru',
}: AdminMarkdownMessageProps) {
  const processedText = useMemo(
    () => injectCitationLinks(text, sources, docsBaseUrl),
    [text, sources, docsBaseUrl],
  );

  return (
    <div className="prose prose-sm prose-invert max-w-none wrap-break-word text-gray-200 leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500/40 [&_blockquote]:pl-3 [&_blockquote]:text-gray-400">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const resolved = resolveDocHref(href, docsBaseUrl);
            const textContent = String(children ?? '').trim();
            const isCitation = /^\[\d+\]$/.test(textContent);

            return (
              <a
                href={resolved}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isCitation
                    ? 'no-underline! text-blue-400 hover:text-blue-300 font-mono text-[11px] font-semibold mx-0.5 transition-colors'
                    : 'text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors font-medium'
                }
                {...props}
              >
                {children}
              </a>
            );
          },
          pre: ({ children }) => {
            if (
              isValidElement<ComponentProps<'code'>>(children) &&
              typeof children.props.children === 'string'
            ) {
              const codeContent = children.props.children;
              const lang =
                /language-(\S+)/.exec(children.props.className ?? '')?.[1] ?? 'text';
              return (
                <div className="my-2 not-prose">
                  <DynamicCodeBlock
                    lang={lang === 'mdx' ? 'md' : lang}
                    code={codeContent.trimEnd()}
                  />
                </div>
              );
            }

            return (
              <CodeBlock className="my-2">
                <CodePre>{children}</CodePre>
              </CodeBlock>
            );
          },
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className?.includes('language-'));
            if (isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-gray-800/90 border border-gray-700/60 text-blue-300 font-mono text-[12px]"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
});