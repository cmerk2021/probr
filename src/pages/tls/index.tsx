import { Route, Routes, Navigate, Link } from 'react-router-dom';
import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { MonoValue } from '@/components/output/MonoValue';
import { StatusBadge, type Status } from '@/components/output/StatusBadge';
import { DataTable } from '@/components/output/DataTable';
import { KeyValueGrid } from '@/components/output/KeyValueGrid';
import { tls } from '@/api/endpoints';
import { v } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import { formatDate } from '@/utils/formatters';
import type {
  CertificateTransparency,
  CertInfo,
  TlsAnalyze,
  TlsCertificate,
  TlsCiphers,
  TlsOverview,
} from '@/api/types';

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b last:border-b-0 border-surface-800/80">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 w-32 shrink-0 pt-0.5">{k}</div>
      <div className="text-sm text-slate-200 min-w-0">{children}</div>
    </div>
  );
}

function Overview() {
  const q = useQ('domain');
  return (
    <ToolPage<TlsOverview>
      title="TLS Overview"
      description="Negotiated protocol, cipher, ALPN, and certificate validity for a host."
      defaultInput={q}
      validate={v.host}
      autoRunOnMount
      run={(h) => tls.overview(h)}
      toolName="TLS Overview"
      toolPath="/tls/overview"
    >
      {(d) => <TlsOverviewReport d={d} />}
    </ToolPage>
  );
}

function protocolTone(p?: string): Status {
  if (!p) return 'unknown';
  const v = p.toUpperCase();
  if (v.includes('1.3')) return 'pass';
  if (v.includes('1.2')) return 'info';
  if (v.includes('1.1') || v.includes('1.0') || v.includes('SSL')) return 'fail';
  return 'unknown';
}

function alpnTone(a?: string): Status {
  if (!a) return 'unknown';
  if (a === 'h2' || a.startsWith('h3')) return 'pass';
  return 'info';
}

function cipherTone(c?: string): Status {
  if (!c) return 'unknown';
  const v = c.toUpperCase();
  if (v.includes('CHACHA20') || v.includes('GCM') || v.includes('AES_256') || v.includes('AES_128_GCM')) return 'pass';
  if (v.includes('CBC')) return 'warn';
  if (v.includes('RC4') || v.includes('DES') || v.includes('NULL') || v.includes('EXPORT')) return 'fail';
  return 'info';
}

function daysRemainingTone(days?: number): Status {
  if (days === undefined || days === null) return 'unknown';
  if (days < 0) return 'fail';
  if (days <= 7) return 'fail';
  if (days <= 30) return 'warn';
  return 'pass';
}

function rttTone(ms?: number): Status {
  if (ms === undefined) return 'unknown';
  if (ms < 100) return 'pass';
  if (ms < 300) return 'info';
  if (ms < 800) return 'warn';
  return 'fail';
}

