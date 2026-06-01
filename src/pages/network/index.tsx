import { Route, Routes, Navigate } from 'react-router-dom';
import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { MonoValue } from '@/components/output/MonoValue';
import { StatusBadge, type Status } from '@/components/output/StatusBadge';
import { DataTable } from '@/components/output/DataTable';
import { network } from '@/api/endpoints';
import { v, normalizeAsn } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import type {
  AsnLookup,
  AsnSummary,
  BgpAsn,
  BgpPrefix,
  CidrAnalyze,
  CidrExpand,
  Geo,
  IpLookup,
  NetworkIntelligence,
  ReverseDns,
  RpkiValidation,
  WhoisIp,
} from '@/api/types';
import { KeyValueGrid } from '@/components/output/KeyValueGrid';
import { formatNumber } from '@/utils/formatters';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function NetworkIp() {
  const q = useQ('ip');
  const [params] = useSearchParams();
  const wantSelf = params.get('self') === '1' && !params.get('q');
  const [selfIp, setSelfIp] = useState<string | null>(null);
  const [selfError, setSelfError] = useState<string | null>(null);

  useEffect(() => {
    if (!wantSelf) return;
    let cancelled = false;
    fetch('https://ip-api.connormerk.dev')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => {
        if (cancelled) return;
        const ip = t.trim();
        if (!ip) throw new Error('Empty response');
        setSelfIp(ip);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSelfError(e instanceof Error ? e.message : 'Lookup failed');
        setSelfIp('8.8.8.8');
      });
    return () => {
      cancelled = true;
    };
  }, [wantSelf]);

  if (wantSelf && selfIp === null) {
    return (
      <div className="card p-6 text-sm text-slate-400 flex items-center gap-3">
        <span className="inline-block h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
        Detecting your public IP…
      </div>
    );
  }

  const defaultInput = wantSelf ? (selfIp ?? q) : q;

  return (
    <ToolPage<NetworkIntelligence>
      key={defaultInput}
      title="IP Intelligence"
      description={
        wantSelf
          ? selfError
            ? `Could not detect your IP (${selfError}); showing default.`
            : 'Detected from your current connection.'
          : 'ASN, geolocation, BGP, RPKI, reverse DNS, and threat flags for any IPv4 or IPv6 address.'
      }
      inputLabel="IP address"
      inputPlaceholder="8.8.8.8"
      defaultInput={defaultInput}
      validate={v.ip}
      autoRunOnMount
      run={(ip) => network.intelligence(ip)}
      toolName="IP Intelligence"
      toolPath="/network/ip"
    >
      {(d) => <IpReport d={d} />}
    </ToolPage>
  );
}

