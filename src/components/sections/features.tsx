import { ExternalLink } from "lucide-react"

import FeatureCard from "@/components/feature-card"
import { Heading } from "@/components/ui/heading"

export default function FeaturesSection() {
  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <Heading as="h2" title="Важно" centered/>

        <div className="grid md:grid-cols-2 gap-8">
          <FeatureCard
            title="Документация"
            description={
              <p>
                Документация по проекту находится в разработке. Пока её нет, вы можете обратиться в{" "}
                <a
                  href="https://t.me/ne4genet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-white hover:text-blue-400 transition-colors"
                >
                  Telegram <ExternalLink className="h-4 w-4 ml-1" />
                </a>{" "}
                — я отвечу на любые ваши вопросы.<br />
                Примеры документов можно найти в{" "}
                <a
                  href="https://github.com/typst-g7-32/examples"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-white hover:text-blue-400 transition-colors"
                >
                  репозитории <ExternalLink className="h-4 w-4 ml-1" />
                </a>.
              </p>
            }
          />

          <FeatureCard
            title="Поддержка проекта"
            description={
              <p>
                <b>1.</b> Поставьте звёздочку на странице проекта в GitHub<br />
                <b>2.</b> Попробуйте шаблон и вернитесь с обратной связью<br />
                <b>3.</b> Присоединяйтесь к сообществу в{" "}
                <a
                  href="https://t.me/typst_gost"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-white hover:text-blue-400 transition-colors"
                >
                  Telegram <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </p>
            }
          />
        </div>
      </div>
    </section>
  )
}
