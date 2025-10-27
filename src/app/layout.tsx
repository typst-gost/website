import type { Metadata } from "next";
import "./globals.css";
import { Banner } from 'fumadocs-ui/components/banner';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { GoogleAnalytics } from '@next/third-parties/google'
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';

export const metadata: Metadata = {
  title: "Typst 7.32",
  description: "Шаблон для оформления документов по ГОСТ 7.32-2017",
};

const { provider } = defineI18nUI(i18n, {
  translations: {
    ru: {
      displayName: 'Русский',
      search: 'Поиск',
      searchNoResult: 'Ничего не найдено',
      toc: 'На этой странице',
      lastUpdate: 'Последнее обновление',
      chooseLanguage: 'Выбрать язык',
      chooseTheme: 'Выбрать тему',
      nextPage: "Следующая страница",
      previousPage: "Предыдущая страница",
    },
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <link rel="icon" href="/favicon.ico" />
      <body className="flex flex-col min-h-screen">
        <RootProvider
          i18n={provider("ru")}
        >
        {children}
        </RootProvider>
      </body>
      <GoogleAnalytics gaId="G-CF82SLT7VV" />
    </html>
  );
}