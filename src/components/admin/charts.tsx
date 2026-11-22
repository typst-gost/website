'use client';

import { useMemo, useState } from 'react';
import {
  CHANNEL_META,
  type AnalyticsData,
  type ChannelName,
  type ConversationSummary,
} from '@/lib/admin/types';
import { cn } from '@/lib/utils';

interface ActivityChartProps {
  conversations: ConversationSummary[];
  days?: number;
}

interface DayBucket {
  dateKey: string;
  label: string;
  conversations: number;
  messages: number;
}

export function ActivityChart({ conversations, days = 14 }: ActivityChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const buckets = useMemo<DayBucket[]>(() => {
    const now = new Date();
    const map = new Map<string, DayBucket>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
      });
      map.set(dateKey, { dateKey, label, conversations: 0, messages: 0 });
    }

    for (const conv of conversations) {
      const ts = conv.updated_at || conv.created_at;
      if (!ts) continue;
      const key = ts.slice(0, 10);
      const bucket = map.get(key);
      if (bucket) {
        bucket.conversations += 1;
        bucket.messages += conv.message_count || 0;
      }
    }

    return Array.from(map.values());
  }, [conversations, days]);

  const maxMessages = Math.max(
    1,
    ...buckets.map((b) => Math.max(b.messages, b.conversations)),
  );

  const width = 680;
  const height = 210;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 28;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const points = buckets.map((b, idx) => {
    const x =
      padLeft + (buckets.length > 1 ? (idx / (buckets.length - 1)) * innerW : innerW / 2);
    const yMsg = padTop + innerH - (b.messages / maxMessages) * innerH;
    const yConv = padTop + innerH - (b.conversations / maxMessages) * innerH;
    return { ...b, x, yMsg, yConv };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yMsg.toFixed(1)}`)
    .join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : '';

  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">
            Активность за последние {days} дней
          </h3>
          <p className="text-xs text-gray-400">
            Сообщений и обновлённых диалогов по датам (из выборки до 200 последних)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Сообщения
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            Диалоги
          </span>
        </div>
      </div>

      <div className="relative w-full">
        {hovered && (
          <div className="absolute top-1 right-2 z-10 rounded-xl border border-gray-700/70 bg-gray-950/90 px-3 py-1.5 text-xs shadow-lg pointer-events-none">
            <div className="font-semibold text-white mb-0.5">{hovered.label}</div>
            <div className="text-blue-300 tabular-nums">
              Сообщений: {hovered.messages}
            </div>
            <div className="text-purple-300 tabular-nums">
              Диалогов: {hovered.conversations}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-52 overflow-visible select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="adminActivityArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padTop + innerH * (1 - ratio);
            const val = Math.round(maxMessages * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="rgba(148,163,184,0.12)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-gray-500 text-[10px] font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#adminActivityArea)" />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {points.map((p, idx) => {
            const barWidth = Math.max(8, innerW / buckets.length - 8);
            const convHeight = (p.conversations / maxMessages) * innerH;
            const isActive = hoveredIdx === idx;
            return (
              <g
                key={p.dateKey}
                onMouseEnter={() => setHoveredIdx(idx)}
                className="cursor-pointer"
              >
                <rect
                  x={p.x - barWidth / 2}
                  y={padTop}
                  width={barWidth}
                  height={innerH}
                  fill={isActive ? 'rgba(59,130,246,0.08)' : 'transparent'}
                  rx="4"
                />
                {p.conversations > 0 && (
                  <rect
                    x={p.x - Math.min(10, barWidth / 2)}
                    y={padTop + innerH - convHeight}
                    width={Math.min(20, barWidth)}
                    height={Math.max(2, convHeight)}
                    rx="3"
                    fill="rgba(168,85,247,0.45)"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.yMsg}
                  r={isActive ? 5 : 3}
                  fill={isActive ? '#60a5fa' : '#3b82f6'}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
                {(idx % 2 === 0 || idx === points.length - 1) && (
                  <text
                    x={p.x}
                    y={height - 6}
                    textAnchor="middle"
                    className="fill-gray-500 text-[10px] font-mono"
                  >
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function ChannelBreakdownChart({ analytics }: { analytics: AnalyticsData | null }) {
  const entries = useMemo(() => {
    const raw = analytics?.by_channel ?? {};
    const total = Object.values(raw).reduce((acc, v) => acc + v, 0);
    const orderedKeys: ChannelName[] = [
      'website',
      'telegram_private',
      'telegram_group',
      'telegram_fix',
      'external',
    ];

    return orderedKeys.map((key) => {
      const count = raw[key] ?? 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      return {
        key,
        meta: CHANNEL_META[key],
        count,
        pct,
      };
    });
  }, [analytics]);

  const totalTurns = entries.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Нагрузка по каналам</h3>
            <p className="text-xs text-gray-400">
              Распределение обработанных обращений
            </p>
          </div>
          <span className="text-sm font-mono font-semibold text-blue-300 tabular-nums">
            {totalTurns} всего
          </span>
        </div>

        <div className="h-3 w-full rounded-full bg-gray-800/80 overflow-hidden flex mb-5 border border-gray-700/40">
          {totalTurns > 0 ? (
            entries
              .filter((e) => e.count > 0)
              .map((entry) => (
                <div
                  key={entry.key}
                  style={{
                    width: `${entry.pct}%`,
                    backgroundColor: entry.meta.hex,
                  }}
                  title={`${entry.meta.label}: ${entry.count} (${entry.pct.toFixed(1)}%)`}
                  className="h-full transition-all duration-500"
                />
              ))
          ) : (
            <div className="w-full h-full bg-gray-800" />
          )}
        </div>

        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.meta.hex }}
                  />
                  <span>{entry.meta.label}</span>
                </div>
                <div className="font-mono text-gray-400 tabular-nums">
                  <span className="text-white font-semibold">{entry.count}</span>{' '}
                  <span className="text-gray-500">({entry.pct.toFixed(0)}%)</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-800/70 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${entry.pct}%`,
                    backgroundColor: entry.meta.hex,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ArcSegment {
  label: string;
  count: number;
  color: string;
  dashArray: string;
  dashOffset: number;
  endOffset: number;
}

export function OutcomesDonutChart({ analytics }: { analytics: AnalyticsData | null }) {
  const stats = useMemo(() => {
    const total = analytics?.total_turns ?? 0;
    const blocked = analytics?.guard_blocked_count ?? 0;
    const noDocs = analytics?.no_docs_count ?? 0;
    const ok = Math.max(0, total - blocked - noDocs);

    const segments = [
      { label: 'Успешные ответы', count: ok, color: '#10b981' },
      { label: 'Нет в базе знаний', count: noDocs, color: '#f59e0b' },
      { label: 'Отклонено фильтром', count: blocked, color: '#ef4444' },
    ];

    return { total, segments };
  }, [analytics]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const arcSegments = useMemo<ArcSegment[]>(() => {
    return stats.segments.reduce<ArcSegment[]>((acc, seg) => {
      const prevOffset = acc.length > 0 ? acc[acc.length - 1].endOffset : 0;
      const length = stats.total > 0 ? (seg.count / stats.total) * circumference : 0;
      return [
        ...acc,
        {
          ...seg,
          dashArray: `${length} ${circumference}`,
          dashOffset: -prevOffset,
          endOffset: prevOffset + length,
        },
      ];
    }, []);
  }, [stats, circumference]);

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">Результаты обработки</h3>
        <p className="text-xs text-gray-400">
          Соотношение выданных ответов и срабатываний правил
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="rgba(51,65,85,0.45)"
              strokeWidth="16"
            />
            {stats.total > 0 &&
              arcSegments.map((seg) => (
                <circle
                  key={seg.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="16"
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.dashOffset}
                  strokeLinecap="butt"
                />
              ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-white tabular-nums">
              {stats.total}
            </span>
            <span className="text-[11px] text-gray-400">запросов</span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-3">
          {stats.segments.map((seg) => {
            const pct = stats.total > 0 ? (seg.count / stats.total) * 100 : 0;
            return (
              <div
                key={seg.label}
                className="flex items-center justify-between gap-2 rounded-xl bg-gray-950/50 border border-gray-800/70 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span>{seg.label}</span>
                </div>
                <div className="text-xs font-mono tabular-nums">
                  <span className="text-white font-semibold">{seg.count}</span>{' '}
                  <span className="text-gray-500">({pct.toFixed(0)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TokensBreakdownCard({ analytics }: { analytics: AnalyticsData | null }) {
  const prompt = analytics?.tokens.prompt_tokens ?? 0;
  const completion = analytics?.tokens.completion_tokens ?? 0;
  const total = Math.max(1, prompt + completion);
  const promptPct = (prompt / total) * 100;
  const completionPct = (completion / total) * 100;
  const turns = analytics?.total_turns ?? 0;
  const avgTokens = turns > 0 ? Math.round((analytics?.tokens.total_tokens ?? 0) / turns) : 0;

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Расход токенов и ресурса</h3>
            <p className="text-xs text-gray-400">
              Соотношение входящего контекста и генерации
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-300 tabular-nums">
            ~{avgTokens.toLocaleString('ru-RU')} ток/ответ
          </span>
        </div>

        <div className="h-4 w-full rounded-full bg-gray-800/80 overflow-hidden flex border border-gray-700/40 mb-4">
          <div
            style={{ width: `${promptPct}%` }}
            className={cn('h-full bg-blue-500 transition-all duration-500')}
            title={`Входящие (Prompt): ${prompt.toLocaleString('ru-RU')}`}
          />
          <div
            style={{ width: `${completionPct}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
            title={`Исходящие (Completion): ${completion.toLocaleString('ru-RU')}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-gray-950/50 border border-gray-800/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Входящие (Prompt)
            </div>
            <div className="text-lg font-bold text-white font-mono tabular-nums">
              {prompt.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-gray-500 font-mono">
              {promptPct.toFixed(1)}% от объёма
            </div>
          </div>

          <div className="rounded-xl bg-gray-950/50 border border-gray-800/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Исходящие (Output)
            </div>
            <div className="text-lg font-bold text-white font-mono tabular-nums">
              {completion.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-gray-500 font-mono">
              {completionPct.toFixed(1)}% от объёма
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-800/70 text-xs">
        <span className="text-gray-400">Оценочная стоимость за период</span>
        <span className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
          {(analytics?.tokens.estimated_cost ?? 0).toFixed(4)} ₽
        </span>
      </div>
    </div>
  );
}