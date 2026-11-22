'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  Cpu,
  Layers,
  RotateCcw,
  Save,
  Shield,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  CHANNEL_META,
  type ChannelName,
  type ModelCategory,
  type ProfileConfig,
} from '@/lib/admin/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/buttons/button';
import { LoadingSpinner } from '@/components/ui/spinner';
import { ModelPickerModal } from './model-picker-modal';

interface ProfilesPanelProps {
  profiles: ProfileConfig[];
  onProfilesChange: () => Promise<void>;
}

const PROMPT_VARIABLES = ['{context}', '{assets_section}', '{current_page_section}'];

export function ProfilesPanel({
  profiles,
  onProfilesChange,
}: ProfilesPanelProps) {
  const [selectedId, setSelectedId] = useState<ChannelName>('website');
  const [draft, setDraft] = useState<ProfileConfig | null>(null);
  const [questionsJson, setQuestionsJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [pickerTarget, setPickerTarget] = useState<{
    mode: 'profile_llm' | 'profile_decision' | 'bulk_llm' | 'bulk_decision';
    title: string;
    category: ModelCategory;
    current: string;
  } | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLlm, setBulkLlm] = useState('');
  const [bulkDecision, setBulkDecision] = useState('');
  const [bulkGuardEnabled, setBulkGuardEnabled] = useState<'keep' | 'true' | 'false'>('keep');
  const [bulkOfftopic, setBulkOfftopic] = useState('');
  const [bulkNoul, setBulkNoul] = useState('');
  const [bulkTimeout, setBulkTimeout] = useState('');
  const [bulkDebug, setBulkDebug] = useState<'keep' | 'true' | 'false'>('keep');
  const [bulkSaving, setBulkSaving] = useState(false);

  const activeProfile =
    profiles.find((p) => p.profile_id === selectedId) ?? profiles[0] ?? null;

  useEffect(() => {
    if (!activeProfile) return;
    setDraft(structuredClone(activeProfile));
    setQuestionsJson(JSON.stringify(activeProfile.decision_questions, null, 2));
    setJsonError(null);
  }, [activeProfile]);

  const handleSaveProfile = async () => {
    if (!draft) return;
    let parsedQuestions: Record<string, unknown>;
    try {
      parsedQuestions = JSON.parse(questionsJson) as Record<string, unknown>;
      setJsonError(null);
    } catch (err) {
      setJsonError(
        err instanceof Error ? `Ошибка JSON: ${err.message}` : 'Некорректный JSON',
      );
      return;
    }

    setSaving(true);
    setStatusBanner(null);

    try {
      const payload = {
        enabled: draft.enabled,
        llm_model: draft.llm_model,
        decision_model: draft.decision_model,
        temperature: Number(draft.temperature),
        max_tokens: draft.max_tokens ? Number(draft.max_tokens) : null,
        system_prompt: draft.system_prompt,
        decision_questions: parsedQuestions,
        refusal_reply: draft.refusal_reply,
        no_docs_reply: draft.no_docs_reply,
        guard_enabled: draft.guard_enabled,
        guard_offtopic_threshold: Number(draft.guard_offtopic_threshold),
        guard_noul_threshold: Number(draft.guard_noul_threshold),
        guard_timeout_seconds: Number(draft.guard_timeout_seconds),
        guard_debug: draft.guard_debug,
        max_query_chars: Number(draft.max_query_chars),
        use_history: draft.use_history,
        history_max_messages: Number(draft.history_max_messages),
        history_ttl_seconds: Number(draft.history_ttl_seconds),
        include_assets_in_prompt: draft.include_assets_in_prompt,
        source_url_mode: draft.source_url_mode,
      };

      const res = await fetch(`/api/admin/profiles/${draft.profile_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

      await onProfilesChange();
      setStatusBanner({
        type: 'success',
        text: `Профиль «${draft.display_name}» сохранён`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось сохранить профиль',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetProfile = async () => {
    if (!draft) return;
    setResetting(true);
    setStatusBanner(null);
    try {
      const res = await fetch(`/api/admin/profiles/${draft.profile_id}/reset`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await onProfilesChange();
      setStatusBanner({
        type: 'success',
        text: `Профиль «${draft.display_name}» сброшен к значениям по умолчанию`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ошибка сброса профиля',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleBulkTelegramUpdate = async () => {
    const payload: Record<string, unknown> = {};
    if (bulkLlm.trim()) payload.llm_model = bulkLlm.trim();
    if (bulkDecision.trim()) payload.decision_model = bulkDecision.trim();
    if (bulkGuardEnabled !== 'keep') payload.guard_enabled = bulkGuardEnabled === 'true';
    if (bulkOfftopic !== '') payload.guard_offtopic_threshold = Number(bulkOfftopic);
    if (bulkNoul !== '') payload.guard_noul_threshold = Number(bulkNoul);
    if (bulkTimeout !== '') payload.guard_timeout_seconds = Number(bulkTimeout);
    if (bulkDebug !== 'keep') payload.guard_debug = bulkDebug === 'true';

    if (Object.keys(payload).length === 0) {
      setStatusBanner({
        type: 'error',
        text: 'Укажите хотя бы один параметр для массового обновления Telegram',
      });
      return;
    }

    setBulkSaving(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/profiles/telegram/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        updated?: number;
        detail?: string;
      };
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      await onProfilesChange();
      setBulkOpen(false);
      setStatusBanner({
        type: 'success',
        text: `Обновлены Telegram-профили (${data.updated ?? 3})`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ошибка массового обновления',
      });
    } finally {
      setBulkSaving(false);
    }
  };

  if (!draft) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => {
            const meta = CHANNEL_META[p.profile_id] ?? CHANNEL_META.external;
            const active = p.profile_id === draft.profile_id;
            return (
              <button
                key={p.profile_id}
                type="button"
                onClick={() => {
                  setSelectedId(p.profile_id);
                  setStatusBanner(null);
                }}
                className={cn(
                  'px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer',
                  active
                    ? 'bg-blue-500/20 border-blue-500/50 text-white shadow-sm'
                    : 'bg-slate-900/50 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700',
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    p.enabled ? 'bg-emerald-400' : 'bg-gray-600',
                  )}
                />
                {meta.shortLabel}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setBulkOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-semibold text-sky-300 transition-colors cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          Массово для Telegram
        </button>
      </div>

      {bulkOpen && (
        <div className="rounded-2xl border border-sky-500/30 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Массовое обновление Telegram-профилей
              </h3>
              <p className="text-xs text-gray-400">
                Применится сразу к <code className="font-mono">telegram_private</code>,{' '}
                <code className="font-mono">telegram_group</code> и{' '}
                <code className="font-mono">telegram_fix</code>. Пустые поля не изменяются.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">LLM-модель</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={bulkLlm}
                  onChange={(e) => setBulkLlm(e.target.value)}
                  placeholder="Оставить без изменений"
                  className="flex-1 h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPickerTarget({
                      mode: 'bulk_llm',
                      title: 'Выбор LLM-модели для всех Telegram-каналов',
                      category: 'llm',
                      current: bulkLlm,
                    })
                  }
                  className="px-3 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 cursor-pointer"
                >
                  Выбрать
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Decision-модель
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={bulkDecision}
                  onChange={(e) => setBulkDecision(e.target.value)}
                  placeholder="Оставить без изменений"
                  className="flex-1 h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPickerTarget({
                      mode: 'bulk_decision',
                      title: 'Выбор Decision-модели для всех Telegram-каналов',
                      category: 'decision',
                      current: bulkDecision,
                    })
                  }
                  className="px-3 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 cursor-pointer"
                >
                  Выбрать
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Фильтр (Guard)
              </label>
              <select
                value={bulkGuardEnabled}
                onChange={(e) =>
                  setBulkGuardEnabled(e.target.value as 'keep' | 'true' | 'false')
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs text-white"
              >
                <option value="keep">Не изменять</option>
                <option value="true">Включить для всех</option>
                <option value="false">Отключить для всех</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Порог offtopic (0–1)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={bulkOfftopic}
                onChange={(e) => setBulkOfftopic(e.target.value)}
                placeholder="Например: 0.85"
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Порог noul (0–1)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={bulkNoul}
                onChange={(e) => setBulkNoul(e.target.value)}
                placeholder="Например: 0.80"
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Таймаут (сек)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  value={bulkTimeout}
                  onChange={(e) => setBulkTimeout(e.target.value)}
                  placeholder="3.0"
                  className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Debug</label>
                <select
                  value={bulkDebug}
                  onChange={(e) =>
                    setBulkDebug(e.target.value as 'keep' | 'true' | 'false')
                  }
                  className="w-full h-9 px-2 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs text-white"
                >
                  <option value="keep">Не менять</option>
                  <option value="true">Вкл</option>
                  <option value="false">Выкл</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="px-4 py-2 rounded-xl bg-gray-800 text-xs text-gray-300 cursor-pointer"
            >
              Отмена
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={bulkSaving}
              onClick={() => void handleBulkTelegramUpdate()}
              className="text-white"
            >
              {bulkSaving ? 'Применение...' : 'Применить ко всем TG'}
            </Button>
          </div>
        </div>
      )}

      {statusBanner && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm flex items-center gap-2',
            statusBanner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300',
          )}
        >
          {statusBanner.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
          <span>{statusBanner.text}</span>
        </div>
      )}

      <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white">{draft.display_name}</h2>
              <span className="px-2 py-0.5 rounded-md bg-gray-800 text-[11px] font-mono text-gray-400">
                {draft.profile_id}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{draft.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-950/70 border border-gray-800 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                className="accent-blue-500 w-4 h-4"
              />
              <span>Канал активен</span>
            </label>

            <button
              type="button"
              onClick={() => void handleResetProfile()}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/60 text-xs text-gray-300 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сбросить
            </button>

            <Button
              type="button"
              variant="primary"
              disabled={saving}
              onClick={() => void handleSaveProfile()}
              className="text-white"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Основная модель (LLM)
              </span>
              <button
                type="button"
                onClick={() =>
                  setPickerTarget({
                    mode: 'profile_llm',
                    title: `Выбор LLM-модели (${draft.profile_id})`,
                    category: 'llm',
                    current: draft.llm_model,
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-xs font-medium text-blue-300 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Каталог и цены
              </button>
            </div>
            <input
              type="text"
              value={draft.llm_model}
              onChange={(e) => setDraft({ ...draft, llm_model: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-gray-900 border border-gray-700/60 text-sm font-mono text-white focus:outline-none focus:border-blue-500/60"
            />
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                Модель классификатора (Decision)
              </span>
              <button
                type="button"
                onClick={() =>
                  setPickerTarget({
                    mode: 'profile_decision',
                    title: `Выбор Decision-модели (${draft.profile_id})`,
                    category: 'decision',
                    current: draft.decision_model,
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs font-medium text-purple-300 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Каталог и цены
              </button>
            </div>
            <input
              type="text"
              value={draft.decision_model}
              onChange={(e) => setDraft({ ...draft, decision_model: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-gray-900 border border-gray-700/60 text-sm font-mono text-white focus:outline-none focus:border-blue-500/60"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            Параметры генерации и контекста
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>Temperature</span>
                <span className="font-mono text-white">{draft.temperature}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={draft.temperature}
                onChange={(e) =>
                  setDraft({ ...draft, temperature: Number(e.target.value) })
                }
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Max tokens (пусто = авто)
              </label>
              <input
                type="number"
                min="64"
                max="32768"
                value={draft.max_tokens ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    max_tokens: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Авто"
                className="w-full h-9 px-3 rounded-xl bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Макс. длина запроса (симв.)
              </label>
              <input
                type="number"
                min="50"
                max="50000"
                value={draft.max_query_chars}
                onChange={(e) =>
                  setDraft({ ...draft, max_query_chars: Number(e.target.value) })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Формат ссылок в источниках
              </label>
              <select
                value={draft.source_url_mode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    source_url_mode: e.target.value as 'relative' | 'absolute',
                  })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-900 border border-gray-700/60 text-xs text-white"
              >
                <option value="relative">Относительные (/docs/...)</option>
                <option value="absolute">Абсолютные (https://...)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-800/70">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.use_history}
                onChange={(e) =>
                  setDraft({ ...draft, use_history: e.target.checked })
                }
                className="accent-blue-500 w-4 h-4"
              />
              Учитывать историю диалога
            </label>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Сообщений в памяти
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={draft.history_max_messages}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    history_max_messages: Number(e.target.value),
                  })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                TTL истории (сек.)
              </label>
              <input
                type="number"
                min="60"
                max="604800"
                value={draft.history_ttl_seconds}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    history_ttl_seconds: Number(e.target.value),
                  })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.include_assets_in_prompt}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    include_assets_in_prompt: e.target.checked,
                  })
                }
                className="accent-blue-500 w-4 h-4"
              />
              Передавать список compile_assets
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Системный промпт
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-500">Переменные:</span>
              {PROMPT_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      system_prompt: `${draft.system_prompt}\n${v}`,
                    })
                  }
                  className="px-2 py-0.5 rounded-md bg-gray-800 hover:bg-gray-700 text-[11px] font-mono text-blue-300 cursor-pointer"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={12}
            value={draft.system_prompt}
            onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })}
            className="w-full rounded-2xl bg-gray-950/80 border border-gray-700/60 p-4 text-xs font-mono text-gray-200 leading-relaxed focus:outline-none focus:border-blue-500/60"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Ответ при отклонении фильтром (refusal_reply)
            </label>
            <textarea
              rows={4}
              value={draft.refusal_reply}
              onChange={(e) => setDraft({ ...draft, refusal_reply: e.target.value })}
              className="w-full rounded-2xl bg-gray-950/80 border border-gray-700/60 p-3 text-xs text-gray-200 focus:outline-none focus:border-blue-500/60"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Ответ при отсутствии в базе (no_docs_reply)
            </label>
            <textarea
              rows={4}
              value={draft.no_docs_reply}
              onChange={(e) => setDraft({ ...draft, no_docs_reply: e.target.value })}
              className="w-full rounded-2xl bg-gray-950/80 border border-gray-700/60 p-3 text-xs text-gray-200 focus:outline-none focus:border-blue-500/60"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              Фильтрация запросов (Guard)
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.guard_enabled}
                  onChange={(e) =>
                    setDraft({ ...draft, guard_enabled: e.target.checked })
                  }
                  className="accent-blue-500 w-4 h-4"
                />
                Включить фильтр
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.guard_debug}
                  onChange={(e) =>
                    setDraft({ ...draft, guard_debug: e.target.checked })
                  }
                  className="accent-purple-500 w-4 h-4"
                />
                Добавлять debug-блок к ответам
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Порог offtopic</span>
                <span className="font-mono text-white">
                  {draft.guard_offtopic_threshold}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={draft.guard_offtopic_threshold}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    guard_offtopic_threshold: Number(e.target.value),
                  })
                }
                className="w-full accent-purple-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Порог noul (уверенность)</span>
                <span className="font-mono text-white">
                  {draft.guard_noul_threshold}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={draft.guard_noul_threshold}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    guard_noul_threshold: Number(e.target.value),
                  })
                }
                className="w-full accent-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Таймаут (сек.)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="30"
                value={draft.guard_timeout_seconds}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    guard_timeout_seconds: Number(e.target.value),
                  })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-900 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-800/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-gray-400" />
                Критерии классификации (decision_questions JSON)
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(questionsJson);
                    setQuestionsJson(JSON.stringify(parsed, null, 2));
                    setJsonError(null);
                  } catch (err) {
                    setJsonError(
                      err instanceof Error ? err.message : 'Некорректный JSON',
                    );
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-300 cursor-pointer"
              >
                Форматировать JSON
              </button>
            </div>
            <textarea
              rows={10}
              value={questionsJson}
              onChange={(e) => {
                setQuestionsJson(e.target.value);
                setJsonError(null);
              }}
              className="w-full rounded-xl bg-gray-950/90 border border-gray-700/60 p-3 text-xs font-mono text-gray-300 leading-relaxed focus:outline-none focus:border-blue-500/60"
            />
            {jsonError && (
              <p className="text-xs text-red-400 font-mono">{jsonError}</p>
            )}
          </div>
        </div>
      </div>

      <ModelPickerModal
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        title={pickerTarget?.title || 'Выбор модели'}
        currentModel={pickerTarget?.current || ''}
        defaultCategory={pickerTarget?.category || 'all'}
        onSelect={(modelId) => {
          if (!pickerTarget) return;
          if (pickerTarget.mode === 'profile_llm' && draft) {
            setDraft({ ...draft, llm_model: modelId });
          } else if (pickerTarget.mode === 'profile_decision' && draft) {
            setDraft({ ...draft, decision_model: modelId });
          } else if (pickerTarget.mode === 'bulk_llm') {
            setBulkLlm(modelId);
          } else if (pickerTarget.mode === 'bulk_decision') {
            setBulkDecision(modelId);
          }
        }}
      />
    </div>
  );
}