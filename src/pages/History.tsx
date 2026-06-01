import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useHistoryStore } from '@/store/historyStore';
import { MonoValue } from '@/components/output/MonoValue';
import { StatusBadge } from '@/components/output/StatusBadge';
import { formatDate, relativeTime } from '@/utils/formatters';
import { cn } from '@/utils/cn';

export function HistoryPage() {
  const entries = useHistoryStore((s) => s.entries);
  const clear = useHistoryStore((s) => s.clear);
  const remove = useHistoryStore((s) => s.remove);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [confirming, setConfirming] = useState(false);

  const filtered = entries.filter(
    (e) =>
      !q || e.tool.toLowerCase().includes(q.toLowerCase()) || e.input.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-slate-400">Every query you run is saved locally to your browser.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="bg-surface-900 border border-surface-700 rounded px-3 py-1.5 text-sm w-56 outline-none focus:border-brand-400/70 mono"
          />
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-data-red/40 text-data-red text-xs hover:bg-data-red/10"
          >
            <Trash2 size={12} /> Clear history
          </button>
        </div>
      </header>

      {confirming && (
        <div className="card p-4 border-data-red/40 bg-data-red/5">
          <p className="text-sm text-slate-200">Delete all {entries.length} history entries? This cannot be undone.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                clear();
                setConfirming(false);
              }}
              className="px-3 py-1.5 rounded text-xs bg-data-red text-white hover:opacity-90"
            >
              Yes, clear
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 rounded text-xs border border-surface-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-xs text-slate-500 py-12 text-center border border-dashed border-surface-700 rounded-md">
          No history entries{q && ` matching “${q}”`}.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((e) => (
            <li
              key={e.id}
              className={cn(
                'card p-3 grid grid-cols-[auto_1fr_auto] gap-3 items-center hover:border-brand-400/40'
              )}
            >
              <StatusBadge status={e.status === 'success' ? 'pass' : 'fail'} size="sm">
                {e.status}
              </StatusBadge>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="uppercase tracking-wide">{e.tool}</span>
                  <span className="text-slate-700">·</span>
                  <MonoValue size="xs">{e.input || '—'}</MonoValue>
                </div>
                {e.errorMessage && (
                  <div className="text-[11px] text-data-red mt-0.5 truncate">{e.errorMessage}</div>
                )}
                <div className="text-[10px] text-slate-500 mt-0.5 mono">
                  {formatDate(e.timestamp)} · {relativeTime(e.timestamp)}
                  {e.durationMs !== undefined && ` · ${e.durationMs}ms`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`${e.toolPath}?q=${encodeURIComponent(e.input)}`)}
                  className="text-xs px-2 py-1 rounded border border-surface-700 hover:border-brand-400/50 hover:text-brand-300"
                >
                  Re-run
                </button>
                <button
                  onClick={() => remove(e.id)}
                  className="p-1.5 rounded hover:bg-surface-800 text-slate-500 hover:text-data-red"
                  aria-label="Delete entry"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
