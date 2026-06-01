import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Github, Menu } from 'lucide-react';
import { meta as metaApi } from '@/api/endpoints';
import { Wordmark } from './Sidebar';
import { cn } from '@/utils/cn';

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  const loc = useLocation();
  const [status, setStatus] = useState<'unknown' | 'ok' | 'down'>('unknown');

  useEffect(() => {
    let cancelled = false;
    metaApi
      .status()
      .then((r) => {
        if (cancelled) return;
        const s = (r.data?.status ?? '').toLowerCase();
        const healthy = ['ok', 'operational', 'healthy', 'up', 'online'].includes(s);
        setStatus(healthy ? 'ok' : 'down');
      })
      .catch(() => !cancelled && setStatus('down'));
    return () => {
      cancelled = true;
    };
  }, []);

  const segments = loc.pathname.split('/').filter(Boolean);
  const crumbs =
    segments.length === 0
      ? [{ label: 'Dashboard', to: '/' }]
      : segments.map((s, i) => ({
          label: s.replace(/-/g, ' '),
          to: '/' + segments.slice(0, i + 1).join('/'),
        }));

  return (
    <header className="sticky top-0 z-30 bg-surface-950/85 backdrop-blur-md border-b border-surface-700">
      <div className="flex items-center gap-3 px-4 md:px-6 h-12">
        <button
          type="button"
          onClick={onMenu}
          className="md:hidden p-2 -ml-2 rounded hover:bg-surface-800"
          aria-label="Menu"
        >
          <Menu size={16} />
        </button>
        <div className="md:hidden">
          <Wordmark size="sm" />
        </div>
        <nav aria-label="Breadcrumb" className="hidden md:flex items-center text-[12px] text-slate-500 mono">
          {crumbs.map((c, i) => (
            <span key={c.to} className="flex items-center">
              {i > 0 && <span className="mx-1.5 text-slate-700">/</span>}
              <Link
                to={c.to}
                className={cn(
                  'capitalize hover:text-brand-300',
                  i === crumbs.length - 1 && 'text-slate-300'
                )}
              >
                {c.label}
              </Link>
            </span>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 mono',
              status === 'ok' && 'border-data-green/40 text-data-green',
              status === 'down' && 'border-data-red/40 text-data-red',
              status === 'unknown' && 'border-surface-600 text-slate-500'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                status === 'ok' && 'bg-data-green glow-green',
                status === 'down' && 'bg-data-red glow-red',
                status === 'unknown' && 'bg-slate-500'
              )}
            />
            {status === 'ok' ? 'API · online' : status === 'down' ? 'API · degraded' : 'API · checking'}
          </span>
          <a
            href="https://github.com/cmerk2021/api"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 hover:text-brand-300"
            aria-label="GitHub"
          >
            <Github size={13} />
          </a>
        </div>
      </div>
    </header>
  );
}
