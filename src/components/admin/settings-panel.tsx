'use client';

import { useState } from 'react';
import { Check, Cpu, Globe, Save, Search, ShieldAlert, Sparkles } from 'lucide-react';
import type { GatewaySettings } from '@/lib/admin/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/buttons/button';
import { LoadingSpinner } from '@/components/ui/spinner';
import { ModelPickerModal } from './model-picker-modal';

interface SettingsPanelProps {
  settings: GatewaySettings | null;
  onSaved: () => Promise<void>;
}

function SettingsEditor({
  settings,
  onSaved,
}: {
  settings: GatewaySettings;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<GatewaySettings>(() => ({ ...settings }));
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

      await onSaved();
      setBanner({
        type: 'success',
        text: 'Системные настройки успешно сохранены',
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ошибка сохранения настроек',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Системные настройки</h2>
          <p className="text-xs text-gray-400">
            Глобальные параметры поиска по документации, индексации, ограничений и подключений
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          disabled={saving}
          onClick={() => void handleSave()}
          className="text-white"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </div>

      {banner && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm flex items-center gap-2',
            banner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300',
          )}
        >
          {banner.type === 'success' && <Check className="w-4 h-4" />}
          <span>{banner.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Векторный поиск и контекст (RAG)
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Модель эмбеддингов
              </label>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-xs text-blue-300 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Выбрать из каталога
              </button>
            </div>
            <input
              type="text"
              value={draft.embedding_model}
              onChange={(e) =>
                setDraft({ ...draft, embedding_model: e.target.value })
              }
              className="w-full h-10 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-sm font-mono text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Мин. порог score (0–1)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={draft.rag_min_score}
                onChange={(e) =>
                  setDraft({ ...draft, rag_min_score: Number(e.target.value) })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Относительный порог (rel_ratio)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={draft.rag_rel_ratio}
                onChange={(e) =>
                  setDraft({ ...draft, rag_rel_ratio: Number(e.target.value) })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Макс. источников в ответе
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={draft.rag_max_sources}
                onChange={(e) =>
                  setDraft({ ...draft, rag_max_sources: Number(e.target.value) })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Кандидатов поиска (limit)
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={draft.rag_search_limit}
                onChange={(e) =>
                  setDraft({ ...draft, rag_search_limit: Number(e.target.value) })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Макс. символов на страницу
              </label>
              <input
                type="number"
                min="1000"
                max="50000"
                value={draft.rag_max_page_chars}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rag_max_page_chars: Number(e.target.value),
                  })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Общий лимит контекста (симв.)
              </label>
              <input
                type="number"
                min="2000"
                max="100000"
                value={draft.rag_max_total_context_chars}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rag_max_total_context_chars: Number(e.target.value),
                  })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-400" />
            Источник документации и индексация
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Базовый URL документации
              </label>
              <input
                type="text"
                value={draft.docs_base_url}
                onChange={(e) =>
                  setDraft({ ...draft, docs_base_url: e.target.value })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                GitHub-репозиторий
              </label>
              <input
                type="text"
                value={draft.docs_repo_slug}
                onChange={(e) =>
                  setDraft({ ...draft, docs_repo_slug: e.target.value })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Ветка</label>
              <input
                type="text"
                value={draft.docs_repo_branch}
                onChange={(e) =>
                  setDraft({ ...draft, docs_repo_branch: e.target.value })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Папка документации
              </label>
              <input
                type="text"
                value={draft.docs_repo_docs_subdir}
                onChange={(e) =>
                  setDraft({ ...draft, docs_repo_docs_subdir: e.target.value })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Папка compile_assets
              </label>
              <input
                type="text"
                value={draft.docs_repo_assets_subdir}
                onChange={(e) =>
                  setDraft({ ...draft, docs_repo_assets_subdir: e.target.value })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Чанк
                </label>
                <input
                  type="number"
                  min="500"
                  max="8000"
                  value={draft.chunk_max_chars}
                  onChange={(e) =>
                    setDraft({ ...draft, chunk_max_chars: Number(e.target.value) })
                  }
                  className="w-full h-9 px-2 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Overlap
                </label>
                <input
                  type="number"
                  min="0"
                  max="2000"
                  value={draft.chunk_overlap}
                  onChange={(e) =>
                    setDraft({ ...draft, chunk_overlap: Number(e.target.value) })
                  }
                  className="w-full h-9 px-2 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Batch
                </label>
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={draft.index_batch_size}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      index_batch_size: Number(e.target.value),
                    })
                  }
                  className="w-full h-9 px-2 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Ограничение частоты запросов (Rate Limit)
            </span>
            <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.rate_limit_enabled}
                onChange={(e) =>
                  setDraft({ ...draft, rate_limit_enabled: e.target.checked })
                }
                className="accent-blue-500 w-4 h-4"
              />
              Включено
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Макс. запросов в окне
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={draft.rate_limit_requests}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rate_limit_requests: Number(e.target.value),
                  })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Окно (секунд)
              </label>
              <input
                type="number"
                min="1"
                max="3600"
                value={draft.rate_limit_window_seconds}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rate_limit_window_seconds: Number(e.target.value),
                  })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Адреса подключённых сервисов
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Основной сайт (website_base_url)
              </label>
              <input
                type="text"
                value={draft.website_base_url}
                onChange={(e) =>
                  setDraft({ ...draft, website_base_url: e.target.value })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Telegram-сервис (telegram_bot_url)
              </label>
              <input
                type="text"
                value={draft.telegram_bot_url}
                onChange={(e) =>
                  setDraft({ ...draft, telegram_bot_url: e.target.value })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Публичный URL шлюза (gateway_public_url)
              </label>
              <input
                type="text"
                value={draft.gateway_public_url}
                onChange={(e) =>
                  setDraft({ ...draft, gateway_public_url: e.target.value })
                }
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <ModelPickerModal
          key="settings-embedding"
          open
          onClose={() => setPickerOpen(false)}
          title="Выбор модели эмбеддингов"
          currentModel={draft.embedding_model}
          defaultCategory="embedding"
          onSelect={(id) => setDraft({ ...draft, embedding_model: id })}
        />
      )}
    </div>
  );
}

export function SettingsPanel({ settings, onSaved }: SettingsPanelProps) {
  if (!settings) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <SettingsEditor
      key={JSON.stringify(settings)}
      settings={settings}
      onSaved={onSaved}
    />
  );
}