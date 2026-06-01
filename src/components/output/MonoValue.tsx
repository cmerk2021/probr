import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { CopyButton } from '@/components/shared/CopyButton';

export type MonoType = 'ip' | 'domain' | 'hash' | 'cidr' | 'asn' | 'port' | 'value';

interface Props {
  children: React.ReactNode;
  value?: string;
  type?: MonoType;
  copyable?: boolean;
  linkTo?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

const sizes = {
  xs: 'text-[11px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
} as const;

const typeBadge: Record<MonoType, string | null> = {
  ip: 'IP',
  domain: 'DOMAIN',
  hash: 'HASH',
  cidr: 'CIDR',
  asn: 'ASN',
  port: 'PORT',
  value: null,
};

export function MonoValue({ children, value, type, copyable = false, linkTo, className, size = 'sm' }: Props) {
  const text = value ?? (typeof children === 'string' ? children : '');
  const inner = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-surface-700 bg-surface-800',
        'mono text-brand-300 align-middle',
        sizes[size],
        className
      )}
    >
      {type && typeBadge[type] && (
        <span className="text-[9px] font-semibold tracking-wider text-slate-500 border-r border-surface-700 pr-1.5 mr-0.5">
          {typeBadge[type]}
        </span>
      )}
      <span className="truncate max-w-[36ch]">{children}</span>
      {copyable && text && <CopyButton value={text} className="ml-1" />}
    </span>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}
