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
  previewUrl: string
  pdfUrl: string
  files: ExampleFile[]
}

interface GitHubTreeItem {
  path: string
  type: "blob" | "tree"
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

      let meta: Record<string, string> = {}
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

      const examples: Example[] =[]
      let counter = 1

      for (const [slug, files] of examplesMap.entries()) {
        examples.push({
          slug,
          title: meta[slug] || `Пример №${counter++}`,
          previewUrl: `https://raw.githubusercontent.com/${REPO}/refs/heads/${PREVIEW_BRANCH}/preview/${slug}/${slug}.png`,
          pdfUrl: `https://raw.githubusercontent.com/${REPO}/refs/heads/${PREVIEW_BRANCH}/preview/${slug}/${slug}.pdf`,
          files,
        })
      }

      return examples
    } catch {
      return []
    }
  },["github-examples-cache"],
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