export const ALLOY_BASE_URL =
  (import.meta.env.VITE_ALLOY_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://api.connormerk.dev';

// Optional user-supplied API key (set via the Settings page, persisted to localStorage by zustand).
let runtimeApiKey = '';
export function setRuntimeApiKey(key: string): void {
  runtimeApiKey = (key ?? '').trim();
}
export function getRuntimeApiKey(): string {
  return runtimeApiKey;
}

export interface RateLimitInfo {
  /** Total requests allowed in the window. */
  limit?: number;
  /** Requests remaining in the current window. */
  remaining?: number;
  /** Unix epoch seconds when the window resets (or seconds-until-reset, depending on server). */
  reset?: number;
  /** Retry-After header (seconds) when rate limited. */
  retryAfter?: number;
}

export interface ApiMeta {
  request_id: string;
  duration_ms?: number;
  auth?: { tier?: string; authenticated?: boolean };
  [k: string]: unknown;
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
  links?: { self?: string; docs?: string };
  timestamp: string;
  request_id: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
  timestamp: string;
  request_id: string;
}

export class AlloyApiError extends Error {
  code: string;
  status: number;
  envelope: ApiErrorEnvelope | null;
  request_id: string;
  rateLimit?: RateLimitInfo;

  constructor(opts: {
    code: string;
    message: string;
    status: number;
    envelope: ApiErrorEnvelope | null;
    request_id?: string;
    rateLimit?: RateLimitInfo;
  }) {
    super(opts.message);
    this.name = 'AlloyApiError';
    this.code = opts.code;
    this.status = opts.status;
    this.envelope = opts.envelope;
    this.request_id = opts.request_id ?? '';
    this.rateLimit = opts.rateLimit;
  }
}

export interface ApiResult<T> {
  data: T;
  meta: {
    timestamp: string;
    request_id: string;
    duration_ms?: number;
    rateLimit?: RateLimitInfo;
  };
}

function parseRateLimit(res: Response): RateLimitInfo | undefined {
  const num = (h: string | null) => {
    if (h === null || h === '') return undefined;
    const n = Number(h);
    return Number.isFinite(n) ? n : undefined;
  };
  const limit =
    num(res.headers.get('x-ratelimit-limit')) ?? num(res.headers.get('ratelimit-limit'));
  const remaining =
    num(res.headers.get('x-ratelimit-remaining')) ?? num(res.headers.get('ratelimit-remaining'));
  const reset =
    num(res.headers.get('x-ratelimit-reset')) ?? num(res.headers.get('ratelimit-reset'));
  const retryAfter = num(res.headers.get('retry-after'));
  if (limit === undefined && remaining === undefined && reset === undefined && retryAfter === undefined) {
    return undefined;
  }
  return { limit, remaining, reset, retryAfter };
}

interface FetchOpts {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
  /** When true, returns raw text instead of parsing JSON envelope. */
  raw?: boolean;
}

function buildUrl(path: string, query?: FetchOpts['query']): string {
  const url = new URL(`${ALLOY_BASE_URL}${path}`);
  url.searchParams.set('pretty', 'true');
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** Core fetcher returning a parsed envelope. */
export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<ApiResult<T>> {
  const url = buildUrl(path, opts.query);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (runtimeApiKey) headers['x-api-key'] = runtimeApiKey;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (err) {
    throw new AlloyApiError({
      code: 'network_error',
      message: err instanceof Error ? err.message : 'Network error',
      status: 0,
      envelope: null,
    });
  }

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new AlloyApiError({
      code: 'invalid_response',
      message: `Non-JSON response (HTTP ${res.status})`,
      status: res.status,
      envelope: null,
    });
  }

  const rateLimit = parseRateLimit(res);

  if (parsed && typeof parsed === 'object' && (parsed as { success?: boolean }).success === false) {
    const env = parsed as ApiErrorEnvelope;
    throw new AlloyApiError({
      code: env.error?.code ?? 'unknown_error',
      message: env.error?.message ?? 'Unknown error',
      status: res.status,
      envelope: env,
      request_id: env.request_id,
      rateLimit,
    });
  }

  if (!res.ok) {
    throw new AlloyApiError({
      code: res.status === 429 ? 'rate_limited' : 'http_error',
      message: res.status === 429 ? 'Rate limit exceeded' : `HTTP ${res.status}`,
      status: res.status,
      envelope: null,
      rateLimit,
    });
  }

  const env = parsed as ApiEnvelope<T>;
  return {
    data: env.data,
    meta: {
      timestamp: env.timestamp,
      request_id: env.request_id,
      duration_ms: env.meta?.duration_ms,
      rateLimit,
    },
  };
}

/** For endpoints that return raw text (e.g. QR SVG). */
export async function apiFetchRaw(
  path: string,
  query?: FetchOpts['query']
): Promise<{ contentType: string; body: string; rateLimit?: RateLimitInfo }> {
  const url = buildUrl(path, query);
  const headers: Record<string, string> = {};
  if (runtimeApiKey) headers['x-api-key'] = runtimeApiKey;
  const res = await fetch(url, { headers });
  const body = await res.text();
  const rateLimit = parseRateLimit(res);
  if (!res.ok) {
    try {
      const env = JSON.parse(body) as ApiErrorEnvelope;
      throw new AlloyApiError({
        code: env.error?.code ?? (res.status === 429 ? 'rate_limited' : 'http_error'),
        message: env.error?.message ?? `HTTP ${res.status}`,
        status: res.status,
        envelope: env,
        rateLimit,
      });
    } catch (e) {
      if (e instanceof AlloyApiError) throw e;
      throw new AlloyApiError({
        code: res.status === 429 ? 'rate_limited' : 'http_error',
        message: res.status === 429 ? 'Rate limit exceeded' : `HTTP ${res.status}`,
        status: res.status,
        envelope: null,
        rateLimit,
      });
    }
  }
  return { contentType: res.headers.get('content-type') ?? '', body, rateLimit };
}

// Simple in-memory LRU response cache (last 20 entries)
const cache = new Map<string, ApiResult<unknown>>();
const CACHE_MAX = 20;

export function clearApiCache(): void {
  cache.clear();
}
export function apiCacheSize(): number {
  return cache.size;
}

export async function apiFetchCached<T>(path: string, opts: FetchOpts = {}): Promise<ApiResult<T>> {
  const key = `${opts.method ?? 'GET'} ${path} ${JSON.stringify(opts.query ?? {})} ${JSON.stringify(opts.body ?? null)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit as ApiResult<T>;
  }
  const result = await apiFetch<T>(path, opts);
  cache.set(key, result);
  if (cache.size > CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  return result;
}
