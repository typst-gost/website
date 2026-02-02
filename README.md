# Typst Gost Website

<a href="https://github.com/typst-gost/website/blob/main/LICENSE"><img src="https://img.shields.io/github/license/typst-gost/website" alt="License badge"></a>
<a href="https://github.com/typst-gost/website/actions"><img src="https://github.com/typst-gost/website/actions/workflows/deploy.yml/badge.svg" alt="Deploy badge"></a>
<a href="https://typst-gost.ru"><img src="https://img.shields.io/website?url=https%3A%2F%2Ftypst-gost.ru" alt="Website badge"></a>

Официальный сайт проекта Typst Gost - экосистемы шаблонов для оформления документов в соответствии с ГОСТ.

![Демонстрация лендинга](assets/preview.png)

Проект создан на базе [Next.js](https://nextjs.org) с использованием [Fumadocs](https://fumadocs.dev/) для генерации документации.

## Быстрый старт

### Установка Bun

Проект использует [Bun](https://bun.sh) как пакетный менеджер и runtime. Установите Bun одним из способов:

#### Linux/macOS
```bash
curl -fsSL https://bun.sh/install | bash
```

#### Windows (PowerShell)
```powershell
irm bun.sh/install.ps1 | iex
```

#### Через npm
```bash
npm install -g bun
```

### Запуск проекта

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/typst-gost/website.git
   cd website
   ```

2. **Установите зависимости:**
   ```bash
   bun install
   ```

3. **Запустите сервер разработки:**
   ```bash
   bun run dev
   ```

4. Откройте [http://localhost:3000](http://localhost:3000) в браузере

### Доступные команды

```bash
bun run dev          # Запуск сервера разработки
bun run build        # Сборка проекта для продакшена
bun run start        # Запуск production сервера
bun run lint         # Проверка кода линтером
```

## Технологии

- **[Next.js](https://nextjs.org)** - React фреймворк для веб-приложений
- **[Nextra](https://nextra.site/)** - статический генератор сайтов на базе Next.js
- **[Tailwind CSS](https://tailwindcss.com)** - CSS фреймворк
- **[TypeScript](https://www.typescriptlang.org)** - типизированный JavaScript
- **[Bun](https://bun.sh)** - быстрый пакетный менеджер и runtime

## Документация

- **[Next.js документация](https://nextjs.org/docs)**
- **[Nextra документация](https://nextra.site/docs)**
- **[Tailwind CSS документация](https://tailwindcss.com/docs)**
- **[Bun документация](https://bun.sh/docs)**

## Обновление версии Typst

При выходе новой версии Typst необходимо обновить версии в двух местах:
1. **WASM файлы компилятора и рендерера:**
```
public/wasm/typst_ts_renderer_bg.wasm
public/wasm/typst_ts_web_compiler_bg.wasm
```
Заменить файлы для использования новой версии

2. **Зависимости в** `package.json`:
```json
{
   "dependencies": {
      "@myriaddreamin/typst-ts-node-compiler": "^0.7.0-rc2",
      "@myriaddreamin/typst.ts": "^0.7.0-rc2"
   }
}
```

3. **Установите обновленные зависимости:**
```bash
bun install
```

## Лицензия

Проект распространяется под лицензией GPL-3.0. См. файл [LICENSE](LICENSE) для подробностей.

## Связь

- **Сайт:** [typst-gost.ru](https://typst-gost.ru)
- **Репозиторий:** [github.com/typst-gost/website](https://github.com/typst-gost/website)
- **Issues:** [github.com/typst-gost/website/issues](https://github.com/typst-gost/website/issues)
