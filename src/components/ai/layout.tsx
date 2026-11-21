'use client';

import { type ReactNode, useEffect } from 'react';
import { DocsLayout as BaseDocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import { AIChat, AIChatPanel, useAIChat } from './search';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function DocsLayoutWithAI(props: DocsLayoutProps & { children: ReactNode }) {
  return (
    <AIChat>
      <ChatLayout {...props} />
    </AIChat>
  );
}

function ChatLayout({ children, ...props }: DocsLayoutProps & { children: ReactNode }) {
  const { open, setOpen } = useAIChat();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  return (
    <BaseDocsLayout {...props}>
      {children}

      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(true)}
            title="Спросить ИИ"
            className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-xl shadow-blue-500/25 border border-blue-400/30 transition-colors hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Sparkles className="size-4" />
            <span>Спросить ИИ</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Окно чата в правом нижнем углу */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs sm:hidden z-50 pointer-events-auto"
            />

            <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-[440px] md:w-[480px] h-[78vh] sm:h-[600px] max-h-[calc(100vh-3rem)] flex flex-col bg-fd-card/95 backdrop-blur-xl border border-fd-border rounded-2xl shadow-2xl overflow-hidden"
              >
                <AIChatPanel />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </BaseDocsLayout>
  );
}