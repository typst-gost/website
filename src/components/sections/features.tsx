import { FeatureCard } from "@/components/feature-card"
import { ExternalLink } from "lucide-react"

export function FeaturesSection() {
  return (
    <section className="py-10 px-4">
      <div className="container mx-auto">
        <h2 className="text-white mt-4">Важно</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <FeatureCard
            title="Документация"
            description={
              <p>
                Документация по проекту находится в работе, пока её нет, можете обратиться в{' '}
                <a
                  href="https://t.me/f0rgenet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-white hover:text-blue-400 transition-colors"
                >
                  телеграм <ExternalLink className="h-4 w-4 ml-1" />
                </a>{' '}, я отвечу на любые ваши вопросы<br/>
                Также вы можете ознакомиться с примерами документов в{' '}
                <a
                  href="https://github.com/typst-g7-32/modern-g7-32/tree/main/tests/documents"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-white hover:text-blue-400 transition-colors"
                >
                  репозитории <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </p>
            }
          />
        <FeatureCard
          title="Поддержка проекта"
          description={
            <p>
              Если вы хотите поддержать разработку проекта, вы можете:<br/>
              <b>1.</b> Поставить звезду на странице проекта в GitHub<br/>
              <b>2.</b> Давать обратную связь по проекту, используя способы в секции «Контакты»
            </p>
          }
        /> 
        </div>
        <h2 className="text-white mt-4">Главное</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="Автоматизация оформления"
            description="Шаблон автоматизирует нумерацию всех элементов отчёта, мы стараемся автоматизировать всё, что возможно автоматизировать в рамках оформления отчётов по ГОСТ"
          /> 
          <FeatureCard
            title="Преимущества Typst"
            description="Мгновенный предпросмотр, коллаборация, контроль версий, большое количество пользовательских библиотек и многое другое становится доступным в рамках оформления отчёта с использованием modern-g7-32"
          />
          <FeatureCard
            title="Интуитивное использование"
            description="Были приложены все усилия для того, чтобы использование шаблона было максимально простым и удобным"
          />
        </div>
      </div>
    </section>
  )
}