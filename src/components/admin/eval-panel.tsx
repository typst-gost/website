'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileJson,
  Filter,
  GitCompare,
  Layers,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  EVAL_SEARCH_MODE_META,
  type EvalChunkPreview,
  type EvalDatasetInfo,
  type EvalMetricsBlock,
  type EvalQuestionInput,
  type EvalQuestionRecord,
  type EvalRunDetail,
  type EvalRunSummary,
  type EvalSearchMode,
  type GatewaySettings,
} from '@/lib/admin/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/buttons/button';
import { LoadingSpinner } from '@/components/ui/spinner';

interface EvalPanelProps {
  docsReady: boolean;
  gatewaySettings: GatewaySettings | null;
  onUnauthorized: () => void;
}

type SliceDimension = 'by_category' | 'by_query_type' | 'by_difficulty';
type QuestionFilterMode = 'all' | 'misses' | 'not_top1' | 'context_miss';

const KS_PRESETS: { label: string; ks: number[] }[] = [
  { label: '1, 3, 5, 10', ks: [1, 3, 5, 10] },
  { label: '1, 3, 5, 10, 20', ks: [1, 3, 5, 10, 20] },
  { label: '1, 5, 10, 20, 50', ks: [1, 5, 10, 20, 50] },
];

const SAMPLE_DATASET_JSON = JSON.stringify(
  {
    questions: [
      {
        id: 'q_001',
        query: 'Как настроить титульный лист в modern-g7-32?',
        relevant_chunk_ids: ['replace_with_20char_id'],
        category: 'typst-gost',
        query_type: 'howto',
        difficulty: 'easy',
      },
    ],
  },
  null,
  2,
);

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatPct(val: number | null | undefined, digits = 1): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return `${(val * 100).toFixed(digits)}%`;
}

function formatScore(val: number | null | undefined, digits = 4): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return val.toFixed(digits);
}

function parseKsInput(raw: string): number[] {
  const nums = raw
    .split(/[\s,;]+/)
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 200);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function parseUploadedQuestions(rawText: string): EvalQuestionInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error(
      err instanceof Error ? `Невалидный JSON: ${err.message}` : 'Невалидный JSON',
    );
  }

  const rawList = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'questions' in parsed
      ? (parsed as { questions: unknown }).questions
      : null;

  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error(
      'JSON должен содержать непустой массив вопросов или объект { "questions": [...] }',
    );
  }

  return rawList.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Элемент #${idx + 1} должен быть JSON-объектом`);
    }
    const obj = item as Record<string, unknown>;
    const query = String(obj.query ?? '').trim();
    if (!query) {
      throw new Error(`Вопрос #${idx + 1} не содержит текста query`);
    }
    const rawRel = Array.isArray(obj.relevant_chunk_ids)
      ? obj.relevant_chunk_ids
      : [];
    const relIds = Array.from(
      new Set(rawRel.map((c) => String(c ?? '').trim()).filter(Boolean)),
    );
    if (relIds.length === 0) {
      throw new Error(
        `Вопрос #${idx + 1} (${String(obj.id || '?')}) имеет пустой relevant_chunk_ids`,
      );
    }

    return {
      id: String(obj.id ?? `q_${String(idx + 1).padStart(3, '0')}`).trim(),
      query,
      relevant_chunk_ids: relIds,
      category: String(obj.category ?? 'unknown').trim() || 'unknown',
      query_type: String(obj.query_type ?? 'unknown').trim() || 'unknown',
      difficulty: String(obj.difficulty ?? 'unknown').trim() || 'unknown',
    };
  });
}

function pickPrimaryK(ks: number[]): number {
  if (ks.includes(5)) return 5;
  if (ks.includes(3)) return 3;
  const gte5 = ks.find((k) => k >= 5);
  return gte5 ?? ks[ks.length - 1] ?? 1;
}

function DeltaBadge({
  current,
  baseline,
  asPercent = false,
  invertGood = false,
}: {
  current: number | null | undefined;
  baseline: number | null | undefined;
  asPercent?: boolean;
  invertGood?: boolean;
}) {
  if (
    current === null ||
    current === undefined ||
    baseline === null ||
    baseline === undefined ||
    !Number.isFinite(current) ||
    !Number.isFinite(baseline)
  ) {
    return null;
  }
  const diff = current - baseline;
  if (Math.abs(diff) < 0.0005) {
    return (
      <span className="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] font-mono text-gray-400">
        0.0
      </span>
    );
  }
  const isPositive = diff > 0;
  const isGood = invertGood ? !isPositive : isPositive;
  const formatted = asPercent
    ? `${isPositive ? '+' : ''}${(diff * 100).toFixed(1)}п.п.`
    : `${isPositive ? '+' : ''}${diff.toFixed(4)}`;

  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tabular-nums border',
        isGood
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          : 'bg-red-500/15 border-red-500/30 text-red-300',
      )}
    >
      {formatted}
    </span>
  );
}

