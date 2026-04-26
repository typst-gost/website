import { notFound } from "next/navigation"
import { getExampleBySlug, getRawFileContent } from "@/lib/github-examples"
import { fileParam } from "../search-params"
import { WorkspaceLayout } from "./workspace-layout"
import { codeToHtml } from "shiki"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function getLanguage(filename: string) {
  if (filename.endsWith(".typ")) return "typst"
  if (filename.endsWith(".bib")) return "bibtex"
  if (filename.endsWith(".json")) return "json"
  if (filename.endsWith(".md")) return "markdown"
  if (filename.endsWith(".yaml") || filename.endsWith(".yml")) return "yaml"
  return "text"
}

export default async function ExampleWorkspacePage({ params, searchParams }: Props) {
  const { slug } = await params
  const example = await getExampleBySlug(slug)

  if (!example) {
    notFound()
  }

  const resolvedSearchParams = await searchParams
  const activeFilePath = fileParam.parseServerSide(resolvedSearchParams.file)

  const activeFile = example.files.find((f) => f.path === activeFilePath) || example.files[0]
  
  let rawContent = ""
  let htmlContent = ""

  if (activeFile && !activeFile.path.match(/\.(png|jpe?g|gif|svg)$/i)) {
    rawContent = await getRawFileContent(activeFile.url)
    htmlContent = await codeToHtml(rawContent, {
      lang: getLanguage(activeFile.path),
      theme: "github-dark",
    })
  }

  return (
    <WorkspaceLayout 
      example={example} 
      activeFile={activeFile} 
      rawContent={rawContent} 
      htmlContent={htmlContent} 
    />
  )
}