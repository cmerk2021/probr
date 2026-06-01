import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { NAV_SECTIONS, TOP_LINKS } from './nav';
import { Github } from 'lucide-react';

export function Sidebar() {
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0',
        'border-r border-surface-700 bg-surface-900/70 backdrop-blur-sm'
      )}
    >
      <div className="px-5 py-5 border-b border-surface-700">
        <Wordmark />
        <p className="text-[10px] tracking-wider uppercase text-slate-500 mt-1.5">
          Internet Intelligence
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <div className="space-y-1">
          {TOP_LINKS.map((l) => (
            <SidebarLink key={l.path} to={l.path} label={l.label} icon={l.icon} />
          ))}
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <SectionHeader label={section.label} Icon={section.icon} />
            <div className="space-y-0.5 mt-1">
              {section.items.map((item) => (
                <SidebarLink key={item.path} to={item.path} label={item.label} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-surface-700 px-4 py-3 flex items-center justify-between text-[11px] text-slate-500">
        <a
          href="https://github.com/cmerk2021/api"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-brand-300"
        >
          <Github size={12} /> GitHub
        </a>
        <span>v0.1.0</span>
      </div>
    </aside>
  );
}

function SectionHeader({ label, Icon }: { label: string; Icon: React.ElementType }) {
  return (
    <div className="px-3 pt-2 pb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
      <Icon size={11} className="text-brand-400/80" />
      {label}
    </div>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon?: React.ElementType;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px]',
          'text-slate-400 hover:text-slate-100 hover:bg-surface-800/60',
          isActive && 'text-brand-200 bg-brand-500/10'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-brand-400',
              'transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'
            )}
          />
          {Icon && <Icon size={13} className="shrink-0" />}
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz =
    size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';
  return (
    <div className={cn('font-display lowercase tracking-tight flex items-center gap-1.5', sz)}>
      <span className="inline-block relative">
        <RadarMark className="inline-block mr-1 align-[-2px]" />
      </span>
      <span className="text-slate-100">probr</span>
      <span className="text-brand-400 animate-cursor-ping">_</span>
    </div>
  );
}

function RadarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" fill="#7c5fff" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#7c5fff" strokeOpacity=".5" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="11" fill="none" stroke="#7c5fff" strokeOpacity=".25" strokeWidth="1" />
    </svg>
  );
}
