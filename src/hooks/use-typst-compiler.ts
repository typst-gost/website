"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"

type TypstModule = Window['$typst']

const TYPST_COMPILER_URL = "/wasm/typst_ts_web_compiler_bg.wasm"
const TYPST_RENDERER_URL = "/wasm/typst_ts_renderer_bg.wasm"
let typstInitialized = false

export function useTypstCompiler(assets: string[] | null) {
  const [compiler, setCompiler] = useState<TypstModule | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [compilerInitError, setCompilerInitError] = useState<string | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)

  const assetsKey = useMemo(() => (assets || []).join(','), [assets])
  const loadedAssetsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setIsLoading(true)
      try {
        if (!window.$typst) {
          await import(
            "@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js"
          )
        }
        
        const typst = window.$typst

        if (!typst) {
          throw new Error("Typst module not loaded")
        }
        
        if (!typstInitialized) {
          typst.setCompilerInitOptions({ getModule: TYPST_COMPILER_URL })
          typst.setRendererInitOptions({ getModule: TYPST_RENDERER_URL })
          typstInitialized = true
        }

        const assetList = assetsKey.split(',').filter(Boolean)
        const newAssets = assetList.filter(a => !loadedAssetsRef.current.has(a))

        if (newAssets.length > 0) {
          await Promise.all(
            newAssets.map(async (assetName) => {
              const response = await fetch(`docs/compile_assets/${assetName}`)
              if (!response.ok) throw new Error(`Asset ${assetName} not found`)
              
              const buffer = await response.arrayBuffer()
              typst.mapShadow(`/${assetName}`, new Uint8Array(buffer))
              
              loadedAssetsRef.current.add(assetName)
            })
          )
        }

        if (isMounted) {
          setCompiler(typst)
          setCompilerInitError(null)
        }
      } catch (err) {
        if (isMounted) {
          setCompilerInitError(
            err instanceof Error ? err.message : "Failed to load compiler/assets"
          )
          console.error("Failed to init Typst compiler:", err)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [assetsKey])

  const compile = useCallback(
    async (code: string): Promise<string | null> => {
      if (!compiler) {
        setCompilerInitError("Compiler not initialized")
        return null
      }

      try {
        compiler.mapShadow("/main.typ", new TextEncoder().encode(code))

        const svg = await compiler.svg({
          mainFilePath: "/main.typ",
        })

        if (!svg || typeof svg !== "string") {
          throw new Error("Compiler returned invalid output")
        }

        setCompileError(null)
        return svg
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setCompileError(errorMessage)
        throw err;
      }
    },
    [compiler]
  )

  return { 
    compiler, 
    isLoading, 
    compilerInitError, 
    compileError, 
    compile 
  }
}