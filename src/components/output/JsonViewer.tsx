import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { CopyButton } from '@/components/shared/CopyButton';

interface Props {
  data: unknown;
  collapsed?: boolean;
  className?: string;
  rootName?: string;
}

export function JsonViewer({ data, collapsed = false, className, rootName }: Props) {
  const json = useMemo(() => JSON.stringify(data, null, 2), [data]);
  return (
    <div className={cn('relative rounded-md border border-surface-700 bg-surface-900/80', className)}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface-700 text-[10px] uppercase tracking-wider text-slate-500">
        <span>{rootName ?? 'JSON'}</span>
        <CopyButton value={json} label="Copy JSON" />
      </div>
      <div className="max-h-[460px] overflow-auto p-3 mono text-xs leading-relaxed">
        <Node value={data} name={rootName} depth={0} forceCollapsed={collapsed} />
      </div>
    </div>
  );
}

interface NodeProps {
  value: unknown;
  name?: string;
  depth: number;
  forceCollapsed?: boolean;
}

function Node({ value, name, depth, forceCollapsed }: NodeProps) {
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const [open, setOpen] = useState(!forceCollapsed && depth < 2);

  if (!isObject) {
    return (
      <div className="flex gap-1.5">
        {name !== undefined && <Key name={name} />}
        <Primitive value={value} />
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);

  const summary = isArray ? `Array(${entries.length})` : `{ ${entries.length} }`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-slate-400 hover:text-brand-300"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {name !== undefined && <Key name={name} inline />}
        <span className="text-slate-500">{isArray ? '[' : '{'}</span>
        {!open && (
          <span className="text-slate-500 italic">
            {' '}
            {summary} {isArray ? ']' : '}'}
          </span>
        )}
      </button>
      {open && (
        <div className="ml-3.5 border-l border-surface-700 pl-3 mt-0.5 space-y-0.5">
          {entries.map(([k, v]) => (
            <Node key={k} name={k} value={v} depth={depth + 1} forceCollapsed={forceCollapsed} />
          ))}
          <div className="text-slate-500">{isArray ? ']' : '}'}</div>
        </div>
      )}
    </div>
  );
}

function Key({ name, inline }: { name: string; inline?: boolean }) {
  return (
    <span className={cn('text-brand-300', inline && 'mr-1')}>
      {name}
      <span className="text-slate-500">:</span>
    </span>
  );
}

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="text-slate-500 italic">null</span>;
  if (typeof value === 'string')
    return <span className="text-data-green break-all">"{value}"</span>;
  if (typeof value === 'number')
    return <span className="text-data-blue">{value}</span>;
  if (typeof value === 'boolean')
    return <span className={value ? 'text-data-green' : 'text-data-red'}>{String(value)}</span>;
  return <span className="text-slate-300">{String(value)}</span>;
}
