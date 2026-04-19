import { Code, FileText } from "lucide-react";

import CodeBlock from "@/components/sections/preview/code-viewer";
import ExpandableContentBlock from "@/components/ui/expandable";
import { PdfViewerWrapper } from "./pdf-client-wrapper";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";

async function getTypstCode() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/typst-gost/examples/refs/heads/main/documents/preview/main.typ",
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) throw new Error("Failed to fetch");
    return res.text();
  } catch (error) {
    return `Error loading code example: ${error}`;
  }
}

const PDF_URL =
  "https://raw.githubusercontent.com/typst-gost/examples/refs/heads/preview/preview/preview/preview.pdf";

export default async function PreviewSection() {
  const typstCode = await getTypstCode();

  return (
    <Section>
      <Heading as="h2" title="Пример" centered desktopHidden />
      <div className="container mx-auto px-4">
        <div className="relative mx-auto max-w-7xl">
          <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl" />
          <div className="relative bg-gray-800/50 border border-gray-800/50 rounded-3xl p-4 sm:p-6 backdrop-blur-xs">
            <div className="hidden lg:flex gap-6 items-stretch">
              <div className="w-1/2 h-[70vh] min-h-120">
                <div className="h-full overflow-hidden rounded-xl">
                  <CodeBlock codeType="typst" codeContent={typstCode} />
                </div>
              </div>

              <div className="w-1/2 h-[70vh] min-h-120 overflow-hidden rounded-xl">
                <PdfViewerWrapper url={PDF_URL} />
              </div>
            </div>

            <div className="lg:hidden space-y-4">
              <ExpandableContentBlock title="Код" icon={<Code size={16} />}>
                <CodeBlock codeType="typst" codeContent={typstCode} />
              </ExpandableContentBlock>

              <ExpandableContentBlock
                title="Документ"
                icon={<FileText size={16} />}
              >
                <div className="w-full h-[70vh]">
                  <PdfViewerWrapper url={PDF_URL} />
                </div>
              </ExpandableContentBlock>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
