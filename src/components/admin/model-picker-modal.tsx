'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Check,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  extractModelPricing,
  type ModelCategory,
  type PolzaModel,
} from '@/lib/admin/types';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/spinner';

type SortOption =
  | 'default'
  | 'price_in_asc'
  | 'price_in_desc'
  | 'price_out_asc'
  | 'price_out_desc'
  | 'context_desc'
  | 'name_asc';

interface ModelPickerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  currentModel: string;
  defaultCategory?: ModelCategory;
  onSelect: (modelId: string) => void;
}

const CATEGORY_TABS: { value: ModelCategory; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'llm', label: 'Чат / LLM' },
  { value: 'decision', label: 'Классификация' },
  { value: 'embedding', label: 'Эмбеддинги' },
  { value: 'image', label: 'Изображения' },
  { value: 'audio', label: 'Аудио' },
];

function formatPrice(value: number | null, currency: string): string {
  if (value === null) return '—';
  const unit = currency === 'RUB' ? '₽' : currency;
  if (value === 0) return `0 ${unit}`;
  if (value < 1) return `${value.toFixed(3)} ${unit}`;
  return `${value.toFixed(2)} ${unit}`;
}

function formatContext(ctx: number | null | undefined): string {
  if (!ctx) return '—';
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
  return String(ctx);
}

