import { Route, Routes, Navigate } from 'react-router-dom';
import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { MonoValue } from '@/components/output/MonoValue';
import { StatusBadge } from '@/components/output/StatusBadge';
import { domain } from '@/api/endpoints';
import { v } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import { formatDate, formatNumber, relativeTime } from '@/utils/formatters';
import type {
  DomainAge,
  DomainIntelligence,
  DomainNameservers,
  DomainRegistrar,
  DomainWhois,
} from '@/api/types';

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b last:border-b-0 border-surface-800/80">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 w-32 shrink-0 pt-0.5">{k}</div>
      <div className="text-sm text-slate-200 min-w-0">{children}</div>
    </div>
  );
}

function Intelligence() {
  const q = useQ('domain');
  return (
    <ToolPage<DomainIntelligence>
      title="Domain Intelligence"
      description="Aggregated WHOIS, DNS, and security signals for a domain."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => domain.intelligence(d)}
      toolName="Domain Intelligence"
      toolPath="/domain/intelligence"
    >
      {(d) => <IntelReport d={d} />}
    </ToolPage>
  );
}

// Tooltip text for the most common EPP / ICANN status flags.
const STATUS_INFO: Record<string, string> = {
  'client delete prohibited': 'Registrar prevents deletion of the domain.',
  'client transfer prohibited': 'Registrar prevents transfer to another registrar.',
  'client update prohibited': 'Registrar prevents modifications to the domain.',
  'client renew prohibited': 'Registrar prevents renewal.',
  'client hold': 'Domain is on hold by registrar — will not resolve.',
  'server delete prohibited': 'Registry prevents deletion.',
  'server transfer prohibited': 'Registry prevents transfer.',
  'server update prohibited': 'Registry prevents modifications.',
  'server renew prohibited': 'Registry prevents renewal.',
  'server hold': 'Domain is on hold by registry — will not resolve.',
  ok: 'No pending operations; domain is normal.',
  inactive: 'No name servers associated — domain will not resolve.',
  'pending delete': 'Scheduled for deletion.',
  'pending transfer': 'Transfer in progress.',
};

function statusTone(s: string): 'pass' | 'warn' | 'fail' | 'info' {
  const lower = s.toLowerCase();
  if (lower.includes('prohibited')) return 'pass'; // lock = good for security
  if (lower === 'ok' || lower.startsWith('active')) return 'pass';
  if (lower.includes('hold') || lower.includes('inactive')) return 'fail';
  if (lower.startsWith('pending')) return 'warn';
  return 'info';
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (isNaN(d)) return null;
  return Math.round((d - Date.now()) / 86400000);
}

function expiryTone(days: number | null): 'pass' | 'warn' | 'fail' | 'unknown' {
  if (days === null) return 'unknown';
  if (days < 0) return 'fail';
  if (days < 30) return 'fail';
  if (days < 90) return 'warn';
  return 'pass';
}

