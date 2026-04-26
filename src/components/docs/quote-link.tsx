"use client";

import * as HoverCard from "@radix-ui/react-hover-card";
import { useQuotes } from "@/contexts/quote-context";
import { useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Markdown from "markdown-to-jsx";

interface QuoteLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  href: string;
  children?: React.ReactNode;
}

function CustomLink({ href, children, ...props }: QuoteLinkProps) {
  const { getQuote } = useQuotes();
  if (href?.startsWith("#")) {
    const quoteId = href.slice(1).split(",")[0];
    const quote = getQuote(quoteId);
    if (quote) {
      href = `${quote.pagePath}#${quoteId}`;
    }
  }
  return (
    <a
      {...props}
      href={href}
      className={props.className || "text-primary hover:underline"}
    >
      {children}
    </a>
  );
}

export function QuoteLink({ href, children, ...props }: QuoteLinkProps) {
  const { getQuote } = useQuotes();
  const router = useRouter();
  const pathname = usePathname();
  const [boundary, setBoundary] = useState<Element | null>(null);

  const quoteIds = useMemo(() => {
    const rawId = href.startsWith("#") ? href.slice(1) : href;
    return rawId
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }, [href]);

  const quotes = useMemo(() => {
    return quoteIds
      .map((id) => getQuote(id))
      .filter(
        (quote): quote is NonNullable<typeof quote> =>
          quote !== null && quote !== undefined,
      );
  }, [quoteIds, getQuote]);

  const actualHref = useMemo(() => {
    if (quotes.length === 0) return href;
    const firstQuote = quotes[0];
    return `${firstQuote.pagePath}#${quoteIds[0]}`;
  }, [quotes, quoteIds, href]);

  const linkRef = useCallback((node: HTMLAnchorElement | null) => {
    if (node) {
      const container = node.closest("article");
      if (container) {
        setBoundary(container);
      }
    }
  },[]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      if (quoteIds.length > 0) {
        e.preventDefault();
        const firstId = quoteIds[0];
        const quote = getQuote(firstId);

        if (quote) {
          if (quote.pagePath !== pathname) {
            router.push(`${quote.pagePath}#${firstId}`);
          } else {
            let decodedId = firstId;
            try {
              decodedId = decodeURIComponent(firstId);
            } catch {
              // Ignore malformed URI component
            }

            const element =
              document.getElementById(decodedId) ||
              document.getElementById(firstId);

            if (element) {
              element.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              window.history.pushState(null, "", `#${firstId}`);
            }
          }
        }
      }
    },
    [quoteIds, getQuote, router, pathname],
  );

  const handleRegularClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const targetId = href.startsWith("#") ? href.slice(1) : "";
      if (!targetId) return;

      let decodedId = targetId;
      try {
        decodedId = decodeURIComponent(targetId);
      } catch {
        // Ignore malformed URI component
      }

      const element =
        document.getElementById(decodedId) || document.getElementById(targetId);

      if (element) {
        e.preventDefault();
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        window.history.pushState(null, "", href);
      }
    },
    [href],
  );

  if (quotes.length === 0) {
    return (
      <a
        {...props}
        ref={linkRef}
        href={href}
        onClick={(e) => {
          handleRegularClick(e);
          props.onClick?.(e);
        }}
        className={props.className || "text-primary hover:underline"}
      >
        {children}
      </a>
    );
  }

  return (
    <HoverCard.Root openDelay={300} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <a
          {...props}
          ref={linkRef}
          href={actualHref}
          onClick={(e) => {
            handleClick(e);
            props.onClick?.(e);
          }}
          className={
            props.className || "text-primary hover:underline cursor-pointer"
          }
        >
          {children}
        </a>
      </HoverCard.Trigger>

      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          align="start"
          sideOffset={5}
          alignOffset={-10}
          collisionBoundary={boundary}
          collisionPadding={20}
          avoidCollisions={true}
          className="z-50 max-w-200 rounded-lg border border-border p-4 bg-indigo-900/10 backdrop-filter backdrop-blur-xl shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-fd-background) 45%, transparent)",
          }}
        >
          <div className="space-y-3">
            {quotes.map((quote, index) => (
              <div
                key={index}
                className={index > 0 ? "pt-3 border-t border-border/50" : ""}
              >
                <div className="text-sm prose text-foreground/85 italic leading-relaxed">
                  <Markdown
                    options={{
                      overrides: {
                        a: { component: CustomLink },
                      },
                    }}
                  >
                    {quote.text}
                  </Markdown>
                </div>
                <footer className="text-xs text-muted-foreground flex items-center justify-between pt-2">
                  <a
                    href="/documents/gost-7.32-2017.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/60 font-semibold hover:text-primary hover:underline transition-colors"
                  >
                    ГОСТ 7.32-2017
                  </a>
                  <span>страница {quote.page}</span>
                </footer>
              </div>
            ))}
          </div>
          <HoverCard.Arrow style={{ fill: "var(--color-fd-border)" }} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}