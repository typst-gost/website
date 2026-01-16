import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export function baseOptions(): BaseLayoutProps {
  return {
    themeSwitch: {
      enabled: false,
    },
    nav: {
      title: 
      <>
        <Image 
            src="/logo.svg" 
            alt="Typst GOST" 
            width={12} 
            height={12} 
            className="w-7 h-7"
          />
        <span className="font-medium">Typst Gost</span>
      </>
    },
  };
}