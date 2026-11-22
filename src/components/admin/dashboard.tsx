'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Clock,
  Coins,
  Database,
  ExternalLink,
  FlaskConical,
  LogOut,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldAlert,
  Sliders,
  Wallet,
} from 'lucide-react';
import {
  CHANNEL_META,
  type AnalyticsData,
  type ConversationSummary,
  type GatewaySettings,
  type PolzaBalance,
  type ProfileConfig,
  type RagStatus,
  type ReadyStatus,
} from '@/lib/admin/types';
import { cn } from '@/lib/utils';
import { PageBackground } from '@/components/decoration/background';
import { LoadingSpinner } from '@/components/ui/spinner';
import {
  ActivityChart,
  ChannelBreakdownChart,
  OutcomesDonutChart,
  TokensBreakdownCard,
} from './charts';
import { ConversationsPanel } from './conversations-panel';
import { ProfilesPanel } from './profiles-panel';
import { RagPanel } from './rag-panel';
import { GuardTesterPanel } from './guard-tester-panel';
import { SettingsPanel } from './settings-panel';

type SectionTab =
  | 'overview'
  | 'conversations'
  | 'profiles'
  | 'rag'
  | 'guard-test'
  | 'settings';

interface AdminDashboardProps {
  initialUser: { username: string; auth_type: string };
  loginPath: string;
}

