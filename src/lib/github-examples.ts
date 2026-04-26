import { unstable_cache } from "next/cache"

const REPO = "typst-gost/examples"
const BRANCH = "main"
const PREVIEW_BRANCH = "preview"

export interface ExampleFile {
  path: string
  url: string
}

export interface Example {
  slug: string
  title: string
  order: number
  previewUrl: string
  pdfUrl: string
  files: ExampleFile[]
}

interface GitHubTreeItem {
  path: string
  type: "blob" | "tree"
}

interface MetaData {
  title: string
  order?: number
}

export const getExamples = unstable_cache(
  async (): Promise<Example[]> => {
    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
        {
          headers: { "User-Agent": "typst-gost-website" },
          next: { revalidate: 3600 },
        }
      )

      if (!treeRes.ok) return[]

      const treeData = await treeRes.json()
      const items: GitHubTreeItem[] = treeData.tree

      const documents = items.filter(
        (item) => item.path.startsWith("documents/") && item.type === "blob"
      )

      let meta: Record<string, MetaData> = {}
      const metaFile = documents.find((f) => f.path === "documents/_meta.json")
      
      if (metaFile) {
        try {
          const metaRes = await fetch(
            `https://raw.githubusercontent.com/${REPO}/refs/heads/${BRANCH}/${metaFile.path}`
          )
          if (metaRes.ok) meta = await metaRes.json()
        } catch {}
      }

      const examplesMap = new Map<string, ExampleFile[]>()

      for (const item of documents) {
        if (item.path === "documents/_meta.json") continue

        const parts = item.path.split("/")
        if (parts.length < 3) continue

        const slug = parts[1]
        const filePath = parts.slice(2).join("/")
        
        if (!examplesMap.has(slug)) {
          examplesMap.set(slug,[])
        }
        
        examplesMap.get(slug)!.push({
          path: filePath,
          url: `https://raw.githubusercontent.com/${REPO}/refs/heads/${BRANCH}/${item.path}`,
        })
      }

      const examples: Example[] = []
      let counter = 1

      for (const [slug, files] of examplesMap.entries()) {
        const metaData = meta[slug] || { title: `Пример №${counter++}`, order: 999 }
        
        examples.push({
          slug,
          title: metaData.title || `Пример №${counter++}`,
          order: metaData.order ?? 999,
          previewUrl: `https://raw.githubusercontent.com/${REPO}/refs/heads/${PREVIEW_BRANCH}/preview/${slug}/${slug}.png`,
          pdfUrl: `https://raw.githubusercontent.com/${REPO}/refs/heads/${PREVIEW_BRANCH}/preview/${slug}/${slug}.pdf`,
          files,
        })
      }

      return examples.sort((a, b) => a.order - b.order)
    } catch {
      return []
    }
  }, ["github-examples-cache"],
  { revalidate: 3600 }
)

export async function getExampleBySlug(slug: string): Promise<Example | null> {
  const examples = await getExamples()
  return examples.find((e) => e.slug === slug) || null
}

export async function getRawFileContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return `Error loading file: ${res.statusText}`
    return await res.text()
  } catch (error) {
    return `Error loading file: ${error}`
  }
}