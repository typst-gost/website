import FeatureCard from "@/components/feature-card"
import { ExternalLink } from "lucide-react"

export default function FeaturesSection() {
  return (
    <section className="py-2 px-4">
      <div className="container mx-auto">
        <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-center md:text-left">
          Важно
        </h2>

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
                  href="https://github.com/typst-g7-32/modern-g7-32/tree/main/tests/documents"
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
                Хотите помочь развитию проекта? Вы можете:<br />
                <b>1.</b> Поставить ⭐ на странице проекта в GitHub<br />
                <b>2.</b> Делать предложения и давать обратную связь<br />
                <b>3.</b> Присоединиться к сообществу в{" "}
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

        <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-center md:text-left mt-5">
          Главное
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            title="Максимальная автоматизация"
            description="Шаблон сам форматирует, нумерует и оформляет все элементы отчёта по ГОСТ 7.32-2017. Забудьте о ручном редактировании оформления — теперь всё делается автоматически."
          />
          <FeatureCard
            title="Скорость и современность"
            description="Typst написан на Rust, поэтому он невероятно быстрый. Результат виден сразу, как только вносите изменения. Вы не потеряете свой документ, ведь он хранится в виде исходного кода."
          />
          <FeatureCard
            title="Простота Markdown + мощь LaTeX"
            description="Синтаксис Typst чистый, понятный и похож на Markdown. При этом это полноценный язык программирования с безграничными возможностями."
          />
          <FeatureCard
            title="Совместная работа в браузере"
            description="Typst предлагает коллаборацию в реальном времени, как Google Docs. Работайте над отчётом вместе с командой — прямо в браузере."
          />
          <FeatureCard
            title="Расширяемость и экосистема"
            description="Сотни шаблонов и пакетов уже доступны в Typst Universe. Добавляйте таблицы, графики, титульные листы и макросы одной строкой импорта."
          />
          <FeatureCard
            title="Открытость и контроль версий"
            description="Документы — это текстовые файлы. Храните их в Git, отслеживайте изменения и возвращайтесь к старым версиям в пару кликов."
          />
        </div>
      </div>
    </section>
  )
}
