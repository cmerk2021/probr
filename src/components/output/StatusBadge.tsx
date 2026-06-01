import { CheckCircle2, CircleAlert, CircleHelp, Info, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export type Status = 'pass' | 'warn' | 'fail' | 'info' | 'unknown';

interface Props {
  status: Status;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  className?: string;
}

const styles: Record<Status, { wrap: string; icon: typeof Info }> = {
  pass: { wrap: 'border-data-green/40 text-data-green bg-data-green/10', icon: CheckCircle2 },
  warn: { wrap: 'border-data-yellow/40 text-data-yellow bg-data-yellow/10', icon: CircleAlert },
  fail: { wrap: 'border-data-red/40 text-data-red bg-data-red/10', icon: XCircle },
  info: { wrap: 'border-data-blue/40 text-data-blue bg-data-blue/10', icon: Info },
  unknown: { wrap: 'border-surface-600 text-slate-400 bg-surface-800', icon: CircleHelp },
};

const sizes = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
} as const;
const iconSize = { sm: 12, md: 14, lg: 16 } as const;
const glowMap: Record<Status, string> = {
  pass: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  warn: 'shadow-[0_0_8px_rgba(234,179,8,0.5)]',
  fail: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  info: 'shadow-[0_0_8px_rgba(56,189,248,0.5)]',
  unknown: '',
};

export function StatusBadge({ status, children, size = 'md', glow = false, className }: Props) {
  const s = styles[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium uppercase tracking-wide whitespace-nowrap',
        s.wrap,
        sizes[size],
        glow && glowMap[status],
        className
      )}
    >
      <Icon size={iconSize[size]} aria-hidden />
      {children ?? status}
    </span>
  );
}
