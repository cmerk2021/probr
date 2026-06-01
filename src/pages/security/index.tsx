import { Route, Routes, Navigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { StatusBadge } from '@/components/output/StatusBadge';
import { MonoValue } from '@/components/output/MonoValue';
import { KeyValueGrid } from '@/components/output/KeyValueGrid';
import { ErrorState } from '@/components/shared/ErrorState';
import { security } from '@/api/endpoints';
import { v } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import { useApi } from '@/hooks/useApi';
import type {
  SecHeaderInfo,
  SecurityDomain,
  SecurityHash,
  SecurityHeaders,
  SecurityPassword,
  SecurityUrl,
} from '@/api/types';
import { LoadingState } from '@/components/shared/LoadingState';

type Status = 'pass' | 'fail' | 'warn' | 'info' | 'unknown';

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b last:border-b-0 border-surface-800/80">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 w-32 shrink-0 pt-0.5">{k}</div>
      <div className="text-sm text-slate-200 min-w-0">{children}</div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mono text-sm mt-0.5 ${accent ? 'text-brand-300' : 'text-slate-200'}`}>{value}</div>
    </div>
  );
}

const SEC_HEADER_INFO: Record<string, { label: string; critical?: boolean; desc: string; remediation: string }> = {
  'strict-transport-security': {
    label: 'HSTS',
    critical: true,
    desc: 'Forces HTTPS for future visits and protects against downgrade attacks.',
    remediation: 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
  },
  'content-security-policy': {
    label: 'CSP',
    critical: true,
    desc: 'Restricts which sources can load scripts, styles, frames and connect endpoints.',
    remediation: "Content-Security-Policy: default-src 'self'; object-src 'none'; frame-ancestors 'none'",
  },
  'x-content-type-options': {
    label: 'X-Content-Type-Options',
    desc: 'Blocks MIME-type sniffing by browsers.',
    remediation: 'X-Content-Type-Options: nosniff',
  },
  'x-frame-options': {
    label: 'X-Frame-Options',
    desc: 'Legacy clickjacking protection; superseded by CSP frame-ancestors.',
    remediation: 'X-Frame-Options: DENY',
  },
  'referrer-policy': {
    label: 'Referrer-Policy',
    desc: 'Controls how much referrer information leaks to other origins.',
    remediation: 'Referrer-Policy: strict-origin-when-cross-origin',
  },
  'permissions-policy': {
    label: 'Permissions-Policy',
    desc: 'Restricts powerful browser features (camera, geolocation, FLoC, etc.).',
    remediation: 'Permissions-Policy: camera=(), microphone=(), geolocation=()',
  },
  'cross-origin-opener-policy': {
    label: 'COOP',
    desc: 'Isolates the browsing context group; enables cross-origin isolation.',
    remediation: 'Cross-Origin-Opener-Policy: same-origin',
  },
  'cross-origin-embedder-policy': {
    label: 'COEP',
    desc: 'Required for cross-origin isolation; controls cross-origin loads.',
    remediation: 'Cross-Origin-Embedder-Policy: require-corp',
  },
  'cross-origin-resource-policy': {
    label: 'CORP',
    desc: 'Restricts who can embed or load this resource cross-origin.',
    remediation: 'Cross-Origin-Resource-Policy: same-origin',
  },
};

function gradeColorClass(g?: string): string {
  if (!g) return 'text-slate-400';
  const u = g.toUpperCase();
  if (u === 'A' || u.startsWith('A+')) return 'text-data-green';
  if (u === 'B') return 'text-data-blue';
  if (u === 'C') return 'text-data-yellow';
  if (u === 'D') return 'text-data-yellow';
  return 'text-data-red';
}

function gradeTone(g?: string): Status {
  if (!g) return 'unknown';
  const u = g.toUpperCase();
  if (u.startsWith('A')) return 'pass';
  if (u === 'B') return 'info';
  if (u === 'C' || u === 'D') return 'warn';
  return 'fail';
}

function statusTone(s?: number): Status {
  if (!s) return 'unknown';
  if (s >= 200 && s < 300) return 'pass';
  if (s >= 300 && s < 400) return 'info';
  if (s >= 400 && s < 500) return 'warn';
  return 'fail';
}

function parseHeaderTokens(name: string, value: string): React.ReactNode {
  if (name === 'permissions-policy' || name === 'content-security-policy' || name === 'cache-control') {
    const parts = value.split(/[,;]\s*/).filter(Boolean);
    if (parts.length > 1) {
      return (
        <div className="flex flex-wrap gap-1">
          {parts.map((p, i) => (
            <span key={i} className="mono text-[10px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300">
              {p}
            </span>
          ))}
        </div>
      );
    }
  }
  if (name === 'strict-transport-security') {
    const parts = value.split(/;\s*/).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {parts.map((p, i) => {
          const isMaxAge = p.startsWith('max-age=');
          const seconds = isMaxAge ? Number(p.slice(8)) : NaN;
          let label = p;
          if (isMaxAge && Number.isFinite(seconds)) {
            const years = (seconds / 31536000).toFixed(seconds >= 31536000 ? 1 : 2);
            label = `max-age=${seconds.toLocaleString()} (${years}y)`;
          }
          return (
            <span
              key={i}
              className={`mono text-[10px] px-1.5 py-0.5 rounded border ${
                isMaxAge && seconds >= 15552000
                  ? 'border-data-green/40 bg-data-green/10 text-data-green'
                  : 'border-surface-700 bg-surface-800 text-slate-300'
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  }
  return <span className="mono text-xs text-slate-300 break-all">{value}</span>;
}

