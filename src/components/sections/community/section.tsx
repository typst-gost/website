"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  MessageCircle,
  QrCode,
  Users,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { QRCodeImage } from "@/components/utils/qr-generator";
import { Heading } from "@/components/ui/heading";
import { cn } from "@/lib/utils";

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (isInView && displayValue === 0 && value > 0) {
      let start = 0;
      const duration = 1500;
      const startTime = Date.now();
      const animate = () => {
        const progress = Math.min((Date.now() - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.floor(start + (value - start) * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };
      animate();
    }
  }, [isInView, value, displayValue]);

  useEffect(() => {
    if (prevValueRef.current !== value && displayValue > 0) {
      const start = displayValue;
      const duration = 1000;
      const startTime = Date.now();
      const animate = () => {
        const progress = Math.min((Date.now() - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.floor(start + (value - start) * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };
      animate();
    }
    prevValueRef.current = value;
  }, [value, displayValue]);

  return <span ref={ref}>{displayValue}</span>;
}

export default function CommunitySection() {
  const [activeTab, setActiveTab] = useState<"stats" | "qr">("stats");
  const [members, setMembers] = useState<number>(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const telegramLink = "https://t.me/typst_gost";

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/telegram-members?chatId=@typst_gost");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (typeof data.result === "number") {
        setMembers((prev) => {
          if (prev > 0 && data.result > prev) {
            setIsCelebrating(true);
            setTimeout(() => setIsCelebrating(false), 3000);
          }
          return data.result;
        });
      }
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div>
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <div className="flex flex-col max-w-xl text-left">
          <Heading
            as="h2"
            title="Сообщество Typst Gost"
            className="mb-6 lg:mb-8 text-left"
          />
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            Присоединяйтесь к нашему уютному сообществу в Telegram. Здесь мы
            обсуждаем типографику, делимся готовыми шаблонами титульных листов
            ваших ВУЗов и просто оперативно помогаем новичкам разобраться с
            ошибками.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-[0_0_40px_-10px_#2AABEE] hover:shadow-[0_0_60px_-15px_#2AABEE] hover:-translate-y-1 w-full sm:w-auto"
            >
              <MessageCircle className="w-6 h-6 fill-white/20" />
              <span>Перейти в Telegram</span>
              <ExternalLink className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </a>
            <div className="lg:hidden flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium text-white">
                {isLoading ? "--" : <AnimatedNumber value={members} />}
              </span>
              <span>участников</span>
            </div>
          </div>
        </div>
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-2 backdrop-blur-md">
            <div className="flex bg-white/5 rounded-2xl p-1 mb-4">
              <button
                onClick={() => setActiveTab("stats")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                  activeTab === "stats"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                <Users className="w-4 h-4" />
                Статистика
              </button>
              <button
                onClick={() => setActiveTab("qr")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                  activeTab === "qr"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                <QrCode className="w-4 h-4" />
                QR-код
              </button>
            </div>
            <div className="relative overflow-hidden bg-white/5 border border-white/5 rounded-2xl aspect-square flex items-center justify-center">
              <AnimatePresence mode="wait">
                {activeTab === "stats" && (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center text-center p-8 w-full"
                  >
                    <motion.div
                      animate={
                        isCelebrating
                          ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }
                          : {}
                      }
                      className="relative"
                    >
                      <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-500/10">
                        <Users className="w-10 h-10 text-blue-400" />
                      </div>
                      <AnimatePresence>
                        {isCelebrating && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0 }}
                            animate={{ opacity: 1, y: -20, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute -top-2 -right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" /> +1
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <div className="text-5xl font-bold text-white mb-2 tabular-nums tracking-tight">
                      {isLoading ? (
                        <span className="opacity-50">--</span>
                      ) : (
                        <AnimatedNumber value={members} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 font-medium">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                      Человек в чате
                    </div>
                  </motion.div>
                )}
                {activeTab === "qr" && (
                  <motion.div
                    key="qr"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center p-8 w-full"
                  >
                    <div className="bg-white p-4 rounded-2xl shadow-xl mb-6">
                      <QRCodeImage data={telegramLink} size={200} />
                    </div>
                    <p className="text-gray-400 text-sm text-center max-w-50">
                      Отсканируйте камерой телефона
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
