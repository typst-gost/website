'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react';
import {
  CHANNEL_META,
  type ChannelName,
  type ConversationDetail,
  type ConversationSummary,
} from '@/lib/admin/types';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/spinner';
import { AdminMarkdownMessage } from './markdown-message';

interface ConversationsPanelProps {
  docsBaseUrl?: string;
  onDataMutated?: () => void;
}

const PAGE_SIZE = 30;

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ConversationsPanel({
  docsBaseUrl = 'https://typst-gost.ru',
  onDataMutated,
}: ConversationsPanelProps) {
  const [channel, setChannel] = useState<ChannelName | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [guardFilter, setGuardFilter] = useState<'' | 'true' | 'false'>('');
  const [offset, setOffset] = useState(0);
  const [listReloadTick, setListReloadTick] = useState(0);

  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailReloadTick, setDetailReloadTick] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (searchInput === searchQuery) return;
    const t = setTimeout(() => {
      setOffset(0);
      setListLoading(true);
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (channel) params.set('channel', channel);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (userFilter.trim()) params.set('external_user_id', userFilter.trim());
    if (guardFilter) params.set('guard_allowed', guardFilter);

    fetch(`/api/admin/conversations?${params.toString()}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          conversations?: ConversationSummary[];
          total?: number;
          detail?: string;
        };
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const loaded = Array.isArray(data.conversations) ? data.conversations : [];
        setItems(loaded);
        setTotal(typeof data.total === 'number' ? data.total : loaded.length);
        setListError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setListError(
          err instanceof Error ? err.message : 'Ошибка загрузки диалогов',
        );
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [channel, searchQuery, userFilter, guardFilter, offset, listReloadTick]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    fetch(`/api/admin/conversations/${encodeURIComponent(selectedId)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ConversationDetail;
      })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, detailReloadTick]);

  const handleClearContext = async (id: string) => {
    try {
      const res = await fetch('/api/admin/conversations/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setActionMessage('Контекстное окно диалога сброшено');
      setTimeout(() => setActionMessage(null), 3000);
      setDetailLoading(true);
      setDetailReloadTick((t) => t + 1);
    } catch {
      setActionMessage('Не удалось сбросить контекст');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await fetch(
        `/api/admin/conversations/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSelectedId(null);
      setDetail(null);
      setConfirmDelete(false);
      setListLoading(true);
      setListReloadTick((t) => t + 1);
      onDataMutated?.();
    } catch {
      setActionMessage('Не удалось удалить диалог');
    }
  };

  const activeDetail = selectedId && detail?.id === selectedId ? detail : null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по заголовку и тексту сообщений..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-gray-950/70 border border-gray-700/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          <input
            type="text"
            value={userFilter}
            onChange={(e) => {
              const nextVal = e.target.value;
              if (nextVal !== userFilter) {
                setOffset(0);
                setListLoading(true);
                setUserFilter(nextVal);
              }
            }}
            placeholder="User ID / IP фильтр..."
            className="h-10 px-3.5 rounded-xl bg-gray-950/70 border border-gray-700/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/60 font-mono"
          />

          <select
            value={guardFilter}
            onChange={(e) => {
              const nextVal = e.target.value as '' | 'true' | 'false';
              if (nextVal !== guardFilter) {
                setOffset(0);
                setListLoading(true);
                setGuardFilter(nextVal);
              }
            }}
            className="h-10 px-3 rounded-xl bg-gray-950/70 border border-gray-700/60 text-xs text-gray-200 focus:outline-none focus:border-blue-500/60 cursor-pointer"
          >
            <option value="">Статус фильтра: Все</option>
            <option value="true">Только разрешённые</option>
            <option value="false">Только заблокированные</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (channel !== '') {
                setOffset(0);
                setListLoading(true);
                setChannel('');
              }
            }}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer',
              channel === ''
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                : 'bg-gray-900/70 border-gray-800 text-gray-400 hover:text-white',
            )}
          >
            Все каналы
          </button>
          {(Object.keys(CHANNEL_META) as ChannelName[]).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => {
                if (channel !== ch) {
                  setOffset(0);
                  setListLoading(true);
                  setChannel(ch);
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer',
                channel === ch
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                  : 'bg-gray-900/70 border-gray-800 text-gray-400 hover:text-white',
              )}
            >
              {CHANNEL_META[ch].shortLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md overflow-hidden flex flex-col max-h-[75vh]">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <span>Найдено диалогов: {total}</span>
            <span className="font-mono">
              Стр. {currentPage}/{totalPages}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-800/70">
            {listLoading && (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size={28} />
              </div>
            )}

            {!listLoading && listError && (
              <div className="p-4 text-xs text-red-300">{listError}</div>
            )}

            {!listLoading && !listError && items.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">
                Диалогов по выбранным фильтрам не найдено
              </div>
            )}

            {!listLoading &&
              !listError &&
              items.map((item) => {
                const meta = CHANNEL_META[item.channel] ?? CHANNEL_META.external;
                const isSelected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id !== selectedId) {
                        setConfirmDelete(false);
                        setDetailLoading(true);
                        setSelectedId(item.id);
                      }
                    }}
                    className={cn(
                      'w-full text-left p-3.5 transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-blue-500/15 border-l-2 border-l-blue-500'
                        : 'hover:bg-slate-800/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md border text-[10px] font-semibold',
                          meta.colorClass,
                        )}
                      >
                        {meta.shortLabel}
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono">
                        {formatDateTime(item.updated_at)}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-white line-clamp-1">
                      {item.title || item.id}
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                      {item.last_message_preview || 'Пустой диалог'}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                      <span className="truncate max-w-44">
                        {item.external_user_id || item.id}
                      </span>
                      <span>{item.message_count} сообщ.</span>
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="px-3 py-2.5 border-t border-gray-800 flex items-center justify-between bg-gray-950/50">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => {
                const next = Math.max(0, offset - PAGE_SIZE);
                if (next !== offset) {
                  setListLoading(true);
                  setOffset(next);
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Назад
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => {
                setListLoading(true);
                setOffset((v) => v + PAGE_SIZE);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-300 disabled:opacity-40 cursor-pointer"
            >
              Вперёд <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md flex flex-col min-h-[500px] max-h-[75vh] overflow-hidden">
          {!selectedId && (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-500">
              <MessageSquare className="w-10 h-10 mb-3 text-gray-600" />
              <p className="text-sm font-medium text-gray-300">
                Выберите диалог слева
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Здесь отобразится полная переписка с поддержкой Markdown и телеметрией
              </p>
            </div>
          )}

          {selectedId && detailLoading && (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner size={32} />
            </div>
          )}

          {selectedId && !detailLoading && activeDetail && (
            <>
              <div className="px-5 py-4 border-b border-gray-800 bg-slate-900/70 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md border text-[11px] font-semibold',
                        (CHANNEL_META[activeDetail.channel] ?? CHANNEL_META.external)
                          .colorClass,
                      )}
                    >
                      {(CHANNEL_META[activeDetail.channel] ?? CHANNEL_META.external).label}
                    </span>
                    <span className="text-xs font-mono text-gray-500 truncate max-w-xs">
                      {activeDetail.id}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5">
                    {activeDetail.title || 'Без названия'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-gray-400 font-mono">
                    {activeDetail.external_user_id && (
                      <span>User: {activeDetail.external_user_id}</span>
                    )}
                    {activeDetail.external_chat_id && (
                      <span>Chat: {activeDetail.external_chat_id}</span>
                    )}
                    <span>Создан: {formatDateTime(activeDetail.created_at)}</span>
                    {activeDetail.context_reset_at && (
                      <span className="text-amber-300">
                        Контекст сброшен: {formatDateTime(activeDetail.context_reset_at)}
                      </span>
                    )}
                  </div>
                  {typeof activeDetail.metadata?.page_location === 'string' && (
                    <a
                      href={activeDetail.metadata.page_location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-1"
                    >
                      {String(
                        activeDetail.metadata.page_title ||
                          activeDetail.metadata.page_location,
                      )}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleClearContext(activeDetail.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700/60 text-xs text-gray-300 hover:text-white transition-colors cursor-pointer"
                    title="Сбросить контекстное окно (история в БД сохранится)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Сбросить контекст
                  </button>

                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs text-red-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleDeleteConversation(activeDetail.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white cursor-pointer"
                      >
                        Подтвердить
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-2.5 py-1.5 rounded-xl bg-gray-800 text-xs text-gray-300 cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {actionMessage && (
                <div className="px-5 py-2 bg-blue-500/10 border-b border-blue-500/20 text-xs text-blue-300">
                  {actionMessage}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {activeDetail.messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col gap-2',
                        isUser ? 'items-end' : 'items-start',
                      )}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1 font-medium text-gray-400">
                          {isUser ? (
                            <>
                              <User className="w-3.5 h-3.5 text-blue-400" />
                              Пользователь
                            </>
                          ) : (
                            <>
                              <Bot className="w-3.5 h-3.5 text-emerald-400" />
                              Система
                            </>
                          )}
                        </span>
                        <span className="font-mono">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>

                      <div
                        className={cn(
                          'rounded-2xl border p-4 max-w-full',
                          isUser
                            ? 'bg-blue-600/15 border-blue-500/30 w-fit max-w-[90%]'
                            : 'bg-gray-950/70 border-gray-800 w-full',
                        )}
                      >
                        <AdminMarkdownMessage
                          text={msg.content}
                          sources={msg.sources}
                          docsBaseUrl={docsBaseUrl}
                        />

                        {!isUser && (
                          <div className="mt-3 pt-3 border-t border-gray-800/80 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                              {msg.llm_model && (
                                <span className="px-2 py-0.5 rounded-md bg-gray-900 border border-gray-800 text-gray-300">
                                  {msg.llm_model}
                                </span>
                              )}

                              {msg.guard_allowed !== null && (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border',
                                    msg.guard_allowed
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                      : 'bg-red-500/10 border-red-500/30 text-red-300',
                                  )}
                                >
                                  {msg.guard_allowed ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <ShieldAlert className="w-3 h-3" />
                                  )}
                                  {msg.guard_intent || 'guard'}
                                  {msg.guard_offtopic_prob !== null &&
                                    ` (off=${msg.guard_offtopic_prob.toFixed(2)}, noul=${(msg.guard_noul_prob ?? 0).toFixed(2)})`}
                                </span>
                              )}

                              {msg.rag_selected !== null && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                  RAG: {msg.rag_selected}/{msg.rag_candidates ?? 0}
                                  {msg.rag_cited !== null ? ` (цит. ${msg.rag_cited})` : ''}
                                  {msg.rag_top_score !== null
                                    ? ` · score ${msg.rag_top_score.toFixed(3)}`
                                    : ''}
                                </span>
                              )}

                              {msg.latency_ms !== null && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-900 border border-gray-800 text-gray-400">
                                  <Clock className="w-3 h-3" />
                                  {Math.round(msg.latency_ms)} мс
                                </span>
                              )}

                              {msg.usage?.total_tokens !== undefined && (
                                <span className="px-2 py-0.5 rounded-md bg-gray-900 border border-gray-800 text-gray-400">
                                  {msg.usage.total_tokens} ток.
                                  {typeof (msg.usage.cost_rub ?? msg.usage.cost) ===
                                    'number' &&
                                    ` · ${Number(msg.usage.cost_rub ?? msg.usage.cost).toFixed(4)} ₽`}
                                </span>
                              )}

                              {msg.stopped && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                  Остановлено
                                </span>
                              )}
                            </div>

                            {msg.error && (
                              <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                {msg.error}
                              </div>
                            )}

                            {msg.sources && msg.sources.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {msg.sources.map((src, idx) => (
                                  <a
                                    key={`${src.url}-${idx}`}
                                    href={
                                      src.url.startsWith('http')
                                        ? src.url
                                        : `${docsBaseUrl.replace(/\/+$/, '')}${src.url}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[11px] text-gray-300 transition-colors"
                                  >
                                    <span className="font-mono text-blue-400">
                                      [{src.label ?? idx + 1}]
                                    </span>
                                    <span className="truncate max-w-52">
                                      {src.title || src.url}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}