const NAV_TABS: {
  id: SectionTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Обзор', icon: BarChart3 },
  { id: 'conversations', label: 'Диалоги', icon: MessageSquare },
  { id: 'profiles', label: 'Каналы и модели', icon: Sliders },
  { id: 'rag', label: 'База знаний', icon: Database },
  { id: 'guard-test', label: 'Проверка правил', icon: FlaskConical },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

export function AdminDashboard({ initialUser, loginPath }: AdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SectionTab>('overview');
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [reloadTick, setReloadTick] = useState(0);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [balance, setBalance] = useState<PolzaBalance | null>(null);
  const [readyStatus, setReadyStatus] = useState<ReadyStatus | null>(null);
  const [ragStatus, setRagStatus] = useState<RagStatus | null>(null);
  const [profiles, setProfiles] = useState<ProfileConfig[]>([]);
  const [settings, setSettings] = useState<GatewaySettings | null>(null);
  const [recentConversations, setRecentConversations] = useState<
    ConversationSummary[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    router.replace(loginPath);
    router.refresh();
  }, [router, loginPath]);

  const fetchJson = useCallback(
    async <T,>(url: string): Promise<T | null> => {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(errData.detail || `${url}: HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    },
    [handleUnauthorized],
  );

  useEffect(() => {
    let cancelled = false;
    const analyticsUrl =
      periodDays > 0
        ? `/api/admin/analytics?days=${periodDays}`
        : '/api/admin/analytics?days=3650';

    Promise.allSettled([
      fetchJson<AnalyticsData>(analyticsUrl),
      fetchJson<PolzaBalance>('/api/admin/polza/balance'),
      fetchJson<ReadyStatus>('/api/admin/ready'),
      fetchJson<RagStatus>('/api/admin/rag/status'),
      fetchJson<{ profiles: ProfileConfig[] }>('/api/admin/profiles'),
      fetchJson<GatewaySettings>('/api/admin/settings'),
      fetchJson<{ conversations: ConversationSummary[] }>(
        '/api/admin/conversations?limit=200',
      ),
    ])
      .then((results) => {
        if (cancelled) return;
        const [
          analyticsRes,
          balanceRes,
          readyRes,
          ragRes,
          profilesRes,
          settingsRes,
          convsRes,
        ] = results;

        if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
          setAnalytics(analyticsRes.value);
        }
        if (balanceRes.status === 'fulfilled' && balanceRes.value) {
          setBalance(balanceRes.value);
        }
        if (readyRes.status === 'fulfilled' && readyRes.value) {
          setReadyStatus(readyRes.value);
        }
        if (ragRes.status === 'fulfilled' && ragRes.value) {
          setRagStatus(ragRes.value);
        }
        if (profilesRes.status === 'fulfilled' && profilesRes.value) {
          setProfiles(profilesRes.value.profiles || []);
        }
        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          setSettings(settingsRes.value);
        }
        if (convsRes.status === 'fulfilled' && convsRes.value) {
          setRecentConversations(convsRes.value.conversations || []);
        }

        const rejected = results.filter(
          (r): r is PromiseRejectedResult => r.status === 'rejected',
        );
        if (rejected.length === results.length) {
          const reason = rejected[0].reason;
          setError(
            reason instanceof Error
              ? reason.message
              : 'Сервер управления недоступен',
          );
        } else {
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [periodDays, reloadTick, fetchJson]);

  useEffect(() => {
    if (!ragStatus?.reindex_running) return;
    const interval = setInterval(() => {
      void fetchJson<RagStatus>('/api/admin/rag/status').then((data) => {
        if (data) setRagStatus(data);
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [ragStatus?.reindex_running, fetchJson]);

  const triggerSilentRefresh = useCallback(() => {
    setRefreshing(true);
    setReloadTick((t) => t + 1);
  }, []);

  const refreshProfiles = useCallback(async () => {
    const data = await fetchJson<{ profiles: ProfileConfig[] }>(
      '/api/admin/profiles',
    );
    if (data) setProfiles(data.profiles || []);
  }, [fetchJson]);

  const refreshRag = useCallback(async () => {
    const data = await fetchJson<RagStatus>('/api/admin/rag/status');
    if (data) setRagStatus(data);
  }, [fetchJson]);

  const refreshSettings = useCallback(async () => {
    const data = await fetchJson<GatewaySettings>('/api/admin/settings');
    if (data) setSettings(data);
  }, [fetchJson]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace(loginPath);
    router.refresh();
  };

  const formattedBalance = (() => {
    const val = balance?.available ?? balance?.amount;
    if (typeof val !== 'number') return '—';
    return `${val.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${balance?.currency === 'RUB' ? '₽' : balance?.currency || '₽'}`;
  })();

  const chartDays = periodDays > 0 && periodDays <= 30 ? periodDays : 14;

  return (
    <div className="relative min-h-screen flex flex-col">
      <PageBackground />

      <div className="relative z-10 flex flex-col flex-1">
        <header className="sticky top-0 z-40 border-b border-gray-800/70 bg-gray-950/75 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 min-w-0 hover:opacity-85 transition-opacity"
              title="На главную сайта"
            >
              <Image
                src="/logo.svg"
                alt="Typst Gost"
                width={28}
                height={28}
                className="w-7 h-7 shrink-0"
              />
              <div className="flex items-baseline gap-2 truncate">
                <span className="text-lg font-bold text-white tracking-tight">
                  Typst Gost
                </span>
                <span className="hidden sm:inline text-xs text-blue-400 font-medium">
                  Панель управления
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              {readyStatus && (
                <div
                  className={cn(
                    'hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium',
                    readyStatus.status === 'ready'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      readyStatus.status === 'ready'
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-amber-400',
                    )}
                  />
                  <span>
                    {readyStatus.status === 'ready'
                      ? 'Система активна'
                      : 'Ожидает индекс'}
                  </span>
                  <span className="text-gray-400 font-mono">
                    · {readyStatus.docs_count} чанков
                  </span>
                </div>
              )}

              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-gray-700/60 text-xs font-mono text-gray-200">
                <Wallet className="w-3.5 h-3.5 text-blue-400" />
                <span>{formattedBalance}</span>
              </div>

              <button
                type="button"
                onClick={triggerSilentRefresh}
                disabled={refreshing}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-gray-700/60 text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                title="Обновить все данные"
              >
                <RefreshCw
                  className={cn('w-4 h-4', refreshing && 'animate-spin')}
                />
              </button>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-gray-800 text-xs text-gray-300">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-medium">{initialUser.username}</span>
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 hover:bg-red-500/15 border border-gray-800 hover:border-red-500/30 text-xs font-medium text-gray-300 hover:text-red-300 transition-colors cursor-pointer"
                title="Выйти"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-gray-800/50">
            <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer border',
                      active
                        ? 'bg-blue-500/15 border-blue-500/40 text-white shadow-sm'
                        : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5',
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4',
                        active ? 'text-blue-400' : 'text-gray-500',
                      )}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-sm text-gray-400">
              <LoadingSpinner size={36} />
              <span>Загрузка панели управления...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-white tracking-tight">
                        Сводка и аналитика
                      </h1>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Ключевые показатели работы сервисов, каналов и базы знаний
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-gray-800">
                      {[
                        { days: 7, label: '7 дней' },
                        { days: 30, label: '30 дней' },
                        { days: 90, label: '90 дней' },
                        { days: 0, label: 'Всё время' },
                      ].map((opt) => (
                        <button
                          key={opt.days}
                          type="button"
                          onClick={() => {
                            if (opt.days !== periodDays) {
                              setRefreshing(true);
                              setPeriodDays(opt.days);
                            }
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                            periodDays === opt.days
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:text-white',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-4">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Баланс API</span>
                        <Wallet className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-xl font-bold text-white font-mono tabular-nums">
                        {formattedBalance}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Доступный остаток
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-4">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Диалогов</span>
                        <MessageSquare className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-xl font-bold text-white font-mono tabular-nums">
                        {(analytics?.total_conversations ?? 0).toLocaleString(
                          'ru-RU',
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Активных сессий
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-4">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Обращений</span>
                        <Activity className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-xl font-bold text-white font-mono tabular-nums">
                        {(analytics?.total_turns ?? 0).toLocaleString('ru-RU')}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Выдано ответов
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-4">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Ср. задержка</span>
                        <Clock className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="text-xl font-bold text-white font-mono tabular-nums">
                        {Math.round(analytics?.avg_latency_ms ?? 0)} мс
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Время до ответа
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-4">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Фильтр / Пусто</span>
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-xl font-bold text-white font-mono tabular-nums">
                        {analytics?.guard_blocked_count ?? 0}{' '}
                        <span className="text-gray-500 text-sm">
                          / {analytics?.no_docs_count ?? 0}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Отклонено / Нет в БД
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-4">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Расход токенов</span>
                        <Coins className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-xl font-bold text-white font-mono tabular-nums">
                        {(analytics?.tokens.total_tokens ?? 0).toLocaleString(
                          'ru-RU',
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-400/90 font-mono mt-1">
                        ~{(analytics?.tokens.estimated_cost ?? 0).toFixed(2)} ₽
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <ActivityChart
                        conversations={recentConversations}
                        days={chartDays}
                      />
                    </div>
                    <ChannelBreakdownChart analytics={analytics} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <OutcomesDonutChart analytics={analytics} />
                    <TokensBreakdownCard analytics={analytics} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-white">
                          Активные каналы и модели
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab('profiles')}
                          className="text-xs text-blue-400 hover:underline cursor-pointer"
                        >
                          Настроить →
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {profiles.map((p) => {
                          const meta =
                            CHANNEL_META[p.profile_id] ?? CHANNEL_META.external;
                          return (
                            <button
                              key={p.profile_id}
                              type="button"
                              onClick={() => setActiveTab('profiles')}
                              className="text-left rounded-xl bg-gray-950/50 hover:bg-gray-900/80 border border-gray-800 hover:border-blue-500/30 p-3 transition-colors cursor-pointer"
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
                                <span
                                  className={cn(
                                    'text-[11px] font-medium',
                                    p.enabled
                                      ? 'text-emerald-400'
                                      : 'text-gray-500',
                                  )}
                                >
                                  {p.enabled ? 'Вкл' : 'Выкл'}
                                </span>
                              </div>
                              <div className="text-xs font-mono text-gray-200 truncate">
                                {p.llm_model}
                              </div>
                              <div className="text-[11px] font-mono text-gray-500 truncate mt-0.5">
                                Guard: {p.guard_enabled ? p.decision_model : 'выключен'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-700/50 bg-slate-900/50 backdrop-blur-md p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-white">
                          Подключённые узлы
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab('settings')}
                          className="text-xs text-blue-400 hover:underline cursor-pointer"
                        >
                          Изменить →
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="rounded-xl bg-gray-950/50 border border-gray-800 p-3 flex items-center justify-between gap-2">
                          <span className="text-gray-400">Основной сайт</span>
                          <a
                            href={
                              readyStatus?.clients.website_base_url ||
                              settings?.website_base_url ||
                              'https://typst-gost.ru'
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-blue-400 hover:underline truncate max-w-52"
                          >
                            {readyStatus?.clients.website_base_url ||
                              settings?.website_base_url ||
                              '—'}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>

                        <div className="rounded-xl bg-gray-950/50 border border-gray-800 p-3 flex items-center justify-between gap-2">
                          <span className="text-gray-400">Шлюз управления</span>
                          <span className="font-mono text-gray-200 truncate max-w-52">
                            {readyStatus?.clients.gateway_public_url ||
                              settings?.gateway_public_url ||
                              '—'}
                          </span>
                        </div>

                        <div className="rounded-xl bg-gray-950/50 border border-gray-800 p-3 flex items-center justify-between gap-2">
                          <span className="text-gray-400">Telegram-бот</span>
                          <span className="font-mono text-gray-200 truncate max-w-52">
                            {readyStatus?.clients.telegram_bot_url ||
                              settings?.telegram_bot_url ||
                              '—'}
                          </span>
                        </div>

                        <div className="rounded-xl bg-gray-950/50 border border-gray-800 p-3 flex items-center justify-between gap-2">
                          <span className="text-gray-400">Эмбеддинги</span>
                          <span className="font-mono text-purple-300 truncate max-w-52">
                            {settings?.embedding_model || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'conversations' && (
                <ConversationsPanel
                  docsBaseUrl={settings?.docs_base_url || 'https://typst-gost.ru'}
                  onDataMutated={triggerSilentRefresh}
                />
              )}

              {activeTab === 'profiles' && (
                <ProfilesPanel
                  profiles={profiles}
                  onProfilesChange={refreshProfiles}
                />
              )}

              {activeTab === 'rag' && (
                <RagPanel status={ragStatus} onRefresh={refreshRag} />
              )}

              {activeTab === 'guard-test' && (
                <GuardTesterPanel profiles={profiles} />
              )}

              {activeTab === 'settings' && (
                <SettingsPanel settings={settings} onSaved={refreshSettings} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}