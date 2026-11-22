'use client';

import { useState } from 'react';
import { Play, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import {
  CHANNEL_META,
  type ChannelName,
  type GuardTestResult,
  type ProfileConfig,
} from '@/lib/admin/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/buttons/button';
import { LoadingSpinner } from '@/components/ui/spinner';
import { ModelPickerModal } from './model-picker-modal';

interface GuardTesterPanelProps {
  profiles: ProfileConfig[];
}

export function GuardTesterPanel({ profiles }: GuardTesterPanelProps) {
  const [profileId, setProfileId] = useState<ChannelName>('website');
  const [query, setQuery] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageLocation, setPageLocation] = useState('');
  const [modelOverride, setModelOverride] = useState('');
  const [offtopicOverride, setOfftopicOverride] = useState('');
  const [noulOverride, setNoulOverride] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuardTestResult | null>(null);

  const selectedProfile = profiles.find((p) => p.profile_id === profileId);

  const handleRun = async () => {
    if (!query.trim()) {
      setError('Введите текст запроса для проверки');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        profile_id: profileId,
        query: query.trim(),
      };
      if (pageTitle.trim() || pageLocation.trim()) {
        payload.page_context = {
          title: pageTitle.trim() || null,
          location: pageLocation.trim() || null,
        };
      }
      if (modelOverride.trim()) {
        payload.decision_model_override = modelOverride.trim();
      }
      if (offtopicOverride !== '') {
        payload.offtopic_threshold_override = Number(offtopicOverride);
      }
      if (noulOverride !== '') {
        payload.noul_threshold_override = Number(noulOverride);
      }

      const res = await fetch('/api/admin/test-guard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as GuardTestResult & {
        detail?: string;
      };
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка тестирования');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">
            Проверка правил классификации
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Тестирует запрос через Decision-модель выбранного профиля без сохранения в историю
          </p>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Профиль</label>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value as ChannelName)}
            className="w-full h-10 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-sm text-white"
          >
            {profiles.map((p) => (
              <option key={p.profile_id} value={p.profile_id}>
                {CHANNEL_META[p.profile_id]?.label || p.display_name} ({p.decision_model})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Проверяемый запрос
          </label>
          <textarea
            rows={5}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например: Как сделать альбомную страницу для одного приложения в modern-g7-32?"
            className="w-full rounded-xl bg-gray-950/70 border border-gray-700/60 p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/60"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Заголовок страницы (опц.)
            </label>
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="Приложения"
              className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              URL страницы (опц.)
            </label>
            <input
              type="text"
              value={pageLocation}
              onChange={(e) => setPageLocation(e.target.value)}
              placeholder="/docs/typst-gost/reference/appendixes"
              className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-gray-800 space-y-3">
          <div className="text-xs font-semibold text-gray-400">
            Переопределение параметров на тест (опционально)
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">
              Decision-модель (по умолчанию:{' '}
              <span className="font-mono text-gray-400">
                {selectedProfile?.decision_model}
              </span>
              )
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={modelOverride}
                onChange={(e) => setModelOverride(e.target.value)}
                placeholder="Использовать модель профиля"
                className="flex-1 h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1 px-3 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Выбрать
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">
                Порог offtopic ({selectedProfile?.guard_offtopic_threshold})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={offtopicOverride}
                onChange={(e) => setOfftopicOverride(e.target.value)}
                placeholder="Из профиля"
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">
                Порог noul ({selectedProfile?.guard_noul_threshold})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={noulOverride}
                onChange={(e) => setNoulOverride(e.target.value)}
                placeholder="Из профиля"
                className="w-full h-9 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          disabled={loading}
          onClick={() => void handleRun()}
          className="w-full text-white"
        >
          {loading ? (
            <>
              <LoadingSpinner size={16} />
              <span>Проверка...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Выполнить проверку</span>
            </>
          )}
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 space-y-4 min-h-80">
        <h3 className="text-base font-bold text-white">Результат классификации</h3>

        {!result && (
          <div className="py-16 text-center text-xs text-gray-500">
            Запустите тест, чтобы увидеть вероятности классов и итоговое решение
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div
              className={cn(
                'rounded-2xl border p-4 flex items-center justify-between gap-3',
                result.verdict.allowed
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30',
              )}
            >
              <div className="flex items-center gap-3">
                {result.verdict.allowed ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <div className="font-bold text-white text-sm">
                    {result.verdict.allowed ? 'Запрос разрешён' : 'Запрос заблокирован'}
                  </div>
                  <div className="text-xs font-mono text-gray-400">
                    reason={result.verdict.reason} · intent={result.verdict.intent}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono text-gray-300">
                {Math.round(result.verdict.latency_ms)} мс
              </span>
            </div>

            <div className="space-y-2.5">
              {Object.entries(result.verdict.probabilities).map(([cls, prob]) => (
                <div key={cls} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-300">{cls}</span>
                    <span className="text-white">{(prob * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        cls === 'offtopic'
                          ? 'bg-red-500'
                          : cls === 'domain'
                            ? 'bg-emerald-500'
                            : 'bg-amber-400',
                      )}
                      style={{ width: `${Math.min(100, prob * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300">
                    definitely_abuse (noul, порог {result.verdict.noul_threshold})
                  </span>
                  <span className="text-white">
                    {(result.verdict.abuse_prob * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{
                      width: `${Math.min(100, result.verdict.abuse_prob * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1.5">
                Состояние, переданное классификатору:
              </div>
              <pre className="rounded-xl bg-gray-950 border border-gray-800 p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {result.evaluated_state}
              </pre>
            </div>
          </div>
        )}
      </div>

      {pickerOpen && (
        <ModelPickerModal
          key={`guard-test-${profileId}`}
          open
          onClose={() => setPickerOpen(false)}
          title="Выбор Decision-модели для теста"
          currentModel={modelOverride || selectedProfile?.decision_model || ''}
          defaultCategory="decision"
          onSelect={(id) => setModelOverride(id)}
        />
      )}
    </div>
  );
}