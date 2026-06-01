import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Wordmark } from '@/components/layout/Sidebar';
import { detectInputType, type DetectedType } from '@/utils/validators';
import { NAV_SECTIONS } from '@/components/layout/nav';
import { useHistoryStore } from '@/store/historyStore';
import { utilities } from '@/api/endpoints';
import { MonoValue } from '@/components/output/MonoValue';
import { cn } from '@/utils/cn';
import { relativeTime } from '@/utils/formatters';

export function Dashboard() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const detected = useMemo<DetectedType>(() => detectInputType(q), [q]);
  const entries = useHistoryStore((s) => s.entries).slice(0, 5);

  const onSearch = () => {
    const v = q.trim();
    if (!v) return;
    switch (detected) {
      case 'ip':
        navigate(`/network/ip?q=${encodeURIComponent(v)}`);
        return;
      case 'asn':
        navigate(`/network/asn?q=${encodeURIComponent(v.replace(/^AS/i, ''))}`);
        return;
      case 'cidr':
        navigate(`/network/cidr?q=${encodeURIComponent(v)}`);
        return;
      case 'url':
        navigate(`/web/audit?q=${encodeURIComponent(v.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))}`);
        return;
      case 'domain':
        navigate(`/domain/intelligence?q=${encodeURIComponent(v)}`);
        return;
      default:
        navigate(`/dns/lookup?q=${encodeURIComponent(v)}`);
    }
  };

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden card p-8 md:p-12 border-brand-500/20">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-brand-700/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-brand-300/80 mb-4">
            <Sparkles size={12} /> Internet intelligence. Instantly.
          </div>
          <div className="mb-7">
            <Wordmark size="lg" />
          </div>

          <div
            className={cn(
              'flex items-stretch rounded-lg border bg-surface-900',
              'border-surface-700 focus-within:border-brand-400/70 transition-colors'
            )}
          >
            <div className="flex items-center pl-3 pr-2 text-slate-500 mono text-xs">
              <span className="text-brand-400">›</span>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder="IP, domain, ASN, CIDR, host or URL…"
              className="flex-1 bg-transparent py-3.5 outline-none placeholder:text-slate-600 mono text-brand-200 text-sm"
              aria-label="Global quick search"
            />
            {q.trim() && (
              <div className="flex items-center px-3 text-[10px] uppercase tracking-wider text-brand-300/80">
                {detected === 'unknown' ? 'fallback · dns' : detected}
              </div>
            )}
            <button
              onClick={onSearch}
              className="m-1.5 px-4 rounded-md bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium inline-flex items-center gap-1.5 active:scale-[0.97] transition-all"
            >
              <ArrowRight size={14} /> Probe
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Try: <CrumbHint t="1.1.1.1" onClick={setQ} /> ·{' '}
            <CrumbHint t="cloudflare.com" onClick={setQ} /> ·{' '}
            <CrumbHint t="AS15169" onClick={setQ} /> ·{' '}
            <CrumbHint t="https://github.com" onClick={setQ} />
          </p>
        </div>
      </section>

      {/* CATEGORY CARDS */}
      <section>
        <SectionTitle title="Explore by category" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => navigate(s.items[0].path)}
              className="card card-hoverable text-left p-4 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md border border-surface-700 bg-surface-800 flex items-center justify-center text-brand-300 group-hover:border-brand-400/50">
                  <s.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-100">{s.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {s.items.length} tool{s.items.length === 1 ? '' : 's'}
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-500 group-hover:text-brand-300 mt-1" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.items.slice(0, 4).map((i) => (
                  <span
                    key={i.path}
                    className="text-[10px] text-slate-400 bg-surface-800/80 border border-surface-700 rounded px-1.5 py-0.5"
                  >
                    {i.label}
                  </span>
                ))}
                {s.items.length > 4 && (
                  <span className="text-[10px] text-slate-500">+{s.items.length - 4}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* QUICK TOOLS */}
      <section>
        <SectionTitle title="Quick tools" />
        <div className="flex flex-wrap gap-2">
          <QuickAction
            label="Generate UUID"
            onClick={async () => {
              const r = await utilities.uuid();
              alert(`UUID:\n${r.data.uuid}`);
            }}
          />
          <QuickAction
            label="Generate password"
            onClick={async () => {
              const r = await utilities.passwordGen();
              alert(`Password:\n${r.data.password}`);
            }}
          />
          <QuickAction label="What's my IP" onClick={() => navigate('/network/ip?q=&self=1')} />
        </div>
      </section>

      {/* RECENT */}
      <section>
        <SectionTitle title="Recent queries" />
        {entries.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-surface-700 rounded-md">
            No queries yet — run anything to populate your history.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <li key={e.id} className="card p-3 flex items-center justify-between hover:border-brand-400/40">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      e.status === 'success' ? 'bg-data-green glow-green' : 'bg-data-red glow-red'
                    )}
                  />
                  <span className="text-xs uppercase tracking-wider text-slate-500">{e.tool}</span>
                  <MonoValue size="xs">{e.input || '—'}</MonoValue>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span>{relativeTime(e.timestamp)}</span>
                  <button
                    onClick={() =>
                      navigate(`${e.toolPath}?q=${encodeURIComponent(e.input)}`)
                    }
                    className="text-brand-300 hover:underline"
                  >
                    Re-run
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">{title}</h2>;
}

function CrumbHint({ t, onClick }: { t: string; onClick: (v: string) => void }) {
  return (
    <button onClick={() => onClick(t)} className="mono text-brand-300 hover:underline">
      {t}
    </button>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card card-hoverable px-3 py-2 text-xs text-slate-300 hover:text-brand-200 inline-flex items-center gap-1.5"
    >
      <Sparkles size={11} className="text-brand-400" />
      {label}
    </button>
  );
}
