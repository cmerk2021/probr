import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  value: string;
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
}

export function CopyButton({ value, className, label = 'Copy', size = 'sm' }: Props) {
  const [copied, setCopied] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  };

  const iconSize = size === 'sm' ? 12 : 14;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-surface-700 px-1.5 py-0.5',
        'text-[10px] uppercase tracking-wider text-slate-400 hover:text-brand-300 hover:border-brand-400/50',
        'transition-colors',
        size === 'md' && 'text-xs px-2 py-1',
        className
      )}
    >
      {copied ? <Check size={iconSize} className="text-data-green" /> : <Copy size={iconSize} />}
      <span className="hidden sm:inline">{copied ? 'Copied' : label}</span>
    </button>
  );
}
