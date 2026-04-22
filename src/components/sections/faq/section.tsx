"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS } from "./faq";
import { Heading } from "@/components/ui/heading";
import { Section } from "@/components/ui/section";

function FaqItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  href: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-white/10 select-none">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-center justify-between gap-4 text-left group transition-all"
        aria-expanded={isOpen}
      >
        <span
          className={cn(
            "text-lg md:text-xl font-medium transition-colors duration-300",
            isOpen ? "text-blue-400" : "text-white group-hover:text-white/80",
          )}
        >
          {question}
        </span>

        <div
          className={cn(
            "shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
            isOpen
              ? "bg-blue-500/20 rotate-180"
              : "bg-white/5 group-hover:bg-white/10",
          )}
        >
          {isOpen ? (
            <Minus className="w-5 h-5 text-blue-400" />
          ) : (
            <Plus className="w-5 h-5 text-gray-400 group-hover:text-white" />
          )}
        </div>
      </button>

      <div
        className={cn(
          "grid transition-all duration-500 ease-in-out",
          isOpen
            ? "grid-rows-[1fr] opacity-100 pb-6"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden flex flex-col gap-4">
          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-2xl">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const isAnyOpen = openId !== null;

  return (
    <Section>
      <Heading as="h2" title="Часто задаваемые вопросы" />

      <div className="flex flex-col max-w-3xl">
        {FAQ_ITEMS.map((item) => (
          <FaqItem
            key={item.id}
            question={item.question}
            answer={item.answer}
            href={item.href}
            isOpen={openId === item.id}
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
          />
        ))}
      </div>
    </Section>
  );
}
