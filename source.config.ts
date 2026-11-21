import { defineDocs, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
    schema: frontmatterSchema.extend({
      iconLocal: z.string().optional(),
    })
  }
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMath],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});