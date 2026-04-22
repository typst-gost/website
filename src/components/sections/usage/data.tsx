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

export interface GuideStep {
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

export const tableColumns =[
  "Инструмент",
  "Офлайн работа",
  "Совместная работа",
  "Поддержка Git",
  "Автодополнение",
  "Установка"
]

export const comparisonData =[
  {
    tool: "Typst Web App",
    icon: <Cloud className="w-5 h-5 text-blue-400" />,
    offline: { exists: false, text: "Нет" },
    collab: { exists: true, text: "В реальном времени" },
    git: { exists: false, text: "Только экспорт" },
    intellisense: { exists: false, text: "Базовое" },
    setup: { exists: true, text: "Не требуется" }
  },
  {
    tool: "VS Code + Tinymist",
    icon: <Laptop className="w-5 h-5 text-purple-400" />,
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
      title: "Установка окружения",
      description: "Установите редактор VS Code и скачайте расширение Tinymist. Оно даёт мощное автодополнение, проверку ошибок и мгновенный предпросмотр.",
      icon: <Code2 className="w-5 h-5" />,
      color: "text-blue-400"
    },
    {
      title: "Загрузка проекта",
      description: "Скачайте архив с шаблоном modern-g7-32 из репозитория GitHub или склонируйте его с помощью Git. Распакуйте в удобную рабочую директорию.",
      icon: <Download className="w-5 h-5" />,
      color: "text-purple-400"
    },
    {
      title: "Редактирование",
      description: "Откройте папку в VS Code. Главный файл проекта — main.typ. Вы можете использовать кнопку Tinymist Preview (в правом верхнем углу) для панели просмотра.",
      icon: <Play className="w-5 h-5" />,
      color: "text-green-400"
    },
    {
      title: "Компиляция",
      description: "При каждом сохранении файла (Ctrl+S / Cmd+S), Tinymist автоматически и за миллисекунды компилирует ваш документ в финальный PDF-файл.",
      icon: <FileCheck2 className="w-5 h-5" />,
      color: "text-amber-400"
    }
  ],
  typst:[
    {
      title: "Создание проекта",
      description: "Перейдите на сайт typst.app, авторизуйтесь и нажмите «Start from template», чтобы создать новый проект на основе шаблона.",
      icon: <PlusCircle className="w-5 h-5" />,
      color: "text-blue-400"
    },
    {
      title: "Поиск шаблона",
      description: "В поиске Typst Universe введите «modern-g7-32» и выберите его. Веб-приложение мгновенно развернёт всю нужную структуру документа.",
      icon: <Search className="w-5 h-5" />,
      color: "text-purple-400"
    },
    {
      title: "Работа в браузере",
      description: "Пишите код в левой панели браузера, а справа сразу же наблюдайте за результатом. Не нужно ничего устанавливать на свой компьютер.",
      icon: <Edit3 className="w-5 h-5" />,
      color: "text-green-400"
    },
    {
      title: "Экспорт в PDF",
      description: "Когда документ готов, нажмите кнопку скачивания в правом верхнем углу интерфейса, чтобы получить идеально оформленный PDF-файл.",
      icon: <DownloadCloud className="w-5 h-5" />,
      color: "text-amber-400"
    }
  ]
}