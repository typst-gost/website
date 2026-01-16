import { codeToHtml } from "shiki";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/buttons/copy-button";

interface CodeBlockProps {
  codeType: string;
  codeContent: string;
  isScrollable?: boolean;
  showControls?: boolean;
}

const CodeBlock = async ({
  codeType,
  codeContent,
  isScrollable = true,
  showControls = true,
}: CodeBlockProps) => {
  const html = await codeToHtml(codeContent, {
    lang: codeType,
    theme: "github-dark",
  });

  return (
    <div className="flex flex-col h-full bg-[#282c34] rounded-lg shadow-md overflow-hidden border border-gray-700">
      <div className="px-4 py-2 bg-gray-700/50 border-b border-gray-700 flex items-center justify-between shrink-0">
        <span className="text-gray-300 font-semibold uppercase text-xs tracking-wider">
          {codeType}
        </span>
        {showControls && <CopyButton content={codeContent} />}
      </div>

      <div
        className={cn(
          "flex-1 min-h-0 w-full relative",
          isScrollable ? "overflow-auto" : "overflow-hidden",
        )}
      >
        <div
          className="text-[8px] md:text-[10px] lg:text-[12px] leading-relaxed p-4 [&>pre]:bg-transparent! [&>pre]:m-0! [&>pre]:font-mono"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
};

export default CodeBlock;