function IntelReport({ d }: { d: DomainIntelligence }) {
  const expDays = daysUntil(d.expires_at);
  const expTone = expiryTone(expDays);

  return (
    <div className="space-y-4">
      <ResultCard title={d.domain} accent>
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display text-brand-300">{d.sld ?? '—'}</span>
            <span className="text-xl text-slate-500">.{d.tld ?? ''}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-1.5 text-sm flex-1 min-w-0">
            <Stat label="Registrar" value={d.registrar ?? '—'} />
            <Stat
              label="Age"
              value={
                d.age_days !== undefined ? (
                  <span title={formatDate(d.registered_at)}>
                    <span className="mono text-data-blue">{formatNumber(d.age_days)}</span>{' '}
                    <span className="text-slate-500 text-xs">days</span>
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <Stat
              label="Registered"
              value={
                <span title={d.registered_at}>
                  {formatDate(d.registered_at)}{' '}
                  <span className="text-slate-500 text-xs">({relativeTime(d.registered_at)})</span>
                </span>
              }
            />
            <Stat
              label="Expires"
              value={
                d.expires_at ? (
                  <span title={d.expires_at}>
                    <span
                      className={
                        expTone === 'fail'
                          ? 'text-data-red'
                          : expTone === 'warn'
                            ? 'text-data-yellow'
                            : 'text-slate-200'
                      }
                    >
                      {formatDate(d.expires_at)}
                    </span>{' '}
                    {expDays !== null && (
                      <span className="text-slate-500 text-xs">
                        ({expDays < 0 ? `${-expDays}d ago` : `in ${expDays}d`})
                      </span>
                    )}
                  </span>
                ) : (
                  '—'
                )
              }
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <StatusBadge status={d.dnssec_signed ? 'pass' : 'warn'} glow={!!d.dnssec_signed} size="md">
              DNSSEC {d.dnssec_signed ? 'signed' : 'unsigned'}
            </StatusBadge>
          </div>
        </div>
      </ResultCard>

      {!!d.status?.length && (
        <ResultCard title={`Status (${d.status.length})`} accent>
          <div className="flex flex-wrap gap-1.5">
            {d.status.map((s) => (
              <StatusBadge key={s} status={statusTone(s)} size="sm">
                <span title={STATUS_INFO[s.toLowerCase()] ?? s}>{s}</span>
              </StatusBadge>
            ))}
          </div>
        </ResultCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title={`Name servers (${(d.nameservers ?? []).length})`} accent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {(d.nameservers ?? []).map((n) => (
              <div
                key={n}
                className="rounded-md border border-surface-700 bg-surface-900/40 px-2.5 py-1.5"
              >
                <MonoValue value={n} type="domain" copyable size="sm">
                  {n}
                </MonoValue>
              </div>
            ))}
          </div>
        </ResultCard>

        <ResultCard title={`A records (${(d.a_records ?? []).length})`} accent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {(d.a_records ?? []).map((a, i) => {
              const addr = typeof a === 'string' ? a : (a as { address?: string }).address ?? '';
              const ttl = typeof a === 'object' ? (a as { ttl?: number }).ttl : undefined;
              return (
                <div
                  key={`${addr}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-surface-700 bg-surface-900/40 px-2.5 py-1.5"
                >
                  <MonoValue
                    value={addr}
                    type="ip"
                    linkTo={`/network/ip?q=${addr}`}
                    size="sm"
                    copyable
                  >
                    {addr || '—'}
                  </MonoValue>
                  {ttl !== undefined && (
                    <span className="text-[10px] mono text-slate-500">ttl {ttl}</span>
                  )}
                </div>
              );
            })}
            {(d.a_records ?? []).length === 0 && (
              <div className="text-xs text-slate-500">No A records.</div>
            )}
          </div>
        </ResultCard>

        <ResultCard title={`MX records (${(d.mx_records ?? []).length})`} accent className="lg:col-span-2">
          <div className="space-y-1">
            {[...(d.mx_records ?? [])]
              .sort((a, b) => {
                const ap = (a as { priority?: number }).priority ?? 999;
                const bp = (b as { priority?: number }).priority ?? 999;
                return ap - bp;
              })
              .map((m, i) => {
                const mx = m as { priority?: number; exchange?: string };
                return (
                  <div
                    key={`${mx.exchange}-${i}`}
                    className="flex items-center gap-3 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-1.5"
                  >
                    <span className="mono text-xs px-2 py-0.5 rounded bg-brand-500/15 text-brand-300 w-12 text-center shrink-0">
                      {mx.priority ?? '—'}
                    </span>
                    <MonoValue value={mx.exchange ?? ''} type="domain" copyable size="sm">
                      {mx.exchange ?? '—'}
                    </MonoValue>
                  </div>
                );
              })}
            {(d.mx_records ?? []).length === 0 && (
              <div className="text-xs text-slate-500">No MX records.</div>
            )}
          </div>
        </ResultCard>
      </div>

      {!!d.txt_records?.length && (
        <ResultCard title={`TXT records (${d.txt_records.length})`} accent>
          <TxtBreakdown items={d.txt_records as Array<string | Record<string, unknown>>} />
        </ResultCard>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`truncate ${accent ? 'text-brand-200' : 'text-slate-200'}`}>{value}</div>
    </div>
  );
}

function classifyDomainTxt(s: string): { kind: 'spf' | 'dmarc' | 'dkim' | 'verify' | 'token' | 'other'; label: string; tone: 'pass' | 'info' | 'warn' | 'unknown' } {
  const lower = s.toLowerCase().trimStart();
  if (lower.startsWith('v=spf1')) return { kind: 'spf', label: 'SPF', tone: 'pass' };
  if (lower.startsWith('v=dmarc1')) return { kind: 'dmarc', label: 'DMARC', tone: 'pass' };
  if (lower.startsWith('v=dkim1')) return { kind: 'dkim', label: 'DKIM', tone: 'pass' };
  if (/^([a-z0-9_-]+(?:-domain)?-verification|google-site-verification|ms|asv|zoom_verify|apple-domain-verification|facebook-domain-verification|status-page-domain-verification|atlassian-domain-verification)[=:_-]/i.test(s)) {
    return { kind: 'verify', label: 'Verification', tone: 'info' };
  }
  if (lower.startsWith('_')) return { kind: 'token', label: 'Token', tone: 'unknown' };
  return { kind: 'other', label: 'Other', tone: 'unknown' };
}

function TxtBreakdown({ items }: { items: Array<string | Record<string, unknown>> }) {
  const strings = items.map((t) =>
    typeof t === 'string'
      ? t
      : String(
          (t as { value?: unknown }).value ??
            (t as { data?: unknown }).data ??
            JSON.stringify(t)
        )
  );
  const order: Array<'spf' | 'dmarc' | 'dkim' | 'verify' | 'token' | 'other'> = [
    'spf',
    'dmarc',
    'dkim',
    'verify',
    'token',
    'other',
  ];
  const groups: Record<string, { label: string; tone: 'pass' | 'info' | 'warn' | 'unknown'; items: string[] }> = {};
  for (const k of order) groups[k] = { label: '', tone: 'unknown', items: [] };
  for (const s of strings) {
    const { kind, label, tone } = classifyDomainTxt(s);
    groups[kind].label = label;
    groups[kind].tone = tone;
    groups[kind].items.push(s);
  }
  const visible = order.map((k) => groups[k]).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3">
      {visible.map((g) => (
        <div key={g.label}>
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge status={g.tone} size="sm">
              {g.label}
            </StatusBadge>
            <span className="text-[11px] mono text-slate-500">{g.items.length}</span>
          </div>
          <div className="space-y-1">
            {g.items.map((line, i) => (
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

function Whois() {
  const q = useQ('domain');
  return (
    <ToolPage<DomainWhois>
      title="Domain WHOIS / RDAP"
      description="Registry data: registrar, contacts, name servers, DNSSEC, status codes."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => domain.whois(d)}
      toolName="Domain WHOIS"
      toolPath="/domain/whois"
    >
      {(d) => <DomainRdapReport d={d} />}
    </ToolPage>
  );
}

// ---------- RDAP helpers (domain-scoped) ----------

interface RdapLink {
  href?: string;
  rel?: string;
  type?: string;
  value?: string;
}
interface RdapEvent {
  eventAction?: string;
  eventActor?: string;
  eventDate?: string;
}
interface RdapNotice {
  title?: string;
  description?: string[];
  links?: RdapLink[];
}
interface RdapRemark {
  title?: string;
  description?: string[];
  type?: string;
}
interface RdapEntity {
  objectClassName?: string;
  handle?: string;
  roles?: string[];
  status?: string[];
  vcardArray?: unknown;
  entities?: RdapEntity[];
  publicIds?: Array<{ identifier?: string; type?: string }>;
  remarks?: RdapRemark[];
  links?: RdapLink[];
}
interface RdapNameserver {
  objectClassName?: string;
  handle?: string;
  ldhName?: string;
  unicodeName?: string;
  links?: RdapLink[];
  ipAddresses?: { v4?: string[]; v6?: string[] };
}
interface DsData {
  algorithm?: number;
  digest?: string;
  digestType?: number;
  keyTag?: number;
}
interface SecureDns {
  delegationSigned?: boolean;
  zoneSigned?: boolean;
  dsData?: DsData[];
}
interface DomainRdap {
  rdapConformance?: string[];
  objectClassName?: string;
  handle?: string;
  ldhName?: string;
  unicodeName?: string;
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  nameservers?: RdapNameserver[];
  secureDNS?: SecureDns;
  notices?: RdapNotice[];
  remarks?: RdapRemark[];
  links?: RdapLink[];
  port43?: string;
}

interface VCard {
  fn?: string;
  org?: string;
  kind?: string;
  email?: string;
  tel?: string;
  address?: string;
}

function parseVCard(vcardArray: unknown): VCard {
  const out: VCard = {};
  if (!Array.isArray(vcardArray) || vcardArray.length < 2) return out;
  const entries = vcardArray[1];
  if (!Array.isArray(entries)) return out;
  for (const e of entries) {
    if (!Array.isArray(e) || e.length < 4) continue;
    const [key, params, , value] = e as [string, Record<string, unknown>, string, unknown];
    switch (key) {
      case 'fn':
        if (typeof value === 'string') out.fn = value;
        break;
      case 'org':
        if (typeof value === 'string') out.org = value;
        break;
      case 'kind':
        if (typeof value === 'string') out.kind = value;
        break;
      case 'email':
        if (typeof value === 'string') out.email = value;
        break;
      case 'tel':
        if (typeof value === 'string') out.tel = value.replace(/^tel:/, '');
        break;
      case 'adr': {
        const label = (params as { label?: string })?.label;
        if (typeof label === 'string') out.address = label;
        break;
      }
    }
  }
  return out;
}

function findEvent(events: RdapEvent[] | undefined, action: string): string | undefined {
  return events?.find((e) => e.eventAction === action)?.eventDate;
}

function fmtDateTime(d?: string): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRegistrar(entities?: RdapEntity[]): RdapEntity | undefined {
  return entities?.find((e) => e.roles?.includes('registrar'));
}

function getNested(ent: RdapEntity | undefined, role: string): RdapEntity | undefined {
  return ent?.entities?.find((e) => e.roles?.includes(role));
}

function getPublicId(ent: RdapEntity | undefined, type: string): string | undefined {
  return ent?.publicIds?.find((p) => p.type?.toLowerCase().includes(type.toLowerCase()))
    ?.identifier;
}

const DS_ALGORITHMS: Record<number, string> = {
  1: 'RSA/MD5',
  3: 'DSA/SHA-1',
  5: 'RSA/SHA-1',
  6: 'DSA-NSEC3-SHA1',
  7: 'RSASHA1-NSEC3-SHA1',
  8: 'RSA/SHA-256',
  10: 'RSA/SHA-512',
  13: 'ECDSAP256SHA256',
  14: 'ECDSAP384SHA384',
  15: 'Ed25519',
  16: 'Ed448',
};

const DS_DIGESTS: Record<number, string> = {
  1: 'SHA-1',
  2: 'SHA-256',
  4: 'SHA-384',
};

function DomainRdapReport({ d }: { d: DomainWhois }) {
  const rdap = d.rdap as DomainRdap | undefined;
  if (!rdap) {
    return (
      <ResultCard title={d.domain} accent>
        <span className="text-sm text-slate-500">No RDAP data returned.</span>
      </ResultCard>
    );
  }

  const registrar = getRegistrar(rdap.entities);
  const registrarV = parseVCard(registrar?.vcardArray);
  const abuse = getNested(registrar, 'abuse');
  const abuseV = parseVCard(abuse?.vcardArray);
  const ianaId = getPublicId(registrar, 'IANA');

  const registered = findEvent(rdap.events, 'registration');
  const expires =
    findEvent(rdap.events, 'expiration') ?? findEvent(rdap.events, 'expiry');
  const lastChanged = findEvent(rdap.events, 'last changed');
  const lastDbUpdate = findEvent(rdap.events, 'last update of RDAP database');

  const expDays = daysUntil(expires);
  const expTone = expiryTone(expDays);
  const ageDays = (() => {
    if (!registered) return null;
    const t = new Date(registered).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.floor((Date.now() - t) / 86400000);
  })();

  const dnssec = rdap.secureDNS;
  const dnssecOn = !!dnssec?.delegationSigned;

  const nameservers = rdap.nameservers ?? [];
  const statuses = rdap.status ?? [];
  const notices = rdap.notices ?? [];
  const remarks = rdap.remarks ?? [];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">
              Domain · {rdap.objectClassName ?? 'domain'}
            </div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none break-all">
                {rdap.ldhName ?? d.domain}
              </span>
              {rdap.unicodeName && rdap.unicodeName !== rdap.ldhName && (
                <span className="text-sm text-slate-400">({rdap.unicodeName})</span>
              )}
              <StatusBadge status={dnssecOn ? 'pass' : 'warn'} size="sm" glow={dnssecOn}>
                DNSSEC {dnssecOn ? 'signed' : 'unsigned'}
              </StatusBadge>
              {registrar && (
                <span className="text-[11px] px-2 py-0.5 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200">
                  {registrarV.fn ?? registrar.handle}
                </span>
              )}
            </div>
            {rdap.handle && (
              <div className="mt-1.5 text-[11px] text-slate-500">
                Handle: <MonoValue value={rdap.handle} size="xs" copyable>{rdap.handle}</MonoValue>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat
              label="Registered"
              value={
                <span title={registered}>
                  {fmtDateTime(registered)}
                  {ageDays !== null && (
                    <span className="text-slate-500 ml-1">· {formatNumber(ageDays)}d ago</span>
                  )}
                </span>
              }
              accent
            />
            <Stat
              label="Expires"
              value={
                expires ? (
                  <span title={expires}>
                    <span
                      className={
                        expTone === 'fail'
                          ? 'text-data-red'
                          : expTone === 'warn'
                            ? 'text-data-yellow'
                            : 'text-slate-200'
                      }
                    >
                      {fmtDateTime(expires)}
                    </span>
                    {expDays !== null && (
                      <span className="text-slate-500 ml-1">
                        ({expDays < 0 ? `${-expDays}d ago` : `in ${expDays}d`})
                      </span>
                    )}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <Stat label="Last changed" value={fmtDateTime(lastChanged)} />
            <Stat label="Name servers" value={nameservers.length} />
            <Stat label="Status flags" value={statuses.length} />
            <Stat label="DB updated" value={fmtDateTime(lastDbUpdate)} />
          </div>
        </div>
      </ResultCard>

      {/* Status codes */}
      {statuses.length > 0 && (
        <ResultCard title={`Status codes · ${statuses.length}`}>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <StatusBadge key={s} status={statusTone(s)} size="sm">
                <span title={STATUS_INFO[s.toLowerCase()] ?? s}>{s}</span>
              </StatusBadge>
            ))}
          </div>
        </ResultCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Registrar */}
        <ResultCard title="Registrar">
          {registrar ? (
            <div className="space-y-2">
              <div>
                <div className="text-base text-slate-100 font-medium">
                  {registrarV.fn ?? registrarV.org ?? registrar.handle ?? '—'}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                  {ianaId && (
                    <span>
                      IANA <span className="mono text-slate-300">#{ianaId}</span>
                    </span>
                  )}
                  {registrar.handle && (
                    <span>
                      Handle <span className="mono text-slate-300">{registrar.handle}</span>
                    </span>
                  )}
                </div>
              </div>
              {abuse && (
                <div className="mt-3 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    Abuse contact
                  </div>
                  <div className="text-sm text-slate-200">{abuseV.fn ?? '—'}</div>
                  <div className="mt-1 flex flex-col gap-1 text-xs">
                    {abuseV.email && (
                      <a
                        href={`mailto:${abuseV.email}`}
                        className="text-brand-300 hover:text-brand-200 mono"
                      >
                        {abuseV.email}
                      </a>
                    )}
                    {abuseV.tel && (
                      <a
                        href={`tel:${abuseV.tel}`}
                        className="text-slate-300 hover:text-slate-100 mono"
                      >
                        {abuseV.tel}
                      </a>
                    )}
                  </div>
                </div>
              )}
              {(registrar.remarks ?? []).length > 0 && (
                <div className="mt-2 text-[11px] text-slate-500 italic">
                  {registrar.remarks!.map((r, i) => (
                    <div key={i}>{r.description?.join(' ')}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500">No registrar entity returned.</span>
          )}
        </ResultCard>

        {/* DNSSEC */}
        <ResultCard title="DNSSEC">
          {dnssec ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge
                  status={dnssec.delegationSigned ? 'pass' : 'warn'}
                  size="sm"
                  glow={!!dnssec.delegationSigned}
                >
                  Delegation {dnssec.delegationSigned ? 'signed' : 'unsigned'}
                </StatusBadge>
                <StatusBadge status={dnssec.zoneSigned ? 'pass' : 'info'} size="sm">
                  Zone {dnssec.zoneSigned ? 'signed' : 'unsigned'}
                </StatusBadge>
              </div>
              {(dnssec.dsData ?? []).length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    DS records · {dnssec.dsData!.length}
                  </div>
                  {dnssec.dsData!.map((ds, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span>
                          Key tag <span className="mono text-slate-200">{ds.keyTag ?? '—'}</span>
                        </span>
                        <span>
                          Algo{' '}
                          <span className="mono text-slate-200">
                            {ds.algorithm ?? '—'}
                            {ds.algorithm && DS_ALGORITHMS[ds.algorithm] && (
                              <span className="text-slate-500"> ({DS_ALGORITHMS[ds.algorithm]})</span>
                            )}
                          </span>
                        </span>
                        <span>
                          Digest{' '}
                          <span className="mono text-slate-200">
                            {ds.digestType ?? '—'}
                            {ds.digestType && DS_DIGESTS[ds.digestType] && (
                              <span className="text-slate-500"> ({DS_DIGESTS[ds.digestType]})</span>
                            )}
                          </span>
                        </span>
                      </div>
                      {ds.digest && (
                        <div className="mt-1.5 break-all">
                          <MonoValue value={ds.digest} size="xs" copyable>
                            {ds.digest}
                          </MonoValue>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500">No DNSSEC info returned.</span>
          )}
        </ResultCard>
      </div>

      {/* Name servers */}
      <ResultCard title={`Name servers · ${nameservers.length}`}>
        {nameservers.length === 0 ? (
          <span className="text-xs text-slate-500">No name servers.</span>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nameservers.map((ns, i) => {
              const ips = [
                ...(ns.ipAddresses?.v4 ?? []),
                ...(ns.ipAddresses?.v6 ?? []),
              ];
              return (
                <div
                  key={(ns.ldhName ?? '') + i}
                  className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2"
                >
                  <MonoValue
                    value={ns.ldhName ?? ''}
                    type="domain"
                    copyable
                    size="sm"
                    linkTo={`/dns/lookup?q=${encodeURIComponent(ns.ldhName ?? '')}`}
                  >
                    {ns.ldhName ?? '—'}
                  </MonoValue>
                  {ns.handle && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Handle <span className="mono text-slate-400">{ns.handle}</span>
                    </div>
                  )}
                  {ips.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ips.map((ip) => (
                        <MonoValue
                          key={ip}
                          value={ip}
                          type="ip"
                          size="xs"
                          linkTo={`/network/ip?q=${encodeURIComponent(ip)}`}
                        >
                          {ip}
                        </MonoValue>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ResultCard>

      {/* Remarks */}
      {remarks.length > 0 && (
        <ResultCard title={`Remarks · ${remarks.length}`}>
          <div className="space-y-2">
            {remarks.map((r, i) => (
              <div
                key={i}
                className="border-l-2 border-brand-500/40 pl-3 text-xs text-slate-300"
              >
                {r.title && (
                  <div className="text-slate-200 font-medium">{r.title}</div>
                )}
                {r.description?.map((line, j) => (
                  <div key={j} className="text-slate-400">
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ResultCard>
      )}

      {/* Notices */}
      {notices.length > 0 && (
        <ResultCard title={`Notices · ${notices.length}`}>
          <div className="space-y-1.5">
            {notices.map((n, i) => (
              <details
                key={i}
                className="group rounded-md border border-surface-700 bg-surface-900/40"
              >
                <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-200 truncate">{n.title ?? 'Notice'}</span>
                  <span className="text-slate-500 text-xs transition-transform group-open:rotate-90">
                    ▶
                  </span>
                </summary>
                <div className="px-3 pb-3 pt-1 text-xs text-slate-400 space-y-1.5 border-t border-surface-700/70">
                  {n.description?.filter(Boolean).map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                  {(n.links ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {n.links!.map((l, j) =>
                        l.href && l.href !== 'None' ? (
                          <a
                            key={j}
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-300 hover:text-brand-200 underline decoration-dotted"
                          >
                            {l.rel ?? l.href}
                          </a>
                        ) : null,
                      )}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </ResultCard>
      )}

      {(rdap.rdapConformance?.length || rdap.port43) && (
        <div className="flex items-center justify-between gap-3 flex-wrap text-[10px] text-slate-500 px-1">
          {rdap.rdapConformance && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="uppercase tracking-wider">Conformance:</span>
              {rdap.rdapConformance.map((c) => (
                <span
                  key={c}
                  className="mono px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          {rdap.port43 && (
            <div>
              port43 <span className="mono text-slate-400">{rdap.port43}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Registrar() {
  const q = useQ('domain');
  return (
    <ToolPage<DomainRegistrar>
      title="Domain Registrar"
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => domain.registrar(d)}
      toolName="Domain Registrar"
      toolPath="/domain/registrar"
    >
      {(d) => (
        <ResultCard title={d.domain} accent>
          <Row k="Registrar">{d.registrar ?? '—'}</Row>
        </ResultCard>
      )}
    </ToolPage>
  );
}

function NameServers() {
  const q = useQ('domain');
  return (
    <ToolPage<DomainNameservers>
      title="Name Servers"
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => domain.nameservers(d)}
      toolName="Name Servers"
      toolPath="/domain/nameservers"
    >
      {(d) => (
        <ResultCard title={d.domain} accent>
          <div className="flex flex-col gap-1">
            {d.nameservers.map((n) => (
              <MonoValue key={n} value={n} type="domain" copyable>{n}</MonoValue>
            ))}
          </div>
        </ResultCard>
      )}
    </ToolPage>
  );
}

function Age() {
  const q = useQ('domain');
  return (
    <ToolPage<DomainAge>
      title="Domain Age"
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => domain.age(d)}
      toolName="Domain Age"
      toolPath="/domain/age"
    >
      {(d) => (
        <ResultCard title={d.domain} accent>
          <Row k="Registered">{formatDate(d.registered_at)}</Row>
          <Row k="Age">{formatNumber(d.age_days)} days · {relativeTime(d.registered_at)}</Row>
        </ResultCard>
      )}
    </ToolPage>
  );
}

export default function DomainRoutes() {
  return (
    <Routes>
      <Route path="intelligence" element={<Intelligence />} />
      <Route path="whois" element={<Whois />} />
      <Route path="registrar" element={<Registrar />} />
      <Route path="nameservers" element={<NameServers />} />
      <Route path="age" element={<Age />} />
      <Route path="*" element={<Navigate to="intelligence" replace />} />
    </Routes>
  );
}
