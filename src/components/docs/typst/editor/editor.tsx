"use client"

import { useEffect, useRef, useLayoutEffect, useState, useCallback } from "react"
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import shiki from 'codemirror-shiki'
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import { cn } from '@/lib/utils'
import { wrappedLineIndent } from 'codemirror-wrapped-line-indent'
import { LoadingSpinner } from '@/components/ui/spinner'
import { ResetButton } from "./reset-button"
import { CopyButton } from "@/components/ui/buttons/copy-button"

interface TypstEditorProps {
  code: string
  onChange: (code: string) => void
  wordWrap?: boolean
  icon?: React.ReactNode
  allowReset?: boolean
  allowCopy?: boolean
  className?: string
  onLoadingChange?: (isLoading: boolean) => void
}

const highlighterPromise = createHighlighterCore({
  langs: [
    import('@shikijs/langs/typst'),
    import('@shikijs/langs/javascript'),
  ],
  themes: [
    import('@shikijs/themes/github-dark'),
  ],
  engine: createOnigurumaEngine(import('shiki/wasm')),
})

export function TypstEditor({
  code,
  onChange,
  wordWrap = true,
  allowCopy = true,
  allowReset = true,
  className,
  onLoadingChange,
}: TypstEditorProps) {
  const initialCodeRef = useRef(code)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  const shikiCompartment = useRef(new Compartment())

  const handleReset = useCallback(() => {
    const view = viewRef.current
    if (!view) return

    const initialText = initialCodeRef.current

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: initialText
      },
    })

    onChangeRef.current(initialText)

    view.focus()
  }, [])

  const onChangeRef = useRef(onChange)
  useLayoutEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!editorRef.current) return
    let mounted = true

    const init = async () => {
      if (!mounted) return

      setIsLoading(true)
      onLoadingChange?.(true)

      try {
        const themeId = 'github-dark'

        const state = EditorState.create({
          doc: code ?? '',
          extensions: [
            history(),
            keymap.of(historyKeymap),
            keymap.of(defaultKeymap),
            keymap.of([indentWithTab]),
            wordWrap ? [EditorView.lineWrapping] : [],
            wordWrap ? wrappedLineIndent : [],

            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                const value = update.state.doc.toString()
                onChangeRef.current(value)
              }
            }),
            EditorView.darkTheme.of(true),
            shiki({
              highlighter: highlighterPromise,
              language: 'typst',
              theme: themeId,
            }),
            shikiCompartment.current.of([]),
          ],
        })

        if (mounted && editorRef.current && !viewRef.current) {
          viewRef.current = new EditorView({
            state,
            parent: editorRef.current,
          })
        }

        setIsLoading(false)
        onLoadingChange?.(false)
      } catch (error) {
        console.error('Failed to initialize editor:', error)
        setIsLoading(false)
        onLoadingChange?.(false)
      }
    }

    init()

    return () => {
      mounted = false
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <figure
      ref={containerRef}
      dir="ltr"
      className={cn(
        'my-4 bg-fd-card rounded-xl',
        'shiki relative border shadow-sm outline-none text-sm mt-0 mb-0',
        className,
      )}
    >
      <div className="absolute flex top-2 right-4 gap-0.5 z-2 backdrop-blur-lg rounded-lg text-fd-muted-foreground">
        {allowCopy && <CopyButton content={code} />}
        {allowReset && <ResetButton className="-me-2" onResetCallback={handleReset}/>}
      </div>
      <div
        className={cn(
          'text-[13px] py-3.5 px-2 overflow-auto max-h-150 fd-scroll-container relative pr-8',
        )}
        style={
          {
            '--padding-right': 'calc(var(--spacing) * 8)',
          } as object
        }
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-fd-card/80 backdrop-blur-sm z-10">
            <LoadingSpinner />
          </div>
        )}
        <div
          ref={editorRef}
          className="font-mono"
          style={{ fontSize: "14px" }}
        />
      </div>
    </figure>
  )
}
