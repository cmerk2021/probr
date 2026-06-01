import { Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { MonoValue } from '@/components/output/MonoValue';
import { StatusBadge } from '@/components/output/StatusBadge';
import { DataTable } from '@/components/output/DataTable';
import { KeyValueGrid } from '@/components/output/KeyValueGrid';
import { dns } from '@/api/endpoints';
import type {
  DnsLookup,
  DnsPropagation,
  DnsSec,
  DnsTypedRecords,
  DnsDmarc,
  DnsSpf,
  DnsRecordType,
} from '@/api/types';
import { v } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import { formatTtl } from '@/utils/formatters';

const RECORD_TYPES: { key: DnsRecordType; label: string; fn: (d: string) => Promise<unknown> }[] = [
  { key: 'A', label: 'A', fn: dns.a },
  { key: 'AAAA', label: 'AAAA', fn: dns.aaaa },
  { key: 'MX', label: 'MX', fn: dns.mx },
  { key: 'TXT', label: 'TXT', fn: dns.txt },
  { key: 'NS', label: 'NS', fn: dns.ns },
  { key: 'CNAME', label: 'CNAME', fn: dns.cname },
];

function getValue(r: Record<string, unknown>): string {
  if (typeof r === 'string') return r;
  const rec = r as { value?: string; data?: string; address?: string; exchange?: string; target?: string; nsname?: string };
  return (
    rec.value ??
    rec.data ??
    rec.address ??
    rec.exchange ??
    rec.target ??
    rec.nsname ??
    JSON.stringify(r)
  );
}

function RecordsTable({ records }: { records: unknown }) {
  // Normalize: API may return an array (most types), a bare object (e.g. SOA), or strings (NS, TXT).
  const list: Array<Record<string, unknown> | string> = Array.isArray(records)
    ? records
    : records && typeof records === 'object'
      ? [records as Record<string, unknown>]
      : [];
  if (list.length === 0)
    return <div className="text-xs text-slate-500">No records.</div>;
  const rows = list.map((r) => (typeof r === 'string' ? { __value: r } : r));
  const hasPrio = rows.some((r) => (r as { priority?: number }).priority !== undefined);
  const hasTtl = rows.some((r) => (r as { ttl?: number }).ttl !== undefined);
  return (
    <DataTable
      rows={rows as Array<Record<string, unknown>>}
      columns={[
        {
          key: 'value',
          header: 'Value',
          render: (r) => {
            const val =
              (r as { __value?: string }).__value ?? getValue(r as Record<string, unknown>);
            // For SOA-like or composite objects, show key fields inline.
            if (
              typeof r === 'object' &&
              !(r as { __value?: string }).__value &&
              !(r as { value?: string }).value &&
              !(r as { address?: string }).address &&
              !(r as { exchange?: string }).exchange
            ) {
              const entries = Object.entries(r).filter(([k]) => k !== 'ttl' && k !== 'priority');
              if (entries.length > 1) {
                return (
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {entries.map(([k, v]) => (
                      <span key={k} className="text-xs">
                        <span className="text-slate-500 mr-1">{k}:</span>
                        <span className="mono text-brand-300">{String(v)}</span>
                      </span>
                    ))}
                  </div>
                );
              }
            }
            return (
              <MonoValue copyable value={val} size="sm">
                {val}
              </MonoValue>
            );
          },
        },
        ...(hasPrio
          ? [
              {
                key: 'priority',
                header: 'Prio',
                className: 'w-16',
                render: (r: Record<string, unknown>) =>
                  (r as { priority?: number }).priority !== undefined ? (
                    <span className="mono text-data-blue">{(r as { priority?: number }).priority}</span>
                  ) : (
                    '—'
                  ),
              },
            ]
          : []),
        ...(hasTtl
          ? [
              {
                key: 'ttl',
                header: 'TTL',
                className: 'w-24',
                render: (r: Record<string, unknown>) => <TtlBar ttl={(r as { ttl?: number }).ttl} />,
              },
            ]
          : []),
      ]}
    />
  );
}

function TtlBar({ ttl }: { ttl?: number }) {
  if (!ttl) return <span className="text-slate-500">—</span>;
  const pct = Math.min(100, Math.log10(ttl + 1) * 25);
  return (
    <div className="flex items-center gap-2">
      <span className="mono text-xs text-slate-300 tabular-nums">{formatTtl(ttl)}</span>
      <div className="h-1 w-12 rounded-full bg-surface-700">
        <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DnsLookupPage() {
  const q = useQ('domain');
  return (
    <ToolPage<DnsLookup>
      title="DNS Full Lookup"
      description="Resolves all common record types for a domain."
      inputLabel="Domain"
      inputPlaceholder="cloudflare.com"
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => dns.lookup(d)}
      toolName="DNS Lookup"
      toolPath="/dns/lookup"
    >
      {(d) => <DnsLookupReport data={d} />}
    </ToolPage>
  );
}

const TYPE_ORDER = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'SOA', 'TXT', 'CAA'] as const;

function countRecs(recs: unknown): number {
  if (Array.isArray(recs)) return recs.length;
  if (recs && typeof recs === 'object') return 1;
  return 0;
}

function DnsLookupReport({ data }: { data: DnsLookup }) {
  const records = (data.records ?? {}) as Record<string, unknown>;
  const knownKeys = new Set<string>(TYPE_ORDER);
  const orderedKeys: string[] = [
    ...TYPE_ORDER.filter((k) => k in records),
    ...Object.keys(records).filter((k) => !knownKeys.has(k)),
  ];

  return (
    <div className="space-y-4">
      <ResultCard title={`Summary · ${data.domain}`} accent>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_ORDER.map((t) => {
            const c = countRecs(records[t]);
            return (
              <StatusBadge key={t} status={c > 0 ? 'pass' : 'unknown'} size="sm">
                <span className="mono">
                  {t} <span className="text-slate-400">·</span> {c}
                </span>
              </StatusBadge>
            );
          })}
        </div>
      </ResultCard>

      <div className="space-y-3">
        {orderedKeys.map((type) => {
          const recs = records[type];
          const count = countRecs(recs);
          return (
            <CollapsibleSection key={type} title={type} count={count}>
              <TypedRecordsView type={type} records={recs} />
            </CollapsibleSection>
          );
        })}
      </div>
    </div>
  );
}

