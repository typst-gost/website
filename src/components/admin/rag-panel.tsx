'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileCode2,
  FolderSync,
  RefreshCw,
} from 'lucide-react';
import type { RagStatus } from '@/lib/admin/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/buttons/button';
import { LoadingSpinner } from '@/components/ui/spinner';

interface RagPanelProps {
  status: RagStatus | null;
  onRefresh: () => Promise<void>;
}

function formatDate(iso: string | null): string {
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

export function RagPanel({ status, onRefresh }: RagPanelProps) {
  const [syncGithub, setSyncGithub] = useState(true);
  const [forceReembed, setForceReembed] = useState(false);
  const [background, setBackground] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleReindex = async () => {
    setTriggering(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/rag/reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_github: syncGithub,
          force_reembed: forceReembed,
          background,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        chunks_count?: number;
        files_processed?: number;
        detail?: string;
      };
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

      setMessage({
        type: 'success',
        text:
          data.status === 'started'
            ? 'Фоновая переиндексация запущена'
            : `Переиндексация завершена: файлов ${data.files_processed ?? 0}, чанков ${data.chunks_count ?? 0}`,
      });
      await onRefresh();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ошибка запуска переиндексации',
      });
    } finally {
      setTriggering(false);
    }
  };

  const assets = (status?.compile_assets ?? []).filter((item) =>
    item.toLowerCase().includes(assetSearch.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-5">
          <div className="text-xs text-gray-400 mb-2">Состояние индекса</div>
          <div className="flex items-center gap-2">
            {status?.docs_ready ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <span className="text-lg font-bold text-white">
              {status?.docs_ready ? 'Готов к работе' : 'Не проиндексирован'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1 font-mono">
            {status?.reindex_running ? 'Выполняется обновление...' : 'Ожидание'}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-5">
          <div className="text-xs text-gray-400 mb-2">Чанков в векторной БД</div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            {(status?.docs_count ?? 0).toLocaleString('ru-RU')}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-5">
          <div className="text-xs text-gray-400 mb-2">Ассетов компиляции</div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-purple-400" />
            {status?.compile_assets_count ?? 0}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderSync className="w-4 h-4 text-blue-400" />
              Переиндексация базы знаний
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Загружает актуальную документацию и ассеты из репозитория и пересобирает LanceDB-таблицу
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            disabled={triggering || status?.reindex_running}
            onClick={() => void handleReindex()}
            className="text-white"
          >
            {triggering || status?.reindex_running ? (
              <>
                <LoadingSpinner size={16} />
                <span>Индексация...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Запустить переиндексацию</span>
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-5 pt-2">
          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={syncGithub}
              onChange={(e) => setSyncGithub(e.target.checked)}
              className="accent-blue-500 w-4 h-4"
            />
            Синхронизировать с GitHub
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={forceReembed}
              onChange={(e) => setForceReembed(e.target.checked)}
              className="accent-blue-500 w-4 h-4"
            />
            Пересчитать все эмбеддинги (игнорировать кэш)
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={background}
              onChange={(e) => setBackground(e.target.checked)}
              className="accent-blue-500 w-4 h-4"
            />
            Выполнить в фоне
          </label>
        </div>

        {message && (
          <div
            className={cn(
              'rounded-xl border px-4 py-2.5 text-xs',
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300',
            )}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              История задач индексации
            </h3>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="text-xs text-blue-400 hover:underline cursor-pointer"
            >
              Обновить
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/60 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-2.5">ID</th>
                  <th className="px-4 py-2.5">Статус</th>
                  <th className="px-4 py-2.5">Инициатор</th>
                  <th className="px-4 py-2.5">Файлы / Чанки</th>
                  <th className="px-4 py-2.5">Новых эмбед.</th>
                  <th className="px-4 py-2.5">Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/70">
                {(status?.recent_jobs ?? []).map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-mono text-gray-400">#{job.id}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-medium border',
                          job.status === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : job.status === 'running'
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                              : 'bg-red-500/10 border-red-500/30 text-red-300',
                        )}
                      >
                        {job.status}
                      </span>
                      {job.error && (
                        <div className="text-[11px] text-red-400 mt-1 max-w-48 truncate">
                          {job.error}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">
                      {job.trigger}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">
                      {job.files_processed} / {job.chunks_count}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-400">
                      {job.embeddings_fetched}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-500">
                      {formatDate(job.started_at)}
                    </td>
                  </tr>
                ))}
                {(!status?.recent_jobs || status.recent_jobs.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Задачи индексации ещё не запускались
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 overflow-hidden flex flex-col max-h-96">
          <div className="px-5 py-3 border-b border-gray-800 space-y-2">
            <h3 className="text-sm font-semibold text-white">
              Файлы ассетов ({assets.length})
            </h3>
            <input
              type="text"
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              placeholder="Фильтр файлов..."
              className="w-full h-8 px-3 rounded-lg bg-gray-950/70 border border-gray-800 text-xs text-white"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {assets.map((asset) => (
              <div
                key={asset}
                className="px-2.5 py-1.5 rounded-lg bg-gray-950/50 border border-gray-800/70 text-xs font-mono text-gray-300 truncate"
              >
                {asset}
              </div>
            ))}
            {assets.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-500">
                Ассеты отсутствуют
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}