import { FileText, List, PieChart, Layers, LucideIcon } from "lucide-react"

export type FeatureColor = "blue" | "purple" | "emerald" | "amber"

export interface FeatureCardData {
  id: "setup" | "abstract" | "outline" | "appendixes"
  title: string
  description: string
  code: string
  href?: string
  icon: LucideIcon
  color: FeatureColor
  colSpan: number
  codeWrapperClassName: string
}

export const featuresData: FeatureCardData[] =[
  {
    id: "setup",
    title: "Настройка в пару строк",
    description: "Задайте основные параметры, и шаблон сам соберет правильный титульный лист со всеми отступами, грифами и шрифтами.",
    code: `#import "@preview/modern-g7-32:0.2.0": gost\n\n#show: gost.with(\n  report-type: "Отчёт о НИР",\n  subject: "Разработка сервиса",\n  performers: (\n    (name: "Иванов И.И.", position: "Студент"),\n  ),\n  city: "Москва",\n)`,
    href: "/docs/reference/title",
    icon: FileText,
    color: "blue",
    colSpan: 2,
    codeWrapperClassName: "w-full md:w-3/5 lg:w-1/2",
  },
  {
    id: "abstract",
    title: "Умный реферат",
    description: "Шаблон сам посчитает страницы, иллюстрации и таблицы.",
    code: `#abstract("ГОСТ", "TYPST", "АВТОМАТИЗАЦИЯ")[\n  В данном отчёте рассматривается...\n]`,
    href: "/docs/reference/abstract",
    icon: PieChart,
    color: "purple",
    colSpan: 1,
    codeWrapperClassName: "w-full mb-8",
  },
  {
    id: "outline",
    title: "Автосодержание",
    description: "Идеальные отточия и уровни заголовков без ручных правок.",
    code: `#outline()\n\n= Введение\n= Проектирование сервиса\n== Выбор архитектуры`,
    href: "/docs/reference/outline",
    icon: List,
    color: "emerald",
    colSpan: 1,
    codeWrapperClassName: "w-full mb-4",
  },
  {
    id: "appendixes",
    title: "Приложения",
    description: "Нумерация кириллицей с пропуском запрещенных литер, независимые счетчики для рисунков и автоматическое попадание в оглавление.",
    code: `#show: appendixes\n\n= Листинги кода\n#figure(\n  \`\`\`python\n  print("Hello, GOST!")\n  \`\`\`,\n  caption: [Скрипт инициализации]\n)`,
    href: "/docs/reference/appendixes",
    icon: Layers,
    color: "amber",
    colSpan: 2,
    codeWrapperClassName: "w-full md:w-3/5 lg:w-1/2",
  }
]