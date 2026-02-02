import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { TypeTable } from './components/docs/fumadocs/type-table';
import { ComponentPropsWithoutRef, ElementType } from 'react';

import { TypstRender } from './components/docs/typst/renderer';
import { GostQuote } from './components/docs/quote';
import { QuoteLink } from './components/docs/quote-link';
import { FurtherReading } from './components/docs/further-reading';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  const RelativeLink = components?.a as ElementType;
  return {
    ...defaultMdxComponents,
    TypstRender,
    GostQuote,
    QuoteLink,
    FurtherReading,
    TypeTable,
    ...components,
    a: (props: ComponentPropsWithoutRef<'a'>) => {
      const rawUrl = <a {...props} target="_blank" rel="noopener noreferrer" />;;
      if (props.href?.startsWith('#')) {
        return <QuoteLink {...props} href={props.href} />;
      }
      if (props.href?.startsWith('/')) {
        return rawUrl;
      }
      if (RelativeLink) {
        return <RelativeLink {...props} />;
      }
      return rawUrl;
    },
  };
}
