import { twMerge } from 'tailwind-merge';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  isHero?: boolean;
}

export const Section = ({ children, className, isHero = false }: SectionProps) => {
  return (
    <section
      className={twMerge(
        className,
        'px-4 container mx-auto max-w-8xl',
        isHero ? 'pt-24 sm:pt-32 md:pt-40 pb-12' : 'py-8 md:py-12',
      )}
    >
      {children}
    </section>
  );
};