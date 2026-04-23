import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { TypeTable } from './components/docs/fumadocs/type-table';
import { ComponentPropsWithoutRef } from 'react';

import { TypstRender } from './components/docs/typst/renderer';
import { GostQuote } from './components/docs/quote';
import { QuoteLink } from './components/docs/quote-link';
import { FurtherReading } from './components/docs/further-reading';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    TypstRender,
    GostQuote,
    QuoteLink,
    FurtherReading,
    TypeTable,
    ...components,
    a: (props: ComponentPropsWithoutRef<'a'>) => {
      const { href } = props;
      
      if (href?.startsWith('#')) {
        return <QuoteLink {...props} href={href} />;
      }
      
      const DefaultA = defaultMdxComponents.a || 'a';
      return <DefaultA {...props} />;
    },
  };
}