function TypedRecordsView({ type, records }: { type: string; records: unknown }) {
  const count = countRecs(records);
  if (count === 0) {
    return <div className="text-xs text-slate-500">No records.</div>;
  }
  switch (type) {
    case 'A':
    case 'AAAA':
      return <AddressList records={records as Array<{ address?: string; ttl?: number }>} />;
    case 'CNAME':
      return <CnameList records={records as Array<Record<string, unknown> | string>} />;
    case 'MX':
      return <MxList records={records as Array<{ exchange?: string; priority?: number; ttl?: number }>} />;
    case 'NS':
      return <NsList records={records as Array<string | Record<string, unknown>>} />;
    case 'SOA':
      return <SoaCard data={records as Record<string, unknown>} />;
    case 'TXT':
      return <TxtList records={records as Array<string | Record<string, unknown>>} />;
    case 'CAA':
      return <CaaList records={records as Array<Record<string, unknown>>} />;
    default:
      return <RecordsTable records={records} />;
  }
}

function AddressList({ records }: { records: Array<{ address?: string; ttl?: number }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {records.map((r, i) => (
        <div
          key={`${r.address}-${i}`}
          className="flex items-center justify-between gap-2 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2"
        >
          <MonoValue
            value={r.address ?? ''}
            type="ip"
            copyable
            linkTo={r.address ? `/network/ip?q=${r.address}` : undefined}
            size="sm"
          >
            {r.address ?? '—'}
          </MonoValue>
          <TtlBar ttl={r.ttl} />
        </div>
      ))}
    </div>
  );
}

