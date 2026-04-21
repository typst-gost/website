"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const TYPST_COMPILER_URL = "/wasm/typst_ts_web_compiler_bg.wasm";
const TYPST_RENDERER_URL = "/wasm/typst_ts_renderer_bg.wasm";

type TypstModule = Window["$typst"];

let typstInitialized = false;

export function useTypstCompiler() {
  const [compiler, setCompiler] = useState<TypstModule>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [compilerInitError, setCompilerInitError] = useState<string | null>(
    null,
  );
  const [compileError, setCompileError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const initCompiler = async () => {
      try {
        await import("@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js");

        const typst = window.$typst;

        if (!typst) {
          throw new Error("Typst module not loaded");
        }

        if (!typstInitialized) {
          typst.setCompilerInitOptions({ getModule: () => TYPST_COMPILER_URL });
          typst.setRendererInitOptions({ getModule: () => TYPST_RENDERER_URL });
          typstInitialized = true;
        }

        setCompiler(typst);
        setCompilerInitError(null);
      } catch (err) {
        setCompilerInitError(
          err instanceof Error ? err.message : "Failed to load compiler",
        );
        console.error("Failed to load Typst compiler:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initCompiler();

    return () => {
      loadingRef.current = false;
    };
  }, []);

  const compile = useCallback(
    async (code: string): Promise<string | null> => {
      if (!compiler) {
        setCompilerInitError("Compiler not initialized");
        return null;
      }

      try {
        if (compiler) {
          compiler.mapShadow("/main.typ", new TextEncoder().encode(code));
        }

        const svg = await compiler.svg({
          mainFilePath: "/main.typ",
        });

        if (!svg || typeof svg !== "string") {
          throw new Error("Compiler returned invalid output");
        }

        setCompileError(null);
        return svg;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setCompileError(errorMessage);
        throw err;
      }
    },
    [compiler],
  );

  return {
    compiler,
    isLoading,
    compilerInitError,
    compileError,
    compile,
  };
}
