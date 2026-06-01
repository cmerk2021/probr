import { Route, Routes, Navigate, Link } from 'react-router-dom';
import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { MonoValue } from '@/components/output/MonoValue';
import { StatusBadge } from '@/components/output/StatusBadge';
import { DataTable } from '@/components/output/DataTable';
import { KeyValueGrid } from '@/components/output/KeyValueGrid';
import { web } from '@/api/endpoints';
import { v } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import { formatBytes, formatNumber } from '@/utils/formatters';
import type {
  SecHeaderInfo,
  SiteAudit,
  SiteAuditMeta,
  SiteHeaders,
  SitePerformance,
  SiteRobots,
  SiteSitemap,
  SiteTechnology,
} from '@/api/types';

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

const SECURITY_HEADER_INFO: Record<string, { label: string; critical?: boolean; desc: string }> = {
  'strict-transport-security': { label: 'HSTS', critical: true, desc: 'Forces HTTPS for future visits.' },
  'content-security-policy': { label: 'CSP', critical: true, desc: 'Restricts which sources can load scripts, styles and frames.' },
  'x-content-type-options': { label: 'X-Content-Type-Options', desc: 'Blocks MIME-type sniffing (nosniff).' },
  'x-frame-options': { label: 'X-Frame-Options', desc: 'Legacy clickjacking protection; superseded by CSP frame-ancestors.' },
  'referrer-policy': { label: 'Referrer-Policy', desc: 'Controls how much referrer info leaks to other origins.' },
  'permissions-policy': { label: 'Permissions-Policy', desc: 'Restricts browser features (camera, geolocation, etc.).' },
  'cross-origin-opener-policy': { label: 'COOP', desc: 'Isolates browsing context; enables cross-origin isolation.' },
  'cross-origin-embedder-policy': { label: 'COEP', desc: 'Required for cross-origin isolation; controls cross-origin loads.' },
  'cross-origin-resource-policy': { label: 'CORP', desc: 'Restricts who can embed/load this resource.' },
};

function statusTone(s?: number): Status {
  if (!s) return 'unknown';
  if (s >= 200 && s < 300) return 'pass';
  if (s >= 300 && s < 400) return 'info';
  if (s >= 400 && s < 500) return 'warn';
  return 'fail';
}

function durationTone(ms?: number): Status {
  if (ms === undefined) return 'unknown';
  if (ms < 300) return 'pass';
  if (ms < 1000) return 'info';
  if (ms < 2500) return 'warn';
  return 'fail';
}

function gradeFromHeaders(h?: Record<string, SecHeaderInfo>): { letter: string; tone: Status; present: number; total: number } {
  if (!h) return { letter: '—', tone: 'unknown', present: 0, total: 0 };
  const keys = Object.keys(SECURITY_HEADER_INFO);
  let weight = 0;
  let max = 0;
  let present = 0;
  for (const k of keys) {
    const info = SECURITY_HEADER_INFO[k];
    const w = info.critical ? 2 : 1;
    max += w;
    if (h[k]?.present) {
      weight += w;
      present += 1;
    }
  }
  const pct = max ? (weight / max) * 100 : 0;
  const letter = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 55 ? 'C' : pct >= 35 ? 'D' : 'F';
  const tone: Status = pct >= 75 ? 'pass' : pct >= 55 ? 'info' : pct >= 35 ? 'warn' : 'fail';
  return { letter, tone, present, total: keys.length };
}

function gradeColor(letter: string): string {
  if (letter === 'A') return 'text-data-green';
  if (letter === 'B') return 'text-data-blue';
  if (letter === 'C') return 'text-data-yellow';
  if (letter === 'D') return 'text-data-yellow';
  if (letter === 'F') return 'text-data-red';
  return 'text-slate-400';
}

function Audit() {
  const q = useQ('domain');
  return (
    <ToolPage<SiteAudit>
      title="Site Audit"
      description="Multi-signal audit: metadata, technologies, security headers, performance."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => web.audit(d)}
      toolName="Site Audit"
      toolPath="/web/audit"
    >
      {(d) => <SiteAuditReport d={d} />}
    </ToolPage>
  );
}

