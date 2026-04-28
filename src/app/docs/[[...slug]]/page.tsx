import { source } from '@/lib/source';
import { MDXPathProvider } from '@/lib/mdx-path-context';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { Feedback } from '@/components/docs/fumadocs/feedback';
import { onRateAction } from '@/lib/fumadocs/feedback';
// import { MarkdownCopyButton } from '@/components/ai/page-actions';

type DocsPageProps = { params: Promise<{ slug?: string[] }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function Page(props: DocsPageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const docPath = page.absolutePath!
    .replace(/\.[^/.]+$/, '')
    .replace(/^content\/docs\//, '')

  // const markdownUrl = `${page.url}.mdx`
  
  return (
    <MDXPathProvider docPath={docPath || 'index'}>
      <DocsPage toc={page.data.toc} tableOfContent={{ style: 'clerk' }} full={page.data.full}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        {/* <div className="flex flex-row gap-2 items-center border-b pb-6 pt--20">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
        </div>
        */}
        <DocsBody>
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, page),
            })}
          />
        </DocsBody>
        <Feedback
          onRateAction={onRateAction}
        />
      </DocsPage>
    </MDXPathProvider>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: DocsPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
