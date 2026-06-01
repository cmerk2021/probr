import { cn } from '@/utils/cn';

interface Props {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  accent?: boolean;
}

export function ResultCard({ title, description, actions, footer, children, className, hoverable, accent }: Props) {
  return (
    <section
      className={cn(
        'card relative overflow-hidden',
        hoverable && 'card-hoverable',
        accent && 'border-l-2 border-l-brand-400/60',
        className
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-5 py-3.5 border-b border-surface-700">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold tracking-wide text-slate-200 truncate">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && <footer className="px-5 py-2.5 border-t border-surface-700 text-[11px] text-slate-500">{footer}</footer>}
    </section>
  );
}