function Headers() {
  const q = useQ('url');
  return (
    <ToolPage<SecurityHeaders>
      title="Security Headers"
      description="Graded inspection of HTTP security headers (CSP, HSTS, COOP/COEP/CORP and more)."
      defaultInput={q}
      validate={v.url}
      autoRunOnMount
      inputMono={false}
      run={(u) => security.headers(u)}
      toolName="Security Headers"
      toolPath="/security/headers"
    >
      {(d) => <SecurityHeadersReport d={d} />}
    </ToolPage>
  );
}

function SecurityHeadersReport({ d }: { d: SecurityHeaders }) {
  const headers = d.headers ?? {};
  const entries = Object.entries(SEC_HEADER_INFO);
  const present = entries.filter(([k]) => headers[k]?.present);
  const missing = entries.filter(([k]) => !headers[k]?.present);
  const missingCritical = missing.filter(([, info]) => info.critical);
  const total = entries.length;
  const presentCount = d.present_count ?? present.length;
  const pct = total ? Math.round((presentCount / total) * 100) : 0;
  const host = (() => {
    try { return new URL(d.url).host; } catch { return d.url; }
  })();

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`font-display text-6xl leading-none ${gradeColorClass(d.grade)}`}>
              {d.grade ?? '—'}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Header grade</div>
              <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-display text-xl text-brand-300 hover:text-brand-200 break-all leading-none"
                >
                  {host || d.url}
                </a>
                <StatusBadge status={statusTone(d.status)} size="sm" glow={statusTone(d.status) === 'pass'}>
                  HTTP {d.status ?? '—'}
                </StatusBadge>
                <StatusBadge status={gradeTone(d.grade)} size="sm">
                  {presentCount}/{total} present
                </StatusBadge>
              </div>
              <div className="mt-2 h-1.5 w-64 rounded-full bg-surface-800 overflow-hidden">
                <div
                  className={`h-full ${
                    gradeTone(d.grade) === 'pass'
                      ? 'bg-data-green'
                      : gradeTone(d.grade) === 'info'
                        ? 'bg-data-blue'
                        : gradeTone(d.grade) === 'warn'
                          ? 'bg-data-yellow'
                          : 'bg-data-red'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-slate-500 mono">{pct}% of recommended headers set</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Present" value={presentCount} accent />
            <Stat label="Missing" value={missing.length} />
            <Stat label="Critical gaps" value={missingCritical.length} />
          </div>
        </div>
      </ResultCard>

      <ResultCard
        title={`Present · ${present.length}`}
        accent
      >
        {present.length === 0 ? (
          <span className="text-xs text-slate-500">No security headers are set.</span>
        ) : (
          <ul className="space-y-1.5">
            {present.map(([key, info]) => {
              const h = headers[key];
              return (
                <li
                  key={key}
                  className="rounded border border-surface-700 bg-surface-900/50 px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusBadge status="pass" size="sm">set</StatusBadge>
                      <MonoValue value={key} size="xs" copyable>
                        <span className="text-slate-100">{key}</span>
                      </MonoValue>
                      {info.critical && (
                        <span className="text-[9px] uppercase tracking-wider text-data-green/70">critical</span>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">{info.label}</span>
                  </div>
                  <div>{h?.value ? parseHeaderTokens(key, String(h.value)) : <span className="text-xs text-slate-500">(empty value)</span>}</div>
                </li>
              );
            })}
          </ul>
        )}
      </ResultCard>

      <ResultCard title={`Missing · ${missing.length}`}>
        {missing.length === 0 ? (
          <span className="text-xs text-slate-500">All recommended security headers are present.</span>
        ) : (
          <ul className="space-y-1.5">
            {missing.map(([key, info]) => (
              <li
                key={key}
                className={`rounded border px-2.5 py-2 ${
                  info.critical
                    ? 'border-data-red/30 bg-data-red/5'
                    : 'border-surface-800 bg-surface-900/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusBadge status={info.critical ? 'fail' : 'warn'} size="sm">
                      missing
                    </StatusBadge>
                    <MonoValue value={key} size="xs" copyable>
                      <span className="text-slate-100">{key}</span>
                    </MonoValue>
                    {info.critical && (
                      <span className="text-[9px] uppercase tracking-wider text-data-red/80">critical</span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">{info.label}</span>
                </div>
                <div className="text-[11px] text-slate-400 mb-1.5">{info.desc}</div>
                <details>
                  <summary className="text-[10px] uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-300">
                    Suggested value
                  </summary>
                  <div className="mt-1.5">
                    <MonoValue value={info.remediation} size="xs" copyable>
                      <span className="text-[11px] text-slate-300 break-all">{info.remediation}</span>
                    </MonoValue>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </ResultCard>

      {host && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to={`/web/audit?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Site audit
          </Link>
          <Link to={`/web/headers?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → All HTTP headers
          </Link>
          <Link to={`/tls/overview?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → TLS overview
          </Link>
        </div>
      )}
    </div>
  );
}

function UrlScan() {
  const q = useQ('url');
  return (
    <ToolPage<SecurityUrl>
      title="URL Reputation"
      description="Heuristic safety score and findings for a URL."
      defaultInput={q}
      validate={v.url}
      autoRunOnMount
      inputMono={false}
      run={(u) => security.url(u)}
      toolName="URL Scan"
      toolPath="/security/url"
    >
      {(d) => <UrlScanReport d={d} />}
    </ToolPage>
  );
}

function scoreTone(s?: number): Status {
  if (s === undefined) return 'unknown';
  if (s >= 80) return 'pass';
  if (s >= 60) return 'info';
  if (s >= 40) return 'warn';
  return 'fail';
}

function scoreBarColor(s?: number): string {
  const t = scoreTone(s);
  return t === 'pass'
    ? 'bg-data-green'
    : t === 'info'
      ? 'bg-data-blue'
      : t === 'warn'
        ? 'bg-data-yellow'
        : t === 'fail'
          ? 'bg-data-red'
          : 'bg-surface-700';
}

function scoreVerdict(s?: number): string {
  if (s === undefined) return '—';
  if (s >= 90) return 'Clean';
  if (s >= 70) return 'Safe';
  if (s >= 50) return 'Suspicious';
  if (s >= 25) return 'High risk';
  return 'Malicious';
}

function severityTone(sev?: string): Status {
  const s = (sev ?? '').toLowerCase();
  if (s === 'critical' || s === 'high') return 'fail';
  if (s === 'medium') return 'warn';
  if (s === 'low') return 'info';
  if (s === 'info') return 'info';
  return 'unknown';
}

function UrlScanReport({ d }: { d: SecurityUrl }) {
  const score = d.score;
  const findings = d.findings ?? [];
  const host = (() => {
    try { return new URL(d.url).host; } catch { return d.url; }
  })();
  const sevCount = (lvl: string) =>
    findings.filter((f) => (f.severity ?? '').toLowerCase() === lvl).length;
  const high = sevCount('critical') + sevCount('high');
  const med = sevCount('medium');
  const low = sevCount('low');

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-5 min-w-0">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(30 41 59)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className={
                    scoreTone(score) === 'pass'
                      ? 'stroke-data-green'
                      : scoreTone(score) === 'info'
                        ? 'stroke-data-blue'
                        : scoreTone(score) === 'warn'
                          ? 'stroke-data-yellow'
                          : 'stroke-data-red'
                  }
                  strokeWidth="3"
                  strokeDasharray={`${score ?? 0} ${100 - (score ?? 0)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-2xl text-slate-100">{score ?? '—'}</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">URL reputation</div>
              <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-display text-xl text-brand-300 hover:text-brand-200 break-all leading-none"
                >
                  {host || d.url}
                </a>
                <StatusBadge status={scoreTone(score)} size="sm" glow={scoreTone(score) === 'pass'}>
                  {scoreVerdict(score)}
                </StatusBadge>
              </div>
              <div className="mt-2 h-1.5 w-64 rounded-full bg-surface-800 overflow-hidden">
                <div className={`h-full ${scoreBarColor(score)}`} style={{ width: `${score ?? 0}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-slate-500 mono">{score ?? '—'}/100 reputation score</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="High/Crit" value={high} accent />
            <Stat label="Medium" value={med} />
            <Stat label="Low/Info" value={low + sevCount('info')} />
          </div>
        </div>
      </ResultCard>

      <ResultCard title={`Findings · ${findings.length}`} accent={findings.length > 0}>
        {findings.length === 0 ? (
          <div className="flex items-center gap-3 py-2">
            <StatusBadge status="pass" size="md" glow>clean</StatusBadge>
            <span className="text-sm text-slate-300">No threat indicators detected for this URL.</span>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {findings.map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded border border-surface-700 bg-surface-900/40 px-2.5 py-2"
              >
                <StatusBadge status={severityTone(f.severity)} size="sm">
                  {f.severity ?? 'info'}
                </StatusBadge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-100">{f.message ?? '—'}</div>
                  {f.code && (
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5 mono">
                      {f.code}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ResultCard>

      <ResultCard title="Target">
        <Row k="URL">
          <MonoValue value={d.url} size="xs" copyable>
            <span className="break-all">{d.url}</span>
          </MonoValue>
        </Row>
        <Row k="Host">
          <MonoValue value={host} size="xs" type="domain" copyable>{host}</MonoValue>
        </Row>
        <Row k="Score">
          <StatusBadge status={scoreTone(score)} size="sm">{score ?? '—'} / 100</StatusBadge>
        </Row>
        <Row k="Verdict">
          <StatusBadge status={scoreTone(score)} size="sm">{scoreVerdict(score)}</StatusBadge>
        </Row>
      </ResultCard>

      {host && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to={`/security/headers?q=${encodeURIComponent(d.url)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Security headers
          </Link>
          <Link to={`/security/domain?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Domain reputation
          </Link>
          <Link to={`/web/audit?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Site audit
          </Link>
        </div>
      )}
    </div>
  );
}

function Hash() {
  const q = useQ();
  return (
    <ToolPage<SecurityHash>
      title="Hash Identifier"
      description="Identify the algorithm family for an unknown hash string."
      defaultInput={q || 'e10adc3949ba59abbe56e057f20f883e'}
      validate={v.hash}
      autoRunOnMount
      run={(h) => security.hash(h)}
      toolName="Hash Identifier"
      toolPath="/security/hash"
    >
      {(d) => <HashReport d={d} />}
    </ToolPage>
  );
}

interface HashAlgoInfo {
  bits: number;
  type: 'cryptographic' | 'password' | 'mac' | 'checksum';
  status: 'secure' | 'legacy' | 'broken';
  desc: string;
}

const HASH_ALGO_INFO: Record<string, HashAlgoInfo> = {
  MD2: { bits: 128, type: 'cryptographic', status: 'broken', desc: 'Obsolete 1989 RSA digest; collision-broken.' },
  MD4: { bits: 128, type: 'cryptographic', status: 'broken', desc: 'Broken in seconds; ancestor of MD5 and SHA-1.' },
  MD5: { bits: 128, type: 'cryptographic', status: 'broken', desc: 'Collision-broken since 2004; do not use for security.' },
  NTLM: { bits: 128, type: 'password', status: 'broken', desc: 'Unsalted MD4 of UTF-16LE password; trivially cracked.' },
  'NTLMv2': { bits: 128, type: 'password', status: 'broken', desc: 'HMAC-MD5 challenge response; weak.' },
  LM: { bits: 64, type: 'password', status: 'broken', desc: 'Legacy LAN Manager; broken by design.' },
  'RIPEMD-128': { bits: 128, type: 'cryptographic', status: 'legacy', desc: 'RIPE family; superseded by RIPEMD-160.' },
  'RIPEMD-160': { bits: 160, type: 'cryptographic', status: 'legacy', desc: 'Used in Bitcoin addresses; still reasonably strong.' },
  'SHA-1': { bits: 160, type: 'cryptographic', status: 'broken', desc: 'Collision attacks demonstrated (SHAttered, 2017).' },
  SHA1: { bits: 160, type: 'cryptographic', status: 'broken', desc: 'Collision attacks demonstrated (SHAttered, 2017).' },
  'SHA-224': { bits: 224, type: 'cryptographic', status: 'secure', desc: 'Truncated SHA-256; secure.' },
  'SHA-256': { bits: 256, type: 'cryptographic', status: 'secure', desc: 'SHA-2 family; current general-purpose digest.' },
  SHA256: { bits: 256, type: 'cryptographic', status: 'secure', desc: 'SHA-2 family; current general-purpose digest.' },
  'SHA-384': { bits: 384, type: 'cryptographic', status: 'secure', desc: 'SHA-2 family; truncated SHA-512.' },
  'SHA-512': { bits: 512, type: 'cryptographic', status: 'secure', desc: 'SHA-2 family; widely used and secure.' },
  SHA512: { bits: 512, type: 'cryptographic', status: 'secure', desc: 'SHA-2 family; widely used and secure.' },
  'SHA3-224': { bits: 224, type: 'cryptographic', status: 'secure', desc: 'Keccak-based SHA-3 family.' },
  'SHA3-256': { bits: 256, type: 'cryptographic', status: 'secure', desc: 'Keccak-based SHA-3 family.' },
  'SHA3-384': { bits: 384, type: 'cryptographic', status: 'secure', desc: 'Keccak-based SHA-3 family.' },
  'SHA3-512': { bits: 512, type: 'cryptographic', status: 'secure', desc: 'Keccak-based SHA-3 family.' },
  bcrypt: { bits: 184, type: 'password', status: 'secure', desc: 'Adaptive password hash with cost factor; recommended.' },
  scrypt: { bits: 256, type: 'password', status: 'secure', desc: 'Memory-hard password hash; recommended.' },
  Argon2: { bits: 256, type: 'password', status: 'secure', desc: 'PHC winner; preferred modern password hash.' },
  PBKDF2: { bits: 256, type: 'password', status: 'legacy', desc: 'Iterated KDF; acceptable with high iteration count.' },
  CRC32: { bits: 32, type: 'checksum', status: 'broken', desc: 'Non-cryptographic checksum; do not use for security.' },
  'CRC-32': { bits: 32, type: 'checksum', status: 'broken', desc: 'Non-cryptographic checksum; do not use for security.' },
  Adler32: { bits: 32, type: 'checksum', status: 'broken', desc: 'Non-cryptographic checksum.' },
  BLAKE2b: { bits: 512, type: 'cryptographic', status: 'secure', desc: 'Fast modern hash; SHA-3 finalist alternative.' },
  BLAKE2s: { bits: 256, type: 'cryptographic', status: 'secure', desc: 'Fast modern hash optimized for small platforms.' },
  BLAKE3: { bits: 256, type: 'cryptographic', status: 'secure', desc: 'Successor to BLAKE2; very fast and secure.' },
  Whirlpool: { bits: 512, type: 'cryptographic', status: 'legacy', desc: 'ISO standard; secure but rarely used.' },
  Tiger: { bits: 192, type: 'cryptographic', status: 'legacy', desc: 'Optimized for 64-bit platforms; uncommon.' },
  'HMAC-MD5': { bits: 128, type: 'mac', status: 'legacy', desc: 'Still secure as MAC despite MD5 collisions, but legacy.' },
  'HMAC-SHA1': { bits: 160, type: 'mac', status: 'legacy', desc: 'Still secure as MAC despite SHA-1 collisions.' },
  'HMAC-SHA256': { bits: 256, type: 'mac', status: 'secure', desc: 'Recommended HMAC construction.' },
};

function hashName(c: string | { name?: string; bits?: number }): string {
  return (typeof c === 'string' ? c : c?.name ?? '').trim();
}

function hashStatusTone(s: HashAlgoInfo['status']): Status {
  return s === 'secure' ? 'pass' : s === 'legacy' ? 'warn' : 'fail';
}

function typeChipTone(t: HashAlgoInfo['type']): Status {
  switch (t) {
    case 'cryptographic': return 'info';
    case 'password': return 'pass';
    case 'mac': return 'info';
    case 'checksum': return 'warn';
    default: return 'unknown';
  }
}

function fmtFingerprintHex(s: string): string {
  if (!s) return '';
  const clean = s.replace(/[^0-9a-fA-F]/g, '');
  return clean.match(/.{1,2}/g)?.join(':') ?? s;
}

function HashReport({ d }: { d: SecurityHash }) {
  const candidates = (d.candidates ?? []).map(hashName).filter(Boolean);
  const best = candidates
    .map((n) => HASH_ALGO_INFO[n] ?? HASH_ALGO_INFO[n.toUpperCase()])
    .filter(Boolean)
    .sort((a, b) => {
      const order = { secure: 0, legacy: 1, broken: 2 } as const;
      return order[a.status] - order[b.status];
    })[0];
  const verdictTone: Status = best ? hashStatusTone(best.status) : 'unknown';
  const charset = (d.character_set ?? '').toLowerCase();

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Identified hash</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none">
                {candidates[0] ?? '—'}
              </span>
              <StatusBadge status={verdictTone} size="sm" glow={verdictTone === 'pass'}>
                {best?.status ?? 'unknown'}
              </StatusBadge>
              {best && (
                <span className="mono text-[10px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300">
                  {best.bits}-bit
                </span>
              )}
              {best && (
                <span className="mono text-[10px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300">
                  {best.type}
                </span>
              )}
            </div>
            <div className="mt-2 mono text-[11px] text-slate-300 break-all max-w-2xl">
              {fmtFingerprintHex(d.hash)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Length" value={`${d.length} chars`} accent />
            <Stat label="Charset" value={d.character_set ?? '—'} />
            <Stat label="Candidates" value={candidates.length} />
          </div>
        </div>
      </ResultCard>

      <ResultCard title={`Candidate algorithms · ${candidates.length}`} accent>
        {candidates.length === 0 ? (
          <span className="text-xs text-slate-500">No candidates identified.</span>
        ) : (
          <ul className="space-y-1.5">
            {candidates.map((name, i) => {
              const info = HASH_ALGO_INFO[name] ?? HASH_ALGO_INFO[name.toUpperCase()];
              const tone = info ? hashStatusTone(info.status) : 'unknown';
              return (
                <li
                  key={`${name}-${i}`}
                  className={`rounded border px-2.5 py-2 ${
                    i === 0
                      ? 'border-brand-500/40 bg-brand-500/5'
                      : 'border-surface-700 bg-surface-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusBadge status={tone} size="sm">
                        {info?.status ?? 'unknown'}
                      </StatusBadge>
                      <span className="text-sm text-slate-100 font-medium">{name}</span>
                      {i === 0 && (
                        <span className="text-[9px] uppercase tracking-wider text-brand-300">most likely</span>
                      )}
                    </div>
                    {info && (
                      <div className="flex items-center gap-1">
                        <span className="mono text-[10px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300">
                          {info.bits}-bit
                        </span>
                        <span
                          className={`mono text-[10px] px-1.5 py-0.5 rounded border ${
                            typeChipTone(info.type) === 'pass'
                              ? 'border-data-green/40 bg-data-green/10 text-data-green'
                              : typeChipTone(info.type) === 'info'
                                ? 'border-data-blue/40 bg-data-blue/10 text-data-blue'
                                : typeChipTone(info.type) === 'warn'
                                  ? 'border-data-yellow/40 bg-data-yellow/10 text-data-yellow'
                                  : 'border-surface-700 bg-surface-800 text-slate-400'
                          }`}
                        >
                          {info.type}
                        </span>
                      </div>
                    )}
                  </div>
                  {info?.desc && (
                    <div className="text-[11px] text-slate-500 mt-1">{info.desc}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ResultCard>

      <ResultCard title="Input">
        <Row k="Hash">
          <MonoValue value={d.hash} size="xs" copyable>
            <span className="break-all">{d.hash}</span>
          </MonoValue>
        </Row>
        <Row k="Length">
          <span className="mono">{d.length}</span> <span className="text-slate-500 text-xs">characters</span>
        </Row>
        <Row k="Character set">
          <span className="mono text-xs px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300">
            {d.character_set ?? '—'}
          </span>
          {charset === 'hex' && (
            <span className="text-xs text-slate-500 ml-2">0-9, a-f (case-insensitive)</span>
          )}
          {charset === 'base64' && (
            <span className="text-xs text-slate-500 ml-2">A-Z, a-z, 0-9, +/=</span>
          )}
        </Row>
        <Row k="Approx bits">
          <span className="mono">{charset === 'hex' ? d.length * 4 : charset === 'base64' ? Math.round(d.length * 6) : '—'}</span>
        </Row>
      </ResultCard>

      <ResultCard title="Guidance">
        {best?.status === 'broken' && (
          <div className="flex items-start gap-3 rounded border border-data-red/30 bg-data-red/5 px-3 py-2 mb-2">
            <StatusBadge status="fail" size="sm">avoid</StatusBadge>
            <div className="text-xs text-slate-300">
              This algorithm family is cryptographically broken. Migrate to SHA-256/SHA-3 for digests, or Argon2/bcrypt for password storage.
            </div>
          </div>
        )}
        {best?.status === 'legacy' && (
          <div className="flex items-start gap-3 rounded border border-data-yellow/30 bg-data-yellow/5 px-3 py-2 mb-2">
            <StatusBadge status="warn" size="sm">legacy</StatusBadge>
            <div className="text-xs text-slate-300">
              Still acceptable in narrow contexts but new systems should prefer SHA-256/SHA-3 or BLAKE2/3.
            </div>
          </div>
        )}
        {best?.status === 'secure' && (
          <div className="flex items-start gap-3 rounded border border-data-green/30 bg-data-green/5 px-3 py-2 mb-2">
            <StatusBadge status="pass" size="sm">ok</StatusBadge>
            <div className="text-xs text-slate-300">
              Modern and recommended for general-purpose hashing.
            </div>
          </div>
        )}
        <div className="text-[11px] text-slate-500">
          Note: hash identification is based on length and character set alone — multiple algorithms can produce the same fingerprint shape. Use context (where the hash came from) to disambiguate.
        </div>
      </ResultCard>
    </div>
  );
}

function DomainSec() {
  const q = useQ('domain');
  return (
    <ToolPage<SecurityDomain>
      title="Domain Security"
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => security.domain(d)}
      toolName="Domain Security"
      toolPath="/security/domain"
    >
      {(d) => (
        <div className="space-y-4">
          <ResultCard title={`${d.domain} · Score ${d.score ?? '—'}`} accent>
            <div className="text-5xl font-display text-brand-300">{d.score ?? '—'}</div>
          </ResultCard>
          {!!d.findings?.length && (
            <ResultCard title="Findings">
              <ul className="space-y-1">
                {d.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <StatusBadge
                      status={f.severity === 'error' || f.severity === 'critical' ? 'fail' : f.severity === 'warn' ? 'warn' : 'info'}
                      size="sm"
                    >
                      {f.severity ?? '—'}
                    </StatusBadge>
                    <span className="text-slate-300">{f.message}</span>
                  </li>
                ))}
              </ul>
            </ResultCard>
          )}
        </div>
      )}
    </ToolPage>
  );
}

function PasswordTest() {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const api = useApi<SecurityPassword>();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw) return;
    api
      .execute(() => security.password(pw), {
        historyTool: 'Password Strength',
        historyToolPath: '/security/password',
        historyInput: '(redacted)',
      })
      .catch(() => {});
  };
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Password Strength</h1>
        <p className="text-sm text-slate-400">
          Password is sent over POST and is never stored in history.
        </p>
      </header>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Enter password to test"
          className="flex-1 bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-sm text-brand-200 outline-none focus:border-brand-400/70"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="px-3 py-2 text-xs text-slate-300 border border-surface-700 rounded hover:border-brand-400/60"
        >
          {show ? 'Hide' : 'Show'}
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium bg-brand-500 hover:bg-brand-400 text-white rounded"
        >
          Test
        </button>
      </form>
      {api.loading && <LoadingState lines={3} />}
      {api.error && <ErrorState error={api.error} />}
      {api.data && <PasswordReport d={api.data} pwLength={pw.length} />}
    </div>
  );
}

function pwScoreTone(score?: number): Status {
  if (score === undefined) return 'unknown';
  if (score >= 8) return 'pass';
  if (score >= 6) return 'info';
  if (score >= 4) return 'warn';
  return 'fail';
}

function pwBarColor(score?: number): string {
  const t = pwScoreTone(score);
  return t === 'pass'
    ? 'bg-data-green'
    : t === 'info'
      ? 'bg-data-blue'
      : t === 'warn'
        ? 'bg-data-yellow'
        : t === 'fail'
          ? 'bg-data-red'
          : 'bg-surface-700';
}

function entropyTone(bits?: number): Status {
  if (bits === undefined) return 'unknown';
  if (bits >= 80) return 'pass';
  if (bits >= 60) return 'info';
  if (bits >= 40) return 'warn';
  return 'fail';
}

function entropyVerdict(bits?: number): string {
  if (bits === undefined) return '—';
  if (bits >= 100) return 'Cryptographic';
  if (bits >= 80) return 'Very strong';
  if (bits >= 60) return 'Strong';
  if (bits >= 40) return 'Moderate';
  if (bits >= 28) return 'Weak';
  return 'Very weak';
}

function lengthTone(len?: number): Status {
  if (len === undefined) return 'unknown';
  if (len >= 16) return 'pass';
  if (len >= 12) return 'info';
  if (len >= 8) return 'warn';
  return 'fail';
}

function humanCrackTime(bits?: number): string {
  if (bits === undefined) return '—';
  // assume 10^10 guesses/sec (offline GPU)
  const seconds = Math.pow(2, bits) / 1e10;
  if (seconds < 1) return 'instant';
  if (seconds < 60) return `${seconds.toFixed(1)} sec`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hr`;
  if (seconds < 31536000) return `${(seconds / 86400).toFixed(1)} days`;
  const years = seconds / 31536000;
  if (years < 1e3) return `${years.toFixed(1)} years`;
  if (years < 1e6) return `${(years / 1e3).toFixed(1)}k years`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)}M years`;
  if (years < 1e12) return `${(years / 1e9).toFixed(1)}B years`;
  return `${years.toExponential(1)} years`;
}

function PasswordReport({ d, pwLength }: { d: SecurityPassword; pwLength: number }) {
  const score = d.score;
  const label = d.label ?? '—';
  const len = d.length ?? pwLength;
  const unique = d.unique_chars;
  const bits = d.entropy_bits;
  const reuseRatio = len && unique !== undefined ? unique / len : undefined;
  const scoreTone = pwScoreTone(score);
  const guidance: Array<{ tone: Status; msg: string }> = [];
  if ((len ?? 0) < 12) guidance.push({ tone: 'warn', msg: 'Use at least 12–16 characters to resist offline attacks.' });
  if (reuseRatio !== undefined && reuseRatio < 0.75) guidance.push({ tone: 'warn', msg: 'Many repeated characters reduce effective entropy.' });
  if ((bits ?? 0) < 60) guidance.push({ tone: 'warn', msg: 'Aim for ≥60 bits of entropy for online accounts, ≥80 for sensitive ones.' });
  if ((bits ?? 0) >= 80 && (len ?? 0) >= 12) guidance.push({ tone: 'pass', msg: 'Strong password — resistant to offline brute-force at modern GPU speeds.' });
  if (guidance.length === 0) guidance.push({ tone: 'info', msg: 'Consider a passphrase or password manager for unique credentials per site.' });

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(30 41 59)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className={
                    scoreTone === 'pass'
                      ? 'stroke-data-green'
                      : scoreTone === 'info'
                        ? 'stroke-data-blue'
                        : scoreTone === 'warn'
                          ? 'stroke-data-yellow'
                          : 'stroke-data-red'
                  }
                  strokeWidth="3"
                  strokeDasharray={`${(score ?? 0) * 10} ${100 - (score ?? 0) * 10}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-xl text-slate-100 leading-none">{score ?? '—'}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">/10</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Password strength</div>
              <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
                <span className="font-display text-3xl text-brand-300 leading-none capitalize">
                  {label}
                </span>
                <StatusBadge status={scoreTone} size="sm" glow={scoreTone === 'pass'}>
                  {entropyVerdict(bits)}
                </StatusBadge>
              </div>
              <div className="mt-2 h-1.5 w-64 rounded-full bg-surface-800 overflow-hidden">
                <div className={`h-full ${pwBarColor(score)}`} style={{ width: `${(score ?? 0) * 10}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-slate-500 mono">
                est. offline crack time: {humanCrackTime(bits)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Length" value={len ?? '—'} accent />
            <Stat label="Unique" value={unique ?? '—'} />
            <Stat label="Entropy" value={bits !== undefined ? `${bits} bits` : '—'} />
          </div>
        </div>
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title="Composition">
          <Row k="Length">
            <StatusBadge status={lengthTone(len)} size="sm">{len ?? '—'} chars</StatusBadge>
            <span className="text-[10px] text-slate-500 ml-2">
              {lengthTone(len) === 'pass' ? 'good' : lengthTone(len) === 'info' ? 'ok' : lengthTone(len) === 'warn' ? 'short' : 'too short'}
            </span>
          </Row>
          <Row k="Unique chars">
            <span className="mono">{unique ?? '—'}</span>
            {reuseRatio !== undefined && (
              <span className="text-[10px] text-slate-500 ml-2">
                ({Math.round(reuseRatio * 100)}% of length)
              </span>
            )}
          </Row>
          {reuseRatio !== undefined && (
            <Row k="Diversity">
              <div className="w-48 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                <div
                  className={`h-full ${
                    reuseRatio >= 0.9
                      ? 'bg-data-green'
                      : reuseRatio >= 0.75
                        ? 'bg-data-blue'
                        : reuseRatio >= 0.5
                          ? 'bg-data-yellow'
                          : 'bg-data-red'
                  }`}
                  style={{ width: `${reuseRatio * 100}%` }}
                />
              </div>
            </Row>
          )}
        </ResultCard>

        <ResultCard title="Entropy">
          <Row k="Bits">
            <StatusBadge status={entropyTone(bits)} size="sm" glow={entropyTone(bits) === 'pass'}>
              {bits !== undefined ? `${bits} bits` : '—'}
            </StatusBadge>
          </Row>
          <Row k="Classification">
            <span className="text-sm text-slate-200">{entropyVerdict(bits)}</span>
          </Row>
          <Row k="Crack time">
            <span className="mono text-xs text-slate-300">{humanCrackTime(bits)}</span>
            <span className="text-[10px] text-slate-500 ml-2">at 10¹⁰ guesses/sec (offline GPU)</span>
          </Row>
          {bits !== undefined && (
            <Row k="Scale">
              <div className="w-48 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                <div
                  className={
                    entropyTone(bits) === 'pass'
                      ? 'h-full bg-data-green'
                      : entropyTone(bits) === 'info'
                        ? 'h-full bg-data-blue'
                        : entropyTone(bits) === 'warn'
                          ? 'h-full bg-data-yellow'
                          : 'h-full bg-data-red'
                  }
                  style={{ width: `${Math.min(100, (bits / 128) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] uppercase tracking-wider text-slate-500 mt-1 w-48">
                <span>0</span><span>64</span><span>128</span>
              </div>
            </Row>
          )}
        </ResultCard>
      </div>

      <ResultCard title="Guidance">
        <ul className="space-y-1.5">
          {guidance.map((g, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded border border-surface-800 bg-surface-900/40 px-2.5 py-1.5"
            >
              <StatusBadge status={g.tone} size="sm">
                {g.tone === 'pass' ? 'ok' : g.tone === 'warn' ? 'tip' : g.tone === 'fail' ? 'risk' : 'info'}
              </StatusBadge>
              <span className="text-xs text-slate-300">{g.msg}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-surface-800 text-[11px] text-slate-500">
          Entropy estimates assume each character is independent — actual passwords from human memory tend to have lower effective entropy than the bit count suggests.
        </div>
      </ResultCard>
    </div>
  );
}

export default function SecurityRoutes() {
  return (
    <Routes>
      <Route path="headers" element={<Headers />} />
      <Route path="url" element={<UrlScan />} />
      <Route path="domain" element={<DomainSec />} />
      <Route path="hash" element={<Hash />} />
      <Route path="password" element={<PasswordTest />} />
      <Route path="*" element={<Navigate to="headers" replace />} />
    </Routes>
  );
}
