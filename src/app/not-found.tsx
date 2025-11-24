'use client';

import { usePathname } from 'next/navigation';

import { NotFoundPage } from "@/components/404/not-found-page"
import { Construction404Page } from "@/components/404/construction-page"

export default function NotFound() {
  const pathname = usePathname();

  if (pathname.startsWith('/docs')) {
     return <Construction404Page section="docs" />;
  }

  if (pathname.startsWith('/examples')) {
     return <Construction404Page section="examples" />;
  }

  return <NotFoundPage />;
}