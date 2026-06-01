import { CopyButton } from '@/components/shared/CopyButton';
import { cn } from '@/utils/cn';

/**
 * KeyValueGrid renders arbitrary JSON-ish data as a structured, human-readable UI:
 * - Primitives → typed inline chip (with copy for long strings)
 * - Arrays of primitives → comma-separated chips
 * - Arrays of objects → compact stacked sub-cards
 * - Objects → label/value rows; nested objects indent
 *
 * Use this anywhere we previously dumped a JsonViewer into result UI. Raw JSON is
 * still available via the "Show raw JSON" toggle in ToolPage.
 */
interface Props {
  data: unknown;
  level?: number;
  emptyLabel?: string;
  /** Hide keys whose value is null/undefined/empty string */
  skipEmpty?: boolean;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function isPrimitive(v: unknown): v is string | number | boolean | null | undefined {
  return v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v);
}

function formatKey(k: string): string {
  return k
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Ip|Url|Dns|Tls|Ssl|Asn|Ttl|Cidr|Mx|Spf|Dmarc|Dkim|Rdap|Sld|Tld|Ct|Bgp|Rpki|Os|Ua|Csv|Yaml|Json|Jwt|Id|Uuid|Ulid|Cn|Cca2|Cca3|Iso|Utc|Http|Cpu|Sha|Md5)\b/gi, (m) => m.toUpperCase());
}

function Primitive({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-slate-500 italic text-xs">null</span>;
  if (typeof value === 'boolean') {
    return (
      <span
        className={cn(
          'mono text-[11px] uppercase px-1.5 py-0.5 rounded border',
          value
            ? 'text-data-green border-data-green/40 bg-data-green/10'
            : 'text-data-red border-data-red/40 bg-data-red/10'
        )}
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === 'number') {
    return <span className="mono text-data-blue text-sm tabular-nums">{value.toLocaleString()}</span>;
  }
  const s = String(value);
  if (!s) return <span className="text-slate-500 italic text-xs">empty</span>;

  // Date strings
  if (ISO_DATE_RE.test(s)) {
    try {
      const d = new Date(s);
      return (
        <span className="text-sm text-slate-200">
          {d.toLocaleString()} <span className="text-[11px] text-slate-500 mono">({s})</span>
        </span>
      );
    } catch {
      // fall through
    }
  }

  // URLs
  if (/^https?:\/\//.test(s)) {
    return (
      <a
        href={s}
        target="_blank"
        rel="noopener noreferrer"
        className="mono text-xs text-brand-300 hover:text-brand-200 underline decoration-dotted break-all"
      >
        {s}
      </a>
    );
  }

  // Long strings: monospace + copy
  if (s.length > 60) {
    return (
      <span className="inline-flex items-start gap-1.5 max-w-full">
        <span className="mono text-xs text-slate-300 break-all">{s}</span>
        <CopyButton value={s} />
      </span>
    );
  }
  return <span className="text-sm text-slate-200 break-words">{s}</span>;
}

export function KeyValueGrid({ data, level = 0, emptyLabel = '—', skipEmpty = false }: Props) {
  if (data === null || data === undefined) {
    return <span className="text-slate-500 text-xs italic">{emptyLabel}</span>;
  }

  if (isPrimitive(data)) return <Primitive value={data} />;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-slate-500 text-xs italic">empty list</span>;
    const allPrim = data.every(isPrimitive);
    if (allPrim) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {data.map((v, i) => (
            <span key={i} className="mono text-[11px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800/60 text-slate-300">
              {v === null || v === undefined ? 'null' : String(v)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <div
            key={i}
            className="rounded border border-surface-800 bg-surface-900/40 px-3 py-2"
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
              # {i + 1}
            </div>
            <KeyValueGrid data={item} level={level + 1} skipEmpty={skipEmpty} />
          </div>
        ))}
      </div>
    );
  }

  // Object
  const entries = Object.entries(data as Record<string, unknown>).filter(([, v]) =>
    skipEmpty ? v !== null && v !== undefined && v !== '' : true
  );
  if (entries.length === 0) return <span className="text-slate-500 text-xs italic">{emptyLabel}</span>;

  return (
    <div className={cn('flex flex-col', level === 0 && 'divide-y divide-surface-800/80')}>
      {entries.map(([k, v]) => {
        const nested = !isPrimitive(v) && !(Array.isArray(v) && v.every(isPrimitive));
        return (
          <div
            key={k}
            className={cn(
              'flex gap-3 py-1.5 min-w-0',
              nested ? 'flex-col sm:flex-row sm:items-start' : 'items-start'
            )}
          >
            <div className="text-[11px] uppercase tracking-wider text-slate-500 sm:w-40 shrink-0 pt-0.5 font-medium">
              {formatKey(k)}
            </div>
            <div className="text-sm text-slate-200 min-w-0 flex-1">
              <KeyValueGrid data={v} level={level + 1} skipEmpty={skipEmpty} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
