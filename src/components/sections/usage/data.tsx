import { 
  Cloud, 
  Laptop, 
  Download, 
  Code2, 
  Play, 
  FileCheck2,
  PlusCircle,
  Search,
  Edit3,
  DownloadCloud
} from "lucide-react"

export type ToolType = "tinymist" | "typst"

export const toolsMeta: Record<ToolType, { name: string; Icon: React.ElementType; color: string; url: string }> = {
  // TODO: Такое уже есть, найти и обновить
  typst: {
    name: "Typst Web App",
    Icon: Cloud,
    color: "text-blue-400",
    url: "https://typst.app"
  },
  tinymist: {
    name: "VS Code + Tinymist",
    Icon: Laptop,
    color: "text-purple-400",
    url: "https://marketplace.visualstudio.com/items?itemName=myriad-dreamin.tinymist"
  }
}

export interface GuideStep {
  title: string
  description: string
  icon: React.ReactNode
  color: string
  href?: string
}

export const tableColumns =[
  "Инструмент",
  "Офлайн работа",
  "Совместная работа",
  "Поддержка Git",
  "Автодополнение",
  "Установка"
]

const TypstIcon = toolsMeta.typst.Icon
const TinymistIcon = toolsMeta.tinymist.Icon

export const comparisonData =[
  {
    tool: toolsMeta.typst.name,
    url: toolsMeta.typst.url,
    icon: <TypstIcon className={`w-5 h-5 ${toolsMeta.typst.color}`} />,
    offline: { exists: false, text: "Нет" },
    collab: { exists: true, text: "В реальном времени" },
    git: { exists: false, text: "Только экспорт" },
    intellisense: { exists: false, text: "Базовое" },
    setup: { exists: true, text: "Не требуется" }
  },
  {
    tool: toolsMeta.tinymist.name,
    url: toolsMeta.tinymist.url,
    icon: <TinymistIcon className={`w-5 h-5 ${toolsMeta.tinymist.color}`} />,
    offline: { exists: true, text: "Да" },
    collab: { exists: false, text: "Через Git" },
    git: { exists: true, text: "Полная" },
    intellisense: { exists: true, text: "Продвинутое" },
    setup: { exists: false, text: "Требуется" }
  }
]

export const guides: Record<ToolType, GuideStep[]> = {
  tinymist:[
    {
      title: "Скачайте VS Code",
      description: "Для работы потребуется редактор кода Visual Studio Code. Установите его, если он ещё не установлен.",
      icon: <Laptop className="w-5 h-5" />,
      color: "text-blue-400",
      href: "https://code.visualstudio.com/download"
    },
    {
      title: "Установите Tinymist",
      description: "Установите расширение Tinymist. Оно даёт мощное автодополнение, проверку ошибок и мгновенный предпросмотр.",
      icon: <Code2 className="w-5 h-5" />,
      color: "text-purple-400",
      href: toolsMeta.tinymist.url
    },
    {
      title: "Загрузите проект",
      description: "Скачайте архив с шаблоном modern-g7-32 из репозитория GitHub или склонируйте его с помощью Git. Распакуйте в удобную рабочую директорию.",
      icon: <Download className="w-5 h-5" />,
      color: "text-indigo-400"
    },
    {
      title: "Редактируйте",
      description: "Откройте папку в VS Code. Главный файл проекта — main.typ. Вы можете использовать кнопку Tinymist Preview (в правом верхнем углу) для панели просмотра.",
      icon: <Play className="w-5 h-5" />,
      color: "text-green-400"
    },
    {
      title: "Компилируйте",
      description: "При каждом сохранении файла (Ctrl+S / Cmd+S), Tinymist автоматически и за миллисекунды компилирует ваш документ в финальный PDF-файл.",
      icon: <FileCheck2 className="w-5 h-5" />,
      color: "text-amber-400"
    }
  ],
  typst:[
    {
      title: "Создайте проект",
      description: "Перейдите на сайт typst.app, авторизуйтесь и нажмите «Start from template», чтобы создать новый проект на основе шаблона.",
      icon: <PlusCircle className="w-5 h-5" />,
      color: "text-blue-400",
      href: toolsMeta.typst.url
    },
    {
      title: "Найдите шаблон",
      description: "В поиске Typst Universe введите «modern-g7-32» и выберите его. Веб-приложение мгновенно развернёт всю нужную структуру документа.",
      icon: <Search className="w-5 h-5" />,
      color: "text-purple-400"
    },
    {
      title: "Пишите код",
      description: "Пишите код в левой панели браузера, а справа сразу же наблюдайте за результатом. Не нужно ничего устанавливать на свой компьютер.",
      icon: <Edit3 className="w-5 h-5" />,
      color: "text-green-400"
    },
    {
      title: "Экспортируйте в PDF",
      description: "Когда документ готов, нажмите кнопку скачивания в правом верхнем углу интерфейса, чтобы получить идеально оформленный PDF-файл.",
      icon: <DownloadCloud className="w-5 h-5" />,
      color: "text-amber-400"
    }
  ]
}