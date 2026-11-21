import type { ReactNode } from 'react';
import { source } from '@/lib/source';
import { DocsLayoutWithAI } from '@/components/ai/layout';

import { baseOptions } from '@/lib/layout.shared';
import { QuoteProvider } from '@/contexts/quote-context';

import '@/styles/typst-render.css';
import 'katex/dist/katex.css';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayoutWithAI
      tree={source.pageTree}
      containerProps={{
        className: 'mx-(--fd-layout-offset)',
      }}
      {...baseOptions()}
    >
      <QuoteProvider>
        {children}
      </QuoteProvider>
    </DocsLayoutWithAI>
  );
}