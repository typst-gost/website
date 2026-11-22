import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Панель управления — Typst Gost',
  description: 'Служебная панель управления платформой Typst Gost',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-gray-950 text-gray-100 antialiased selection:bg-blue-500/30 selection:text-white">
      {children}
    </div>
  );
}