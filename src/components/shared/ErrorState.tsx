import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import type { AlloyApiError } from '@/api/client';
import { CopyButton } from './CopyButton';

interface Props {
  error: AlloyApiError;
  onRetry?: () => void;
}

function formatReset(reset?: number): string | null {
  if (reset === undefined) return null;
  // Heuristic: small values are "seconds until reset", large are epoch seconds.
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsUntil = reset > nowSec ? reset - nowSec : reset;
  if (secondsUntil <= 0) return 'now';
  if (secondsUntil < 60) return `${secondsUntil}s`;
  if (secondsUntil < 3600) return `${Math.ceil(secondsUntil / 60)}m`;
  return `${Math.ceil(secondsUntil / 3600)}h`;
}

export function ErrorState({ error, onRetry }: Props) {
  const isRateLimit = error.status === 429 || error.code === 'rate_limited';
  const rl = error.rateLimit;
  const resetIn = formatReset(rl?.reset ?? rl?.retryAfter);

  const details = JSON.stringify(
    {
      code: error.code,
      message: error.message,
      status: error.status,
      request_id: error.request_id || undefined,
      rateLimit: rl,
      envelope: error.envelope ?? undefined,
    },
    null,
    2
  );

  if (isRateLimit) {
    return (
      <div className="card p-5 border-data-yellow/40 bg-data-yellow/5">
        <div className="flex items-start gap-3">
          <Clock className="text-data-yellow shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-data-yellow">Rate limit reached</h3>
            <p className="text-sm text-slate-300 mt-1 break-words">
              {error.message ||
                'You have made too many requests to the Alloy API in a short window.'}
              {resetIn && (
                <>
                  {' '}Try again in <span className="mono text-data-yellow">{resetIn}</span>.
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400 mono">
              {rl?.limit !== undefined && (
                <span>
                  limit: <span className="text-slate-200">{rl.limit}</span>
                </span>
              )}
              {rl?.remaining !== undefined && (
                <span>
                  remaining: <span className="text-slate-200">{rl.remaining}</span>
                </span>
              )}
              {rl?.reset !== undefined && (
                <span>
                  reset: <span className="text-slate-200">{rl.reset}</span>
                </span>
              )}
              {rl?.retryAfter !== undefined && (
                <span>
                  retry_after: <span className="text-slate-200">{rl.retryAfter}s</span>
                </span>
              )}
              {error.request_id && (
                <span>
                  request_id: <span className="text-slate-200">{error.request_id}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-surface-800 border border-surface-700 hover:border-brand-400/60 hover:text-brand-300"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              )}
              <CopyButton value={details} label="Copy details" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 border-data-red/40 bg-data-red/5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-data-red shrink-0 mt-0.5" size={18} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-data-red">
            {error.code === 'network_error' ? 'Network error' : `Request failed — ${error.code}`}
          </h3>
          <p className="text-sm text-slate-300 mt-1 break-words">{error.message}</p>
          {error.request_id && (
            <p className="text-[11px] text-slate-500 mt-2 mono">request_id: {error.request_id}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-surface-800 border border-surface-700 hover:border-brand-400/60 hover:text-brand-300"
              >
                <RefreshCw size={12} /> Retry
              </button>
            )}
            <CopyButton value={details} label="Copy details" />
          </div>
        </div>
      </div>
    </div>
  );
}
