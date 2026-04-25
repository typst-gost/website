"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useMDXPath } from "@/lib/mdx-path-context";
import { useTypstCompiler } from "@/hooks/use-typst-compiler";

import { TypstEditor } from "./editor/editor";
import { TypstOutput } from "./output";
import { DynamicCodeBlock } from "@/components/docs/fumadocs/dynamic-codeblock";
import { formatTypstError, parseTypstError } from "@/lib/typst/error-parser";
import {
  DEFAULT_HIDDEN_PREFIX,
  DEFAULT_HIDDEN_SUFFIX,
} from "@/lib/typst/constants";

interface TypstRenderProps {
  code: string;
  image?: string;
  filePath?: string;
  alt?: string;
  layout?: "horizontal" | "vertical";
  wordWrap?: boolean;
  editable?: boolean;
  hiddenPrefix?: string | null;
  hiddenSuffix?: string | null;
}

function buildFullCode(
  code: string,
  hiddenPrefix: string | null | undefined,
  hiddenSuffix: string | null | undefined,
): string {
  const prefix = hiddenPrefix || "";
  const suffix = hiddenSuffix || "";
  return `${prefix}${code}${suffix}`;
}

let globalCompileQueue = Promise.resolve();

export function TypstRender({
  code,
  image,
  filePath,
  alt = "Preview",
  layout = "horizontal",
  wordWrap = true,
  editable = true,
  hiddenPrefix = DEFAULT_HIDDEN_PREFIX,
  hiddenSuffix = DEFAULT_HIDDEN_SUFFIX,
}: TypstRenderProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [compiledSvg, setCompiledSvg] = useState<string | null>(null);
  const [localCompileError, setLocalCompileError] = useState<string | null>(
    null,
  );

  const isMounted = useRef(true);
  const initialCompileRef = useRef(false);
  const compileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { docPath } = useMDXPath();
  const {
    compile,
    isLoading: compilerLoading,
    compilerInitError,
    compileError: hookCompileError,
  } = useTypstCompiler();

  const displayCode = useMemo(() => code.trim(), [code]);

  const imagePath = useMemo(() => {
    if (filePath) return filePath;
    if (!image) return null;
    if (image.startsWith("/")) return image;
    return `/docs/attachments/${docPath}/${image}`;
  }, [filePath, image, docPath]);

  const imageError = !!imagePath && failedImage === imagePath;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const showEditor =
    editable && !compilerLoading && !compilerInitError && !!compile;

  const compileCode = useCallback(
    (codeToCompile: string) => {
      if (!compile) return;

      const fullCodeToCompile = buildFullCode(
        codeToCompile,
        hiddenPrefix,
        hiddenSuffix,
      );

      globalCompileQueue = globalCompileQueue
        .then(async () => {
          if (!isMounted.current) return;

          setLocalCompileError(null);

          const svg = await compile(fullCodeToCompile, ["title.pdf"]);

          if (!svg) throw new Error("Compiler returned empty result");
          if (typeof svg !== "string")
            throw new Error("Compiler returned invalid type of SVG");

          const trimmedSvg = svg.trim();
          if (!trimmedSvg.startsWith("<svg"))
            throw new Error("Invalid svg: does not start with <svg");

          const processed = trimmedSvg
            .replace(/width="[^"]*"/g, "")
            .replace(/height="[^"]*"/g, "");

          if (isMounted.current) {
            setCompiledSvg(processed);
          }
        })
        .catch((error) => {
          if (isMounted.current) {
            const parsedError = parseTypstError(error);
            setLocalCompileError(formatTypstError(parsedError));
            console.error("Compilation error:", error);
          }
        });
    },
    [compile, hiddenPrefix, hiddenSuffix],
  );

  useEffect(() => {
    if (showEditor && !initialCompileRef.current) {
      initialCompileRef.current = true;
      setTimeout(() => {
        compileCode(displayCode);
      }, 0);
    }
  }, [showEditor, displayCode, compileCode]);

  const handleEditorChange = useCallback(
    (newCode: string) => {
      if (compileTimeoutRef.current) {
        clearTimeout(compileTimeoutRef.current);
      }
      compileTimeoutRef.current = setTimeout(() => {
        compileCode(newCode);
      }, 400);
    },
    [compileCode],
  );

  const containerClass =
    layout === "horizontal"
      ? "flex flex-row gap-8 items-stretch"
      : "flex flex-col gap-8";

  const codeBlockClass = layout === "horizontal" ? "w-1/2" : "w-full";
  const displayCompileError = localCompileError || hookCompileError;

  return (
    <div className="typst-render-container my-6">
      <div className={containerClass}>
        <div className={codeBlockClass}>
          {showEditor ? (
            <TypstEditor
              code={displayCode}
              onChange={handleEditorChange}
              wordWrap={wordWrap}
            />
          ) : (
            <DynamicCodeBlock
              code={displayCode}
              lang="typst"
              wordWrap={wordWrap}
              codeblock={{
                className: "h-full",
              }}
            />
          )}
        </div>

        <TypstOutput
          compiledSvg={compiledSvg}
          imagePath={imagePath}
          alt={alt}
          compileError={displayCompileError}
          imageError={imageError}
          onImageError={() => {
            if (imagePath) setFailedImage(imagePath);
          }}
          layout={layout}
        />
      </div>
    </div>
  );
}