function SiteAuditReport({ d }: { d: SiteAudit }) {
  const m = d.meta ?? {};
  const r = d.response ?? {};
  const techs: string[] = Array.isArray(d.technologies)
    ? (d.technologies as Array<string | { name?: string }>).map((t) => (typeof t === 'string' ? t : t.name ?? '')).filter(Boolean)
    : [];
  const sec = d.security_headers ?? {};
  const grade = gradeFromHeaders(sec);
  const url = d.url ?? m.url ?? '';
  const status = r.status ?? m.status;
  const host = (() => {
    try { return new URL(url).host; } catch { return url; }
  })();

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Audited URL</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="font-display text-2xl text-brand-300 hover:text-brand-200 break-all leading-none"
              >
                {host || url}
              </a>
              <StatusBadge status={statusTone(status)} size="sm" glow={statusTone(status) === 'pass'}>
                HTTP {status ?? '—'}
              </StatusBadge>
            </div>
            {m.title && (
              <div className="mt-1.5 text-sm text-slate-200 truncate" title={m.title}>{m.title}</div>
            )}
            {m.description && (
              <div className="text-xs text-slate-500 line-clamp-2 max-w-2xl">{m.description}</div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Duration" value={m.duration_ms !== undefined ? `${m.duration_ms} ms` : '—'} accent />
            <Stat label="Size" value={r.bytes !== undefined ? formatBytes(r.bytes) : '—'} />
            <Stat label="Compressed" value={r.compressed ? 'yes' : 'no'} />
          </div>
        </div>
      </ResultCard>

      <ResultCard
        title="Security headers"
        accent
        actions={
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              {grade.present}/{grade.total} present
            </span>
            <span className={`font-display text-3xl leading-none ${gradeColor(grade.letter)}`}>
              {grade.letter}
            </span>
          </div>
        }
      >
        <ul className="space-y-1.5">
          {Object.entries(SECURITY_HEADER_INFO).map(([key, info]) => {
            const h = sec[key];
            const present = !!h?.present;
            return (
              <li
                key={key}
                className={`flex items-start gap-3 rounded border px-2.5 py-1.5 ${
                  present
                    ? 'border-surface-700 bg-surface-900/50'
                    : 'border-surface-800 bg-surface-900/30'
                }`}
              >
                <StatusBadge
                  status={present ? 'pass' : info.critical ? 'fail' : 'warn'}
                  size="sm"
                >
                  {present ? 'set' : 'missing'}
                </StatusBadge>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="mono text-xs text-slate-200">{key}</span>
                    {info.critical && (
                      <span className="text-[9px] uppercase tracking-wider text-data-red/80">critical</span>
                    )}
                  </div>
                  {present && h?.value ? (
                    <div className="mono text-[11px] text-slate-400 mt-0.5 break-all">{String(h.value)}</div>
                  ) : (
                    <div className="text-[11px] text-slate-500 mt-0.5">{info.desc}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title={`Technologies · ${techs.length}`}>
          {techs.length === 0 ? (
            <span className="text-xs text-slate-500">No technologies detected.</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {techs.map((t) => (
                <span
                  key={t}
                  className="mono text-xs px-2 py-1 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </ResultCard>

        <ResultCard title="Response">
          <Row k="Status">
            <StatusBadge status={statusTone(status)} size="sm">HTTP {status ?? '—'}</StatusBadge>
          </Row>
          <Row k="Content-Type">
            <span className="mono text-xs text-slate-300">{r.content_type ?? '—'}</span>
          </Row>
          <Row k="Size">
            {r.bytes !== undefined ? formatBytes(r.bytes) : '—'}
            {r.bytes !== undefined && (
              <span className="text-slate-500 mono text-xs ml-2">({formatNumber(r.bytes)} B)</span>
            )}
          </Row>
          <Row k="Compressed">
            <StatusBadge status={r.compressed ? 'pass' : 'info'} size="sm">
              {r.compressed ? 'yes' : 'no'}
            </StatusBadge>
          </Row>
          <Row k="Duration">
            <StatusBadge status={durationTone(m.duration_ms)} size="sm">
              {m.duration_ms !== undefined ? `${m.duration_ms} ms` : '—'}
            </StatusBadge>
          </Row>
        </ResultCard>
      </div>

      <ResultCard title="Page metadata">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <Row k="Title"><span className="text-slate-100">{m.title ?? '—'}</span></Row>
            <Row k="Description">
              <span className="text-slate-300">{m.description ?? '—'}</span>
            </Row>
            <Row k="Language"><span className="mono text-xs">{m.language ?? '—'}</span></Row>
            <Row k="Charset"><span className="mono text-xs">{m.charset ?? '—'}</span></Row>
          </div>
          <div>
            <Row k="Internal links"><span className="mono">{m.links?.internal ?? 0}</span></Row>
            <Row k="External links"><span className="mono">{m.links?.external ?? 0}</span></Row>
            <Row k="OG image">
              {m.og?.image ? (
                <MonoValue value={m.og.image} size="xs" copyable>{m.og.image}</MonoValue>
              ) : '—'}
            </Row>
            <Row k="Twitter card">
              <span className="mono text-xs">{m.twitter?.card ?? '—'}</span>
            </Row>
          </div>
        </div>
        {!!m.icons?.length && (
          <div className="mt-3 pt-3 border-t border-surface-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Icons</div>
            <div className="flex flex-wrap gap-1">
              {m.icons.map((i) => (
                <MonoValue key={i} value={i} size="xs" copyable>{i}</MonoValue>
              ))}
            </div>
          </div>
        )}
      </ResultCard>

      {host && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to={`/web/headers?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → HTTP headers
          </Link>
          <Link to={`/web/performance?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Performance
          </Link>
          <Link to={`/web/technology?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Technology stack
          </Link>
          <Link to={`/web/robots?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → robots.txt
          </Link>
          <Link to={`/tls/overview?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → TLS overview
          </Link>
        </div>
      )}
    </div>
  );
}

function UrlMeta() {
  const q = useQ('url');
  return (
    <ToolPage<SiteAuditMeta>
      title="URL Metadata"
      description="Extract title, description, OpenGraph and link metadata from a URL."
      defaultInput={q}
      validate={v.url}
      autoRunOnMount
      inputMono={false}
      run={(u) => web.urlMeta(u)}
      toolName="URL Metadata"
      toolPath="/web/url-meta"
    >
      {(d) => <UrlMetaReport d={d} />}
    </ToolPage>
  );
}

function UrlMetaReport({ d }: { d: SiteAuditMeta }) {
  const url = d.url ?? '';
  const host = (() => {
    try { return new URL(url).host; } catch { return url; }
  })();
  const ogEntries = d.og ? Object.entries(d.og).filter(([, v]) => !!v) : [];
  const twEntries = d.twitter ? Object.entries(d.twitter).filter(([, v]) => !!v) : [];
  const ogImage = d.og?.image;
  const ogImageUrl = ogImage
    ? (ogImage.startsWith('http') ? ogImage : url ? new URL(ogImage, url).toString() : ogImage)
    : undefined;
  const totalLinks = (d.links?.internal ?? 0) + (d.links?.external ?? 0);

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">URL</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-display text-2xl text-brand-300 hover:text-brand-200 break-all leading-none"
                >
                  {host || url}
                </a>
              ) : (
                <span className="font-display text-2xl text-slate-400">—</span>
              )}
              <StatusBadge status={statusTone(d.status)} size="sm" glow={statusTone(d.status) === 'pass'}>
                HTTP {d.status ?? '—'}
              </StatusBadge>
              {d.language && (
                <span className="mono text-[10px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300">
                  lang={d.language}
                </span>
              )}
              {d.charset && (
                <span className="mono text-[10px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300">
                  {d.charset}
                </span>
              )}
            </div>
            {d.title && (
              <div className="mt-2 text-base text-slate-100 break-words">{d.title}</div>
            )}
            {d.description && (
              <div className="text-xs text-slate-400 mt-0.5 max-w-2xl">{d.description}</div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Duration" value={d.duration_ms !== undefined ? `${d.duration_ms} ms` : '—'} accent />
            <Stat label="Links" value={totalLinks} />
            <Stat label="Icons" value={d.icons?.length ?? 0} />
          </div>
        </div>
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title="Core metadata">
          <Row k="Title"><span className="text-slate-100 break-words">{d.title ?? '—'}</span></Row>
          <Row k="Description"><span className="text-slate-300 break-words">{d.description ?? '—'}</span></Row>
          <Row k="Language"><span className="mono text-xs">{d.language ?? '—'}</span></Row>
          <Row k="Charset"><span className="mono text-xs">{d.charset ?? '—'}</span></Row>
          <Row k="HTTP status">
            <StatusBadge status={statusTone(d.status)} size="sm">{d.status ?? '—'}</StatusBadge>
          </Row>
          <Row k="Fetch time">
            <StatusBadge status={durationTone(d.duration_ms)} size="sm">
              {d.duration_ms !== undefined ? `${d.duration_ms} ms` : '—'}
            </StatusBadge>
          </Row>
        </ResultCard>

        <ResultCard title="Links">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border border-surface-700 bg-surface-900/50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Internal</div>
              <div className="font-display text-3xl text-brand-300 leading-none mt-1">
                {d.links?.internal ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">same-origin anchors</div>
            </div>
            <div className="rounded border border-surface-700 bg-surface-900/50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">External</div>
              <div className="font-display text-3xl text-data-blue leading-none mt-1">
                {d.links?.external ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">cross-origin anchors</div>
            </div>
          </div>
        </ResultCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title={`OpenGraph · ${ogEntries.length}`}>
          {ogEntries.length === 0 ? (
            <span className="text-xs text-slate-500">No OpenGraph tags.</span>
          ) : (
            <div className="space-y-1.5">
              {ogEntries.map(([k, v]) => (
                <Row key={k} k={`og:${k}`}>
                  <MonoValue value={String(v)} size="xs" copyable>
                    <span className="break-all">{String(v)}</span>
                  </MonoValue>
                </Row>
              ))}
            </div>
          )}
          {ogImageUrl && (
            <div className="mt-3 pt-3 border-t border-surface-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Preview</div>
              <a href={ogImageUrl} target="_blank" rel="noreferrer" className="block">
                <img
                  src={ogImageUrl}
                  alt="og:image preview"
                  className="max-h-40 rounded border border-surface-700 bg-surface-900"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </a>
            </div>
          )}
        </ResultCard>

        <ResultCard title={`Twitter cards · ${twEntries.length}`}>
          {twEntries.length === 0 ? (
            <span className="text-xs text-slate-500">No Twitter card tags.</span>
          ) : (
            <div className="space-y-1.5">
              {twEntries.map(([k, v]) => (
                <Row key={k} k={`twitter:${k}`}>
                  {k === 'card' ? (
                    <span className="mono text-xs px-1.5 py-0.5 rounded border border-data-blue/40 bg-data-blue/10 text-data-blue">
                      {String(v)}
                    </span>
                  ) : (
                    <MonoValue value={String(v)} size="xs" copyable>
                      <span className="break-all">{String(v)}</span>
                    </MonoValue>
                  )}
                </Row>
              ))}
            </div>
          )}
        </ResultCard>
      </div>

      {!!d.icons?.length && (
        <ResultCard title={`Icons · ${d.icons.length}`}>
          <div className="space-y-1.5">
            {d.icons.map((i) => (
              <div key={i} className="flex items-center gap-3 rounded border border-surface-700 bg-surface-900/40 px-2.5 py-1.5">
                <img
                  src={i}
                  alt=""
                  className="w-6 h-6 object-contain rounded bg-surface-900"
                  onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                />
                <MonoValue value={i} size="xs" copyable>
                  <span className="break-all text-slate-300">{i}</span>
                </MonoValue>
              </div>
            ))}
          </div>
        </ResultCard>
      )}

      {host && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to={`/web/audit?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Full site audit
          </Link>
          <Link to={`/web/headers?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → HTTP headers
          </Link>
          <Link to={`/tls/overview?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → TLS overview
          </Link>
        </div>
      )}
    </div>
  );
}

function Headers() {
  const q = useQ('domain');
  return (
    <ToolPage<SiteHeaders>
      title="HTTP Headers"
      description="Categorized response headers with security and CDN signals highlighted."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => web.headers(d)}
      toolName="HTTP Headers"
      toolPath="/web/headers"
    >
      {(d) => <HeadersReport d={d} />}
    </ToolPage>
  );
}

const HEADER_CATEGORIES: Record<string, { label: string; order: number }> = {
  security: { label: 'Security', order: 1 },
  cors: { label: 'CORS', order: 2 },
  caching: { label: 'Caching', order: 3 },
  content: { label: 'Content', order: 4 },
  cdn: { label: 'CDN / proxy', order: 5 },
  reporting: { label: 'Reporting', order: 6 },
  other: { label: 'Other', order: 7 },
};

const SECURITY_HEADERS = new Set([
  'strict-transport-security',
  'content-security-policy',
  'content-security-policy-report-only',
  'x-content-type-options',
  'x-frame-options',
  'x-xss-protection',
  'referrer-policy',
  'permissions-policy',
  'feature-policy',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'expect-ct',
]);
const CORS_HEADERS = new Set([
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
  'access-control-max-age',
  'timing-allow-origin',
]);
const CACHING_HEADERS = new Set([
  'cache-control',
  'expires',
  'etag',
  'last-modified',
  'age',
  'vary',
  'pragma',
  'surrogate-control',
]);
const CONTENT_HEADERS = new Set([
  'content-type',
  'content-length',
  'content-encoding',
  'content-language',
  'content-disposition',
  'content-range',
  'transfer-encoding',
  'accept-ranges',
]);
const REPORTING_HEADERS = new Set([
  'nel',
  'report-to',
  'reporting-endpoints',
]);

function categorize(name: string): keyof typeof HEADER_CATEGORIES {
  const n = name.toLowerCase();
  if (SECURITY_HEADERS.has(n)) return 'security';
  if (CORS_HEADERS.has(n)) return 'cors';
  if (CACHING_HEADERS.has(n)) return 'caching';
  if (CONTENT_HEADERS.has(n)) return 'content';
  if (REPORTING_HEADERS.has(n)) return 'reporting';
  if (
    n === 'server' ||
    n === 'via' ||
    n === 'alt-svc' ||
    n === 'connection' ||
    n === 'date' ||
    n.startsWith('cf-') ||
    n.startsWith('x-vercel-') ||
    n.startsWith('x-amz-') ||
    n.startsWith('x-cache') ||
    n.startsWith('x-served-by') ||
    n.startsWith('x-fastly') ||
    n.startsWith('x-akamai') ||
    n.startsWith('fly-')
  ) return 'cdn';
  return 'other';
}

function catTone(cat: keyof typeof HEADER_CATEGORIES): Status {
  switch (cat) {
    case 'security': return 'pass';
    case 'cors': return 'info';
    case 'caching': return 'info';
    case 'content': return 'info';
    case 'cdn': return 'info';
    case 'reporting': return 'warn';
    default: return 'unknown';
  }
}

function detectCdn(headers: Record<string, string | string[]>): string | undefined {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(', ') : v]),
  );
  const server = (lower.server ?? '').toLowerCase();
  if (server.includes('cloudflare') || 'cf-ray' in lower) return 'Cloudflare';
  if ('x-vercel-id' in lower || 'x-vercel-cache' in lower) return 'Vercel';
  if (server.includes('netlify') || 'x-nf-request-id' in lower) return 'Netlify';
  if ('x-amz-cf-id' in lower || 'x-amz-cf-pop' in lower) return 'AWS CloudFront';
  if ('x-served-by' in lower && server.includes('fastly')) return 'Fastly';
  if ('x-akamai-transformed' in lower) return 'Akamai';
  if (server.includes('fly')) return 'Fly.io';
  if (server) return server.split('/')[0];
  return undefined;
}

function renderHeaderValue(name: string, raw: string): React.ReactNode {
  const trimmed = raw.trim();
  // JSON object/array (e.g. report-to, nel)
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      return (
        <pre className="mono text-[10px] text-slate-400 bg-surface-900/60 border border-surface-800 rounded p-2 overflow-x-auto leading-relaxed">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      /* fall through */
    }
  }
  // cache-control / permissions-policy / etc. with comma/semicolon directives
  if (name === 'cache-control' || name === 'permissions-policy' || name === 'strict-transport-security' || name === 'content-security-policy' || name === 'alt-svc') {
    const parts = trimmed.split(/[,;]\s*/).filter(Boolean);
    if (parts.length > 1) {
      return (
        <div className="flex flex-wrap gap-1">
          {parts.map((p, i) => (
            <span
              key={`${p}-${i}`}
              className="mono text-[10px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300"
            >
              {p}
            </span>
          ))}
        </div>
      );
    }
  }
  return <span className="mono text-xs text-slate-300 break-all">{trimmed}</span>;
}

function HeadersReport({ d }: { d: SiteHeaders }) {
  const headers = d.headers ?? {};
  const entries = Object.entries(headers);
  const cdn = detectCdn(headers);
  const counts: Record<string, number> = {};
  const grouped: Record<string, Array<[string, string | string[]]>> = {};
  for (const [k, v] of entries) {
    const cat = categorize(k);
    counts[cat] = (counts[cat] ?? 0) + 1;
    (grouped[cat] ??= []).push([k, v]);
  }
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => a[0].localeCompare(b[0]));
  }
  const host = (() => {
    try { return new URL(d.url).host; } catch { return d.url; }
  })();
  const orderedCats = (Object.keys(HEADER_CATEGORIES) as Array<keyof typeof HEADER_CATEGORIES>)
    .filter((c) => grouped[c]?.length)
    .sort((a, b) => HEADER_CATEGORIES[a].order - HEADER_CATEGORIES[b].order);

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Response headers</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="font-display text-2xl text-brand-300 hover:text-brand-200 break-all leading-none"
              >
                {host || d.url}
              </a>
              <StatusBadge status={statusTone(d.status)} size="sm" glow={statusTone(d.status) === 'pass'}>
                HTTP {d.status}
              </StatusBadge>
              {cdn && (
                <span className="mono text-[10px] px-1.5 py-0.5 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200">
                  {cdn}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-x-5 gap-y-2 text-xs">
            <Stat label="Total" value={entries.length} accent />
            <Stat label="Security" value={counts.security ?? 0} />
            <Stat label="Caching" value={counts.caching ?? 0} />
            <Stat label="CDN" value={counts.cdn ?? 0} />
          </div>
        </div>
      </ResultCard>

      {orderedCats.map((cat) => (
        <ResultCard
          key={cat}
          title={`${HEADER_CATEGORIES[cat].label} · ${grouped[cat].length}`}
          accent={cat === 'security'}
        >
          <ul className="space-y-1.5">
            {grouped[cat].map(([name, value]) => {
              const v = Array.isArray(value) ? value.join(', ') : String(value);
              return (
                <li
                  key={name}
                  className="rounded border border-surface-700 bg-surface-900/40 px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusBadge status={catTone(cat)} size="sm">
                        {HEADER_CATEGORIES[cat].label}
                      </StatusBadge>
                      <MonoValue value={name} size="xs" copyable>
                        <span className="text-slate-100">{name}</span>
                      </MonoValue>
                    </div>
                  </div>
                  <div>{renderHeaderValue(name, v)}</div>
                </li>
              );
            })}
          </ul>
        </ResultCard>
      ))}

      {host && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to={`/web/audit?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Full site audit
          </Link>
          <Link to={`/web/performance?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Performance
          </Link>
          <Link to={`/tls/overview?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → TLS overview
          </Link>
        </div>
      )}
    </div>
  );
}

function Robots() {
  const q = useQ('domain');
  return (
    <ToolPage<SiteRobots>
      title="robots.txt"
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => web.robots(d)}
      toolName="robots.txt"
      toolPath="/web/robots"
    >
      {(d) => (
        <div className="space-y-4">
          <ResultCard title={d.url} accent>
            <Row k="Exists">
              <StatusBadge status={d.exists ? 'pass' : 'fail'} size="sm">
                {d.exists ? 'Present' : 'Missing'}
              </StatusBadge>
            </Row>
            <Row k="Sitemaps">
              {(d.sitemaps ?? []).length === 0 ? (
                '—'
              ) : (
                <div className="flex flex-col gap-1">
                  {d.sitemaps!.map((s) => (
                    <MonoValue key={s} size="xs">{s}</MonoValue>
                  ))}
                </div>
              )}
            </Row>
          </ResultCard>
          <ResultCard title="Rules">
            <KeyValueGrid data={d.rules ?? []} />
          </ResultCard>
          {d.raw && (
            <ResultCard title="Raw">
              <pre className="mono text-xs whitespace-pre-wrap text-slate-300 max-h-96 overflow-auto">
                {d.raw}
              </pre>
            </ResultCard>
          )}
        </div>
      )}
    </ToolPage>
  );
}

function Sitemap() {
  const q = useQ('domain');
  return (
    <ToolPage<SiteSitemap>
      title="Sitemap"
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => web.sitemap(d)}
      toolName="Sitemap"
      toolPath="/web/sitemap"
    >
      {(d) => (
        <ResultCard title={`${d.url} · ${d.count ?? 0} URLs`} accent>
          {!d.exists ? (
            <StatusBadge status="fail">No sitemap</StatusBadge>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-auto">
              {(d.urls ?? []).map((u) => (
                <MonoValue key={u} size="xs" copyable value={u}>{u}</MonoValue>
              ))}
            </div>
          )}
        </ResultCard>
      )}
    </ToolPage>
  );
}

function Performance() {
  const q = useQ('domain');
  return (
    <ToolPage<SitePerformance>
      title="Server-side Performance"
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => web.performance(d)}
      toolName="Performance"
      toolPath="/web/performance"
    >
      {(d) => (
        <ResultCard title={d.url} accent>
          <Row k="Status"><StatusBadge status={(d.status ?? 0) < 400 ? 'pass' : 'fail'} size="sm">HTTP {d.status}</StatusBadge></Row>
          <Row k="TTFB"><span className="mono text-data-blue">{d.ttfb_estimate_ms ?? '—'} ms</span></Row>
          <Row k="Bytes">{formatBytes(d.bytes ?? 0)} {d.compressed && <span className="text-data-green text-xs">· compressed</span>}</Row>
          <Row k="Server">{d.server ?? '—'}</Row>
          <Row k="Cache-Control"><MonoValue size="xs">{d.cache_control ?? '—'}</MonoValue></Row>
          <Row k="Content-Type"><MonoValue size="xs">{d.content_type ?? '—'}</MonoValue></Row>
        </ResultCard>
      )}
    </ToolPage>
  );
}

function Technology() {
  const q = useQ('domain');
  return (
    <ToolPage<SiteTechnology>
      title="Tech Fingerprint"
      description="Detected platforms, frameworks, analytics, CDNs and infrastructure components."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => web.technology(d)}
      toolName="Tech Fingerprint"
      toolPath="/web/technology"
    >
      {(d) => <TechnologyReport d={d} />}
    </ToolPage>
  );
}

interface TechItem {
  name: string;
  category?: string;
  version?: string;
  website?: string;
}

const TECH_INFO: Record<string, { category: string; desc: string; tone: Status }> = {
  cloudflare: { category: 'CDN', desc: 'Global CDN, DDoS mitigation and DNS provider.', tone: 'pass' },
  vercel: { category: 'Hosting', desc: 'Frontend cloud platform with edge network and serverless functions.', tone: 'pass' },
  netlify: { category: 'Hosting', desc: 'Static & Jamstack hosting with edge functions.', tone: 'pass' },
  fastly: { category: 'CDN', desc: 'Programmable edge cloud and CDN.', tone: 'pass' },
  akamai: { category: 'CDN', desc: 'Enterprise CDN and edge security platform.', tone: 'pass' },
  cloudfront: { category: 'CDN', desc: 'AWS global content delivery network.', tone: 'pass' },
  nginx: { category: 'Web server', desc: 'High-performance HTTP server and reverse proxy.', tone: 'info' },
  apache: { category: 'Web server', desc: 'Modular HTTP server.', tone: 'info' },
  caddy: { category: 'Web server', desc: 'HTTP/2 server with automatic HTTPS.', tone: 'info' },
  react: { category: 'JS framework', desc: 'Component-based UI library.', tone: 'info' },
  next: { category: 'JS framework', desc: 'React framework with hybrid rendering.', tone: 'info' },
  'next.js': { category: 'JS framework', desc: 'React framework with hybrid rendering.', tone: 'info' },
  vue: { category: 'JS framework', desc: 'Progressive UI framework.', tone: 'info' },
  nuxt: { category: 'JS framework', desc: 'Vue meta-framework.', tone: 'info' },
  svelte: { category: 'JS framework', desc: 'Compiled UI framework.', tone: 'info' },
  sveltekit: { category: 'JS framework', desc: 'Svelte app framework.', tone: 'info' },
  astro: { category: 'JS framework', desc: 'Content-first framework with islands.', tone: 'info' },
  angular: { category: 'JS framework', desc: 'Full-featured TypeScript framework.', tone: 'info' },
  wordpress: { category: 'CMS', desc: 'PHP-based content management system.', tone: 'info' },
  drupal: { category: 'CMS', desc: 'PHP-based content management system.', tone: 'info' },
  shopify: { category: 'Ecommerce', desc: 'Hosted ecommerce platform.', tone: 'info' },
  'google analytics': { category: 'Analytics', desc: 'Web traffic measurement.', tone: 'warn' },
  gtag: { category: 'Analytics', desc: 'Google global site tag.', tone: 'warn' },
  'google tag manager': { category: 'Tag manager', desc: 'Centralized script injection.', tone: 'warn' },
  hotjar: { category: 'Analytics', desc: 'Heatmaps and session recordings.', tone: 'warn' },
  segment: { category: 'Analytics', desc: 'Customer-data pipeline.', tone: 'warn' },
  mixpanel: { category: 'Analytics', desc: 'Product analytics.', tone: 'warn' },
  amplitude: { category: 'Analytics', desc: 'Product analytics.', tone: 'warn' },
  intercom: { category: 'Support', desc: 'Customer messaging widget.', tone: 'info' },
  stripe: { category: 'Payments', desc: 'Payment processing.', tone: 'pass' },
  hubspot: { category: 'Marketing', desc: 'CRM and marketing automation.', tone: 'warn' },
  jquery: { category: 'JS library', desc: 'Legacy DOM utility library.', tone: 'warn' },
  bootstrap: { category: 'CSS framework', desc: 'Component-based CSS framework.', tone: 'info' },
  tailwindcss: { category: 'CSS framework', desc: 'Utility-first CSS framework.', tone: 'info' },
  tailwind: { category: 'CSS framework', desc: 'Utility-first CSS framework.', tone: 'info' },
};

function normalizeTech(t: string | { name?: string; category?: string; version?: string; website?: string }): TechItem | null {
  if (typeof t === 'string') {
    const name = t.trim();
    if (!name) return null;
    const info = TECH_INFO[name.toLowerCase()];
    return { name, category: info?.category };
  }
  if (!t?.name) return null;
  const info = TECH_INFO[t.name.toLowerCase()];
  return {
    name: t.name,
    category: t.category ?? info?.category,
    version: t.version,
    website: t.website,
  };
}

const CATEGORY_TONE: Record<string, Status> = {
  CDN: 'pass',
  Hosting: 'pass',
  'Web server': 'info',
  'JS framework': 'info',
  'JS library': 'warn',
  'CSS framework': 'info',
  CMS: 'info',
  Ecommerce: 'info',
  Analytics: 'warn',
  'Tag manager': 'warn',
  Marketing: 'warn',
  Support: 'info',
  Payments: 'pass',
};

function TechnologyReport({ d }: { d: SiteTechnology }) {
  const techs = (d.technologies ?? [])
    .map(normalizeTech)
    .filter((t): t is TechItem => t !== null);
  const host = (() => {
    try { return new URL(d.url).host; } catch { return d.url; }
  })();
  const buckets: Record<string, TechItem[]> = {};
  for (const t of techs) {
    const cat = t.category ?? 'Other';
    (buckets[cat] ??= []).push(t);
  }
  const catNames = Object.keys(buckets).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Tech fingerprint</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="font-display text-2xl text-brand-300 hover:text-brand-200 break-all leading-none"
              >
                {host || d.url}
              </a>
              <span className="font-display text-3xl text-slate-200 leading-none">{techs.length}</span>
              <span className="text-[11px] uppercase tracking-wider text-slate-500">detected</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Categories" value={catNames.length} accent />
            <Stat label="Versioned" value={techs.filter((t) => t.version).length} />
            <Stat label="Tracking" value={techs.filter((t) => {
              const info = TECH_INFO[t.name.toLowerCase()];
              return info?.tone === 'warn' && (info.category === 'Analytics' || info.category === 'Tag manager' || info.category === 'Marketing');
            }).length} />
          </div>
        </div>
      </ResultCard>

      {techs.length === 0 ? (
        <ResultCard>
          <span className="text-xs text-slate-500">No technologies detected.</span>
        </ResultCard>
      ) : (
        catNames.map((cat) => {
          const list = buckets[cat];
          const catTone = CATEGORY_TONE[cat] ?? 'unknown';
          return (
            <ResultCard key={cat} title={`${cat} · ${list.length}`}>
              <ul className="space-y-1.5">
                {list.map((t) => {
                  const info = TECH_INFO[t.name.toLowerCase()];
                  return (
                    <li
                      key={t.name}
                      className="flex items-start gap-3 rounded border border-surface-700 bg-surface-900/40 px-2.5 py-2"
                    >
                      <StatusBadge status={info?.tone ?? catTone} size="sm">
                        {cat}
                      </StatusBadge>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm text-slate-100 font-medium">{t.name}</span>
                          {t.version && (
                            <span className="mono text-[11px] text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/40 bg-brand-500/10">
                              {t.version}
                            </span>
                          )}
                        </div>
                        {info?.desc && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{info.desc}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ResultCard>
          );
        })
      )}

      {host && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to={`/web/audit?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Full site audit
          </Link>
          <Link to={`/web/headers?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → HTTP headers
          </Link>
          <Link to={`/web/performance?q=${encodeURIComponent(host)}`} className="px-2.5 py-1 rounded border border-surface-700 bg-surface-900/50 hover:bg-surface-800 text-slate-300">
            → Performance
          </Link>
        </div>
      )}
    </div>
  );
}

export default function WebRoutes() {
  return (
    <Routes>
      <Route path="audit" element={<Audit />} />
      <Route path="url-meta" element={<UrlMeta />} />
      <Route path="headers" element={<Headers />} />
      <Route path="robots" element={<Robots />} />
      <Route path="sitemap" element={<Sitemap />} />
      <Route path="performance" element={<Performance />} />
      <Route path="technology" element={<Technology />} />
      <Route path="*" element={<Navigate to="audit" replace />} />
    </Routes>
  );
}