function fmtCertDate(s?: string): string {
  if (!s) return '—';
  const t = new Date(s).getTime();
  if (!Number.isFinite(t)) return s;
  return new Date(t).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TlsOverviewReport({ d }: { d: TlsOverview }) {
  const cipherObj = typeof d.cipher === 'object' && d.cipher !== null ? (d.cipher as { name?: string; standardName?: string; version?: string }) : null;
  const cipherName = typeof d.cipher === 'string' ? d.cipher : cipherObj?.name ?? cipherObj?.standardName;
  const protocol = d.protocol ?? cipherObj?.version;
  const days = d.days_remaining;
  const total = (() => {
    if (!d.not_before || !d.not_after) return undefined;
    const start = new Date(d.not_before).getTime();
    const end = new Date(d.not_after).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
    return Math.max(1, Math.round((end - start) / 86400000));
  })();
  const elapsedPct = (() => {
    if (!total || days === undefined) return 0;
    return Math.max(0, Math.min(100, ((total - days) / total) * 100));
  })();

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">TLS endpoint</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none break-all">
                {d.host}
              </span>
              <span className="mono text-sm text-slate-500">:{d.port ?? 443}</span>
              <StatusBadge
                status={d.authorized ? 'pass' : 'fail'}
                size="sm"
                glow={!!d.authorized}
              >
                {d.authorized ? 'Trusted chain' : 'Untrusted'}
              </StatusBadge>
              {protocol && (
                <StatusBadge status={protocolTone(protocol)} size="sm">
                  {protocol}
                </StatusBadge>
              )}
              {d.alpn && (
                <span
                  className={`mono text-[11px] px-2 py-0.5 rounded border ${
                    alpnTone(d.alpn) === 'pass'
                      ? 'border-data-green/40 bg-data-green/10 text-data-green'
                      : 'border-brand-500/40 bg-brand-500/10 text-brand-200'
                  }`}
                  title="Negotiated ALPN protocol"
                >
                  ALPN {d.alpn}
                </span>
              )}
            </div>
            {cipherName && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Cipher</span>
                <span
                  className={`mono px-1.5 py-0.5 rounded border ${
                    cipherTone(cipherName) === 'pass'
                      ? 'border-data-green/40 bg-data-green/10 text-data-green'
                      : cipherTone(cipherName) === 'warn'
                        ? 'border-data-yellow/40 bg-data-yellow/10 text-data-yellow'
                        : cipherTone(cipherName) === 'fail'
                          ? 'border-data-red/40 bg-data-red/10 text-data-red'
                          : 'border-surface-700 bg-surface-800 text-slate-300'
                  }`}
                >
                  {cipherName}
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat
              label="Days left"
              value={
                <StatusBadge status={daysRemainingTone(days)} size="sm" glow={days !== undefined && days > 30}>
                  {days ?? '—'}
                </StatusBadge>
              }
              accent
            />
            <Stat label="Handshake" value={
              <span className={
                rttTone(d.duration_ms) === 'pass' ? 'text-data-green'
                : rttTone(d.duration_ms) === 'warn' ? 'text-data-yellow'
                : rttTone(d.duration_ms) === 'fail' ? 'text-data-red'
                : 'text-slate-200'
              }>
                {d.duration_ms ?? '—'}<span className="text-slate-500"> ms</span>
              </span>
            } />
            <Stat label="Port" value={d.port ?? 443} />
          </div>
        </div>
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title="Validity">
          <Row k="Not before">
            <span title={d.not_before}>{fmtCertDate(d.not_before)}</span>
          </Row>
          <Row k="Not after">
            <span title={d.not_after}>{fmtCertDate(d.not_after)}</span>
          </Row>
          <Row k="Days remaining">
            <StatusBadge status={daysRemainingTone(days)} size="sm" glow={days !== undefined && days > 30}>
              {days ?? '—'} days
            </StatusBadge>
          </Row>
          {total !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                <span>Lifecycle</span>
                <span className="mono text-slate-400">
                  {Math.round(elapsedPct)}% elapsed · {total}d total
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    daysRemainingTone(days) === 'fail'
                      ? 'bg-data-red'
                      : daysRemainingTone(days) === 'warn'
                        ? 'bg-data-yellow'
                        : 'bg-data-green'
                  }`}
                  style={{ width: `${elapsedPct}%` }}
                />
              </div>
            </div>
          )}
        </ResultCard>

        <ResultCard title="Negotiated">
          <Row k="Protocol">
            <StatusBadge status={protocolTone(protocol)} size="sm">
              {protocol ?? '—'}
            </StatusBadge>
          </Row>
          <Row k="Cipher">
            <MonoValue value={cipherName ?? ''} size="sm" copyable>
              {cipherName ?? '—'}
            </MonoValue>
          </Row>
          {cipherObj?.standardName && cipherObj.standardName !== cipherName && (
            <Row k="IANA name">
              <MonoValue value={cipherObj.standardName} size="xs">{cipherObj.standardName}</MonoValue>
            </Row>
          )}
          <Row k="ALPN">
            <StatusBadge status={alpnTone(d.alpn)} size="sm">
              {d.alpn ?? '—'}
            </StatusBadge>
          </Row>
          <Row k="Handshake">
            <span className="mono">{d.duration_ms ?? '—'}</span>
            <span className="text-slate-500 text-xs ml-1">ms</span>
          </Row>
        </ResultCard>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 px-1">
        <a
          href={`/tls/certificate?q=${encodeURIComponent(d.host)}`}
          className="text-brand-300 hover:text-brand-200"
        >
          Certificate details →
        </a>
        <a
          href={`/tls/ciphers?q=${encodeURIComponent(d.host)}`}
          className="text-brand-300 hover:text-brand-200"
        >
          Supported ciphers →
        </a>
      </div>
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

function Certificate() {
  const q = useQ('domain');
  return (
    <ToolPage<TlsCertificate>
      title="TLS Certificate"
      description="Subject, issuer, validity, SANs, key, fingerprint and full issuance chain."
      defaultInput={q}
      validate={v.host}
      autoRunOnMount
      run={(h) => tls.certificate(h)}
      toolName="TLS Certificate"
      toolPath="/tls/certificate"
    >
      {(d) => <TlsCertificateReport d={d} />}
    </ToolPage>
  );
}

function dnFormat(dn?: Record<string, string> | string): string {
  if (!dn) return '—';
  if (typeof dn === 'string') return dn;
  const order = ['CN', 'OU', 'O', 'L', 'ST', 'C'];
  const keys = [...Object.keys(dn)].sort(
    (a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)),
  );
  return keys.map((k) => `${k}=${dn[k]}`).join(', ');
}

function getCN(dn?: Record<string, string> | string): string {
  if (!dn) return '—';
  if (typeof dn === 'string') return dn;
  return dn.CN ?? dn.O ?? '—';
}

function keyStrengthAlgo(keyType?: string, keyBits?: number): { label: string; tone: Status } {
  if (!keyType) return { label: '—', tone: 'unknown' };
  const kt = keyType.toLowerCase();
  if (kt.includes('ed25519')) return { label: 'Ed25519', tone: 'pass' };
  if (kt.includes('ed448')) return { label: 'Ed448', tone: 'pass' };
  if (kt.includes('prime256') || kt.includes('p-256') || kt === 'ecdsa') return { label: `ECDSA ${keyBits ?? 256}-bit (P-256)`, tone: 'pass' };
  if (kt.includes('secp384') || kt.includes('p-384')) return { label: `ECDSA ${keyBits ?? 384}-bit (P-384)`, tone: 'pass' };
  if (kt.includes('secp521')) return { label: `ECDSA ${keyBits ?? 521}-bit (P-521)`, tone: 'pass' };
  if (kt === 'rsa') {
    const tone: Status = (keyBits ?? 0) >= 2048 ? 'pass' : (keyBits ?? 0) >= 1024 ? 'warn' : 'fail';
    return { label: `RSA ${keyBits ?? '?'}-bit`, tone };
  }
  return { label: `${keyType} ${keyBits ?? ''}`, tone: 'info' };
}

function TlsCertificateReport({ d }: { d: TlsCertificate }) {
  const c = d.certificate ?? ({} as CertInfo);
  const chain = d.chain ?? [];
  const sans = (c.subject_alt_names ?? c.san ?? []) as string[];
  const days = c.days_remaining;
  const fp = c.fingerprint_sha256 ?? c.fingerprint;
  const fp1 = c.fingerprint_sha1;
  const key = keyStrengthAlgo(c.key_type, c.key_bits);
  const total = (() => {
    const from = c.valid_from ?? c.not_before;
    const to = c.valid_to ?? c.not_after;
    if (!from || !to) return undefined;
    const a = new Date(from).getTime();
    const b = new Date(to).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
    return Math.max(1, Math.round((b - a) / 86400000));
  })();
  const elapsedPct = total && days !== undefined ? Math.max(0, Math.min(100, ((total - days) / total) * 100)) : 0;

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Leaf certificate</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none break-all">
                {getCN(c.subject)}
              </span>
              <span className="mono text-sm text-slate-500">
                {d.host}:{d.port ?? 443}
              </span>
              <StatusBadge status={daysRemainingTone(days)} size="sm" glow={days !== undefined && days > 30}>
                {days ?? '—'}d left
              </StatusBadge>
              <StatusBadge status={key.tone} size="sm">{key.label}</StatusBadge>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500">
              Issued by <span className="text-slate-300">{getCN(c.issuer)}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="SANs" value={sans.length} accent />
            <Stat label="Chain depth" value={chain.length} />
            <Stat label="Lifetime" value={total ? `${total}d` : '—'} />
          </div>
        </div>
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title="Subject">
          {typeof c.subject === 'object' && c.subject ? (
            <DnList dn={c.subject as Record<string, string>} />
          ) : (
            <span className="mono text-sm text-slate-200">{c.subject ?? '—'}</span>
          )}
        </ResultCard>
        <ResultCard title="Issuer">
          {typeof c.issuer === 'object' && c.issuer ? (
            <DnList dn={c.issuer as Record<string, string>} />
          ) : (
            <span className="mono text-sm text-slate-200">{c.issuer ?? '—'}</span>
          )}
        </ResultCard>
      </div>

      <ResultCard title="Validity">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Not before</div>
            <div className="text-sm text-slate-200 mt-0.5" title={c.valid_from ?? c.not_before}>
              {fmtCertDate(c.valid_from ?? c.not_before)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Not after</div>
            <div className="text-sm text-slate-200 mt-0.5" title={c.valid_to ?? c.not_after}>
              {fmtCertDate(c.valid_to ?? c.not_after)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Remaining</div>
            <div className="mt-0.5">
              <StatusBadge status={daysRemainingTone(days)} size="sm" glow={days !== undefined && days > 30}>
                {days ?? '—'} days
              </StatusBadge>
            </div>
          </div>
        </div>
        {total !== undefined && days !== undefined && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-1">
              <span>Lifecycle</span>
              <span className="mono text-slate-400">
                {Math.round(elapsedPct)}% elapsed · {total}d total
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  daysRemainingTone(days) === 'fail'
                    ? 'bg-data-red'
                    : daysRemainingTone(days) === 'warn'
                      ? 'bg-data-yellow'
                      : 'bg-data-green'
                }`}
                style={{ width: `${elapsedPct}%` }}
              />
            </div>
          </div>
        )}
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title="Identity">
          <Row k="Serial">
            <MonoValue value={c.serial ?? ''} size="xs" copyable>
              {c.serial ?? '—'}
            </MonoValue>
          </Row>
          <Row k="Key">
            <span className="flex items-center gap-2">
              <StatusBadge status={key.tone} size="sm">{key.label}</StatusBadge>
            </span>
          </Row>
          {c.signature_algorithm && (
            <Row k="Signature">
              <span className="mono text-sm">{String(c.signature_algorithm)}</span>
            </Row>
          )}
          {fp && (
            <Row k="SHA-256">
              <MonoValue value={fp} size="xs" copyable>
                <span className="break-all">{fp}</span>
              </MonoValue>
            </Row>
          )}
          {fp1 && (
            <Row k="SHA-1">
              <MonoValue value={fp1} size="xs" copyable>
                <span className="break-all">{fp1}</span>
              </MonoValue>
            </Row>
          )}
        </ResultCard>

        <ResultCard title={`Subject alt names · ${sans.length}`}>
          {sans.length === 0 ? (
            <span className="text-xs text-slate-500">No SANs.</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {sans.map((s) => (
                <MonoValue
                  key={s}
                  value={s}
                  type="domain"
                  size="xs"
                  copyable
                  linkTo={
                    s.startsWith('*')
                      ? undefined
                      : `/tls/overview?q=${encodeURIComponent(s)}`
                  }
                >
                  {s}
                </MonoValue>
              ))}
            </div>
          )}
        </ResultCard>
      </div>

      <ResultCard title={`Chain of trust · ${chain.length}`}>
        {chain.length === 0 ? (
          <span className="text-xs text-slate-500">No chain returned.</span>
        ) : (
          <ChainList chain={chain} />
        )}
      </ResultCard>
    </div>
  );
}