function IpReport({ d }: { d: NetworkIntelligence }) {
  const geo = d.geo ?? {};
  const flags = (d.flags ?? {}) as { bogon?: boolean; anycast?: boolean; anycast_indicator?: boolean; [k: string]: unknown };
  const isAnycast = !!(flags.anycast ?? flags.anycast_indicator);
  const isBogon = !!flags.bogon;
  const family = typeof d.family === 'number'
    ? (d.family === 6 ? 'IPv6' : 'IPv4')
    : d.family === 'ipv6'
      ? 'IPv6'
      : d.family === 'ipv4'
        ? 'IPv4'
        : null;
  const rdap = d.rdap as
    | { handle?: string; name?: string; startAddress?: string; endAddress?: string; events?: RdapEvent[]; status?: string[]; port43?: string }
    | undefined;
  const asn = d.asn as
    | (AsnSummary & { block?: { resource?: string; name?: string; desc?: string }; country?: string })
    | null
    | undefined;
  const ptr = d.reverse_dns ?? [];
  const geoExt = geo as Geo & { resources?: string[]; covered_percentage?: number };
  const flag = countryFlag(geo.country);
  const lat = typeof geo.latitude === 'number' ? geo.latitude : undefined;
  const lon = typeof geo.longitude === 'number' ? geo.longitude : undefined;
  const mapUrl =
    lat !== undefined && lon !== undefined
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=10/${lat}/${lon}`
      : null;
  const registered = findEvent(rdap?.events, 'registration');
  const lastChanged = findEvent(rdap?.events, 'last changed');

  return (
    <div className="space-y-4">
      {/* Hero */}
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">IP address</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none mono break-all">
                {d.ip}
              </span>
              {family && (
                <span className="mono text-[11px] px-2 py-0.5 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200">
                  {family}
                </span>
              )}
              <StatusBadge status={isBogon ? 'fail' : 'pass'} size="sm" glow>
                {isBogon ? 'Bogon' : 'Routable'}
              </StatusBadge>
              <StatusBadge status={isAnycast ? 'info' : 'unknown'} size="sm" glow={isAnycast}>
                {isAnycast ? 'Anycast' : 'Unicast'}
              </StatusBadge>
            </div>
            <div className="mt-2 text-base text-slate-100">
              {asn?.holder ?? asn?.name ?? rdap?.name ?? '—'}
            </div>
            {asn?.asn !== undefined && (
              <a
                href={`/network/asn?q=${asn.asn}`}
                className="mt-0.5 inline-block text-[11px] text-brand-300 hover:text-brand-200 mono"
              >
                AS{asn.asn}
              </a>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat
              label="Country"
              value={
                geo.country ? (
                  <span>
                    {flag && <span className="mr-1">{flag}</span>}
                    {geo.country_name ?? geo.country}
                  </span>
                ) : (
                  '—'
                )
              }
              accent
            />
            <Stat label="City" value={geo.city ?? '—'} />
            <Stat label="Region" value={geo.region ?? '—'} />
            <Stat label="Prefix" value={d.prefix ?? '—'} />
            <Stat label="Family" value={family ?? '—'} />
            <Stat label="PTR" value={ptr.length ? String(ptr.length) : '—'} />
          </div>
        </div>
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ASN */}
        <ResultCard title="Autonomous System">
          {asn ? (
            <>
              <Row k="ASN">
                <MonoValue
                  value={String(asn.asn ?? '')}
                  type="asn"
                  linkTo={`/network/asn?q=${asn.asn}`}
                  size="sm"
                >
                  AS{asn.asn}
                </MonoValue>
              </Row>
              <Row k="Holder">{asn.holder ?? asn.name ?? '—'}</Row>
              {asn.country && <Row k="Country">{asn.country}</Row>}
              {asn.block?.name && (
                <Row k="Block">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-300">{asn.block.name}</span>
                    {asn.block.resource && (
                      <MonoValue size="xs" value={asn.block.resource}>{asn.block.resource}</MonoValue>
                    )}
                    {asn.block.desc && (
                      <span className="text-[11px] text-slate-500">{asn.block.desc}</span>
                    )}
                  </div>
                </Row>
              )}
              {d.prefix && (
                <Row k="Announced">
                  <MonoValue
                    value={d.prefix}
                    type="cidr"
                    size="xs"
                    linkTo={`/network/cidr?q=${encodeURIComponent(d.prefix)}`}
                  >
                    {d.prefix}
                  </MonoValue>
                </Row>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500">No ASN data.</span>
          )}
        </ResultCard>

        {/* Geolocation */}
        <ResultCard title="Geolocation">
          <Row k="Country">
            {geo.country ? (
              <span>
                {flag && <span className="mr-1.5">{flag}</span>}
                {geo.country_name ?? geo.country}
                <span className="ml-1 text-slate-500 mono text-xs">({geo.country})</span>
              </span>
            ) : (
              '—'
            )}
          </Row>
          <Row k="City">{geo.city ?? '—'}</Row>
          <Row k="Region">{geo.region ?? '—'}</Row>
          <Row k="Coordinates">
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-300 hover:text-brand-200 mono text-xs"
              >
                {lat}, {lon} ↗
              </a>
            ) : (
              '—'
            )}
          </Row>
          {geo.timezone && <Row k="Timezone">{geo.timezone}</Row>}
          {geo.postal && <Row k="Postal">{geo.postal}</Row>}
          {typeof geoExt.covered_percentage === 'number' && (
            <Row k="Coverage">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 rounded bg-surface-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-400"
                    style={{ width: `${Math.min(100, geoExt.covered_percentage)}%` }}
                  />
                </div>
                <span className="mono text-xs text-slate-300">{geoExt.covered_percentage}%</span>
              </div>
            </Row>
          )}
          {!!geoExt.resources?.length && (
            <Row k="Resources">
              <div className="flex flex-wrap gap-1">
                {geoExt.resources.map((r: string) => (
                  <MonoValue
                    key={r}
                    value={r}
                    type="cidr"
                    size="xs"
                    linkTo={`/network/cidr?q=${encodeURIComponent(r)}`}
                  >
                    {r}
                  </MonoValue>
                ))}
              </div>
            </Row>
          )}
        </ResultCard>

        {/* Network / RDAP */}
        <ResultCard title="Network registration">
          {rdap ? (
            <>
              <Row k="Name">{rdap.name ?? '—'}</Row>
              <Row k="Handle">
                {rdap.handle ? (
                  <MonoValue size="xs" copyable value={rdap.handle}>{rdap.handle}</MonoValue>
                ) : (
                  '—'
                )}
              </Row>
              <Row k="Range">
                {rdap.startAddress || rdap.endAddress ? (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <MonoValue value={rdap.startAddress ?? ''} type="ip" size="xs">
                      {rdap.startAddress ?? '—'}
                    </MonoValue>
                    <span className="text-slate-500">→</span>
                    <MonoValue value={rdap.endAddress ?? ''} type="ip" size="xs">
                      {rdap.endAddress ?? '—'}
                    </MonoValue>
                  </span>
                ) : (
                  '—'
                )}
              </Row>
              {!!rdap.status?.length && (
                <Row k="Status">
                  <div className="flex flex-wrap gap-1">
                    {rdap.status.map((s) => (
                      <StatusBadge
                        key={s}
                        status={s === 'active' || s === 'validated' ? 'pass' : 'info'}
                        size="sm"
                      >
                        {s}
                      </StatusBadge>
                    ))}
                  </div>
                </Row>
              )}
              {(registered || lastChanged) && (
                <Row k="Registered">
                  <span title={registered}>{fmtDate(registered)}</span>
                  {lastChanged && (
                    <span className="text-slate-500"> · updated {fmtDate(lastChanged)}</span>
                  )}
                </Row>
              )}
              {rdap.port43 && (
                <Row k="WHOIS">
                  <MonoValue size="xs" copyable value={rdap.port43}>{rdap.port43}</MonoValue>
                </Row>
              )}
              <Row k="More">
                <a
                  href={`/network/whois?q=${encodeURIComponent(d.ip)}`}
                  className="text-brand-300 hover:text-brand-200 text-xs"
                >
                  Full RDAP report →
                </a>
              </Row>
            </>
          ) : (
            <span className="text-xs text-slate-500">No RDAP data.</span>
          )}
        </ResultCard>

        {/* Reverse DNS */}
        <ResultCard title={`Reverse DNS · ${ptr.length}`}>
          {ptr.length === 0 ? (
            <span className="text-xs text-slate-500">No PTR records.</span>
          ) : (
            <ul className="space-y-1">
              {ptr.map((p, i) => (
                <li key={i}>
                  <MonoValue value={p} type="domain" copyable size="xs">
                    {p}
                  </MonoValue>
                </li>
              ))}
            </ul>
          )}
        </ResultCard>
      </div>
    </div>
  );
}

function countryFlag(code?: string): string | null {
  if (!code || code.length !== 2) return null;
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  const base = 0x1f1e6;
  return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65));
}

function NetworkAsn() {
  const q = useQ();
  return (
    <ToolPage<AsnLookup>
      title="ASN Lookup"
      description="Metadata, organization, and announced prefixes for an Autonomous System Number."
      inputLabel="ASN"
      inputPlaceholder="13335 or AS13335"
      defaultInput={q || '13335'}
      validate={v.asn}
      autoRunOnMount
      run={(s) => network.asn(normalizeAsn(s))}
      toolName="ASN Lookup"
      toolPath="/network/asn"
    >
      {(d) => <AsnReport d={d} />}
    </ToolPage>
  );
}

interface AsnRdap {
  handle?: string;
  name?: string;
  status?: string[];
  startAutnum?: number;
  endAutnum?: number;
  port43?: string;
  rdapConformance?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  remarks?: RdapRemark[];
  notices?: RdapNotice[];
}

function detectRir(block?: AsnLookup['block']): string | null {
  if (!block) return null;
  const blob = `${block.name ?? ''} ${(block as { desc?: string }).desc ?? ''} ${block.description ?? ''}`;
  const m = blob.match(/\b(ARIN|RIPE|APNIC|LACNIC|AFRINIC)\b/i);
  return m ? m[1].toUpperCase() : null;
}

function AsnReport({ d }: { d: AsnLookup }) {
  const rdap = d.rdap as AsnRdap | undefined;
  const prefixes = (d.announced_prefixes ?? []).map((p) =>
    typeof p === 'string' ? p : ((p as { prefix?: string }).prefix ?? '')
  ).filter(Boolean);
  const v4 = prefixes.filter((p) => !p.includes(':'));
  const v6 = prefixes.filter((p) => p.includes(':'));
  const rir = detectRir(d.block);
  const registered = findEvent(rdap?.events, 'registration');
  const lastChanged = findEvent(rdap?.events, 'last changed');
  const status = rdap?.status ?? [];
  const block = d.block as { resource?: string; name?: string; desc?: string; description?: string } | undefined;
  const blockDesc = block?.desc ?? block?.description;
  const entities = rdap?.entities ?? [];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">
              Autonomous System
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display text-4xl text-brand-300 leading-none">
                AS{d.asn}
              </span>
              {rir && (
                <span className="mono text-xs px-2 py-0.5 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200">
                  {rir}
                </span>
              )}
              {status.map((s) => (
                <StatusBadge
                  key={s}
                  status={s === 'active' || s === 'validated' ? 'pass' : s === 'reserved' ? 'info' : 'info'}
                  size="sm"
                >
                  {s}
                </StatusBadge>
              ))}
            </div>
            <div className="mt-1.5 text-base text-slate-100">{d.holder ?? rdap?.name ?? '—'}</div>
            {rdap?.handle && (
              <div className="mt-0.5 text-[11px] text-slate-500 mono">{rdap.handle}</div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Prefixes" value={formatNumber(prefixes.length)} accent />
            <Stat label="IPv4" value={formatNumber(v4.length)} />
            <Stat label="IPv6" value={formatNumber(v6.length)} />
            <Stat label="Registered" value={fmtDate(registered)} />
            <Stat label="Last changed" value={fmtDate(lastChanged)} />
            <Stat label="Type" value={d.type ?? '—'} />
          </div>
        </div>
      </ResultCard>

      {/* Block & metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title="Allocation block">
          <Row k="Range">
            {block?.resource ? (
              <MonoValue size="xs" copyable value={block.resource}>{block.resource}</MonoValue>
            ) : (
              '—'
            )}
          </Row>
          <Row k="Name">{block?.name ?? '—'}</Row>
          {blockDesc && <Row k="Source">{blockDesc}</Row>}
          {rdap?.startAutnum !== undefined && (
            <Row k="RDAP range">
              <span className="mono text-xs">
                AS{rdap.startAutnum}
                {rdap.endAutnum !== undefined && rdap.endAutnum !== rdap.startAutnum
                  ? ` – AS${rdap.endAutnum}`
                  : ''}
              </span>
            </Row>
          )}
          <Row k="Resource">{d.resource ?? '—'}</Row>
        </ResultCard>

        <ResultCard title="Registry">
          <Row k="Handle">
            {rdap?.handle ? (
              <MonoValue size="xs" copyable value={rdap.handle}>{rdap.handle}</MonoValue>
            ) : (
              '—'
            )}
          </Row>
          <Row k="Name">{rdap?.name ?? '—'}</Row>
          {rdap?.port43 && (
            <Row k="WHOIS">
              <MonoValue size="xs" copyable value={rdap.port43}>{rdap.port43}</MonoValue>
            </Row>
          )}
          {rdap?.rdapConformance?.length ? (
            <Row k="Conformance">
              <div className="flex flex-wrap gap-1">
                {rdap.rdapConformance.map((c) => (
                  <span
                    key={c}
                    className="mono text-[10px] px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 text-slate-400"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </Row>
          ) : null}
        </ResultCard>
      </div>

      {/* Remarks */}
      {!!rdap?.remarks?.length && (
        <ResultCard title="Registration remarks">
          <ul className="space-y-2 text-xs">
            {rdap.remarks.map((r, i) => (
              <li key={i} className="border-l-2 border-brand-500/40 pl-3">
                {r.title && (
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-0.5">
                    {r.title}
                  </div>
                )}
                {r.description?.map((line, j) => (
                  <p key={j} className="text-slate-300 whitespace-pre-wrap">{line}</p>
                ))}
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {/* Announced prefixes */}
      <ResultCard title={`Announced prefixes · ${prefixes.length}`}>
        {prefixes.length === 0 ? (
          <span className="text-xs text-slate-500">No prefixes announced.</span>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PrefixList label="IPv4" items={v4} />
            <PrefixList label="IPv6" items={v6} />
          </div>
        )}
      </ResultCard>

      {/* Contacts */}
      <ResultCard title={`Contacts · ${entities.length}`}>
        {entities.length === 0 ? (
          <span className="text-xs text-slate-500">No entities reported.</span>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {entities.flatMap((ent, i) => renderEntity(ent, [String(i)])).slice(0, 50)}
          </div>
        )}
      </ResultCard>

      {/* Notices */}
      {!!rdap?.notices?.length && (
        <ResultCard title="Notices">
          <ul className="space-y-2 text-xs">
            {rdap.notices.map((n, i) => (
              <li key={i} className="border-l-2 border-surface-700 pl-3">
                {n.title && (
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    {n.title}
                  </div>
                )}
                {n.description?.map((line, j) => (
                  <p key={j} className="text-slate-400">{line}</p>
                ))}
                {n.links?.map((l, j) =>
                  l.href ? (
                    <a
                      key={j}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-300 hover:text-brand-200 break-all"
                    >
                      {l.href}
                    </a>
                  ) : null
                )}
              </li>
            ))}
          </ul>
        </ResultCard>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mono text-sm ${accent ? 'text-brand-300' : 'text-slate-200'}`}>{value}</div>
    </div>
  );
}

