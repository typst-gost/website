"use client"

import Link from "next/link"
import { useQueryState } from "nuqs"
import { FileCode2, FileJson, FileText, Image as ImageIcon, FolderOpen, Folder } from "lucide-react"
import { ExampleFile } from "@/lib/github-examples"
import { cn } from "@/lib/utils"
import { fileParam } from "@/app/examples/search-params"

interface TreeNode {
  name: string
  path: string
  type: "file" | "folder"
  children?: TreeNode[]
  url?: string
}

function buildTree(files: ExampleFile[]): TreeNode[] {
  const root: TreeNode[] =[]

  for (const file of files) {
    const parts = file.path.split("/")
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const existingPath = parts.slice(0, i + 1).join("/")

      let node = currentLevel.find((n) => n.name === part)

      if (!node) {
        node = {
          name: part,
          path: existingPath,
          type: isFile ? "file" : "folder",
          ...(isFile ? { url: file.url } : { children:[] }),
        }
        currentLevel.push(node)
      }

      if (!isFile) {
        currentLevel = node.children!
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((n) => n.children && sortNodes(n.children))
  }

  sortNodes(root)
  return root
}

function getFileIcon(filename: string) {
  if (filename.endsWith(".typ")) return <FileCode2 className="w-4 h-4 text-blue-400" />
  if (filename.endsWith(".json")) return <FileJson className="w-4 h-4 text-yellow-400" />
  if (filename.match(/\.(png|jpe?g|svg|gif)$/i)) return <ImageIcon className="w-4 h-4 text-purple-400" />
  return <FileText className="w-4 h-4 text-gray-400" />
}

export function FileTree({ files, activePath, slug }: { files: ExampleFile[], activePath: string, slug: string }) {
  const tree = buildTree(files)
  const [, setFile] = useQueryState("file", fileParam)

  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.type === "folder") {
      return (
        <div key={node.path} className="flex flex-col">
          <div 
            className="flex items-center gap-1.5 py-1 px-2 hover:bg-white/5 cursor-pointer text-gray-300"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <FolderOpen className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm truncate select-none">{node.name}</span>
          </div>
          <div className="flex flex-col">
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </div>
        </div>
      )
    }

    const isActive = activePath === node.path

    return (
      <Link
        key={node.path}
        href={`?file=${encodeURIComponent(node.path)}`}
        scroll={false}
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors",
          isActive ? "bg-blue-500/20 text-white" : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="shrink-0">{getFileIcon(node.name)}</span>
        <span className="text-sm truncate select-none">{node.name}</span>
      </Link>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-0.5">
      <div className="px-4 py-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Файлы проекта
      </div>
      {tree.map((node) => renderNode(node, 0))}
    </div>
  )
}