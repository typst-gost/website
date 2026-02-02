'use client';

import { cn } from '../../../lib/cn';
import { buttonVariants } from './button';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { type SyntheticEvent, useEffect, useState, useTransition, useCallback } from 'react';
import {
  Collapsible,
  CollapsibleContent,
} from 'fumadocs-ui/components/ui/collapsible';
import { cva } from 'class-variance-authority';
import { usePathname } from 'next/navigation';

const rateButtonVariants = cva(
  'inline-flex items-center gap-2 px-3 py-2 rounded-full font-medium border text-sm [&_svg]:size-4 disabled:cursor-not-allowed cursor-pointer',
  {
    variants: {
      active: {
        true: 'text-fd-primary [&_svg]:fill-current',
        false: 'text-fd-muted-foreground',
      },
    },
  },
);

export interface Feedback {
  opinion: 'good' | 'bad';
  url?: string;
  message: string;
}

export interface ActionResponse {
  githubUrl: string;
}

interface Result extends Feedback {
  response?: ActionResponse;
}

export function Feedback({
  onRateAction,
}: {
  onRateAction: (url: string, feedback: Feedback) => Promise<ActionResponse>;
}) {
  const url = usePathname();
  const [previous, setPrevious] = useState<Result | null>(() => {
    try {
      const item = localStorage.getItem(`docs-feedback-${url}`);
      return item ? (JSON.parse(item) as Result) : null;
    } catch {
      return null;
    }
  });
  const [opinion, setOpinion] = useState<'good' | 'bad' | null>(null);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const saveToStorage = useCallback(() => {
    const key = `docs-feedback-${url}`;
    try {
      if (previous) {
        localStorage.setItem(key, JSON.stringify(previous));
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  }, [previous, url]);

  useEffect(() => {
    saveToStorage();
  }, [saveToStorage]);

  const submit = useCallback((e?: SyntheticEvent) => {
    if (opinion == null) return;

    startTransition(async () => {
      const feedback: Feedback = {
        opinion,
        url,
        message,
      };

      try {
        const response = await onRateAction(url, feedback);
        setPrevious({
          response,
          ...feedback,
        });
        setMessage('');
        setOpinion(null);
      } catch (error) {
        console.error('Ошибка отправки отзыва:', error);
      }
    });

    e?.preventDefault();
  }, [opinion, message, url, onRateAction]);

  const activeOpinion = previous?.opinion ?? opinion;
  const isSubmitted = previous !== null;

  const resetFeedback = () => {
    setPrevious(null);
    setOpinion(null);
    setMessage('');
  };

  const openBadFeedback = () => {
    if (opinion === 'bad') {
      setOpinion(null);
    } else {
      setOpinion('bad');
    }
  };

  const openGoodFeedback = () => {
    if (opinion === 'good') {
      setOpinion(null);
    } else {
      setOpinion('good');
    }
  };

  return (
    <Collapsible
      open={opinion !== null || previous !== null}
      onOpenChange={(open) => {
        if (!open) {
          setOpinion(null);
        }
      }}
      className="border-y py-3"
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium pe-2">
          Поделитесь своим мнением об этой странице
        </p>
        <button
          type="button"
          disabled={isSubmitted}
          className={cn(
            rateButtonVariants({
              active: activeOpinion === 'good',
            }),
          )}
          onClick={openGoodFeedback}
          aria-label="Мне понравилось"
        >
          <ThumbsUp />
          Мне понравилось
        </button>
        <button
          type="button"
          disabled={isSubmitted}
          className={cn(
            rateButtonVariants({
              active: activeOpinion === 'bad',
            }),
          )}
          onClick={openBadFeedback}
          aria-label="Так себе"
        >
          <ThumbsDown />
          Так себе
        </button>
      </div>
      <CollapsibleContent className="mt-3 space-y-3">
        {isSubmitted ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-fd-card p-6 text-center text-fd-foreground">
            <p className="text-md">Спасибо за отзыв!</p>
            <div className="flex flex-row items-center gap-2">
              {previous?.response?.githubUrl && (
                <a
                  href={previous.response.githubUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                  className={cn(
                    buttonVariants({
                      variant: 'outline',
                    }),
                    'text-xs',
                  )}
                >
                  Посмотреть в GitHub
                </a>
              )}
              <button
                type="button"
                className={cn(
                  buttonVariants({
                    color: 'secondary',
                  }),
                  'text-xs',
                )}
                onClick={resetFeedback}
              >
                Отправить ещё раз
              </button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <textarea
              autoFocus
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-20 resize-none rounded-lg border bg-fd-card p-3 text-fd-secondary-foreground placeholder:text-fd-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary focus-visible:ring-offset-2"
              placeholder="Оставьте ваш отзыв..."
              disabled={isPending}
              onKeyDown={(e) => {
                if (!e.shiftKey && e.key === 'Enter') {
                  submit(e);
                }
              }}
              aria-label="Ваш отзыв"
            />
            <button
              type="submit"
              className={cn(
                buttonVariants({ color: 'outline' }),
                'w-fit px-3',
                isPending && 'cursor-not-allowed opacity-50',
              )}
              disabled={isPending || !opinion}
            >
              {isPending ? 'Отправляется...' : 'Отправить'}
            </button>
          </form>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