function DnList({ dn }: { dn: Record<string, string> }) {
  const order = ['CN', 'OU', 'O', 'L', 'ST', 'C'];
  const keys = [...Object.keys(dn)].sort(
    (a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)),
  );
  const labels: Record<string, string> = {
    CN: 'Common name',
    O: 'Organization',
    OU: 'Org. unit',
    L: 'Locality',
    ST: 'State',
    C: 'Country',
  };
  return (
    <div className="space-y-1">
      {keys.map((k) => (
        <div key={k} className="flex items-start gap-3 py-1 border-b last:border-b-0 border-surface-800/80">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 w-24 shrink-0 pt-0.5">
            <span className="mono text-slate-400">{k}</span>
            <span className="text-slate-600 ml-1">{labels[k] ?? ''}</span>
          </div>
          <div className="text-sm text-slate-200 min-w-0 mono break-all">{String(dn[k])}</div>
        </div>
      ))}
    </div>
  );
}

function ChainList({ chain }: { chain: CertInfo[] }) {
  return (
    <ol className="space-y-2">
      {chain.map((cert, i) => {
        const isLeaf = i === 0;
        const isRoot = i === chain.length - 1;
        const role = isLeaf ? 'Leaf' : isRoot ? 'Root' : `Intermediate ${i}`;
        const key = keyStrengthAlgo(cert.key_type, cert.key_bits);
        const days = cert.days_remaining;
        return (
          <li
            key={i}
            className="relative rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    isLeaf
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-200'
                      : isRoot
                        ? 'border-data-green/40 bg-data-green/10 text-data-green'
                        : 'border-surface-700 bg-surface-800 text-slate-300'
                  }`}
                >
                  {role}
                </span>
                <span className="text-sm text-slate-100 truncate">{getCN(cert.subject)}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={key.tone} size="sm">{key.label}</StatusBadge>
                {days !== undefined && (
                  <StatusBadge status={daysRemainingTone(days)} size="sm">
                    {days}d
                  </StatusBadge>
                )}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 truncate">
              issued by <span className="text-slate-300">{getCN(cert.issuer)}</span> ·{' '}
              <span className="mono">{fmtCertDate(cert.valid_from ?? cert.not_before)}</span> →{' '}
              <span className="mono">{fmtCertDate(cert.valid_to ?? cert.not_after)}</span>
            </div>
            {(cert.fingerprint_sha256 ?? cert.fingerprint) && (
              <details className="mt-1.5">
                <summary className="text-[10px] uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-300">
                  Fingerprint · serial
                </summary>
                <div className="mt-1 space-y-1 text-[11px]">
                  {(cert.fingerprint_sha256 ?? cert.fingerprint) && (
                    <div>
                      <span className="text-slate-500 mr-2">SHA-256</span>
                      <MonoValue value={String(cert.fingerprint_sha256 ?? cert.fingerprint)} size="xs" copyable>
                        <span className="break-all">{cert.fingerprint_sha256 ?? cert.fingerprint}</span>
                      </MonoValue>
                    </div>
                  )}
                  {cert.serial && (
                    <div>
                      <span className="text-slate-500 mr-2">Serial</span>
                      <MonoValue value={cert.serial} size="xs" copyable>
                        <span className="break-all">{cert.serial}</span>
                      </MonoValue>
                    </div>
                  )}
                </div>
              </details>
            )}
            {i < chain.length - 1 && (
              <div className="absolute left-6 -bottom-2 w-px h-2 bg-surface-700" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Ciphers() {
  const q = useQ('domain');
  return (
    <ToolPage<TlsCiphers>
      title="TLS Cipher Suites"
      description="Negotiated cipher families, key exchange, authentication and bulk encryption."
      defaultInput={q}
      validate={v.host}
      autoRunOnMount
      run={(h) => tls.ciphers(h)}
      toolName="TLS Ciphers"
      toolPath="/tls/ciphers"
    >
      {(d) => <TlsCiphersReport d={d} />}
    </ToolPage>
  );
}

interface ParsedCipher {
  name: string;
  kex: string;
  auth: string;
  bulk: string;
  mac: string;
  pfs: boolean;
  aead: boolean;
  legacy: boolean;
  tone: Status;
}

function cipherName(c: string | { name?: string }): string {
  return typeof c === 'string' ? c : (c?.name ?? '');
}

function parseCipher(raw: string): ParsedCipher {
  const name = raw;
  let kex = 'RSA';
  let auth = 'RSA';
  let rest = raw;
  if (raw.startsWith('ECDHE-ECDSA-')) { kex = 'ECDHE'; auth = 'ECDSA'; rest = raw.slice(12); }
  else if (raw.startsWith('ECDHE-RSA-')) { kex = 'ECDHE'; auth = 'RSA'; rest = raw.slice(10); }
  else if (raw.startsWith('DHE-RSA-')) { kex = 'DHE'; auth = 'RSA'; rest = raw.slice(8); }
  else if (raw.startsWith('DHE-DSS-')) { kex = 'DHE'; auth = 'DSS'; rest = raw.slice(8); }
  else if (raw.startsWith('ECDH-')) { kex = 'ECDH'; auth = raw.includes('ECDSA') ? 'ECDSA' : 'RSA'; rest = raw.replace(/^ECDH-(ECDSA|RSA)-/, ''); }
  else if (raw.startsWith('TLS_')) {
    // TLS 1.3 style names: TLS_AES_128_GCM_SHA256
    kex = 'ANY (TLS 1.3)'; auth = 'ANY';
    rest = raw.slice(4).replace(/_/g, '-');
  }
  // bulk + mac
  let bulk = rest;
  let mac = '';
  const macMatch = rest.match(/-(SHA(?:256|384)?|MD5)$/);
  if (macMatch) {
    mac = macMatch[1];
    bulk = rest.slice(0, -macMatch[0].length);
  }
  const aead = /-(GCM|CCM|POLY1305)\b/.test(bulk + (mac ? '-' + mac : '')) || /CHACHA20/.test(bulk);
  const pfs = kex === 'ECDHE' || kex === 'DHE' || kex.startsWith('ANY');
  const legacy = /(^|[-_])(RC4|DES|3DES|MD5|NULL|EXPORT|IDEA|SEED)([-_]|$)/.test(raw);
  let tone: Status;
  if (legacy) tone = 'fail';
  else if (!pfs) tone = 'warn';
  else if (!aead) tone = 'warn';
  else tone = 'pass';
  return { name, kex, auth, bulk, mac, pfs, aead, legacy, tone };
}

function kexTone(k: string): Status {
  if (k.startsWith('ANY')) return 'pass';
  if (k === 'ECDHE') return 'pass';
  if (k === 'DHE') return 'info';
  if (k === 'ECDH') return 'warn';
  return 'warn';
}

function bulkTone(b: string): Status {
  if (/CHACHA20/.test(b)) return 'pass';
  if (/AES(128|256)-GCM/.test(b)) return 'pass';
  if (/AES(128|256)-CCM/.test(b)) return 'pass';
  if (/AES(128|256)-CBC/.test(b) || /^AES(128|256)$/.test(b)) return 'warn';
  if (/3DES|DES|RC4|NULL/.test(b)) return 'fail';
  return 'info';
}

function TlsCiphersReport({ d }: { d: TlsCiphers }) {
  const supported = (d.supported ?? []).map(cipherName).filter(Boolean).map(parseCipher);
  const unsupported = (d.unsupported ?? []).map(cipherName).filter(Boolean).map(parseCipher);
  const pfsCount = supported.filter((c) => c.pfs).length;
  const aeadCount = supported.filter((c) => c.aead).length;
  const weakCount = supported.filter((c) => c.tone === 'fail' || c.tone === 'warn').length;
  const tested = supported.length + unsupported.length;
  const pct = tested ? Math.round((supported.length / tested) * 100) : 0;

  const overallTone: Status = supported.length === 0
    ? 'unknown'
    : supported.every((c) => c.tone === 'pass')
      ? 'pass'
      : weakCount > 0
        ? 'warn'
        : 'pass';

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Cipher posture</div>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none">
                {supported.length}
                <span className="text-slate-500 text-xl">/{tested}</span>
              </span>
              <span className="mono text-sm text-slate-500">{d.host}:{d.port ?? 443}</span>
              <StatusBadge status={overallTone} size="sm" glow={overallTone === 'pass'}>
                {overallTone === 'pass' ? 'Modern' : overallTone === 'warn' ? 'Mixed' : '—'}
              </StatusBadge>
            </div>
            <div className="mt-2 h-1.5 w-64 rounded-full bg-surface-800 overflow-hidden">
              <div
                className={`h-full ${overallTone === 'pass' ? 'bg-data-green' : overallTone === 'warn' ? 'bg-data-yellow' : 'bg-data-red'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-slate-500 mono">{pct}% of tested ciphers accepted</div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="PFS" value={`${pfsCount}/${supported.length || 0}`} accent />
            <Stat label="AEAD" value={`${aeadCount}/${supported.length || 0}`} />
            <Stat label="Weak/Legacy" value={weakCount} />
          </div>
        </div>
      </ResultCard>

      <ResultCard title={`Supported · ${supported.length}`} accent>
        {supported.length === 0 ? (
          <span className="text-xs text-slate-500">No ciphers negotiated.</span>
        ) : (
          <CipherList ciphers={supported} />
        )}
      </ResultCard>

      <ResultCard title={`Rejected · ${unsupported.length}`}>
        {unsupported.length === 0 ? (
          <span className="text-xs text-slate-500">No rejected ciphers in test set.</span>
        ) : (
          <CipherList ciphers={unsupported} muted />
        )}
      </ResultCard>
    </div>
  );
}

function CipherList({ ciphers, muted = false }: { ciphers: ParsedCipher[]; muted?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {ciphers.map((c) => (
        <li
          key={c.name}
          className={`rounded-md border px-3 py-2 ${
            muted
              ? 'border-surface-800 bg-surface-900/40 opacity-70'
              : 'border-surface-700 bg-surface-900/50'
          }`}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <MonoValue value={c.name} size="xs" copyable>
              <span className="text-slate-100">{c.name}</span>
            </MonoValue>
            <div className="flex items-center gap-1.5 flex-wrap">
              {!muted && <StatusBadge status={c.tone} size="sm">{c.tone === 'pass' ? 'Strong' : c.tone === 'warn' ? 'Weak' : c.tone === 'fail' ? 'Legacy' : '—'}</StatusBadge>}
              <ChipPill tone={kexTone(c.kex)} label="KEX" value={c.kex} />
              <ChipPill tone="info" label="AUTH" value={c.auth} />
              <ChipPill tone={bulkTone(c.bulk)} label="BULK" value={c.bulk} />
              {c.mac && <ChipPill tone="info" label="MAC" value={c.mac} />}
              {c.pfs && <ChipPill tone="pass" label="" value="PFS" />}
              {c.aead && <ChipPill tone="pass" label="" value="AEAD" />}
              {c.legacy && <ChipPill tone="fail" label="" value="LEGACY" />}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChipPill({ tone, label, value }: { tone: Status; label: string; value: string }) {
  const cls =
    tone === 'pass'
      ? 'border-data-green/40 bg-data-green/10 text-data-green'
      : tone === 'warn'
        ? 'border-data-yellow/40 bg-data-yellow/10 text-data-yellow'
        : tone === 'fail'
          ? 'border-data-red/40 bg-data-red/10 text-data-red'
          : tone === 'info'
            ? 'border-data-blue/40 bg-data-blue/10 text-data-blue'
            : 'border-surface-700 bg-surface-800 text-slate-400';
  return (
    <span className={`mono text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>
      {label && <span className="opacity-60 mr-1">{label}</span>}
      {value}
    </span>
  );
}

function Analyze() {
  const q = useQ('domain');
  return (
    <ToolPage<TlsAnalyze>
      title="TLS Full Analysis"
      description="Grade, protocol, cipher, certificate, chain length and cipher posture in one view."
      defaultInput={q}
      validate={v.host}
      autoRunOnMount
      run={(h) => tls.analyze(h)}
      toolName="TLS Analyze"
      toolPath="/tls/analyze"
    >
      {(d) => <TlsAnalyzeReport d={d} />}
    </ToolPage>
  );
}

function gradeTone(grade?: string): Status {
  if (!grade) return 'unknown';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'pass';
  if (g.startsWith('B')) return 'info';
  if (g.startsWith('C')) return 'warn';
  if (g.startsWith('D')) return 'warn';
  return 'fail';
}

function gradeColorClass(grade?: string): string {
  const t = gradeTone(grade);
  return t === 'pass'
    ? 'text-data-green'
    : t === 'info'
      ? 'text-data-blue'
      : t === 'warn'
        ? 'text-data-yellow'
        : t === 'fail'
          ? 'text-data-red'
          : 'text-slate-400';
}

function TlsAnalyzeReport({ d }: { d: TlsAnalyze }) {
  const cert = d.certificate ?? ({} as CertInfo);
  const cipherName = typeof d.cipher === 'string' ? d.cipher : d.cipher?.name ?? d.cipher?.standardName;
  const cipherVer = typeof d.cipher === 'string' ? undefined : d.cipher?.version;
  const sup = (d.supported_ciphers ?? []).map((c) => (typeof c === 'string' ? c : c.name ?? '')).filter(Boolean);
  const unsup = (d.unsupported_ciphers ?? []).map((c) => (typeof c === 'string' ? c : c.name ?? '')).filter(Boolean);
  const supParsed = sup.map(parseCipher);
  const unsupParsed = unsup.map(parseCipher);
  const total = sup.length + unsup.length;
  const pfsCount = supParsed.filter((c) => c.pfs).length;
  const aeadCount = supParsed.filter((c) => c.aead).length;
  const weakCount = supParsed.filter((c) => c.tone === 'fail' || c.tone === 'warn').length;
  const protocols = ['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3'] as const;
  const negVer = typeof d.cipher === 'string' ? d.protocol : d.cipher?.version ?? d.protocol;

  function protoStatus(p: string): { tone: Status; label: string } {
    const v = p.replace('TLS ', '');
    const legacy = v === '1.0' || v === '1.1';
    if (negVer?.includes(v)) return { tone: 'pass', label: 'Negotiated' };
    // We can't infer fully from cipher names; rely on cipher protocol field if present
    const supportedSet = new Set(
      (d.supported_ciphers ?? [])
        .map((c) => (typeof c === 'string' ? '' : c.protocol ?? ''))
        .filter(Boolean),
    );
    const seen = Array.from(supportedSet).some((x) => x.includes(v));
    if (seen) return { tone: legacy ? 'warn' : 'pass', label: 'Supported' };
    return { tone: legacy ? 'pass' : 'unknown', label: legacy ? 'Disabled' : '—' };
  }

  const key = keyStrengthAlgo(cert.key_type, cert.key_bits);
  const days = cert.days_remaining;

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`font-display text-6xl leading-none ${gradeColorClass(d.grade)}`}>
              {d.grade ?? '—'}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Overall grade</div>
              <div className="flex items-baseline gap-3 mt-0.5">
                <span className="mono text-sm text-slate-300">{d.host}:{d.port ?? 443}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <StatusBadge status={d.hostname_match ? 'pass' : 'fail'} size="sm" glow={!!d.hostname_match}>
                  Hostname {d.hostname_match ? 'match' : 'mismatch'}
                </StatusBadge>
                {negVer && <ChipPill tone={protocolTone(negVer)} label="" value={negVer} />}
                {cipherName && <ChipPill tone={cipherTone(cipherName)} label="" value={cipherName} />}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-x-6 gap-y-2 text-xs">
            <Stat label="Chain" value={d.chain_length ?? '—'} accent />
            <Stat label="Ciphers" value={`${sup.length}/${total}`} />
            <Stat label="PFS" value={pfsCount} />
            <Stat label="Weak" value={weakCount} />
          </div>
        </div>
      </ResultCard>

      <ResultCard title="Protocol support">
        <div className="flex flex-wrap gap-2">
          {protocols.map((p) => {
            const s = protoStatus(p);
            return (
              <div
                key={p}
                className="flex items-center gap-2 px-3 py-1.5 rounded border border-surface-700 bg-surface-900/50"
              >
                <span className="mono text-xs text-slate-200">{p}</span>
                <StatusBadge status={s.tone} size="sm" glow={s.tone === 'pass'}>
                  {s.label}
                </StatusBadge>
              </div>
            );
          })}
        </div>
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title="Negotiated connection" accent>
          <Row k="Protocol">
            {negVer ? (
              <StatusBadge status={protocolTone(negVer)} size="sm" glow>{negVer}</StatusBadge>
            ) : (
              '—'
            )}
          </Row>
          <Row k="Cipher">
            {cipherName ? (
              <MonoValue value={cipherName} size="xs" copyable>
                <span className="text-slate-100">{cipherName}</span>
              </MonoValue>
            ) : (
              '—'
            )}
          </Row>
          {cipherVer && <Row k="Cipher version"><span className="mono text-sm">{cipherVer}</span></Row>}
          <Row k="Chain length">
            <span className="mono text-slate-200">{d.chain_length ?? '—'}</span>
          </Row>
          <Row k="Hostname">
            <StatusBadge status={d.hostname_match ? 'pass' : 'fail'} size="sm">
              {d.hostname_match ? 'matches certificate' : 'does not match'}
            </StatusBadge>
          </Row>
        </ResultCard>

        <ResultCard title="Leaf certificate">
          <Row k="Subject CN">
            <span className="mono text-sm text-slate-100">{getCN(cert.subject)}</span>
          </Row>
          <Row k="Issuer">
            <span className="mono text-sm text-slate-300">{dnFormat(cert.issuer)}</span>
          </Row>
          <Row k="Key">
            <StatusBadge status={key.tone} size="sm">{key.label}</StatusBadge>
          </Row>
          <Row k="Validity">
            <span className="text-xs text-slate-300">
              <span className="mono">{fmtCertDate(cert.valid_from ?? cert.not_before)}</span>
              <span className="text-slate-500 mx-1.5">→</span>
              <span className="mono">{fmtCertDate(cert.valid_to ?? cert.not_after)}</span>
            </span>
          </Row>
          <Row k="Days left">
            <StatusBadge status={daysRemainingTone(days)} size="sm" glow={days !== undefined && days > 30}>
              {days ?? '—'}
            </StatusBadge>
          </Row>
          {(cert.subject_alt_names ?? cert.san ?? []).length > 0 && (
            <Row k="SANs">
              <div className="flex flex-wrap gap-1">
                {((cert.subject_alt_names ?? cert.san) as string[]).map((s) => (
                  <MonoValue key={s} value={s} type="domain" size="xs">{s}</MonoValue>
                ))}
              </div>
            </Row>
          )}
        </ResultCard>
      </div>

      <ResultCard title={`Cipher posture · ${sup.length}/${total}`}>
        <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
          <Stat label="Forward secrecy" value={`${pfsCount}/${sup.length || 0}`} accent />
          <Stat label="AEAD" value={`${aeadCount}/${sup.length || 0}`} />
          <Stat label="Weak/Legacy" value={weakCount} />
        </div>
        {sup.length > 0 && (
          <>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Accepted</div>
            <CipherList ciphers={supParsed} />
          </>
        )}
        {unsup.length > 0 && (
          <>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-4 mb-1.5">Rejected</div>
            <CipherList ciphers={unsupParsed} muted />
          </>
        )}
      </ResultCard>

      {!!d.findings?.length && (
        <ResultCard title={`Findings · ${d.findings.length}`} accent>
          <ul className="space-y-1.5">
            {d.findings.map((f, i) => {
              const sev = (f.severity ?? 'info') as string;
              const map: Record<string, Status> = {
                critical: 'fail',
                high: 'fail',
                medium: 'warn',
                low: 'info',
                info: 'info',
              };
              return (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm rounded border border-surface-800 bg-surface-900/40 px-2.5 py-1.5"
                >
                  <StatusBadge status={map[sev] ?? 'info'} size="sm">{sev}</StatusBadge>
                  <span className="text-slate-300">{f.message}</span>
                </li>
              );
            })}
          </ul>
        </ResultCard>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          to={`/tls/overview?q=${encodeURIComponent(d.host)}`}
          className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300"
        >
          → TLS overview
        </Link>
        <Link
          to={`/tls/certificate?q=${encodeURIComponent(d.host)}`}
          className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300"
        >
          → Certificate detail
        </Link>
        <Link
          to={`/tls/ciphers?q=${encodeURIComponent(d.host)}`}
          className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300"
        >
          → Ciphers
        </Link>
        <Link
          to={`/tls/ct?q=${encodeURIComponent(d.host)}`}
          className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300"
        >
          → CT logs
        </Link>
      </div>
    </div>
  );
}

function CtLog() {
  const q = useQ('domain');
  return (
    <ToolPage<CertificateTransparency>
      title="Certificate Transparency"
      description="Search CT logs for certificates issued for a domain."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => tls.ct(d)}
      toolName="CT Logs"
      toolPath="/tls/ct"
    >
      {(d) => (
        <ResultCard title={`${d.domain} · ${d.count ?? 0} certificates`} accent>
          <DataTable
            rows={d.certificates ?? []}
            columns={[
              { key: 'common_name', header: 'CN', render: (r) => <MonoValue size="xs">{r.common_name ?? '—'}</MonoValue> },
              { key: 'issuer_name', header: 'Issuer' },
              { key: 'not_before', header: 'Not before', render: (r) => formatDate(r.not_before) },
              { key: 'not_after', header: 'Not after', render: (r) => formatDate(r.not_after) },
            ]}
          />
        </ResultCard>
      )}
    </ToolPage>
  );
}

export default function TlsRoutes() {
  return (
    <Routes>
      <Route path="overview" element={<Overview />} />
      <Route path="certificate" element={<Certificate />} />
      <Route path="ciphers" element={<Ciphers />} />
      <Route path="analyze" element={<Analyze />} />
      <Route path="ct" element={<CtLog />} />
      <Route path="*" element={<Navigate to="overview" replace />} />
    </Routes>
  );
}
