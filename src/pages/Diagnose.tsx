import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { KeyValueGrid } from '@/components/output/KeyValueGrid';
import { StatusBadge, type Status } from '@/components/output/StatusBadge';
import { MonoValue } from '@/components/output/MonoValue';
import { flagship } from '@/api/endpoints';
import { v } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import type { InternetDiagnose } from '@/api/types';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

function gradeStatus(grade?: string): Status {
  if (!grade) return 'unknown';
  const g = grade.toUpperCase();
  if (g === 'A' || g === 'A+' || g === 'B') return 'pass';
  if (g === 'C') return 'warn';
  if (g === 'D' || g === 'E' || g === 'F') return 'fail';
  return 'unknown';
}

function levelStatus(level?: string): Status {
  if (level === 'pass') return 'pass';
  if (level === 'warn') return 'warn';
  if (level === 'fail') return 'fail';
  return 'info';
}

function LevelIcon({ level, size = 16 }: { level?: string; size?: number }) {
  if (level === 'pass') return <CheckCircle2 size={size} className="text-data-green shrink-0" />;
  if (level === 'warn') return <AlertTriangle size={size} className="text-data-yellow shrink-0" />;
  if (level === 'fail') return <XCircle size={size} className="text-data-red shrink-0" />;
  return <Info size={size} className="text-data-blue shrink-0" />;
}

export default function Diagnose() {
  const q = useQ('domain');
  return (
    <ToolPage<InternetDiagnose>
      title="Internet Diagnose"
      description="Flagship multi-protocol health report: DNS, DNSSEC, TLS, HTTP, headers, IPv6, email, BGP/RPKI."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => flagship.internetDiagnose(d)}
      toolName="Internet Diagnose"
      toolPath="/diagnose"
    >
      {(d) => {
        const summary = d.summary ?? {};
        const findings = d.findings ?? [];
        const sections = d.sections ?? {};
        return (
          <div className="space-y-4 print:bg-white print:text-black">
            <ResultCard
              title={`Overall · ${d.domain}`}
              accent
              actions={
                <button
                  onClick={() => window.print()}
                  className="text-xs text-brand-300 hover:text-brand-200"
                >
                  Print
                </button>
              }
            >
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="text-6xl font-display text-brand-300 leading-none">
                    {d.grade ?? d.score ?? '—'}
                  </div>
                  <StatusBadge status={gradeStatus(d.grade)} size="lg" glow>
                    {d.grade ? `Grade ${d.grade}` : 'Health'}
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-data-green mono">
                    <CheckCircle2 size={14} /> {summary.pass ?? 0} pass
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-data-yellow mono">
                    <AlertTriangle size={14} /> {summary.warn ?? 0} warn
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-data-red mono">
                    <XCircle size={14} /> {summary.fail ?? 0} fail
                  </span>
                </div>
                {d.duration_ms !== undefined && (
                  <span className="text-xs text-slate-500 mono">{d.duration_ms} ms</span>
                )}
              </div>
            </ResultCard>

            {findings.length > 0 && (
              <ResultCard title={`Findings (${findings.length})`} accent>
                <ul className="space-y-1.5">
                  {findings.map((f, i) => (
                    <li
                      key={`${f.id ?? i}-${i}`}
                      className="flex items-start gap-2 text-sm border-b border-surface-800/60 last:border-b-0 pb-1.5 last:pb-0"
                    >
                      <LevelIcon level={f.level} />
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <StatusBadge status={levelStatus(f.level)} size="sm">
                          {(f.id ?? '').toUpperCase() || (f.level ?? '—')}
                        </StatusBadge>
                        <span className="text-slate-300">{f.message ?? '—'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            {Object.entries(sections).map(([key, value]) => (
              <ResultCard key={key} title={key.toUpperCase()} accent>
                <SectionBody name={key} data={value} />
              </ResultCard>
            ))}
          </div>
        );
      }}
    </ToolPage>
  );
}

function SectionBody({ name, data }: { name: string; data: unknown }) {
  if (data === null || data === undefined) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  if (name === 'bgp' && typeof data === 'object') {
    const b = data as { asn?: number; holder?: string; prefix?: string; hosted_ip?: string };
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <Row k="ASN">
          {b.asn ? (
            <MonoValue value={`AS${b.asn}`} type="asn" linkTo={`/network/asn?q=${b.asn}`}>
              AS{b.asn}
            </MonoValue>
          ) : (
            '—'
          )}
        </Row>
        <Row k="Holder">{b.holder ?? '—'}</Row>
        {b.prefix && (
          <Row k="Prefix">
            <MonoValue value={b.prefix} type="cidr" linkTo={`/network/cidr?q=${encodeURIComponent(b.prefix)}`}>
              {b.prefix}
            </MonoValue>
          </Row>
        )}
        {b.hosted_ip && (
          <Row k="Hosted IP">
            <MonoValue value={b.hosted_ip} type="ip" linkTo={`/network/ip?q=${b.hosted_ip}`}>
              {b.hosted_ip}
            </MonoValue>
          </Row>
        )}
      </div>
    );
  }

  if (name === 'dnssec' && typeof data === 'object') {
    const s = data as { signed?: boolean; ad?: boolean };
    return (
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={s.signed ? 'pass' : 'fail'} glow>
          {s.signed ? 'Signed' : 'Unsigned'}
        </StatusBadge>
        <StatusBadge status={s.ad ? 'pass' : 'warn'} glow={!!s.ad}>
          {s.ad ? 'AD bit' : 'No AD bit'}
        </StatusBadge>
      </div>
    );
  }

  if (name === 'http' && typeof data === 'object') {
    const h = data as {
      http_status?: number;
      https_status?: number;
      security_headers?: Record<string, { present?: boolean; value?: unknown }>;
    };
    const sh = h.security_headers ?? {};
    const statusClass = (s?: number) =>
      s && s >= 200 && s < 400 ? 'pass' : s && s >= 400 ? 'fail' : 'warn';
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={statusClass(h.https_status)} glow>
            HTTPS {h.https_status ?? '—'}
          </StatusBadge>
          <StatusBadge status={statusClass(h.http_status)} glow>
            HTTP {h.http_status ?? '—'}
          </StatusBadge>
        </div>
        {Object.keys(sh).length > 0 && (
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wider text-slate-500">Security headers</div>
            <ul className="space-y-1">
              {Object.entries(sh).map(([hdr, info]) => (
                <li key={hdr} className="flex items-start gap-2 text-xs">
                  <StatusBadge status={info?.present ? 'pass' : 'fail'} size="sm">
                    {hdr}
                  </StatusBadge>
                  {info?.value !== null && info?.value !== undefined && (
                    <span className="mono text-slate-400 break-all line-clamp-2">
                      {String(info.value)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return <KeyValueGrid data={data} skipEmpty />;
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs uppercase tracking-wider text-slate-500 w-24 shrink-0">{k}</span>
      <span className="text-slate-200 min-w-0 break-words">{children}</span>
    </div>
  );
}
