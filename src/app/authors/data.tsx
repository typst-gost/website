export interface AuthorTag {
  label: string
  className: string
}

export interface Author {
  name: string
  role: string
  github: string
  telegram: string | null
  avatarPath?: string
  isInactive?: boolean
  tags: AuthorTag[]
}

export const TAGS = {
  template: { label: "Шаблон", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  website: { label: "Сайт", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  docs: { label: "Документация", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  presentation: { label: "Презентация", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  promo: { label: "Продвижение", className: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  design: { label: "Дизайн", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  infrastructure: { label: "Инфраструктура", className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
} as const

export const authors: Author[] = [
  {
    name: "Forgenet",
    role: "Создатель шаблона",
    github: "https://github.com/F0rgenet",
    telegram: "https://t.me/forgenet",
    avatarPath: "https://github.com/F0rgenet.png",
    isInactive: false,
    tags: [TAGS.template, TAGS.website, TAGS.docs],
  },
  {
    name: "benzlokzik",
    role: "Разработчик",
    github: "https://github.com/benzlokzik",
    telegram: "https://t.me/anri4ok",
    avatarPath: "https://github.com/benzlokzik.png",
    tags: [TAGS.website, TAGS.infrastructure, TAGS.template],
  },
  {
    name: "imCatCatcher",
    role: "Разработчик",
    github: "https://github.com/imCatCatcher",
    telegram: "https://t.me/imcatcatcher",
    avatarPath: "https://github.com/imCatCatcher.png",
    isInactive: true,
    tags: [TAGS.template, TAGS.docs],
  }
]