export function ModelPickerModal({
  open,
  onClose,
  title,
  currentModel,
  defaultCategory = 'all',
  onSelect,
}: ModelPickerModalProps) {
  const [category, setCategory] = useState<ModelCategory>(defaultCategory);
  const [search, setSearch] = useState('');
  const [onlyFz152, setOnlyFz152] = useState(false);
  const [onlyWithPrice, setOnlyWithPrice] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [customId, setCustomId] = useState('');

  const [models, setModels] = useState<PolzaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModels = useCallback(
    async (cat: ModelCategory, forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          category: cat,
          include_providers: 'true',
          include_capabilities: 'true',
        });
        if (forceRefresh) {
          params.set('refresh', 'true');
        }
        const res = await fetch(`/api/admin/polza/models?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = (await res.json().catch(() => ({}))) as {
          models?: PolzaModel[];
          detail?: string;
        };
        if (!res.ok) {
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        setModels(Array.isArray(data.models) ? data.models : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить каталог');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    setCategory(defaultCategory);
    setCustomId(currentModel);
    void loadModels(defaultCategory, false);
  }, [open, defaultCategory, currentModel, loadModels]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const filteredModels = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const list = models
      .map((model) => ({
        model,
        price: extractModelPricing(model),
      }))
      .filter(({ model, price }) => {
        if (onlyFz152 && !model.is_fz152_compliant) return false;
        if (
          onlyWithPrice &&
          price.promptPerMillion === null &&
          price.completionPerMillion === null
        ) {
          return false;
        }
        if (!needle) return true;
        return (
          model.id.toLowerCase().includes(needle) ||
          (model.name || '').toLowerCase().includes(needle) ||
          (model.short_description || '').toLowerCase().includes(needle)
        );
      });

    if (sortBy === 'default') return list;

    return [...list].sort((a, b) => {
      if (sortBy === 'price_in_asc' || sortBy === 'price_in_desc') {
        const av = a.price.promptPerMillion;
        const bv = b.price.promptPerMillion;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return sortBy === 'price_in_asc' ? av - bv : bv - av;
      }

      if (sortBy === 'price_out_asc' || sortBy === 'price_out_desc') {
        const av = a.price.completionPerMillion;
        const bv = b.price.completionPerMillion;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return sortBy === 'price_out_asc' ? av - bv : bv - av;
      }

      if (sortBy === 'context_desc') {
        return (b.model.context_length ?? 0) - (a.model.context_length ?? 0);
      }

      return (a.model.name || a.model.id).localeCompare(
        b.model.name || b.model.id,
        'ru',
      );
    });
  }, [models, search, onlyFz152, onlyWithPrice, sortBy]);

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
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              {title}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Текущее значение:{' '}
              <code className="text-blue-300 font-mono">{currentModel}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadModels(category, true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/60 text-xs text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Обновить список с сервера"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Обновить
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-800/70 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-800/80 space-y-3 bg-slate-900/30">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setCategory(tab.value);
                  void loadModels(tab.value, false);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer',
                  category === tab.value
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                    : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию, slug или описанию..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-gray-900/80 border border-gray-700/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/60"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex items-center">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-10 pl-8 pr-3 rounded-xl bg-gray-900/80 border border-gray-700/60 text-xs text-gray-200 focus:outline-none focus:border-blue-500/60 cursor-pointer"
                >
                  <option value="default">Сортировка: По умолчанию</option>
                  <option value="price_in_asc">Цена входа: Сначала дешевле</option>
                  <option value="price_in_desc">Цена входа: Сначала дороже</option>
                  <option value="price_out_asc">Цена выхода: Сначала дешевле</option>
                  <option value="price_out_desc">Цена выхода: Сначала дороже</option>
                  <option value="context_desc">Контекст: Сначала больше</option>
                  <option value="name_asc">Название: А–Я</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setOnlyFz152((v) => !v)}
                className={cn(
                  'h-10 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer',
                  onlyFz152
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-gray-900/80 border-gray-700/60 text-gray-400 hover:text-white',
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                152-ФЗ
              </button>

              <button
                type="button"
                onClick={() => setOnlyWithPrice((v) => !v)}
                className={cn(
                  'h-10 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer',
                  onlyWithPrice
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                    : 'bg-gray-900/80 border-gray-700/60 text-gray-400 hover:text-white',
                )}
              >
                С ценой
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-64">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-gray-400">
              <LoadingSpinner size={32} />
              <span>Загрузка каталога моделей...</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              Ошибка загрузки: {error}
            </div>
          )}

          {!loading && !error && filteredModels.length === 0 && (
            <div className="text-center py-16 text-sm text-gray-400">
              По заданным фильтрам модели не найдены. Вы можете указать идентификатор вручную ниже.
            </div>
          )}

          {!loading &&
            !error &&
            filteredModels.map(({ model, price }) => {
              const isSelected = model.id === currentModel;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelect(model.id);
                    onClose();
                  }}
                  className={cn(
                    'w-full text-left rounded-2xl border p-4 transition-all cursor-pointer group',
                    isSelected
                      ? 'bg-blue-500/15 border-blue-500/50 shadow-lg shadow-blue-500/5'
                      : 'bg-slate-900/50 border-gray-800 hover:border-blue-500/40 hover:bg-slate-900/80',
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">
                          {model.name || model.id}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-[11px] font-medium text-blue-200">
                            <Check className="w-3 h-3" /> Выбрана
                          </span>
                        )}
                        {model.is_fz152_compliant && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-medium text-emerald-300">
                            152-ФЗ
                          </span>
                        )}
                        {model.type && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-[11px] text-gray-400 font-mono">
                            {model.type}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-mono text-gray-400 mt-1 truncate">
                        {model.id}
                      </div>

                      {model.short_description && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                          {model.short_description}
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-1.5 shrink-0 text-right">
                      <div className="flex flex-wrap sm:flex-col items-end gap-1 text-xs font-mono tabular-nums">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300">
                          Вход: {formatPrice(price.promptPerMillion, price.currency)} / 1M
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300">
                          Выход: {formatPrice(price.completionPerMillion, price.currency)} / 1M
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono">
                        Контекст: {formatContext(model.context_length)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        <div className="p-4 border-t border-gray-800 bg-slate-900/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              placeholder="Или укажите идентификатор вручную..."
              className="flex-1 h-9 px-3 rounded-xl bg-gray-950/80 border border-gray-700/60 text-xs font-mono text-white focus:outline-none focus:border-blue-500/60"
            />
            <button
              type="button"
              onClick={() => {
                if (customId.trim()) {
                  onSelect(customId.trim());
                  onClose();
                }
              }}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
            >
              Применить ID
            </button>
          </div>
          <div className="text-xs text-gray-500 text-right shrink-0">
            Найдено: {filteredModels.length}
          </div>
        </div>
      </div>
    </div>
  );
}