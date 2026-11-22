export type ChannelName =
  | 'website'
  | 'telegram_private'
  | 'telegram_group'
  | 'telegram_fix'
  | 'external';

export type ModelCategory =
  | 'all'
  | 'llm'
  | 'decision'
  | 'chat'
  | 'classification'
  | 'image'
  | 'embedding'
  | 'audio'
  | 'video'
  | 'tts'
  | 'stt';

export interface PolzaBalance {
  amount: number | string | null;
  available: number | string | null;
  currency: string;
  raw?: Record<string, unknown>;
}

export interface PolzaPricing {
  prompt_per_million?: number | string | null;
  completion_per_million?: number | string | null;
  input_per_million?: number | string | null;
  output_per_million?: number | string | null;
  prompt?: number | string | null;
  completion?: number | string | null;
  request?: number | string | null;
  currency?: string;
}

export interface PolzaProvider {
  name?: string;
  id?: string;
  pricing?: PolzaPricing;
  is_official?: boolean;
}

export interface PolzaModel {
  id: string;
  name?: string;
  short_description?: string;
  description?: string;
  type?: string;
  context_length?: number | null;
  max_output_tokens?: number | null;
  is_fz152_compliant?: boolean;
  pricing?: PolzaPricing;
  providers?: PolzaProvider[];
  supported_parameters?: string[];
  capabilities?: Record<string, unknown>;
}

export interface ExtractedModelPrice {
  promptPerMillion: number | null;
  completionPerMillion: number | null;
  currency: string;
}

function parseNumericPrice(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(',', '.');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePerMillion(
  explicitPerMillion: unknown,
  fallbackRaw: unknown,
): number | null {
  const explicit = parseNumericPrice(explicitPerMillion);
  if (explicit !== null) return explicit;
  const fallback = parseNumericPrice(fallbackRaw);
  if (fallback === null) return null;
  if (fallback > 0 && fallback < 0.01) {
    return fallback * 1_000_000;
  }
  return fallback;
}

export function extractModelPricing(model: PolzaModel): ExtractedModelPrice {
  const pricing = model.pricing ?? model.providers?.[0]?.pricing;
  if (!pricing) {
    return { promptPerMillion: null, completionPerMillion: null, currency: 'RUB' };
  }

  const promptPerMillion = normalizePerMillion(
    pricing.prompt_per_million ?? pricing.input_per_million,
    pricing.prompt,
  );
  const completionPerMillion = normalizePerMillion(
    pricing.completion_per_million ?? pricing.output_per_million,
    pricing.completion,
  );

  return {
    promptPerMillion,
    completionPerMillion,
    currency: pricing.currency || 'RUB',
  };
}

export interface GatewaySettings {
  embedding_model: string;
  rag_min_score: number;
  rag_rel_ratio: number;
  rag_max_sources: number;
  rag_search_limit: number;
  rag_max_page_chars: number;
  rag_max_total_context_chars: number;
  docs_base_url: string;
  docs_repo_slug: string;
  docs_repo_branch: string;
  docs_repo_docs_subdir: string;
  docs_repo_assets_subdir: string;
  chunk_max_chars: number;
  chunk_overlap: number;
  index_batch_size: number;
  rate_limit_enabled: boolean;
  rate_limit_requests: number;
  rate_limit_window_seconds: number;
  website_base_url: string;
  telegram_bot_url: string;
  gateway_public_url: string;
}

export interface ProfileConfig {
  profile_id: ChannelName;
  display_name: string;
  description: string;
  enabled: boolean;
  llm_model: string;
  decision_model: string;
  temperature: number;
  max_tokens: number | null;
  system_prompt: string;
  decision_questions: Record<string, unknown>;
  refusal_reply: string;
  no_docs_reply: string;
  guard_enabled: boolean;
  guard_offtopic_threshold: number;
  guard_noul_threshold: number;
  guard_timeout_seconds: number;
  guard_debug: boolean;
  max_query_chars: number;
  use_history: boolean;
  history_max_messages: number;
  history_ttl_seconds: number;
  include_assets_in_prompt: boolean;
  source_url_mode: 'relative' | 'absolute';
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  channel: ChannelName;
  external_user_id: string | null;
  external_chat_id: string | null;
  title: string | null;
  metadata: Record<string, unknown>;
  message_count: number;
  last_message_preview: string;
  context_reset_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageSourceItem {
  label?: number | string;
  title?: string;
  url: string;
  path?: string;
  category?: string;
  score?: number;
  cosine?: number;
}

export interface MessageUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_rub?: number;
  cost?: number;
}

export interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  llm_model: string | null;
  decision_model: string | null;
  guard_allowed: boolean | null;
  guard_intent: string | null;
  guard_offtopic_prob: number | null;
  guard_noul_prob: number | null;
  guard_latency_ms: number | null;
  rag_candidates: number | null;
  rag_selected: number | null;
  rag_cited: number | null;
  rag_top_score: number | null;
  sources: MessageSourceItem[];
  usage: MessageUsage | null;
  latency_ms: number | null;
  stopped: boolean;
  error: string | null;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  channel: ChannelName;
  external_user_id: string | null;
  external_chat_id: string | null;
  title: string | null;
  metadata: Record<string, unknown>;
  context_reset_at: string | null;
  created_at: string;
  updated_at: string;
  messages: ConversationMessage[];
}

export interface AnalyticsData {
  period_days: number | null;
  total_conversations: number;
  total_turns: number;
  guard_blocked_count: number;
  no_docs_count: number;
  avg_latency_ms: number;
  by_channel: Record<string, number>;
  tokens: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
  };
}

export interface ReindexJob {
  id: number;
  status: string;
  trigger: string;
  files_processed: number;
  chunks_count: number;
  embeddings_fetched: number;
  assets_synced: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface RagStatus {
  docs_ready: boolean;
  docs_count: number;
  reindex_running: boolean;
  compile_assets_count: number;
  compile_assets: string[];
  recent_jobs: ReindexJob[];
}

export interface ReadyStatus {
  status: 'ready' | 'degraded';
  docs_ready: boolean;
  docs_count: number;
  reindex_running: boolean;
  profiles_loaded: number;
  clients: {
    gateway_public_url: string;
    website_base_url: string;
    telegram_bot_url: string;
  };
}

export interface GuardVerdict {
  allowed: boolean;
  reason: string;
  model: string;
  intent: string;
  probabilities: Record<string, number>;
  offtopic_prob: number;
  abuse_prob: number;
  offtopic_threshold: number;
  noul_threshold: number;
  latency_ms: number;
  error: string | null;
}

export interface GuardTestResult {
  verdict: GuardVerdict;
  evaluated_state: string;
}

export const CHANNEL_META: Record<
  ChannelName,
  { label: string; shortLabel: string; colorClass: string; hex: string }
> = {
  website: {
    label: 'Веб-сайт (документация)',
    shortLabel: 'Сайт',
    colorClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    hex: '#3b82f6',
  },
  telegram_private: {
    label: 'Telegram (личные)',
    shortLabel: 'TG ЛС',
    colorClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    hex: '#0ea5e9',
  },
  telegram_group: {
    label: 'Telegram (группы)',
    shortLabel: 'TG Группы',
    colorClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    hex: '#6366f1',
  },
  telegram_fix: {
    label: 'Telegram (исправление)',
    shortLabel: 'TG Fix',
    colorClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    hex: '#a855f7',
  },
  external: {
    label: 'Внешнее API',
    shortLabel: 'External',
    colorClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    hex: '#10b981',
  },
};