function CnameList({ records }: { records: Array<Record<string, unknown> | string> }) {
  return (
    <div className="space-y-1.5">
      {records.map((r, i) => {
        const target =
          typeof r === 'string'
            ? r
            : ((r as { value?: string; data?: string; target?: string }).value ??
              (r as { data?: string }).data ??
              (r as { target?: string }).target ??
              '—');
        const ttl = typeof r === 'object' ? (r as { ttl?: number }).ttl : undefined;
        return (
          <div
            key={`${target}-${i}`}
            className="flex items-center justify-between gap-3 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2"
          >
            <MonoValue value={target} type="domain" copyable size="sm">
              {target}
            </MonoValue>
            <TtlBar ttl={ttl} />
          </div>
        );
      })}
    </div>
  );
}

function MxList({
  records,
}: {
  records: Array<{ exchange?: string; priority?: number; ttl?: number }>;
}) {
  const sorted = [...records].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
  return (
    <div className="space-y-1.5">
      {sorted.map((r, i) => (
        <div
          key={`${r.exchange}-${i}`}
          className="flex items-center gap-3 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2"
        >
          <span className="mono text-xs px-2 py-0.5 rounded bg-brand-500/15 text-brand-300 w-12 text-center shrink-0">
            {r.priority ?? '—'}
          </span>
          <MonoValue value={r.exchange ?? ''} type="domain" copyable size="sm">
            {r.exchange ?? '—'}
          </MonoValue>
          <div className="ml-auto">
            <TtlBar ttl={r.ttl} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NsList({ records }: { records: Array<string | Record<string, unknown>> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {records.map((r, i) => {
        const host =
          typeof r === 'string'
            ? r
            : ((r as { value?: string; nsname?: string; data?: string }).value ??
              (r as { nsname?: string }).nsname ??
              (r as { data?: string }).data ??
              '—');
        const ttl = typeof r === 'object' ? (r as { ttl?: number }).ttl : undefined;
        return (
          <div
            key={`${host}-${i}`}
            className="flex items-center justify-between gap-2 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2"
          >
            <MonoValue value={host} type="domain" copyable size="sm">
              {host}
            </MonoValue>
            <TtlBar ttl={ttl} />
          </div>
        );
      })}
    </div>
  );
}

function SoaCard({ data }: { data: Record<string, unknown> }) {
  const fields: Array<[string, string, React.ReactNode]> = [
    ['nsname', 'Primary NS', <MonoValue value={String(data.nsname ?? '')} type="domain" copyable size="sm">{String(data.nsname ?? '—')}</MonoValue>],
    ['hostmaster', 'Hostmaster', <MonoValue value={String(data.hostmaster ?? '')} copyable size="sm">{String(data.hostmaster ?? '—')}</MonoValue>],
    ['serial', 'Serial', <span className="mono text-data-blue">{String(data.serial ?? '—')}</span>],
    ['refresh', 'Refresh', <span className="mono text-slate-300">{formatTtl(Number(data.refresh) || 0)}</span>],
    ['retry', 'Retry', <span className="mono text-slate-300">{formatTtl(Number(data.retry) || 0)}</span>],
    ['expire', 'Expire', <span className="mono text-slate-300">{formatTtl(Number(data.expire) || 0)}</span>],
    ['minttl', 'Min TTL', <span className="mono text-slate-300">{formatTtl(Number(data.minttl) || 0)}</span>],
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      {fields.map(([k, label, node]) => (
        <div key={k} className="flex items-baseline gap-2 py-1 border-b border-surface-800/60">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 w-24 shrink-0">
            {label}
          </span>
          <span className="min-w-0 break-words">{node}</span>
        </div>
      ))}
    </div>
  );
}

function classifyTxt(s: string): { kind: string; tone: 'pass' | 'info' | 'warn' | 'unknown' } {
  const lower = s.toLowerCase().trimStart();
  if (lower.startsWith('v=spf1')) return { kind: 'SPF', tone: 'pass' };
  if (lower.startsWith('v=dmarc1')) return { kind: 'DMARC', tone: 'pass' };
  if (lower.startsWith('v=dkim1')) return { kind: 'DKIM', tone: 'pass' };
  const m = s.match(/^([a-z0-9_-]+(?:-domain)?-verification|google-site-verification|ms|asv|zoom_verify|apple-domain-verification|facebook-domain-verification|status-page-domain-verification|atlassian-domain-verification)[=:_-]/i);
  if (m) return { kind: 'verify', tone: 'info' };
  if (lower.startsWith('_')) return { kind: 'token', tone: 'unknown' };
  return { kind: 'txt', tone: 'unknown' };
}

function TxtList({ records }: { records: Array<string | Record<string, unknown>> }) {
  const strings = records.map((r) =>
    typeof r === 'string'
      ? r
      : String(
          (r as { value?: unknown }).value ??
            (r as { data?: unknown }).data ??
            JSON.stringify(r)
        )
  );

  const groups: Record<string, string[]> = { SPF: [], DMARC: [], DKIM: [], verify: [], token: [], txt: [] };
  for (const s of strings) {
    const { kind } = classifyTxt(s);
    groups[kind].push(s);
  }
  const sections: Array<{ label: string; items: string[]; tone: 'pass' | 'info' | 'warn' | 'unknown' }> = (
    [
      { label: 'SPF', items: groups.SPF, tone: 'pass' },
      { label: 'DMARC', items: groups.DMARC, tone: 'pass' },
      { label: 'DKIM', items: groups.DKIM, tone: 'pass' },
      { label: 'Verification tokens', items: groups.verify, tone: 'info' },
      { label: 'Underscore tokens', items: groups.token, tone: 'unknown' },
      { label: 'Other', items: groups.txt, tone: 'unknown' },
    ] as const
  ).filter((s) => s.items.length > 0);

  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <div key={s.label}>
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge status={s.tone} size="sm">
              {s.label}
            </StatusBadge>
            <span className="text-[11px] mono text-slate-500">{s.items.length}</span>
          </div>
          <div className="space-y-1">
            {s.items.map((line, i) => (
              <div
                key={i}
                className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-1.5"
              >
                <MonoValue value={line} copyable size="xs">
                  <span className="break-all">{line}</span>
                </MonoValue>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CaaList({ records }: { records: Array<Record<string, unknown>> }) {
  const toneFor = (tag: string): 'pass' | 'info' | 'warn' | 'unknown' => {
    if (tag === 'issue') return 'pass';
    if (tag === 'issuewild') return 'info';
    if (tag === 'iodef') return 'warn';
    return 'unknown';
  };
  return (
    <div className="space-y-1">
      {records.map((r, i) => {
        const tag = (['issue', 'issuewild', 'iodef'] as const).find(
          (k) => r[k] !== undefined
        ) ?? 'unknown';
        const value = String(r[tag] ?? '');
        const critical = Number(r.critical ?? 0);
        return (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-1.5 text-sm"
          >
            <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 text-slate-400 w-8 text-center">
              {critical}
            </span>
            <StatusBadge status={toneFor(tag)} size="sm">
              {tag}
            </StatusBadge>
            <MonoValue value={value} copyable size="xs">
              <span className="break-all text-slate-200">{value || '—'}</span>
            </MonoValue>
          </div>
        );
      })}
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-800/60"
      >
        <span className="text-sm font-semibold tracking-wide">{title}</span>
        <span
          className={`text-xs mono ${
            count > 0 ? 'text-brand-300' : 'text-slate-500'
          } px-2 py-0.5 rounded border border-surface-700`}
        >
          {count}
        </span>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </section>
  );
}

function DnsRecords() {
  const q = useQ('domain');
  const [tab, setTab] = useState<DnsRecordType>('A');
  const [domain, setDomain] = useState(q);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">DNS Record Types</h1>
        <p className="text-sm text-slate-400">Tabbed view of a single record type at a time.</p>
      </header>
      <div className="flex items-center gap-2">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1 bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-sm text-brand-200 outline-none focus:border-brand-400/70"
          placeholder="cloudflare.com"
        />
      </div>
      <div className="flex gap-1 border-b border-surface-700 overflow-x-auto">
        {RECORD_TYPES.map((rt) => (
          <button
            key={rt.key}
            onClick={() => setTab(rt.key)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border-b-2 ${
              tab === rt.key
                ? 'border-brand-400 text-brand-200'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {rt.label}
          </button>
        ))}
      </div>
      <RecordTabContent key={`${tab}:${domain}`} type={tab} domain={domain} />
    </div>
  );
}

function RecordTabContent({ type, domain }: { type: DnsRecordType; domain: string }) {
  const [data, setData] = useState<DnsTypedRecords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    const fn = RECORD_TYPES.find((r) => r.key === type)?.fn;
    if (!fn) {
      setLoading(false);
      return;
    }
    const domainError = v.domain(domain);
    if (domainError) {
      setError(domainError);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fn(domain)
      .then((r) => {
        if (!cancelled) setData((r as { data: DnsTypedRecords }).data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Failed');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [type, domain]);

  if (loading) return <div className="text-xs text-slate-500">Loading {type}…</div>;
  if (error) return <div className="text-xs text-data-red">{error}</div>;
  if (!data) return null;
  return (
    <ResultCard title={`${type} records · ${data.domain}`} accent>
      <RecordsTable records={data.records as Array<Record<string, unknown>>} />
    </ResultCard>
  );
}

function DnsSecPage() {
  const q = useQ('domain');
  return (
    <ToolPage<DnsSec>
      title="DNSSEC"
      description="Inspect DNSSEC chain-of-trust validation."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => dns.dnssec(d)}
      toolName="DNSSEC"
      toolPath="/dns/dnssec"
    >
      {(d) => <DnssecReport d={d} />}
    </ToolPage>
  );
}

interface DnssecRecord {
  name?: string;
  type?: number;
  TTL?: number;
  ttl?: number;
  data?: string;
}

// RFC type numbers we display nicely
const DNSSEC_TYPE_LABEL: Record<number, string> = {
  43: 'DS',
  46: 'RRSIG',
  47: 'NSEC',
  48: 'DNSKEY',
  50: 'NSEC3',
};

function DnssecReport({ d }: { d: DnsSec }) {
  const ds = (d.ds_records ?? []) as DnssecRecord[];
  const dnskey = (d.dnskey_records ?? []) as DnssecRecord[];
  const dsOnly = ds.filter((r) => r.type === 43);
  const dsRrsig = ds.filter((r) => r.type === 46);
  const dnskeysOnly = dnskey.filter((r) => r.type === 48);
  const dnskeyRrsig = dnskey.filter((r) => r.type === 46);

  return (
    <div className="space-y-4">
      <ResultCard title={`DNSSEC · ${d.domain}`} accent>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={d.signed ? 'pass' : 'fail'} glow size="lg">
            {d.signed ? 'Signed' : 'Unsigned'}
          </StatusBadge>
          <StatusBadge status={d.ad_flag ? 'pass' : 'warn'} size="md">
            AD flag {d.ad_flag ? 'set' : 'absent'}
          </StatusBadge>
          <div className="text-xs text-slate-400 mono flex items-center gap-3 ml-auto">
            <span>{dsOnly.length} DS</span>
            <span>·</span>
            <span>{dnskeysOnly.length} DNSKEY</span>
            <span>·</span>
            <span>{dsRrsig.length + dnskeyRrsig.length} RRSIG</span>
          </div>
        </div>
      </ResultCard>

      <ResultCard title={`DS records (${dsOnly.length})`} accent>
        {dsOnly.length === 0 ? (
          <div className="text-xs text-slate-500">No DS records published at the parent zone.</div>
        ) : (
          <div className="space-y-1.5">
            {dsOnly.map((r, i) => (
              <DsRow key={i} r={r} />
            ))}
          </div>
        )}
        {dsRrsig.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
              {dsRrsig.length} RRSIG covering DS
            </summary>
            <div className="mt-2 space-y-1.5">
              {dsRrsig.map((r, i) => (
                <RrsigRow key={i} r={r} />
              ))}
            </div>
          </details>
        )}
      </ResultCard>

      <ResultCard title={`DNSKEY records (${dnskeysOnly.length})`} accent>
        {dnskeysOnly.length === 0 ? (
          <div className="text-xs text-slate-500">No DNSKEY records returned.</div>
        ) : (
          <div className="space-y-1.5">
            {dnskeysOnly.map((r, i) => (
              <DnskeyRow key={i} r={r} />
            ))}
          </div>
        )}
        {dnskeyRrsig.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
              {dnskeyRrsig.length} RRSIG covering DNSKEY
            </summary>
            <div className="mt-2 space-y-1.5">
              {dnskeyRrsig.map((r, i) => (
                <RrsigRow key={i} r={r} />
              ))}
            </div>
          </details>
        )}
      </ResultCard>
    </div>
  );
}

function typeBadge(t?: number) {
  const label = (t !== undefined && DNSSEC_TYPE_LABEL[t]) || (t !== undefined ? `TYPE${t}` : '—');
  return (
    <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 text-slate-400 shrink-0">
      {label}
    </span>
  );
}

function recordHeader(r: DnssecRecord) {
  const ttl = r.TTL ?? r.ttl;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {typeBadge(r.type)}
      <span className="mono text-xs text-slate-300">{r.name ?? '—'}</span>
      <span className="ml-auto">
        <TtlBar ttl={ttl} />
      </span>
    </div>
  );
}

// DS rdata: "<keytag> <algorithm> <digestType> <digest>"
function DsRow({ r }: { r: DnssecRecord }) {
  const parts = (r.data ?? '').trim().split(/\s+/);
  const [keytag, algo, digestType, ...digestParts] = parts;
  const digest = digestParts.join('');
  return (
    <div className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2 space-y-1.5">
      {recordHeader(r)}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs">
        <Labeled label="Key tag">
          <span className="mono text-data-blue">{keytag ?? '—'}</span>
        </Labeled>
        <Labeled label="Algorithm">
          <span className="mono text-slate-300">{algo ?? '—'}</span>
        </Labeled>
        <Labeled label="Digest type">
          <span className="mono text-slate-300">{digestType ?? '—'}</span>
        </Labeled>
        <Labeled label="Length">
          <span className="mono text-slate-500">{digest.length} hex</span>
        </Labeled>
      </div>
      {digest && (
        <div className="text-[11px] mono text-slate-400 break-all border-t border-surface-800 pt-1.5">
          {digest}
        </div>
      )}
    </div>
  );
}

// DNSKEY rdata: "<flags> <protocol> <algorithm> <base64-key>"
// Flags 257 = KSK, 256 = ZSK.
function DnskeyRow({ r }: { r: DnssecRecord }) {
  const parts = (r.data ?? '').trim().split(/\s+/);
  const [flagsStr, protoStr, algo, ...keyParts] = parts;
  const flags = Number(flagsStr);
  const key = keyParts.join('');
  const isKsk = flags === 257;
  return (
    <div className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {typeBadge(r.type)}
        <span className="mono text-xs text-slate-300">{r.name ?? '—'}</span>
        <StatusBadge status={isKsk ? 'pass' : 'info'} size="sm">
          {isKsk ? 'KSK · 257' : flags === 256 ? 'ZSK · 256' : `flags ${flagsStr ?? '?'}`}
        </StatusBadge>
        <span className="ml-auto">
          <TtlBar ttl={r.TTL ?? r.ttl} />
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs">
        <Labeled label="Flags">
          <span className="mono text-data-blue">{flagsStr ?? '—'}</span>
        </Labeled>
        <Labeled label="Protocol">
          <span className="mono text-slate-300">{protoStr ?? '—'}</span>
        </Labeled>
        <Labeled label="Algorithm">
          <span className="mono text-slate-300">{algo ?? '—'}</span>
        </Labeled>
        <Labeled label="Key length">
          <span className="mono text-slate-500">{key.length} chars</span>
        </Labeled>
      </div>
      {key && (
        <details className="text-[11px]">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
            Show public key
          </summary>
          <div className="mt-1 mono text-slate-400 break-all border-t border-surface-800 pt-1.5">
            {key}
          </div>
        </details>
      )}
    </div>
  );
}

// RRSIG rdata: "<typeCovered> <algorithm> <labels> <origTTL> <sigExpire> <sigInception> <keytag> <signer> <signature>"
function RrsigRow({ r }: { r: DnssecRecord }) {
  const parts = (r.data ?? '').trim().split(/\s+/);
  const [covered, algo, labels, origTtl, expire, inception, keytag, signer, ...sigParts] = parts;
  const sig = sigParts.join('');
  const fmtEpoch = (e?: string) => {
    if (!e) return '—';
    const n = Number(e);
    if (!Number.isFinite(n)) return e;
    return new Date(n * 1000).toLocaleString();
  };
  return (
    <div className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {typeBadge(r.type)}
        <span className="mono text-xs text-slate-300">{r.name ?? '—'}</span>
        <span className="text-[11px] text-slate-500">covers</span>
        <span className="mono text-[11px] text-brand-300">{covered ?? '—'}</span>
        <span className="ml-auto">
          <TtlBar ttl={r.TTL ?? r.ttl} />
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-xs">
        <Labeled label="Algorithm">
          <span className="mono text-slate-300">{algo ?? '—'}</span>
        </Labeled>
        <Labeled label="Labels">
          <span className="mono text-slate-300">{labels ?? '—'}</span>
        </Labeled>
        <Labeled label="Orig TTL">
          <span className="mono text-slate-300">{origTtl ?? '—'}</span>
        </Labeled>
        <Labeled label="Inception">
          <span className="text-slate-300" title={inception}>
            {fmtEpoch(inception)}
          </span>
        </Labeled>
        <Labeled label="Expires">
          <span className="text-slate-300" title={expire}>
            {fmtEpoch(expire)}
          </span>
        </Labeled>
        <Labeled label="Key tag">
          <span className="mono text-data-blue">{keytag ?? '—'}</span>
        </Labeled>
        <Labeled label="Signer">
          <span className="mono text-slate-300 truncate">{signer ?? '—'}</span>
        </Labeled>
      </div>
      {sig && (
        <details className="text-[11px]">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
            Show signature
          </summary>
          <div className="mt-1 mono text-slate-400 break-all border-t border-surface-800 pt-1.5">
            {sig}
          </div>
        </details>
      )}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 shrink-0">{label}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function DnsEmail() {
  const q = useQ('domain');
  return (
    <ToolPage<{ spf: DnsSpf; dmarc: DnsDmarc }>
      title="Email Auth (SPF + DMARC)"
      description="Combined SPF and DMARC inspection for a domain."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={async (d) => {
        const [spfRes, dmarcRes] = await Promise.all([dns.spf(d), dns.dmarc(d)]);
        return {
          data: { spf: spfRes.data, dmarc: dmarcRes.data },
          meta: spfRes.meta,
        };
      }}
      toolName="Email Auth"
      toolPath="/dns/email"
    >
      {(d) => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResultCard title={`SPF · ${d.spf.domain}`} accent>
            <StatusBadge status={d.spf.present ? 'pass' : 'fail'} size="md" glow>
              {d.spf.present ? 'Present' : 'Missing'}
            </StatusBadge>
            <div className="mt-3 space-y-2">
              {(d.spf.records ?? []).map((r, i) => (
                <MonoValue key={i} value={r.raw ?? ''} copyable size="xs">
                  {r.raw ?? '—'}
                </MonoValue>
              ))}
            </div>
            {!!d.spf.issues?.length && (
              <div className="mt-3 space-y-1">
                {d.spf.issues.map((iss, i) => (
                  <div key={i} className="text-xs text-data-yellow">
                    ⚠ {iss.message}
                  </div>
                ))}
              </div>
            )}
          </ResultCard>
          <ResultCard title={`DMARC · ${d.dmarc.domain}`} accent>
            <StatusBadge status={d.dmarc.present ? 'pass' : 'fail'} size="md" glow>
              {d.dmarc.present ? 'Present' : 'Missing'}
            </StatusBadge>
            <div className="mt-3 space-y-2">
              {(d.dmarc.records ?? []).map((r, i) => (
                <MonoValue key={i} value={r.raw ?? ''} copyable size="xs">
                  {r.raw ?? '—'}
                </MonoValue>
              ))}
            </div>
          </ResultCard>
        </div>
      )}
    </ToolPage>
  );
}

function DnsPropagationPage() {
  const q = useQ('domain');
  return (
    <ToolPage<DnsPropagation>
      title="DNS Propagation"
      description="Resolve a domain across multiple public resolvers to check propagation."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => dns.propagation(d)}
      toolName="DNS Propagation"
      toolPath="/dns/propagation"
    >
      {(d) => (
        <ResultCard title={`Propagation for ${d.domain} (${d.type ?? 'A'})`} accent>
          <DataTable
            rows={(d.results ?? []) as Array<Record<string, unknown>>}
            columns={[
              {
                key: 'ok',
                header: '',
                className: 'w-10',
                render: (r) => {
                  const err = (r as { error?: string }).error;
                  const recs = (r as { records?: unknown[]; answers?: unknown[] }).records ?? (r as { answers?: unknown[] }).answers ?? [];
                  const ok = !err && Array.isArray(recs) && recs.length > 0;
                  return <StatusBadge status={ok ? 'pass' : 'fail'} size="sm"> </StatusBadge>;
                },
              },
              {
                key: 'resolver',
                header: 'Resolver',
                render: (r) => (
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm text-slate-200">
                      {(r as { resolver?: string }).resolver ?? '—'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {((r as { servers?: string[] }).servers ?? []).map((s) => (
                        <MonoValue key={s} size="xs" type="ip">
                          {s}
                        </MonoValue>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: 'latency',
                header: 'Latency',
                className: 'w-24',
                render: (r) => {
                  const ms = (r as { latency_ms?: number }).latency_ms;
                  if (ms === undefined) return <span className="text-slate-500">—</span>;
                  return (
                    <span
                      className={
                        ms < 50
                          ? 'mono text-data-green'
                          : ms < 150
                            ? 'mono text-data-yellow'
                            : 'mono text-data-red'
                      }
                    >
                      {ms} ms
                    </span>
                  );
                },
              },
              {
                key: 'answers',
                header: 'Answers',
                render: (r) => {
                  const err = (r as { error?: string }).error;
                  if (err) return <span className="text-data-red text-xs mono">{err}</span>;
                  const recs =
                    ((r as { records?: Array<Record<string, unknown>> }).records ??
                      (r as { answers?: unknown[] }).answers ??
                      []) as Array<Record<string, unknown> | string>;
                  if (recs.length === 0)
                    return <span className="text-slate-500 text-xs">no answers</span>;
                  return (
                    <div className="flex flex-wrap gap-1">
                      {recs.map((a, i) => {
                        const addr =
                          typeof a === 'string'
                            ? a
                            : (a.address ?? a.value ?? a.data ?? JSON.stringify(a));
                        const ttl = typeof a === 'object' ? (a as { ttl?: number }).ttl : undefined;
                        return (
                          <span key={i} className="inline-flex items-center gap-1">
                            <MonoValue size="xs" type="ip">
                              {String(addr)}
                            </MonoValue>
                            {ttl !== undefined && (
                              <span className="text-[10px] text-slate-500 mono">ttl {ttl}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  );
                },
              },
            ]}
          />
        </ResultCard>
      )}
    </ToolPage>
  );
}

export default function DnsRoutes() {
  return (
    <Routes>
      <Route path="lookup" element={<DnsLookupPage />} />
      <Route path="records" element={<DnsRecords />} />
      <Route path="dnssec" element={<DnsSecPage />} />
      <Route path="email" element={<DnsEmail />} />
      <Route path="propagation" element={<DnsPropagationPage />} />
      <Route path="*" element={<Navigate to="lookup" replace />} />
    </Routes>
  );
}