function MetricsCurveChart({
  ks,
  overall,
  baselineOverall,
}: {
  ks: number[];
  overall: EvalMetricsBlock;
  baselineOverall: EvalMetricsBlock | null;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 640;
  const height = 220;
  const padLeft = 44;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 32;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const points = useMemo(() => {
    return ks.map((k, idx) => {
      const key = String(k);
      const x =
        padLeft + (ks.length > 1 ? (idx / (ks.length - 1)) * innerW : innerW / 2);
      const recall = overall.recall_at_k[key] ?? 0;
      const hit = overall.hit_rate_at_k[key] ?? 0;
      const mrr = overall.mrr_at_k[key] ?? 0;
      const baseRecall = baselineOverall?.recall_at_k?.[key] ?? null;

      return {
        k,
        x,
        recall,
        hit,
        mrr,
        baseRecall,
        yRecall: padTop + innerH - recall * innerH,
        yHit: padTop + innerH - hit * innerH,
        yMrr: padTop + innerH - mrr * innerH,
        yBaseRecall:
          baseRecall !== null ? padTop + innerH - baseRecall * innerH : null,
      };
    });
  }, [ks, overall, baselineOverall, innerW, innerH]);

  const toPath = (coords: { x: number; y: number }[]) =>
    coords
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');

  const recallPath = toPath(points.map((p) => ({ x: p.x, y: p.yRecall })));
  const hitPath = toPath(points.map((p) => ({ x: p.x, y: p.yHit })));
  const mrrPath = toPath(points.map((p) => ({ x: p.x, y: p.yMrr })));
  const baseRecallPts = points.filter(
    (p): p is typeof p & { yBaseRecall: number } => p.yBaseRecall !== null,
  );
  const baseRecallPath =
    baseRecallPts.length > 0
      ? toPath(baseRecallPts.map((p) => ({ x: p.x, y: p.yBaseRecall })))
      : '';

  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Кривые качества по K
          </h3>
          <p className="text-xs text-gray-400">
            Динамика Recall@k, HitRate@k и MRR@k при увеличении окна выборки
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Recall@k
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            HitRate@k
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            MRR@k
          </span>
          {baseRecallPath && (
            <span className="inline-flex items-center gap-1.5 text-gray-400">
              <span className="w-3 border-t-2 border-dashed border-gray-400" />
              Baseline Recall
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full">
        {hovered && (
          <div className="absolute top-1 right-2 z-10 rounded-xl border border-gray-700/80 bg-gray-950/95 px-3 py-2 text-xs shadow-xl pointer-events-none space-y-0.5 font-mono">
            <div className="font-bold text-white">k = {hovered.k}</div>
            <div className="text-blue-300">
              Recall@{hovered.k}: {formatPct(hovered.recall)}
            </div>
            <div className="text-emerald-300">
              Hit@{hovered.k}: {formatPct(hovered.hit)}
            </div>
            <div className="text-purple-300">
              MRR@{hovered.k}: {hovered.mrr.toFixed(4)}
            </div>
            {hovered.baseRecall !== null && (
              <div className="text-gray-400 pt-0.5 border-t border-gray-800">
                Base Recall@{hovered.k}: {formatPct(hovered.baseRecall)}
              </div>
            )}
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 overflow-visible select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padTop + innerH * (1 - ratio);
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
                  {Math.round(ratio * 100)}%
                </text>
              </g>
            );
          })}

          {baseRecallPath && (
            <path
              d={baseRecallPath}
              fill="none"
              stroke="rgba(156,163,175,0.65)"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}

          {hitPath && (
            <path
              d={hitPath}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {recallPath && (
            <path
              d={recallPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {mrrPath && (
            <path
              d={mrrPath}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((p, idx) => {
            const isActive = hoveredIdx === idx;
            const hitZoneWidth = Math.max(24, innerW / Math.max(1, points.length));
            return (
              <g
                key={p.k}
                onMouseEnter={() => setHoveredIdx(idx)}
                className="cursor-pointer"
              >
                <rect
                  x={p.x - hitZoneWidth / 2}
                  y={padTop}
                  width={hitZoneWidth}
                  height={innerH}
                  fill={isActive ? 'rgba(59,130,246,0.08)' : 'transparent'}
                  rx="4"
                />
                <circle
                  cx={p.x}
                  cy={p.yHit}
                  r={isActive ? 5 : 3.5}
                  fill="#34d399"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
                <circle
                  cx={p.x}
                  cy={p.yRecall}
                  r={isActive ? 5 : 3.5}
                  fill="#3b82f6"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
                <circle
                  cx={p.x}
                  cy={p.yMrr}
                  r={isActive ? 4.5 : 3}
                  fill="#c084fc"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  className={cn(
                    'text-[11px] font-mono',
                    isActive ? 'fill-white font-bold' : 'fill-gray-400',
                  )}
                >
                  @{p.k}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function DatasetModal({
  open,
  onClose,
  initialPath,
  docsReady,
  onUseInline,
  onSavedToServer,
}: {
  open: boolean;
  onClose: () => void;
  initialPath: string;
  docsReady: boolean;
  onUseInline: (questions: EvalQuestionInput[], label: string) => void;
  onSavedToServer: (savedPath: string, info: EvalDatasetInfo) => void;
}) {
  const [rawJson, setRawJson] = useState(SAMPLE_DATASET_JSON);
  const [fileName, setFileName] = useState<string>('');
  const [targetPath, setTargetPath] = useState(initialPath);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const parsedResult = useMemo(() => {
    try {
      const questions = parseUploadedQuestions(rawJson);
      const categories: Record<string, number> = {};
      for (const q of questions) {
        categories[q.category] = (categories[q.category] || 0) + 1;
      }
      return { questions, categories, error: null as string | null };
    } catch (err) {
      return {
        questions: null as EvalQuestionInput[] | null,
        categories: {} as Record<string, number>,
        error: err instanceof Error ? err.message : 'Ошибка разбора JSON',
      };
    }
  }, [rawJson]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setServerError(null);
    const text = await file.text();
    setRawJson(text);
  };

  const handleSaveToServer = async () => {
    if (!parsedResult.questions) return;
    setSaving(true);
    setServerError(null);
    try {
      const qs = new URLSearchParams();
      if (targetPath.trim()) {
        qs.set('path', targetPath.trim());
      }
      const queryStr = qs.toString() ? `?${qs.toString()}` : '';
      const res = await fetch(`/api/admin/eval/dataset${queryStr}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsedResult.questions }),
      });
      const data = (await res.json().catch(() => ({}))) as EvalDatasetInfo & {
        saved_to?: string;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      onSavedToServer(targetPath.trim(), data);
      onClose();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Не удалось сохранить датасет',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-gray-700/60 bg-slate-950/95 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-4 bg-slate-900/60">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileJson className="w-4 h-4 text-blue-400" />
              Подстановка и загрузка эталонного датасета
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Поддерживаются JSON вида{' '}
              <code className="font-mono text-gray-300">
                {`{"questions": [...]}`}
              </code>{' '}
              или массив вопросов
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800/70 hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-xs font-semibold text-blue-200 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Выбрать .json файл</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => void handleFileChange(e)}
                className="hidden"
              />
            </label>

            {fileName && (
              <span className="text-xs font-mono text-gray-300">
                Файл: {fileName}
              </span>
            )}

            <button
              type="button"
              onClick={() => setRawJson(SAMPLE_DATASET_JSON)}
              className="ml-auto px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 cursor-pointer"
            >
              Вставить шаблон
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Содержимое JSON
            </label>
            <textarea
              rows={12}
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                setServerError(null);
              }}
              spellCheck={false}
              className="w-full rounded-2xl bg-gray-900/90 border border-gray-700/60 p-3.5 text-xs font-mono text-gray-200 leading-relaxed focus:outline-none focus:border-blue-500/60"
            />
          </div>

          {parsedResult.error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
              {parsedResult.error}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  JSON валиден: {parsedResult.questions?.length ?? 0} вопросов
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(parsedResult.categories).map(([cat, cnt]) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/20 font-mono text-[11px]"
                  >
                    {cat}: {cnt}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-3.5 space-y-2">
            <label className="block text-xs font-medium text-gray-300">
              Путь для сохранения на сервере (внутри DATA_DIR, пусто ={' '}
              <span className="font-mono text-gray-400">eval_dataset.json</span>)
            </label>
            <input
              type="text"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="eval_dataset.json"
              className="w-full h-9 px-3 rounded-xl bg-gray-950 border border-gray-700/60 text-xs font-mono text-white"
            />
          </div>

          {serverError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
              {serverError}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={!parsedResult.questions}
            onClick={() => {
              if (!parsedResult.questions) return;
              onUseInline(
                parsedResult.questions,
                fileName || `Временный JSON (${parsedResult.questions.length})`,
              );
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs font-semibold text-purple-200 cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Подставить разово (без записи на диск)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-800 text-xs text-gray-300 cursor-pointer"
            >
              Отмена
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!parsedResult.questions || saving}
              onClick={() => void handleSaveToServer()}
              className="text-white"
            >
              {saving ? 'Сохранение...' : 'Сохранить на сервер'}
            </Button>
          </div>
        </div>

        {!docsReady && (
          <div className="px-5 py-2 bg-amber-500/10 border-t border-amber-500/20 text-[11px] text-amber-300">
            База знаний пока не проиндексирована — сохранить датасет можно, но запуск оценки станет доступен после индексации.
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionsViewerModal({
  open,
  onClose,
  questions,
  loading,
  datasetLabel,
}: {
  open: boolean;
  onClose: () => void;
  questions: EvalQuestionInput[];
  loading: boolean;
  datasetLabel: string;
}) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(questions.map((q) => q.category))).sort(),
    [questions],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (catFilter && q.category !== catFilter) return false;
      if (!needle) return true;
      return (
        q.id.toLowerCase().includes(needle) ||
        q.query.toLowerCase().includes(needle) ||
        q.relevant_chunk_ids.some((c) => c.toLowerCase().includes(needle))
      );
    });
  }, [questions, search, catFilter]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-gray-700/60 bg-slate-950/95 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-4 bg-slate-900/60">
          <div>
            <h2 className="text-lg font-bold text-white">
              Вопросы датасета ({questions.length})
            </h2>
            <p className="text-xs font-mono text-gray-400 mt-0.5 truncate max-w-lg">
              {datasetLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {questions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob(
                    [JSON.stringify({ questions }, null, 2)],
                    { type: 'application/json' },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'eval_dataset.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Скачать JSON
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-800/70 hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-800 flex flex-wrap gap-2 bg-slate-900/30">
          <div className="relative flex-1 min-w-52">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ID, вопросу или chunk_id..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-gray-900 border border-gray-700/60 text-xs text-white"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-gray-900 border border-gray-700/60 text-xs text-gray-200"
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="py-16 flex justify-center">
              <LoadingSpinner size={32} />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center text-xs text-gray-500">
              Вопросы не найдены
            </div>
          )}

          {!loading &&
            filtered.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-gray-800 bg-slate-900/50 p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    {q.id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                    {q.category}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                    {q.query_type}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                    {q.difficulty}
                  </span>
                </div>
                <p className="text-sm text-white">{q.query}</p>
                <div className="flex flex-wrap gap-1.5">
                  {q.relevant_chunk_ids.map((cid) => (
                    <span
                      key={cid}
                      className="px-2 py-0.5 rounded-md bg-gray-950 border border-gray-800 text-[11px] font-mono text-emerald-300"
                    >
                      {cid}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export function EvalPanel({
  docsReady,
  gatewaySettings,
  onUnauthorized,
}: EvalPanelProps) {
  const [datasetPathInput, setDatasetPathInput] = useState('');
  const [appliedDatasetPath, setAppliedDatasetPath] = useState('');
  const [datasetInfo, setDatasetInfo] = useState<EvalDatasetInfo | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(true);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [datasetRefreshTick, setDatasetRefreshTick] = useState(0);

  const [inlineQuestions, setInlineQuestions] = useState<
    EvalQuestionInput[] | null
  >(null);
  const [inlineLabel, setInlineLabel] = useState('');
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);

  const [questionsViewerOpen, setQuestionsViewerOpen] = useState(false);
  const [viewerQuestions, setViewerQuestions] = useState<EvalQuestionInput[]>(
    [],
  );
  const [viewerLoading, setViewerLoading] = useState(false);

  const [searchMode, setSearchMode] = useState<EvalSearchMode>('hybrid_scored');
  const [ksInput, setKsInput] = useState('1, 3, 5, 10, 20');
  const [useQueryExpansion, setUseQueryExpansion] = useState(true);
  const [includeContextMetrics, setIncludeContextMetrics] = useState(true);
  const [skipMissingChunks, setSkipMissingChunks] = useState(false);
  const [forceReembed, setForceReembed] = useState(false);
  const [backgroundRun, setBackgroundRun] = useState(true);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchLimitOverride, setSearchLimitOverride] = useState('');
  const [minScoreOverride, setMinScoreOverride] = useState('');
  const [relRatioOverride, setRelRatioOverride] = useState('');
  const [maxSourcesOverride, setMaxSourcesOverride] = useState('');
  const [limitQuestions, setLimitQuestions] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedQueryTypes, setSelectedQueryTypes] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);

  const [launching, setLaunching] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runBanner, setRunBanner] = useState<string | null>(null);

  const [runs, setRuns] = useState<EvalRunSummary[]>([]);
  const [evalRunning, setEvalRunning] = useState(false);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsTick, setRunsTick] = useState(0);

  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedRunDetail, setSelectedRunDetail] =
    useState<EvalRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [baselineRunId, setBaselineRunId] = useState<number | null>(null);
  const [sliceDimension, setSliceDimension] =
    useState<SliceDimension>('by_category');
  const [questionFilter, setQuestionFilter] =
    useState<QuestionFilterMode>('all');
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionCatFilter, setQuestionCatFilter] = useState('');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );
  const [chunkCache, setChunkCache] = useState<
    Record<string, EvalChunkPreview>
  >({});
  const [chunkLookupLoading, setChunkLookupLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (appliedDatasetPath.trim()) {
      qs.set('path', appliedDatasetPath.trim());
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';

    fetch(`/api/admin/eval/dataset${suffix}`, { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) {
          onUnauthorized();
          return null;
        }
        const data = (await res.json().catch(() => ({}))) as EvalDatasetInfo & {
          detail?: string;
        };
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setDatasetInfo(data);
        setDatasetError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setDatasetError(
          err instanceof Error ? err.message : 'Ошибка проверки датасета',
        );
      })
      .finally(() => {
        if (!cancelled) setDatasetLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appliedDatasetPath, datasetRefreshTick, onUnauthorized]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/eval/runs?limit=30', { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) {
          onUnauthorized();
          return null;
        }
        const data = (await res.json().catch(() => ({}))) as {
          eval_running?: boolean;
          runs?: EvalRunSummary[];
          detail?: string;
        };
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        if (cancelled || !data) return;
        const loadedRuns = Array.isArray(data.runs) ? data.runs : [];
        setRuns(loadedRuns);
        setEvalRunning(Boolean(data.eval_running));
        setSelectedRunId((prev) => {
          if (prev !== null && loadedRuns.some((r) => r.id === prev)) {
            return prev;
          }
          return loadedRuns[0]?.id ?? null;
        });
      })
      .catch(() => {
        // Keep current runs state on transient polling failure
      })
      .finally(() => {
        if (!cancelled) setRunsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [runsTick, onUnauthorized]);

  useEffect(() => {
    const hasRunningRow = runs.some((r) => r.status === 'running');
    if (!evalRunning && !hasRunningRow) return;

    const timer = setInterval(() => {
      setRunsTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, [evalRunning, runs]);

  const activeRunSummary = useMemo(
    () => runs.find((r) => r.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  const activeRunStatus = activeRunSummary?.status ?? null;
  useEffect(() => {
    if (selectedRunId === null) return;
    let cancelled = false;

    fetch(`/api/admin/eval/runs/${selectedRunId}?include_details=true`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (res.status === 401) {
          onUnauthorized();
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as EvalRunDetail;
      })
      .then((data) => {
        if (!cancelled && data) {
          setSelectedRunDetail(data);
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedRunDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRunId, activeRunStatus, onUnauthorized]);

  const lookupChunks = useCallback(
    async (ids: string[]) => {
      const missing = ids.filter((id) => !(id in chunkCache));
      if (missing.length === 0) return;

      setChunkLookupLoading(true);
      try {
        const res = await fetch('/api/admin/eval/chunks/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chunk_ids: missing.slice(0, 100) }),
        });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as {
          chunks?: Record<string, EvalChunkPreview>;
        };
        if (data.chunks) {
          setChunkCache((prev) => ({ ...prev, ...data.chunks }));
        }
      } catch {
        // Optional helper endpoint; fallback gracefully to chunk IDs
      } finally {
        setChunkLookupLoading(false);
      }
    },
    [chunkCache],
  );

  const handleInspectQuestions = async () => {
    setQuestionsViewerOpen(true);
    if (inlineQuestions) {
      setViewerQuestions(inlineQuestions);
      return;
    }
    setViewerLoading(true);
    try {
      const qs = new URLSearchParams({ include_questions: 'true' });
      if (appliedDatasetPath.trim()) qs.set('path', appliedDatasetPath.trim());
      const res = await fetch(`/api/admin/eval/dataset?${qs.toString()}`, {
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as EvalDatasetInfo;
      if (res.ok && Array.isArray(data.questions)) {
        setViewerQuestions(data.questions);
      } else {
        setViewerQuestions([]);
      }
    } finally {
      setViewerLoading(false);
    }
  };

  const handleRunEval = async () => {
    const ks = parseKsInput(ksInput);
    if (ks.length === 0) {
      setRunError('Укажите хотя бы одно целое K в диапазоне [1, 200]');
      return;
    }

    setLaunching(true);
    setRunError(null);
    setRunBanner(null);

    try {
      const payload: Record<string, unknown> = {
        ks,
        search_mode: searchMode,
        use_query_expansion: useQueryExpansion,
        include_context_metrics: includeContextMetrics,
        skip_missing_chunks: skipMissingChunks,
        force_reembed: forceReembed,
        background: backgroundRun,
        include_details: !backgroundRun,
      };

      if (inlineQuestions) {
        payload.questions = inlineQuestions;
      } else if (appliedDatasetPath.trim()) {
        payload.dataset_path = appliedDatasetPath.trim();
      }

      if (searchLimitOverride !== '') {
        payload.search_limit = Number(searchLimitOverride);
      }
      if (minScoreOverride !== '') {
        payload.min_score_override = Number(minScoreOverride);
      }
      if (relRatioOverride !== '') {
        payload.rel_ratio_override = Number(relRatioOverride);
      }
      if (maxSourcesOverride !== '') {
        payload.max_sources_override = Number(maxSourcesOverride);
      }
      if (limitQuestions !== '') {
        payload.limit_questions = Number(limitQuestions);
      }
      if (selectedCategories.length > 0) {
        payload.categories = selectedCategories;
      }
      if (selectedQueryTypes.length > 0) {
        payload.query_types = selectedQueryTypes;
      }
      if (selectedDifficulties.length > 0) {
        payload.difficulties = selectedDifficulties;
      }

      const res = await fetch('/api/admin/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        run_id?: number;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      if (typeof data.run_id === 'number') {
        setDetailLoading(true);
        setSelectedRunId(data.run_id);
      }
      if (data.status === 'started') {
        setEvalRunning(true);
        setRunBanner(`Запущена фоновая оценка #${data.run_id}...`);
      } else {
        setRunBanner(`Оценка #${data.run_id} успешно завершена`);
      }
      setRunsTick((t) => t + 1);
    } catch (err) {
      setRunError(
        err instanceof Error ? err.message : 'Ошибка запуска оценки метрик',
      );
    } finally {
      setLaunching(false);
    }
  };

  const handleDeleteRun = async (runId: number) => {
    try {
      const res = await fetch(`/api/admin/eval/runs/${runId}`, {
        method: 'DELETE',
      });
      if (!res.ok) return;
      if (selectedRunId === runId) {
        setSelectedRunId(null);
        setSelectedRunDetail(null);
      }
      if (baselineRunId === runId) {
        setBaselineRunId(null);
      }
      setRunsTick((t) => t + 1);
    } catch {
      // Ignore transient error
    }
  };

  const availableCategories = useMemo(() => {
    if (inlineQuestions) {
      const counts: Record<string, number> = {};
      for (const q of inlineQuestions) {
        counts[q.category] = (counts[q.category] || 0) + 1;
      }
      return counts;
    }
    return datasetInfo?.by_category ?? {};
  }, [inlineQuestions, datasetInfo]);

  const availableQueryTypes = useMemo(() => {
    if (inlineQuestions) {
      const counts: Record<string, number> = {};
      for (const q of inlineQuestions) {
        counts[q.query_type] = (counts[q.query_type] || 0) + 1;
      }
      return counts;
    }
    return datasetInfo?.by_query_type ?? {};
  }, [inlineQuestions, datasetInfo]);

  const availableDifficulties = useMemo(() => {
    if (inlineQuestions) {
      const counts: Record<string, number> = {};
      for (const q of inlineQuestions) {
        counts[q.difficulty] = (counts[q.difficulty] || 0) + 1;
      }
      return counts;
    }
    return datasetInfo?.by_difficulty ?? {};
  }, [inlineQuestions, datasetInfo]);

  const toggleFilterChip = (
    list: string[],
    setter: (next: string[]) => void,
    value: string,
  ) => {
    setter(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );
  };

  const activeDetail =
    selectedRunDetail && selectedRunDetail.id === selectedRunId
      ? selectedRunDetail
      : null;
  const baselineRun = useMemo(
    () =>
      baselineRunId !== null && baselineRunId !== selectedRunId
        ? runs.find((r) => r.id === baselineRunId && r.status === 'completed') ??
          null
        : null,
    [runs, baselineRunId, selectedRunId],
  );

  const effectiveLimit =
    searchLimitOverride !== ''
      ? Number(searchLimitOverride)
      : gatewaySettings?.rag_search_limit ?? 24;
  const parsedKs = useMemo(() => parseKsInput(ksInput), [ksInput]);
  const maxK = parsedKs[parsedKs.length - 1] ?? 20;

  const activeKs = activeDetail?.config?.ks ?? [1, 3, 5, 10, 20];
  const primaryK = pickPrimaryK(activeKs);
  const maxActiveK = activeKs[activeKs.length - 1] ?? 20;

  const sliceData = useMemo(() => {
    if (!activeDetail?.metrics) return {};
    return activeDetail.metrics[sliceDimension] ?? {};
  }, [activeDetail, sliceDimension]);

  const filteredQuestions = useMemo(() => {
    if (!activeDetail?.details) return [];
    const needle = questionSearch.trim().toLowerCase();
    return activeDetail.details.filter((rec) => {
      if (questionFilter === 'misses' && rec.reciprocal_rank > 0) return false;
      if (
        questionFilter === 'not_top1' &&
        (rec.first_relevant_rank === 1 || rec.reciprocal_rank === 0)
      ) {
        return false;
      }
      if (
        questionFilter === 'context_miss' &&
        (rec.context_hit === null || rec.context_hit > 0)
      ) {
        return false;
      }
      if (questionCatFilter && rec.category !== questionCatFilter) return false;
      if (!needle) return true;
      return (
        rec.id.toLowerCase().includes(needle) ||
        rec.query.toLowerCase().includes(needle)
      );
    });
  }, [activeDetail, questionFilter, questionSearch, questionCatFilter]);

  const handleExpandQuestion = (rec: EvalQuestionRecord) => {
    if (expandedQuestionId === rec.id) {
      setExpandedQuestionId(null);
      return;
    }
    setExpandedQuestionId(rec.id);
    const idsToLoad = [...rec.relevant_chunk_ids, ...rec.retrieved_chunk_ids];
    void lookupChunks(idsToLoad);
  };

  const canLaunch =
    docsReady &&
    !launching &&
    !evalRunning &&
    (Boolean(inlineQuestions?.length) || Boolean(datasetInfo?.exists));

  const docsBaseUrl = gatewaySettings?.docs_base_url || 'https://typst-gost.ru';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Target className="w-5 h-5 text-blue-400" />
              Оценка качества поиска (Recall@k &amp; MRR)
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Замер релевантности поиска по эталонному датасету, сравнение стратегий и диагностика промахов
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDatasetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-xs font-semibold text-blue-200 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Подставить / загрузить датасет
            </button>

            <button
              type="button"
              disabled={!inlineQuestions && !datasetInfo?.exists}
              onClick={() => void handleInspectQuestions()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/60 text-xs font-medium text-gray-200 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Eye className="w-3.5 h-3.5" />
              Просмотр вопросов
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-center pt-3 border-t border-gray-800/70">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-60">
              <FileJson className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={datasetPathInput}
                onChange={(e) => setDatasetPathInput(e.target.value)}
                placeholder="Путь к датасету (пусто = data/eval_dataset.json)"
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/60"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setDatasetLoading(true);
                setAppliedDatasetPath(datasetPathInput);
                setDatasetRefreshTick((t) => t + 1);
              }}
              disabled={datasetLoading}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700/60 text-xs font-medium text-gray-200 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={cn('w-3.5 h-3.5', datasetLoading && 'animate-spin')}
              />
              Проверить
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {datasetInfo && (
              <>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium',
                    datasetInfo.docs_ready
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                  )}
                >
                  <Database className="w-3.5 h-3.5" />
                  {datasetInfo.docs_ready
                    ? `Индекс: ${datasetInfo.index_chunks_count} чанков`
                    : 'Индекс не готов'}
                </span>

                {datasetInfo.exists ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 font-mono">
                    {datasetInfo.total_questions} вопросов
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Файл датасета не найден
                  </span>
                )}

                {datasetInfo.exists &&
                  datasetInfo.docs_ready &&
                  (datasetInfo.missing_chunk_ids_total ?? 0) === 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Все chunk_id валидны
                    </span>
                  )}

                {datasetInfo.exists &&
                  (datasetInfo.missing_chunk_ids_total ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Отсутствует {datasetInfo.missing_chunk_ids_total} чанков (
                      {datasetInfo.questions_with_missing_chunks} вопр.)
                    </span>
                  )}
              </>
            )}
          </div>
        </div>

        {datasetError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-300">
            {datasetError}
          </div>
        )}

        {datasetInfo?.sample_missing_chunk_ids &&
          datasetInfo.sample_missing_chunk_ids.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200 space-y-1.5">
              <div className="font-medium">
                Обнаружены chunk_id, отсутствующие в текущей таблице LanceDB (возможно, документация переиндексировалась):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {datasetInfo.sample_missing_chunk_ids.map((cid) => (
                  <code
                    key={cid}
                    className="px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/20 font-mono text-[11px]"
                  >
                    {cid}
                  </code>
                ))}
              </div>
            </div>
          )}

        {inlineQuestions && (
          <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-purple-200">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>
                Активен подставленный временный датасет:{' '}
                <strong className="text-white">{inlineLabel}</strong> (
                {inlineQuestions.length} вопр.)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setInlineQuestions(null);
                setInlineLabel('');
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30 cursor-pointer"
            >
              Вернуться к серверному файлу
            </button>
          </div>
        )}

        {Object.keys(availableCategories).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
            <span className="mr-1 text-gray-500">Категории:</span>
            {Object.entries(availableCategories).map(([cat, cnt]) => (
              <span
                key={cat}
                className="px-2 py-0.5 rounded-md bg-gray-950/60 border border-gray-800 font-mono text-gray-300"
              >
                {cat}: {cnt}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              Параметры запуска оценки
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Выберите алгоритм поиска, набор K и дополнительные параметры
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            disabled={!canLaunch}
            onClick={() => void handleRunEval()}
            className="text-white shadow-lg shadow-blue-600/20"
          >
            {launching || evalRunning ? (
              <>
                <LoadingSpinner size={16} />
                <span>{evalRunning ? 'Выполняется...' : 'Запуск...'}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Запустить оценку</span>
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(Object.keys(EVAL_SEARCH_MODE_META) as EvalSearchMode[]).map((mode) => {
            const meta = EVAL_SEARCH_MODE_META[mode];
            const active = searchMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setSearchMode(mode)}
                className={cn(
                  'text-left rounded-xl border p-3 transition-all cursor-pointer',
                  active
                    ? 'bg-blue-500/15 border-blue-500/50 shadow-sm'
                    : 'bg-gray-950/50 border-gray-800 hover:border-gray-700',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-white">
                    {meta.label}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  {meta.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 items-center pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">K:</span>
            {KS_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setKsInput(preset.ks.join(', '))}
                className={cn(
                  'px-2.5 py-1 rounded-lg border text-xs font-mono cursor-pointer transition-colors',
                  ksInput === preset.ks.join(', ')
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                    : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-white',
                )}
              >
                {preset.label}
              </button>
            ))}
            <input
              type="text"
              value={ksInput}
              onChange={(e) => setKsInput(e.target.value)}
              placeholder="1, 3, 5, 10, 20"
              className="w-40 h-8 px-2.5 rounded-lg bg-gray-950/80 border border-gray-700/60 text-xs font-mono text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={useQueryExpansion}
                onChange={(e) => setUseQueryExpansion(e.target.checked)}
                className="accent-blue-500 w-4 h-4"
              />
              Синонимы (SYNONYM_MAP)
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeContextMetrics}
                onChange={(e) => setIncludeContextMetrics(e.target.checked)}
                className="accent-blue-500 w-4 h-4"
              />
              Context Recall &amp; No-Docs
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={skipMissingChunks}
                onChange={(e) => setSkipMissingChunks(e.target.checked)}
                className="accent-blue-500 w-4 h-4"
              />
              Пропускать битые chunk_id
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={forceReembed}
                onChange={(e) => setForceReembed(e.target.checked)}
                className="accent-purple-500 w-4 h-4"
              />
              Без кэша эмбеддингов
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={backgroundRun}
                onChange={(e) => setBackgroundRun(e.target.checked)}
                className="accent-blue-500 w-4 h-4"
              />
              Фоновый запуск
            </label>
          </div>
        </div>

        {maxK > effectiveLimit && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-300">
            Внимание: максимальное K ({maxK}) больше лимита кандидатов ({effectiveLimit}) — увеличить лимит можно в расширенных настройках ниже.
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            {showAdvanced ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Расширенные настройки: переопределение порогов RAG и фильтры среза
          </button>

          {showAdvanced && (
            <div className="mt-3 rounded-xl border border-gray-800 bg-gray-950/50 p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    search_limit (по умолч.{' '}
                    {gatewaySettings?.rag_search_limit ?? 24})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={searchLimitOverride}
                    onChange={(e) => setSearchLimitOverride(e.target.value)}
                    placeholder="Из настроек"
                    className="w-full h-8 px-2.5 rounded-lg bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    min_score (по умолч. {gatewaySettings?.rag_min_score ?? 0.4})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={minScoreOverride}
                    onChange={(e) => setMinScoreOverride(e.target.value)}
                    placeholder="Из настроек"
                    className="w-full h-8 px-2.5 rounded-lg bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    rel_ratio (по умолч.{' '}
                    {gatewaySettings?.rag_rel_ratio ?? 0.72})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={relRatioOverride}
                    onChange={(e) => setRelRatioOverride(e.target.value)}
                    placeholder="Из настроек"
                    className="w-full h-8 px-2.5 rounded-lg bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    max_sources (по умолч.{' '}
                    {gatewaySettings?.rag_max_sources ?? 5})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxSourcesOverride}
                    onChange={(e) => setMaxSourcesOverride(e.target.value)}
                    placeholder="Из настроек"
                    className="w-full h-8 px-2.5 rounded-lg bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Лимит вопросов (smoke)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={limitQuestions}
                    onChange={(e) => setLimitQuestions(e.target.value)}
                    placeholder="Все"
                    className="w-full h-8 px-2.5 rounded-lg bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-800/70">
                <div>
                  <div className="text-[11px] text-gray-400 mb-1.5">
                    Фильтр категорий (пусто = все)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(availableCategories).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          toggleFilterChip(
                            selectedCategories,
                            setSelectedCategories,
                            cat,
                          )
                        }
                        className={cn(
                          'px-2 py-0.5 rounded-md border text-[11px] font-mono cursor-pointer',
                          selectedCategories.includes(cat)
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                            : 'bg-gray-900 border-gray-800 text-gray-400',
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-gray-400 mb-1.5">
                    Фильтр типов запросов (пусто = все)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(availableQueryTypes).map((qt) => (
                      <button
                        key={qt}
                        type="button"
                        onClick={() =>
                          toggleFilterChip(
                            selectedQueryTypes,
                            setSelectedQueryTypes,
                            qt,
                          )
                        }
                        className={cn(
                          'px-2 py-0.5 rounded-md border text-[11px] font-mono cursor-pointer',
                          selectedQueryTypes.includes(qt)
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                            : 'bg-gray-900 border-gray-800 text-gray-400',
                        )}
                      >
                        {qt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-gray-400 mb-1.5">
                    Фильтр сложности (пусто = все)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(availableDifficulties).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() =>
                          toggleFilterChip(
                            selectedDifficulties,
                            setSelectedDifficulties,
                            diff,
                          )
                        }
                        className={cn(
                          'px-2 py-0.5 rounded-md border text-[11px] font-mono cursor-pointer',
                          selectedDifficulties.includes(diff)
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                            : 'bg-gray-900 border-gray-800 text-gray-400',
                        )}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {runError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
            {runError}
          </div>
        )}

        {runBanner && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-200 flex items-center gap-2">
            {evalRunning ? (
              <LoadingSpinner size={14} />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{runBanner}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5 items-start">
        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md overflow-hidden flex flex-col max-h-[82vh]">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              История запусков ({runs.length})
            </span>
            <button
              type="button"
              onClick={() => setRunsTick((t) => t + 1)}
              className="text-xs text-blue-400 hover:underline cursor-pointer"
            >
              Обновить
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-800/70">
            {runsLoading && (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size={26} />
              </div>
            )}

            {!runsLoading && runs.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">
                Запусков оценки ещё не было
              </div>
            )}

            {!runsLoading &&
              runs.map((run) => {
                const isSelected = run.id === selectedRunId;
                const modeMeta =
                  EVAL_SEARCH_MODE_META[run.config?.search_mode] ??
                  EVAL_SEARCH_MODE_META.hybrid_scored;
                const runKs = run.config?.ks ?? [1, 3, 5, 10, 20];
                const runPrimaryK = pickPrimaryK(runKs);
                const overall = run.metrics?.overall;

                return (
                  <div
                    key={run.id}
                    onClick={() => {
                      if (run.id !== selectedRunId) {
                        setDetailLoading(true);
                        setExpandedQuestionId(null);
                        setSelectedRunId(run.id);
                      }
                    }}
                    className={cn(
                      'p-3.5 transition-colors cursor-pointer group',
                      isSelected
                        ? 'bg-blue-500/15 border-l-2 border-l-blue-500'
                        : 'hover:bg-slate-800/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-white">
                          #{run.id}
                        </span>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded border text-[10px] font-medium',
                            modeMeta.badgeClass,
                          )}
                        >
                          {modeMeta.shortLabel}
                        </span>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium',
                            run.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : run.status === 'running'
                                ? 'bg-blue-500/15 text-blue-300'
                                : 'bg-red-500/15 text-red-300',
                          )}
                        >
                          {run.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteRun(run.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-500 hover:text-red-400 transition-opacity cursor-pointer"
                        title="Удалить запуск"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {overall ? (
                      <div className="grid grid-cols-3 gap-1.5 my-2 text-center">
                        <div className="rounded-lg bg-gray-950/60 border border-gray-800/80 py-1 px-1.5">
                          <div className="text-[10px] text-gray-500">MRR</div>
                          <div className="text-xs font-mono font-bold text-purple-300">
                            {overall.mrr.toFixed(3)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-gray-950/60 border border-gray-800/80 py-1 px-1.5">
                          <div className="text-[10px] text-gray-500">
                            R@{runPrimaryK}
                          </div>
                          <div className="text-xs font-mono font-bold text-blue-300">
                            {formatPct(
                              overall.recall_at_k[String(runPrimaryK)],
                              0,
                            )}
                          </div>
                        </div>
                        <div className="rounded-lg bg-gray-950/60 border border-gray-800/80 py-1 px-1.5">
                          <div className="text-[10px] text-gray-500">
                            Hit@1
                          </div>
                          <div className="text-xs font-mono font-bold text-emerald-300">
                            {formatPct(overall.hit_rate_at_k['1'], 0)}
                          </div>
                        </div>
                      </div>
                    ) : run.error ? (
                      <div className="text-[11px] text-red-400 line-clamp-2 my-1">
                        {run.error}
                      </div>
                    ) : (
                      <div className="text-[11px] text-blue-300 flex items-center gap-1.5 my-1">
                        <LoadingSpinner size={12} />
                        Выполняется оценка...
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
                      <span className="truncate max-w-40">
                        {run.dataset_name} ({run.evaluated_questions || run.total_questions})
                      </span>
                      <span>{formatDate(run.started_at)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          {!selectedRunId && (
            <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-16 text-center text-sm text-gray-500">
              Выберите запуск слева или запустите новую оценку метрик
            </div>
          )}

          {selectedRunId && detailLoading && (
            <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-16 flex justify-center">
              <LoadingSpinner size={32} />
            </div>
          )}

          {selectedRunId && !detailLoading && activeDetail && (
            <>
              <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-white">
                        Запуск #{activeDetail.id}
                      </h2>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md border text-xs font-medium',
                          (
                            EVAL_SEARCH_MODE_META[
                              activeDetail.config?.search_mode
                            ] ?? EVAL_SEARCH_MODE_META.hybrid_scored
                          ).badgeClass,
                        )}
                      >
                        {(
                          EVAL_SEARCH_MODE_META[
                            activeDetail.config?.search_mode
                          ] ?? EVAL_SEARCH_MODE_META.hybrid_scored
                        ).label}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-gray-800 text-xs font-mono text-gray-300">
                        {activeDetail.dataset_name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] font-mono text-gray-400">
                      <span>limit={activeDetail.config?.search_limit}</span>
                      <span>
                        expand={activeDetail.config?.use_query_expansion ? 'on' : 'off'}
                      </span>
                      <span>min_score={activeDetail.config?.min_score}</span>
                      <span>rel_ratio={activeDetail.config?.rel_ratio}</span>
                      <span>max_sources={activeDetail.config?.max_sources}</span>
                      <span>model={activeDetail.config?.embedding_model}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5">
                      <GitCompare className="w-3.5 h-3.5 text-gray-400" />
                      <select
                        value={baselineRunId ?? ''}
                        onChange={(e) =>
                          setBaselineRunId(
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className="h-8 px-2.5 rounded-xl bg-gray-950/80 border border-gray-700/60 text-xs text-gray-200"
                      >
                        <option value="">Сравнить с запуском...</option>
                        {runs
                          .filter(
                            (r) =>
                              r.id !== activeDetail.id && r.status === 'completed',
                          )
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              #{r.id} ({r.config?.search_mode}, MRR{' '}
                              {r.metrics?.overall.mrr.toFixed(3)})
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob(
                          [JSON.stringify(activeDetail, null, 2)],
                          { type: 'application/json' },
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `eval_run_${activeDetail.id}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Экспорт JSON
                    </button>
                  </div>
                </div>

                {activeDetail.error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
                    {activeDetail.error}
                  </div>
                )}
              </div>

              {activeDetail.metrics && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-4">
                      <div className="text-[11px] text-gray-400 mb-1">MRR</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-purple-300 font-mono tabular-nums">
                          {activeDetail.metrics.overall.mrr.toFixed(4)}
                        </span>
                        <DeltaBadge
                          current={activeDetail.metrics.overall.mrr}
                          baseline={baselineRun?.metrics?.overall.mrr}
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        Средний обратный ранг
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-4">
                      <div className="text-[11px] text-gray-400 mb-1">
                        HitRate@1
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-emerald-300 font-mono tabular-nums">
                          {formatPct(
                            activeDetail.metrics.overall.hit_rate_at_k['1'],
                          )}
                        </span>
                        <DeltaBadge
                          current={
                            activeDetail.metrics.overall.hit_rate_at_k['1']
                          }
                          baseline={
                            baselineRun?.metrics?.overall.hit_rate_at_k['1']
                          }
                          asPercent
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        Точное попадание в Top-1
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-4">
                      <div className="text-[11px] text-gray-400 mb-1">
                        Recall@{primaryK}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-blue-300 font-mono tabular-nums">
                          {formatPct(
                            activeDetail.metrics.overall.recall_at_k[
                              String(primaryK)
                            ],
                          )}
                        </span>
                        <DeltaBadge
                          current={
                            activeDetail.metrics.overall.recall_at_k[
                              String(primaryK)
                            ]
                          }
                          baseline={
                            baselineRun?.metrics?.overall.recall_at_k[
                              String(primaryK)
                            ]
                          }
                          asPercent
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        Hit@{primaryK}:{' '}
                        {formatPct(
                          activeDetail.metrics.overall.hit_rate_at_k[
                            String(primaryK)
                          ],
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-4">
                      <div className="text-[11px] text-gray-400 mb-1">
                        Recall@{maxActiveK}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-sky-300 font-mono tabular-nums">
                          {formatPct(
                            activeDetail.metrics.overall.recall_at_k[
                              String(maxActiveK)
                            ],
                          )}
                        </span>
                        <DeltaBadge
                          current={
                            activeDetail.metrics.overall.recall_at_k[
                              String(maxActiveK)
                            ]
                          }
                          baseline={
                            baselineRun?.metrics?.overall.recall_at_k[
                              String(maxActiveK)
                            ]
                          }
                          asPercent
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        Hit@{maxActiveK}:{' '}
                        {formatPct(
                          activeDetail.metrics.overall.hit_rate_at_k[
                            String(maxActiveK)
                          ],
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-4">
                      <div className="text-[11px] text-gray-400 mb-1">
                        Context Recall
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-white font-mono tabular-nums">
                          {formatPct(
                            activeDetail.metrics.overall.context_recall,
                          )}
                        </span>
                        <DeltaBadge
                          current={activeDetail.metrics.overall.context_recall}
                          baseline={
                            baselineRun?.metrics?.overall.context_recall
                          }
                          asPercent
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        {activeDetail.metrics.overall.no_docs_rate !== null
                          ? `No-Docs: ${formatPct(
                              activeDetail.metrics.overall.no_docs_rate,
                            )}`
                          : 'Только для Hybrid Scored'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-4">
                      <div className="text-[11px] text-gray-400 mb-1">
                        Вопросы / Задержка
                      </div>
                      <div className="text-xl font-bold text-white font-mono tabular-nums">
                        {activeDetail.evaluated_questions}
                        <span className="text-xs text-gray-500">
                          /{activeDetail.total_questions}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activeDetail.metrics.overall.avg_latency_ms.toFixed(1)}{' '}
                        мс
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4">
                    <MetricsCurveChart
                      ks={activeKs}
                      overall={activeDetail.metrics.overall}
                      baselineOverall={baselineRun?.metrics?.overall ?? null}
                    />

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md overflow-hidden flex flex-col">
                      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                          Таблица по значениям K
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          кэш эмбед.:{' '}
                          {activeDetail.metrics.embeddings_cached_hits ?? 0} / +
                          {activeDetail.metrics.embeddings_fetched ?? 0}
                        </span>
                      </div>
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-gray-950/60 text-gray-400 border-b border-gray-800">
                            <tr>
                              <th className="px-3.5 py-2">K</th>
                              <th className="px-3.5 py-2">Recall@k</th>
                              <th className="px-3.5 py-2">HitRate@k</th>
                              <th className="px-3.5 py-2">MRR@k</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/70">
                            {activeKs.map((k) => {
                              const key = String(k);
                              return (
                                <tr key={k} className="hover:bg-slate-800/30">
                                  <td className="px-3.5 py-2 text-white font-bold">
                                    @{k}
                                  </td>
                                  <td className="px-3.5 py-2 text-blue-300">
                                    {formatPct(
                                      activeDetail.metrics?.overall.recall_at_k[
                                        key
                                      ],
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2 text-emerald-300">
                                    {formatPct(
                                      activeDetail.metrics?.overall
                                        .hit_rate_at_k[key],
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2 text-purple-300">
                                    {formatScore(
                                      activeDetail.metrics?.overall.mrr_at_k[
                                        key
                                      ],
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Layers className="w-4 h-4 text-blue-400" />
                        Срезы качества
                      </div>
                      <div className="inline-flex gap-1 p-1 rounded-xl bg-gray-950/70 border border-gray-800">
                        {(
                          [
                            ['by_category', 'По категориям'],
                            ['by_query_type', 'По типу запроса'],
                            ['by_difficulty', 'По сложности'],
                          ] as const
                        ).map(([dim, label]) => (
                          <button
                            key={dim}
                            type="button"
                            onClick={() => setSliceDimension(dim)}
                            className={cn(
                              'px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                              sliceDimension === dim
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-950/60 text-gray-400 border-b border-gray-800">
                          <tr>
                            <th className="px-4 py-2.5">Группа</th>
                            <th className="px-4 py-2.5">Вопр.</th>
                            <th className="px-4 py-2.5">MRR</th>
                            <th className="px-4 py-2.5">Hit@1</th>
                            <th className="px-4 py-2.5">Recall@{primaryK}</th>
                            <th className="px-4 py-2.5">
                              Recall@{maxActiveK}
                            </th>
                            <th className="px-4 py-2.5">Ctx Recall</th>
                            <th className="px-4 py-2.5">No-Docs</th>
                            <th className="px-4 py-2.5">Задержка</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/70 font-mono">
                          {Object.entries(sliceData).map(([name, block]) => (
                            <tr key={name} className="hover:bg-slate-800/30">
                              <td className="px-4 py-2.5 font-semibold text-white">
                                {name}
                              </td>
                              <td className="px-4 py-2.5 text-gray-300">
                                {block.count}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-purple-300 w-12">
                                    {block.mrr.toFixed(3)}
                                  </span>
                                  <div className="w-16 h-1.5 rounded-full bg-gray-800 overflow-hidden hidden sm:block">
                                    <div
                                      className="h-full bg-purple-500 rounded-full"
                                      style={{
                                        width: `${Math.min(100, block.mrr * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-emerald-300">
                                {formatPct(block.hit_rate_at_k['1'])}
                              </td>
                              <td className="px-4 py-2.5 text-blue-300">
                                {formatPct(block.recall_at_k[String(primaryK)])}
                              </td>
                              <td className="px-4 py-2.5 text-sky-300">
                                {formatPct(
                                  block.recall_at_k[String(maxActiveK)],
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-gray-200">
                                {formatPct(block.context_recall)}
                              </td>
                              <td className="px-4 py-2.5 text-amber-300">
                                {formatPct(block.no_docs_rate)}
                              </td>
                              <td className="px-4 py-2.5 text-gray-400">
                                {block.avg_latency_ms.toFixed(1)} мс
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {activeDetail.details && activeDetail.details.length > 0 && (
                <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Filter className="w-4 h-4 text-blue-400" />
                        Разбор запросов ({filteredQuestions.length} из{' '}
                        {activeDetail.details.length})
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            ['all', 'Все'],
                            ['misses', 'Промахи (MRR = 0)'],
                            ['not_top1', 'Не в Топ-1'],
                            ['context_miss', 'Промах контекста'],
                          ] as const
                        ).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setQuestionFilter(mode)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors',
                              questionFilter === mode
                                ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                                : 'bg-gray-950/70 border-gray-800 text-gray-400 hover:text-white',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className="relative flex-1 min-w-52">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={questionSearch}
                          onChange={(e) => setQuestionSearch(e.target.value)}
                          placeholder="Поиск по тексту запроса или ID..."
                          className="w-full h-9 pl-9 pr-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs text-white"
                        />
                      </div>

                      <select
                        value={questionCatFilter}
                        onChange={(e) => setQuestionCatFilter(e.target.value)}
                        className="h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs text-gray-200"
                      >
                        <option value="">Все категории</option>
                        {Object.keys(
                          activeDetail.metrics?.by_category ?? {},
                        ).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-800/70 max-h-[65vh] overflow-y-auto">
                    {filteredQuestions.map((rec) => {
                      const isExpanded = expandedQuestionId === rec.id;
                      const rank = rec.first_relevant_rank;
                      const rankBadgeClass =
                        rank === 1
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : rank !== null && rank <= 5
                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                            : rank !== null
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              : 'bg-red-500/15 border-red-500/30 text-red-300';

                      return (
                        <div key={rec.id} className="bg-slate-900/20">
                          <button
                            type="button"
                            onClick={() => handleExpandQuestion(rec)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                )}
                                <span className="text-gray-300 font-bold">
                                  {rec.id}
                                </span>
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded border font-semibold',
                                    rankBadgeClass,
                                  )}
                                >
                                  {rank !== null ? `Rank #${rank}` : 'MISS'}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                                  {rec.category}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                  {rec.query_type}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                  {rec.difficulty}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-100 line-clamp-2 pl-5">
                                {rec.query}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0 text-[11px] font-mono pl-5 sm:pl-0">
                              <span className="px-2 py-1 rounded-lg bg-gray-950/70 border border-gray-800 text-purple-300">
                                RR {rec.reciprocal_rank.toFixed(3)}
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-gray-950/70 border border-gray-800 text-blue-300">
                                R@{primaryK}{' '}
                                {formatPct(
                                  rec.recall_at_k[String(primaryK)],
                                  0,
                                )}
                              </span>
                              {rec.context_hit !== null && (
                                <span
                                  className={cn(
                                    'px-2 py-1 rounded-lg border',
                                    rec.context_hit > 0
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                      : 'bg-red-500/10 border-red-500/30 text-red-300',
                                  )}
                                >
                                  {rec.no_docs
                                    ? 'No-Docs'
                                    : rec.context_hit > 0
                                      ? `Ctx OK (${rec.selected_sources_count ?? 0})`
                                      : `Ctx Miss (${rec.selected_sources_count ?? 0})`}
                                </span>
                              )}
                              {rec.top_score !== null && (
                                <span className="text-gray-500">
                                  score {rec.top_score.toFixed(3)}
                                </span>
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-5 pb-4 pt-3 border-t border-gray-800/80 bg-gray-950/50 space-y-4">
                              {chunkLookupLoading && (
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <LoadingSpinner size={14} />
                                  <span>Загрузка содержимого чанков...</span>
                                </div>
                              )}

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-emerald-300">
                                    Эталонные чанки ({rec.relevant_chunk_ids.length})
                                  </div>
                                  <div className="space-y-2">
                                    {rec.relevant_chunk_ids.map((cid) => {
                                      const pos =
                                        rec.retrieved_chunk_ids.indexOf(cid);
                                      const isMissingInIdx =
                                        rec.missing_chunk_ids.includes(cid);
                                      const preview = chunkCache[cid];
                                      const docHref = preview?.url
                                        ? preview.url.startsWith('http')
                                          ? preview.url
                                          : `${docsBaseUrl.replace(/\/+$/, '')}${preview.url}`
                                        : null;

                                      return (
                                        <div
                                          key={cid}
                                          className={cn(
                                            'rounded-xl border p-2.5 text-xs space-y-1',
                                            pos !== -1
                                              ? 'bg-emerald-500/5 border-emerald-500/30'
                                              : isMissingInIdx
                                                ? 'bg-amber-500/5 border-amber-500/30'
                                                : 'bg-red-500/5 border-red-500/30',
                                          )}
                                        >
                                          <div className="flex items-center justify-between gap-2 font-mono">
                                            <span className="text-white">
                                              {cid}
                                            </span>
                                            <span
                                              className={cn(
                                                'px-1.5 py-0.5 rounded text-[10px]',
                                                pos !== -1
                                                  ? 'bg-emerald-500/20 text-emerald-300'
                                                  : isMissingInIdx
                                                    ? 'bg-amber-500/20 text-amber-300'
                                                    : 'bg-red-500/20 text-red-300',
                                              )}
                                            >
                                              {pos !== -1
                                                ? `Найден на #${pos + 1}`
                                                : isMissingInIdx
                                                  ? 'Нет в индексе'
                                                  : 'Не найден'}
                                            </span>
                                          </div>
                                          {preview && (
                                            <>
                                              <div className="flex items-center justify-between gap-2 text-[11px] text-gray-300">
                                                <span className="font-medium truncate">
                                                  {preview.title}
                                                  {preview.section
                                                    ? ` · ${preview.section}`
                                                    : ''}
                                                </span>
                                                {docHref && (
                                                  <a
                                                    href={docHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-400 hover:underline shrink-0"
                                                  >
                                                    Док.
                                                    <ExternalLink className="w-3 h-3" />
                                                  </a>
                                                )}
                                              </div>
                                              <p className="text-[11px] text-gray-400 line-clamp-3 whitespace-pre-wrap">
                                                {preview.text_preview}
                                              </p>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-blue-300">
                                    Найденные чанки (Топ-{rec.retrieved_chunk_ids.length})
                                  </div>
                                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                                    {rec.retrieved_chunk_ids.map((cid, idx) => {
                                      const isRel =
                                        rec.relevant_chunk_ids.includes(cid);
                                      const preview = chunkCache[cid];
                                      const docHref = preview?.url
                                        ? preview.url.startsWith('http')
                                          ? preview.url
                                          : `${docsBaseUrl.replace(/\/+$/, '')}${preview.url}`
                                        : null;

                                      return (
                                        <div
                                          key={`${cid}-${idx}`}
                                          className={cn(
                                            'rounded-xl border p-2.5 text-xs space-y-1',
                                            isRel
                                              ? 'bg-emerald-500/10 border-emerald-500/40'
                                              : 'bg-gray-900/60 border-gray-800',
                                          )}
                                        >
                                          <div className="flex items-center justify-between gap-2 font-mono">
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400">
                                                #{idx + 1}
                                              </span>
                                              <span
                                                className={
                                                  isRel
                                                    ? 'text-emerald-300 font-bold'
                                                    : 'text-gray-300'
                                                }
                                              >
                                                {cid}
                                              </span>
                                            </div>
                                            {isRel && (
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">
                                                Релевантный
                                              </span>
                                            )}
                                          </div>
                                          {preview && (
                                            <>
                                              <div className="flex items-center justify-between gap-2 text-[11px] text-gray-300">
                                                <span className="truncate">
                                                  {preview.title}
                                                  {preview.section
                                                    ? ` · ${preview.section}`
                                                    : ''}
                                                </span>
                                                {docHref && (
                                                  <a
                                                    href={docHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-400 hover:underline shrink-0"
                                                  >
                                                    Док.
                                                    <ExternalLink className="w-3 h-3" />
                                                  </a>
                                                )}
                                              </div>
                                              <p className="text-[11px] text-gray-500 line-clamp-2 whitespace-pre-wrap">
                                                {preview.text_preview}
                                              </p>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {rec.retrieved_chunk_ids.length === 0 && (
                                      <div className="text-xs text-gray-500 py-4 text-center">
                                        Поиск не вернул ни одного чанка
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredQuestions.length === 0 && (
                      <div className="p-8 text-center text-xs text-gray-500">
                        Нет вопросов, подходящих под выбранные фильтры
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <DatasetModal
        open={datasetModalOpen}
        onClose={() => setDatasetModalOpen(false)}
        initialPath={appliedDatasetPath}
        docsReady={docsReady}
        onUseInline={(questions, label) => {
          setInlineQuestions(questions);
          setInlineLabel(label);
        }}
        onSavedToServer={(savedPath, info) => {
          setInlineQuestions(null);
          setInlineLabel('');
          setDatasetPathInput(savedPath);
          setAppliedDatasetPath(savedPath);
          setDatasetInfo(info);
          setDatasetRefreshTick((t) => t + 1);
        }}
      />

      <QuestionsViewerModal
        open={questionsViewerOpen}
        onClose={() => setQuestionsViewerOpen(false)}
        questions={viewerQuestions}
        loading={viewerLoading}
        datasetLabel={
          inlineQuestions
            ? inlineLabel
            : datasetInfo?.path || appliedDatasetPath || 'eval_dataset.json'
        }
      />
    </div>
  );
}