function PrefixList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
        {label} · {items.length}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-600">None.</div>
      ) : (
        <ul className="space-y-1 max-h-72 overflow-auto pr-1">
          {items.map((p) => (
            <li key={p}>
              <MonoValue
                value={p}
                type="cidr"
                size="xs"
                copyable
                linkTo={`/network/cidr?q=${encodeURIComponent(p)}`}
              >
                {p}
              </MonoValue>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NetworkBgp() {
  const q = useQ();
  const [mode, setMode] = useState<'prefix' | 'asn'>('prefix');
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">BGP Explorer</h1>
        <p className="text-sm text-slate-400">Inspect a prefix's routes or an ASN's BGP footprint.</p>
      </header>
      <div className="flex gap-1 border-b border-surface-700">
        {(['prefix', 'asn'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border-b-2 transition-colors ${
              mode === m
                ? 'border-brand-400 text-brand-200'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      {mode === 'prefix' ? (
        <ToolPage<BgpPrefix>
          title=""
          inputLabel="Prefix"
          inputPlaceholder="1.1.1.0/24"
          defaultInput={q || '1.1.1.0/24'}
          validate={v.cidr}
          autoRunOnMount
          run={(p) => network.bgpPrefix(p)}
          toolName="BGP Prefix"
          toolPath="/network/bgp"
        >
          {(d) => <BgpPrefixReport d={d} />}
        </ToolPage>
      ) : (
        <ToolPage<BgpAsn>
          title=""
          inputLabel="ASN"
          inputPlaceholder="13335"
          defaultInput={q || '13335'}
          validate={v.asn}
          autoRunOnMount
          run={(s) => network.bgpAsn(normalizeAsn(s))}
          toolName="BGP ASN"
          toolPath="/network/bgp"
        >
          {(d) => <BgpAsnReport d={d} />}
        </ToolPage>
      )}
    </div>
  );
}

// ---------- BGP report types & helpers ----------

interface BgpOverview {
  announced?: boolean;
  is_less_specific?: boolean;
  asns?: Array<{ asn: number; holder?: string }>;
  related_prefixes?: string[];
  resource?: string;
  type?: string;
  block?: { resource?: string; name?: string; desc?: string; description?: string };
  query_time?: string;
  num_filtered_out?: number;
  actual_num_related?: number;
}

interface BgpPeer {
  asn_origin?: string | number;
  as_path?: string;
  community?: string;
  largeCommunity?: string;
  extendedCommunity?: string;
  last_updated?: string;
  latest_time?: string;
  prefix?: string;
  peer?: string;
  origin?: string;
  next_hop?: string;
}

interface BgpRrc {
  rrc?: string;
  location?: string;
  scope?: string;
  peers?: BgpPeer[];
}

interface BgpRoutes {
  rrcs?: BgpRrc[];
  query_time?: string;
  latest_time?: string;
  parameters?: { resource?: string; look_back_limit?: number; cache?: unknown };
}

function parseAsPath(path?: string): number[] {
  if (!path) return [];
  return path
    .split(/\s+/)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

function dedupeAsPath(hops: number[]): number[] {
  // Collapse consecutive duplicates (prepending)
  const out: number[] = [];
  for (const h of hops) {
    if (out[out.length - 1] !== h) out.push(h);
  }
  return out;
}

function countTokens(s?: string): number {
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}

function originColor(o?: string): Status {
  switch ((o ?? '').toUpperCase()) {
    case 'IGP':
      return 'pass';
    case 'EGP':
      return 'info';
    case 'INCOMPLETE':
      return 'warn';
    default:
      return 'unknown';
  }
}

function ageFromNow(iso?: string): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return `${Math.round(diffSec)}s`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h`;
  return `${Math.round(diffSec / 86400)}d`;
}

function BgpPrefixReport({ d }: { d: BgpPrefix }) {
  const overview = (d.overview ?? {}) as BgpOverview;
  const routes = (d.routes ?? {}) as BgpRoutes;
  const rrcs = routes.rrcs ?? [];
  const origins = overview.asns ?? [];
  const related = overview.related_prefixes ?? [];

  const allPeers = useMemo(() => rrcs.flatMap((r) => r.peers ?? []), [rrcs]);
  const totalPeers = allPeers.length;
  const uniquePaths = useMemo(
    () => new Set(allPeers.map((p) => p.as_path ?? '')).size,
    [allPeers]
  );
  const upstreamSet = useMemo(() => {
    const set = new Set<number>();
    for (const p of allPeers) {
      const hops = dedupeAsPath(parseAsPath(p.as_path));
      // The "upstream" relative to origin is the second-to-last hop
      if (hops.length >= 2) set.add(hops[hops.length - 2]);
    }
    return set;
  }, [allPeers]);
  const avgPathLen = useMemo(() => {
    if (!allPeers.length) return 0;
    const total = allPeers.reduce(
      (acc, p) => acc + dedupeAsPath(parseAsPath(p.as_path)).length,
      0
    );
    return total / allPeers.length;
  }, [allPeers]);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">BGP prefix</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none mono break-all">
                {d.prefix}
              </span>
              <StatusBadge
                status={overview.announced ? 'pass' : 'fail'}
                size="sm"
                glow={!!overview.announced}
              >
                {overview.announced ? 'Announced' : 'Not announced'}
              </StatusBadge>
              {overview.is_less_specific && (
                <StatusBadge status="info" size="sm">Less specific</StatusBadge>
              )}
              {overview.type && (
                <span className="mono text-[11px] px-2 py-0.5 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200">
                  {overview.type}
                </span>
              )}
            </div>
            {!!origins.length && (
              <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
                <span className="text-[11px] uppercase tracking-wider text-slate-500">Origin</span>
                {origins.map((o) => (
                  <a
                    key={o.asn}
                    href={`/network/asn?q=${o.asn}`}
                    className="inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded border border-brand-500/40 bg-brand-500/5 hover:bg-brand-500/15 text-brand-100"
                  >
                    <span className="mono text-xs text-brand-300">AS{o.asn}</span>
                    {o.holder && <span className="text-xs text-slate-300 truncate max-w-[18rem]">{o.holder}</span>}
                  </a>
                ))}
              </div>
            )}
            {overview.block?.name && (
              <div className="mt-1 text-[11px] text-slate-500">
                Block: <span className="text-slate-300">{overview.block.name}</span>
                {overview.block.resource && (
                  <span className="mono ml-1">({overview.block.resource})</span>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="RRCs" value={formatNumber(rrcs.length)} accent />
            <Stat label="Peers" value={formatNumber(totalPeers)} />
            <Stat label="Unique paths" value={formatNumber(uniquePaths)} />
            <Stat label="Upstreams" value={formatNumber(upstreamSet.size)} />
            <Stat
              label="Avg path"
              value={avgPathLen ? avgPathLen.toFixed(1) : '—'}
            />
            <Stat label="Latest" value={fmtDate(routes.latest_time ?? overview.query_time)} />
          </div>
        </div>
      </ResultCard>

      {/* Related prefixes */}
      {related.length > 0 && (
        <ResultCard title={`Related prefixes · ${related.length}`}>
          <div className="flex flex-wrap gap-1">
            {related.map((p) => (
              <MonoValue
                key={p}
                value={p}
                type="cidr"
                size="xs"
                linkTo={`/network/cidr?q=${encodeURIComponent(p)}`}
              >
                {p}
              </MonoValue>
            ))}
          </div>
        </ResultCard>
      )}

      {/* RRC collectors */}
      {rrcs.length === 0 ? (
        <ResultCard title="Route collectors">
          <span className="text-xs text-slate-500">No RRC data returned.</span>
        </ResultCard>
      ) : (
        <RrcList rrcs={rrcs} originAsns={origins.map((o) => o.asn)} />
      )}
    </div>
  );
}

function RrcList({ rrcs, originAsns }: { rrcs: BgpRrc[]; originAsns: number[] }) {
  const [pathFilter, setPathFilter] = useState('');
  // Sort by peer count desc for the most "interesting" first
  const sorted = useMemo(
    () => [...rrcs].sort((a, b) => (b.peers?.length ?? 0) - (a.peers?.length ?? 0)),
    [rrcs]
  );
  const totalShown = sorted.reduce((acc, r) => acc + (r.peers?.length ?? 0), 0);

  return (
    <ResultCard
      title={`Route collectors · ${rrcs.length}`}
      actions={
        <input
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          placeholder="Filter AS path or peer…"
          className="bg-surface-900 border border-surface-700 rounded px-2.5 py-1 text-xs w-56 outline-none focus:border-brand-400/70 mono"
        />
      }
    >
      <div className="text-[11px] text-slate-500 mb-2">
        Showing {formatNumber(totalShown)} peers across {rrcs.length} collectors.
      </div>
      <div className="space-y-2">
        {sorted.map((r, idx) => (
          <RrcCard
            key={(r.rrc ?? '') + idx}
            rrc={r}
            originAsns={originAsns}
            filter={pathFilter}
            defaultOpen={idx === 0}
          />
        ))}
      </div>
    </ResultCard>
  );
}

function RrcCard({
  rrc,
  originAsns,
  filter,
  defaultOpen,
}: {
  rrc: BgpRrc;
  originAsns: number[];
  filter: string;
  defaultOpen: boolean;
}) {
  const peers = rrc.peers ?? [];
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return peers;
    return peers.filter(
      (p) =>
        (p.as_path ?? '').toLowerCase().includes(q) ||
        (p.peer ?? '').toLowerCase().includes(q) ||
        (p.next_hop ?? '').toLowerCase().includes(q)
    );
  }, [peers, filter]);

  const distinctUpstreams = useMemo(() => {
    const s = new Set<number>();
    for (const p of peers) {
      const hops = dedupeAsPath(parseAsPath(p.as_path));
      if (hops.length >= 2) s.add(hops[hops.length - 2]);
    }
    return s.size;
  }, [peers]);

  return (
    <details
      open={defaultOpen}
      className="group rounded-md border border-surface-700 bg-surface-900/40 open:bg-surface-900/60"
    >
      <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-500 text-xs transition-transform group-open:rotate-90">▶</span>
          <span className="mono text-xs px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/40 text-brand-200">
            {rrc.rrc ?? '—'}
          </span>
          <span className="text-sm text-slate-100 truncate">{rrc.location ?? '—'}</span>
          {rrc.scope && (
            <span className="text-[11px] text-slate-500 hidden sm:inline">· {rrc.scope}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>
            <span className="mono text-slate-200">{formatNumber(filtered.length)}</span>
            {filter && (
              <span className="text-slate-500"> / {formatNumber(peers.length)}</span>
            )}{' '}
            peers
          </span>
          <span>
            <span className="mono text-slate-200">{distinctUpstreams}</span> upstreams
          </span>
        </div>
      </summary>
      <div className="border-t border-surface-700/70 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-500">No peers match filter.</div>
        ) : (
          <PeerTable peers={filtered} originAsns={originAsns} />
        )}
      </div>
    </details>
  );
}

function PeerTable({ peers, originAsns }: { peers: BgpPeer[]; originAsns: number[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-surface-900/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Peer</th>
            <th className="px-3 py-2 text-left font-medium">AS path</th>
            <th className="px-3 py-2 text-left font-medium">Origin</th>
            <th className="px-3 py-2 text-left font-medium">Next hop</th>
            <th className="px-3 py-2 text-left font-medium">Comm.</th>
            <th className="px-3 py-2 text-right font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((p, i) => (
            <PeerRow key={(p.peer ?? '') + i} peer={p} originAsns={originAsns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeerRow({ peer, originAsns }: { peer: BgpPeer; originAsns: number[] }) {
  const hops = dedupeAsPath(parseAsPath(peer.as_path));
  const commTotal =
    countTokens(peer.community) +
    countTokens(peer.largeCommunity) +
    countTokens(peer.extendedCommunity);
  const tooltip = [
    peer.community && `Communities: ${peer.community}`,
    peer.largeCommunity && `Large: ${peer.largeCommunity}`,
    peer.extendedCommunity && `Extended: ${peer.extendedCommunity}`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <tr className="border-t border-surface-800/70 hover:bg-surface-800/40">
      <td className="px-3 py-1.5 mono text-slate-300 whitespace-nowrap">{peer.peer ?? '—'}</td>
      <td className="px-3 py-1.5">
        <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5">
          {hops.length === 0 && <span className="text-slate-500">—</span>}
          {hops.map((h, i) => {
            const isOrigin = i === hops.length - 1;
            const isInOrigins = originAsns.includes(h);
            return (
              <span key={`${h}-${i}`} className="flex items-center gap-1">
                <a
                  href={`/network/asn?q=${h}`}
                  className={`mono text-[11px] px-1 rounded border ${
                    isOrigin || isInOrigins
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-200'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800'
                  }`}
                >
                  {h}
                </a>
                {i < hops.length - 1 && <span className="text-slate-600 text-[10px]">›</span>}
              </span>
            );
          })}
        </div>
      </td>
      <td className="px-3 py-1.5">
        <StatusBadge status={originColor(peer.origin)} size="sm">
          {peer.origin ?? '—'}
        </StatusBadge>
      </td>
      <td className="px-3 py-1.5 mono text-slate-400 whitespace-nowrap">
        {peer.next_hop ?? '—'}
      </td>
      <td className="px-3 py-1.5">
        {commTotal > 0 ? (
          <span
            title={tooltip}
            className="mono text-[10px] px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 text-slate-300 cursor-help"
          >
            {commTotal}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td
        className="px-3 py-1.5 text-right text-slate-500 whitespace-nowrap"
        title={peer.last_updated}
      >
        {ageFromNow(peer.last_updated)}
      </td>
    </tr>
  );
}

function BgpAsnReport({ d }: { d: BgpAsn }) {
  const overview = (d.overview ?? {}) as {
    announcing?: boolean;
    holder?: string;
    name?: string;
    block?: { name?: string; resource?: string };
    [k: string]: unknown;
  };
  const prefixes = (d.announced_prefixes ?? []).map((p) =>
    typeof p === 'string' ? { prefix: p } : (p as { prefix: string; timelines?: unknown[] })
  );
  const v4 = prefixes.filter((p) => !p.prefix?.includes(':'));
  const v6 = prefixes.filter((p) => p.prefix?.includes(':'));

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">BGP ASN</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none">
                AS{d.asn}
              </span>
              <a
                href={`/network/asn?q=${d.asn}`}
                className="text-[11px] text-brand-300 hover:text-brand-200"
              >
                ASN details →
              </a>
            </div>
            {(overview.holder || overview.name) && (
              <div className="mt-1.5 text-base text-slate-100">{overview.holder ?? overview.name}</div>
            )}
            {overview.block?.name && (
              <div className="mt-0.5 text-[11px] text-slate-500">
                Block: {overview.block.name}
                {overview.block.resource && (
                  <span className="mono ml-1">({overview.block.resource})</span>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Prefixes" value={formatNumber(prefixes.length)} accent />
            <Stat label="IPv4" value={formatNumber(v4.length)} />
            <Stat label="IPv6" value={formatNumber(v6.length)} />
          </div>
        </div>
      </ResultCard>

      <ResultCard title={`Announced prefixes · ${prefixes.length}`}>
        {prefixes.length === 0 ? (
          <span className="text-xs text-slate-500">No prefixes announced.</span>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PrefixList label="IPv4" items={v4.map((p) => p.prefix!)} />
            <PrefixList label="IPv6" items={v6.map((p) => p.prefix!)} />
          </div>
        )}
      </ResultCard>
    </div>
  );
}

function NetworkRpki() {
  const q = useQ();
  return (
    <ToolPage<RpkiValidation>
      title="RPKI Validator"
      description="Resource Public Key Infrastructure validation state for a prefix."
      inputLabel="Prefix"
      inputPlaceholder="1.1.1.0/24"
      defaultInput={q || '1.1.1.0/24'}
      validate={v.cidr}
      autoRunOnMount
      run={(p) => network.rpki(p)}
      toolName="RPKI"
      toolPath="/network/rpki"
    >
      {(d) => {
        const statusMap: Record<string, Status> = {
          valid: 'pass',
          invalid: 'fail',
          unknown: 'unknown',
          notfound: 'warn',
          not_found: 'warn',
        };
        return (
          <ResultCard title={`Validations for ${d.prefix}`} accent>
            <DataTable
              rows={d.validations ?? []}
              columns={[
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => {
                    const s = ((r as { status?: string; state?: string }).status ??
                      (r as { state?: string }).state ??
                      'unknown') as string;
                    return (
                      <StatusBadge status={statusMap[s] ?? 'unknown'} glow>
                        {s}
                      </StatusBadge>
                    );
                  },
                },
                {
                  key: 'asn',
                  header: 'Origin AS',
                  render: (r) =>
                    r.asn ? (
                      <MonoValue value={String(r.asn)} type="asn" linkTo={`/network/asn?q=${r.asn}`}>
                        AS{r.asn}
                      </MonoValue>
                    ) : (
                      '—'
                    ),
                },
                {
                  key: 'validator',
                  header: 'Validator',
                  render: (r) => (r as { validator?: string }).validator ?? '—',
                },
                {
                  key: 'roas',
                  header: 'ROAs',
                  render: (r) => {
                    const roas = (r as { validating_roas?: Array<Record<string, unknown>> })
                      .validating_roas ?? [];
                    if (!roas.length) return <span className="text-slate-500">—</span>;
                    return (
                      <div className="flex flex-col gap-1">
                        {roas.map((roa, i) => {
                          const validity = String(roa.validity ?? '');
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <StatusBadge status={statusMap[validity] ?? 'unknown'} size="sm">
                                {validity || '—'}
                              </StatusBadge>
                              <MonoValue size="xs" type="cidr">
                                {String(roa.prefix ?? '')}
                              </MonoValue>
                              <span className="text-slate-500">
                                AS<span className="mono text-slate-300">{String(roa.origin ?? '')}</span>
                              </span>
                              <span className="text-slate-500">
                                max <span className="mono text-slate-300">/{String(roa.max_length ?? '')}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  },
                },
              ]}
            />
          </ResultCard>
        );
      }}
    </ToolPage>
  );
}

function NetworkCidr() {
  const q = useQ();
  return (
    <ToolPage<CidrAnalyze>
      title="CIDR Tools"
      description="Analyze a CIDR block: network, broadcast, usable hosts, bit layout."
      inputLabel="CIDR"
      inputPlaceholder="10.0.0.0/24"
      defaultInput={q || '10.0.0.0/24'}
      validate={v.cidr}
      autoRunOnMount
      run={(c) => network.cidrAnalyze(c)}
      toolName="CIDR Analyze"
      toolPath="/network/cidr"
    >
      {(d, input) => <CidrReport d={d} input={input} />}
    </ToolPage>
  );
}

function CidrReport({ d, input }: { d: CidrAnalyze; input: string }) {
  const family = Number(d.family ?? (d.cidr?.includes(':') ? 6 : 4));
  const prefix = d.prefix ?? 0;
  const totalBits = family === 6 ? 128 : 32;
  const hostBits = totalBits - prefix;
  const addr = d.num_addresses != null ? Number(d.num_addresses) : undefined;
  const hosts = d.num_hosts != null ? Number(d.num_hosts) : undefined;
  const isPointToPoint = family === 4 && (prefix === 31 || prefix === 32);
  const ipv4Octets = useMemo(
    () => (family === 4 && d.network ? d.network.split('.').map((o) => Number.parseInt(o, 10)) : []),
    [d.network, family]
  );
  const ipv4MaskOctets = useMemo(
    () => (family === 4 && d.netmask ? d.netmask.split('.').map((o) => Number.parseInt(o, 10)) : []),
    [d.netmask, family]
  );

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">CIDR block</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none mono break-all">
                {d.cidr ?? input}
              </span>
              <StatusBadge status="info" size="sm">
                IPv{family}
              </StatusBadge>
              <span className="mono text-[11px] px-2 py-0.5 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200">
                /{prefix}
              </span>
              {isPointToPoint && (
                <StatusBadge status="warn" size="sm">
                  {prefix === 31 ? 'Point-to-point' : 'Host route'}
                </StatusBadge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <MonoValue value={d.network ?? ''} type="ip" copyable size="xs">
                {d.network ?? '—'}
              </MonoValue>
              <span className="text-slate-600">→</span>
              <MonoValue value={d.broadcast ?? d.last_host ?? ''} type="ip" copyable size="xs">
                {d.broadcast ?? d.last_host ?? '—'}
              </MonoValue>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Addresses" value={formatNumber(addr)} accent />
            <Stat label="Usable hosts" value={formatNumber(hosts)} />
            <Stat label="Host bits" value={String(hostBits)} />
            <Stat label="Network bits" value={String(prefix)} />
            <Stat label="Family" value={`IPv${family}`} />
            <Stat label="Class" value={cidrClass(family, prefix)} />
          </div>
        </div>
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title="Range">
          <Row k="Network">
            <MonoValue value={d.network ?? ''} type="ip" copyable>
              {d.network ?? '—'}
            </MonoValue>
          </Row>
          <Row k="First host">
            <MonoValue value={d.first_host ?? ''} type="ip" copyable>
              {d.first_host ?? '—'}
            </MonoValue>
          </Row>
          <Row k="Last host">
            <MonoValue value={d.last_host ?? ''} type="ip" copyable>
              {d.last_host ?? '—'}
            </MonoValue>
          </Row>
          {d.broadcast && (
            <Row k="Broadcast">
              <MonoValue value={d.broadcast} type="ip" copyable>
                {d.broadcast}
              </MonoValue>
            </Row>
          )}
        </ResultCard>

        <ResultCard title="Mask">
          {d.netmask && (
            <Row k="Netmask">
              <MonoValue value={d.netmask} copyable>
                {d.netmask}
              </MonoValue>
            </Row>
          )}
          {d.wildcard && (
            <Row k="Wildcard">
              <MonoValue value={d.wildcard} copyable>
                {d.wildcard}
              </MonoValue>
            </Row>
          )}
          <Row k="Prefix length">/{prefix}</Row>
          <Row k="Host bits">{hostBits}</Row>
        </ResultCard>
      </div>

      {family === 4 && ipv4Octets.length === 4 && ipv4MaskOctets.length === 4 && (
        <ResultCard title="Binary layout">
          <div className="space-y-2">
            <BinaryRow
              label="Network"
              octets={ipv4Octets}
              prefix={prefix}
              highlight="network"
            />
            <BinaryRow
              label="Netmask"
              octets={ipv4MaskOctets}
              prefix={prefix}
              highlight="mask"
            />
          </div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-brand-500/40 border border-brand-500/60" />
              Network bits ({prefix})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-surface-800 border border-surface-700" />
              Host bits ({hostBits})
            </span>
          </div>
        </ResultCard>
      )}

      <ResultCard title="Expand addresses">
        <ExpandPanel cidr={input} />
      </ResultCard>
    </div>
  );
}

function cidrClass(family: number, prefix: number): string {
  if (family === 6) return '—';
  if (prefix === 32) return '/32 host';
  if (prefix === 31) return '/31 P2P';
  if (prefix >= 24) return 'C-sized';
  if (prefix >= 16) return 'B-sized';
  if (prefix >= 8) return 'A-sized';
  return 'Supernet';
}

function BinaryRow({
  label,
  octets,
  prefix,
  highlight,
}: {
  label: string;
  octets: number[];
  prefix: number;
  highlight: 'network' | 'mask';
}) {
  const bits: { bit: string; isNetwork: boolean }[] = [];
  let idx = 0;
  for (const o of octets) {
    const b = (o & 0xff).toString(2).padStart(8, '0');
    for (const ch of b) {
      bits.push({ bit: ch, isNetwork: idx < prefix });
      idx++;
    }
  }
  return (
    <div className="flex items-center gap-3 text-[10px]">
      <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="flex gap-2 flex-wrap mono">
        {[0, 1, 2, 3].map((o) => (
          <div key={o} className="flex">
            {bits.slice(o * 8, o * 8 + 8).map((b, i) => (
              <span
                key={i}
                className={
                  b.isNetwork
                    ? highlight === 'mask'
                      ? 'w-3.5 text-center bg-brand-500/40 border-y border-l border-brand-500/60 text-brand-100 first:rounded-l last:border-r'
                      : 'w-3.5 text-center bg-brand-500/30 border-y border-l border-brand-500/50 text-brand-100 first:rounded-l'
                    : 'w-3.5 text-center bg-surface-800 border-y border-l border-surface-700 text-slate-400 last:border-r last:rounded-r'
                }
                style={
                  i === 7
                    ? { borderRightWidth: 1, borderRightStyle: 'solid', borderTopRightRadius: 2, borderBottomRightRadius: 2 }
                    : undefined
                }
              >
                {b.bit}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpandPanel({ cidr }: { cidr: string }) {
  const [d, setD] = useState<CidrExpand | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        onClick={async () => {
          setBusy(true);
          try {
            const r = await network.cidrExpand(cidr);
            setD(r.data);
          } finally {
            setBusy(false);
          }
        }}
        className="text-xs px-3 py-1.5 rounded border border-surface-700 hover:border-brand-400/50 hover:text-brand-300"
      >
        {busy ? 'Expanding…' : d ? 'Re-expand' : 'Expand addresses'}
      </button>
      {d && (
        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-2">
            {formatNumber(d.returned)} of {formatNumber(d.total_addresses)} shown
            {d.truncated && <span className="ml-2 text-data-yellow">· truncated</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-64 overflow-auto">
            {d.addresses.map((a) => (
              <MonoValue key={a} value={a} size="xs">
                {a}
              </MonoValue>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NetworkRdns() {
  const q = useQ('ip');
  return (
    <ToolPage<ReverseDns>
      title="Reverse DNS"
      description="PTR records for an IP address."
      inputLabel="IP address"
      inputPlaceholder="8.8.8.8"
      defaultInput={q}
      validate={v.ip}
      autoRunOnMount
      run={(ip) => network.reverseDns(ip)}
      toolName="Reverse DNS"
      toolPath="/network/rdns"
    >
      {(d) => (
        <ResultCard title={`PTR for ${d.ip}`} accent>
          {d.ptr?.length ? (
            <ul className="space-y-1.5">
              {d.ptr.map((p, i) => (
                <li key={i}>
                  <MonoValue value={p} type="domain" copyable>
                    {p}
                  </MonoValue>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-slate-500">No PTR records.</div>
          )}
        </ResultCard>
      )}
    </ToolPage>
  );
}

function NetworkWhois() {
  const q = useQ('ip');
  return (
    <ToolPage<WhoisIp>
      title="IP WHOIS / RDAP"
      description="Registry data for an IP address (RDAP)."
      inputLabel="IP address"
      inputPlaceholder="8.8.8.8"
      defaultInput={q}
      validate={v.ip}
      autoRunOnMount
      run={(ip) => network.whoisIp(ip)}
      toolName="IP WHOIS"
      toolPath="/network/whois"
    >
      {(d) => <RdapReport ip={d.ip} rdap={d.rdap as Rdap | undefined} />}
    </ToolPage>
  );
}

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}
interface RdapLink {
  href?: string;
  rel?: string;
  type?: string;
  value?: string;
}
interface RdapRemark {
  title?: string;
  description?: string[];
}
interface RdapNotice {
  title?: string;
  description?: string[];
  links?: RdapLink[];
}
interface RdapEntity {
  handle?: string;
  roles?: string[];
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  remarks?: RdapRemark[];
  links?: RdapLink[];
  vcardArray?: unknown;
}
interface Rdap {
  handle?: string;
  name?: string;
  type?: string;
  startAddress?: string;
  endAddress?: string;
  ipVersion?: string;
  parentHandle?: string;
  status?: string[];
  port43?: string;
  rdapConformance?: string[];
  cidr0_cidrs?: Array<{ v4prefix?: string; v6prefix?: string; length?: number }>;
  events?: RdapEvent[];
  entities?: RdapEntity[];
  remarks?: RdapRemark[];
  notices?: RdapNotice[];
  links?: RdapLink[];
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
        if (typeof value === 'string') out.tel = value;
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

function fmtDate(d?: string): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function RdapReport({ ip, rdap }: { ip: string; rdap?: Rdap }) {
  if (!rdap) {
    return (
      <ResultCard title={`RDAP · ${ip}`} accent>
        <span className="text-sm text-slate-500">No RDAP data returned.</span>
      </ResultCard>
    );
  }
  const cidrs = rdap.cidr0_cidrs ?? [];
  const registered = findEvent(rdap.events, 'registration');
  const lastChanged = findEvent(rdap.events, 'last changed');
  const entities = rdap.entities ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ResultCard title={`Network · ${rdap.name ?? rdap.handle ?? ip}`} accent>
        <Row k="IP">
          <MonoValue value={ip} type="ip" copyable size="md">
            {ip}
          </MonoValue>
        </Row>
        <Row k="Handle"><MonoValue value={rdap.handle ?? '—'} copyable size="sm">{rdap.handle ?? '—'}</MonoValue></Row>
        <Row k="Name">{rdap.name ?? '—'}</Row>
        <Row k="Type">{rdap.type ?? '—'}</Row>
        <Row k="IP version">{rdap.ipVersion ?? '—'}</Row>
        <Row k="Range">
          {rdap.startAddress || rdap.endAddress ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <MonoValue value={rdap.startAddress ?? ''} type="ip" size="xs">
                {rdap.startAddress ?? '—'}
              </MonoValue>
              <span className="text-slate-500">→</span>
              <MonoValue value={rdap.endAddress ?? ''} type="ip" size="xs">
                {rdap.endAddress ?? '—'}
              </MonoValue>
            </span>
          ) : (
            '—'
          )}
        </Row>
        {cidrs.length > 0 && (
          <Row k="CIDRs">
            <div className="flex flex-wrap gap-1">
              {cidrs.map((c, i) => {
                const prefix = c.v4prefix ?? c.v6prefix ?? '';
                const cidr = c.length !== undefined ? `${prefix}/${c.length}` : prefix;
                return (
                  <MonoValue
                    key={`${cidr}-${i}`}
                    value={cidr}
                    type="cidr"
                    linkTo={`/network/cidr?q=${encodeURIComponent(cidr)}`}
                    size="xs"
                  >
                    {cidr}
                  </MonoValue>
                );
              })}
            </div>
          </Row>
        )}
        {rdap.parentHandle && (
          <Row k="Parent">
            <MonoValue value={rdap.parentHandle} size="xs">{rdap.parentHandle}</MonoValue>
          </Row>
        )}
        {rdap.port43 && (
          <Row k="WHOIS">
            <MonoValue value={rdap.port43} size="xs" copyable>{rdap.port43}</MonoValue>
          </Row>
        )}
      </ResultCard>

      <ResultCard title="Status & dates" accent>
        <Row k="Status">
          {rdap.status?.length ? (
            <div className="flex flex-wrap gap-1">
              {rdap.status.map((s) => (
                <StatusBadge
                  key={s}
                  status={s === 'active' || s === 'validated' ? 'pass' : 'info'}
                  size="sm"
                >
                  {s}
                </StatusBadge>
              ))}
            </div>
          ) : (
            '—'
          )}
        </Row>
        <Row k="Registered">
          <span title={registered}>{fmtDate(registered)}</span>
        </Row>
        <Row k="Last changed">
          <span title={lastChanged}>{fmtDate(lastChanged)}</span>
        </Row>
        {rdap.rdapConformance?.length && (
          <Row k="Conformance">
            <div className="flex flex-wrap gap-1">
              {rdap.rdapConformance.map((c) => (
                <span
                  key={c}
                  className="mono text-[10px] px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 text-slate-400"
                >
                  {c}
                </span>
              ))}
            </div>
          </Row>
        )}
      </ResultCard>

      <ResultCard title={`Contacts (${entities.length})`} className="lg:col-span-2">
        {entities.length === 0 && (
          <span className="text-xs text-slate-500">No entities reported.</span>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {entities.flatMap((ent, i) => renderEntity(ent, [String(i)])).slice(0, 50)}
        </div>
      </ResultCard>

      {rdap.notices && rdap.notices.length > 0 && (
        <ResultCard title="Notices" className="lg:col-span-2">
          <ul className="space-y-2 text-xs">
            {rdap.notices.map((n, i) => (
              <li key={i} className="border-l-2 border-surface-700 pl-3">
                {n.title && (
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    {n.title}
                  </div>
                )}
                {n.description?.map((line, j) => (
                  <p key={j} className="text-slate-400">
                    {line}
                  </p>
                ))}
                {n.links?.map((l, j) =>
                  l.href ? (
                    <a
                      key={j}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-300 hover:text-brand-200 break-all"
                    >
                      {l.href}
                    </a>
                  ) : null
                )}
              </li>
            ))}
          </ul>
        </ResultCard>
      )}
    </div>
  );
}

function renderEntity(ent: RdapEntity, path: string[]): JSX.Element[] {
  const card = <EntityCard key={path.join('.')} ent={ent} />;
  const nested = (ent.entities ?? []).flatMap((c, i) => renderEntity(c, [...path, String(i)]));
  return [card, ...nested];
}

function EntityCard({ ent }: { ent: RdapEntity }) {
  const v = parseVCard(ent.vcardArray);
  const registered = findEvent(ent.events, 'registration');
  const lastChanged = findEvent(ent.events, 'last changed');
  return (
    <div className="rounded-md border border-surface-700 bg-surface-900/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-100 truncate">
            {v.fn || v.org || ent.handle || 'Entity'}
          </div>
          {ent.handle && (
            <div className="text-[10px] text-slate-500 mono">{ent.handle}</div>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {(ent.roles ?? []).map((r) => (
            <StatusBadge
              key={r}
              status={r === 'abuse' ? 'fail' : r === 'registrant' ? 'pass' : 'info'}
              size="sm"
            >
              {r}
            </StatusBadge>
          ))}
          {(ent.status ?? []).map((s) => (
            <StatusBadge key={s} status={s === 'validated' ? 'pass' : 'info'} size="sm">
              {s}
            </StatusBadge>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {v.email && (
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] uppercase text-slate-500 shrink-0">Email</span>
            <a href={`mailto:${v.email}`} className="mono text-brand-300 hover:text-brand-200 truncate">
              {v.email}
            </a>
          </div>
        )}
        {v.tel && (
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] uppercase text-slate-500 shrink-0">Phone</span>
            <span className="mono text-slate-300 truncate">{v.tel}</span>
          </div>
        )}
        {v.kind && (
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] uppercase text-slate-500 shrink-0">Kind</span>
            <span className="text-slate-300">{v.kind}</span>
          </div>
        )}
        {(registered || lastChanged) && (
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] uppercase text-slate-500 shrink-0">Updated</span>
            <span className="text-slate-300" title={lastChanged}>
              {fmtDate(lastChanged ?? registered)}
            </span>
          </div>
        )}
      </div>
      {v.address && (
        <pre className="text-[11px] text-slate-400 mono whitespace-pre-wrap leading-snug border-t border-surface-800 pt-1.5">
          {v.address}
        </pre>
      )}
      {ent.remarks?.map((r, i) => (
        <details key={i} className="text-[11px]">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
            {r.title ?? 'Remarks'}
          </summary>
          <div className="mt-1 space-y-0.5 text-slate-400 pl-3 border-l border-surface-700">
            {r.description?.map((line, j) => (
              <p key={j} className="whitespace-pre-wrap">
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b last:border-b-0 border-surface-800/80">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 w-28 shrink-0 pt-0.5">{k}</div>
      <div className="text-sm text-slate-200 min-w-0">{children}</div>
    </div>
  );
}

function IpLookupPage() {
  const q = useQ('ip');
  return (
    <ToolPage<IpLookup>
      title="IP Lookup (lite)"
      description="Lightweight IP record (use IP Intelligence for the full report)."
      defaultInput={q}
      validate={v.ip}
      autoRunOnMount
      run={(ip) => network.ip(ip)}
      toolName="IP Lookup"
      toolPath="/network/ip-lite"
    >
      {(d) => <KeyValueGrid data={d} skipEmpty />}
    </ToolPage>
  );
}

export default function NetworkRoutes() {
  return (
    <Routes>
      <Route path="ip" element={<NetworkIp />} />
      <Route path="ip-lite" element={<IpLookupPage />} />
      <Route path="asn" element={<NetworkAsn />} />
      <Route path="bgp" element={<NetworkBgp />} />
      <Route path="rpki" element={<NetworkRpki />} />
      <Route path="cidr" element={<NetworkCidr />} />
      <Route path="rdns" element={<NetworkRdns />} />
      <Route path="whois" element={<NetworkWhois />} />
      <Route path="*" element={<Navigate to="ip" replace />} />
    </Routes>
  );
}
