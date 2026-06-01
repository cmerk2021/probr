import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { NAV_SECTIONS, TOP_LINKS } from './nav';
import { Wordmark } from './Sidebar';

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-surface-900 border-r border-surface-700 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <Wordmark size="sm" />
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-800" aria-label="Close menu">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          <div className="space-y-1">
            {TOP_LINKS.map((l) => (
              <Item key={l.path} to={l.path} label={l.label} onNav={onClose} />
            ))}
          </div>
          {NAV_SECTIONS.map((s) => (
            <div key={s.label}>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {s.label}
              </div>
              {s.items.map((i) => (
                <Item key={i.path} to={i.path} label={i.label} onNav={onClose} />
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}

function Item({ to, label, onNav }: { to: string; label: string; onNav: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNav}
      className={({ isActive }) =>
        cn(
          'block px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-surface-800',
          isActive && 'text-brand-200 bg-brand-500/10'
        )
      }
    >
      {label}
    </NavLink>
  );
}
