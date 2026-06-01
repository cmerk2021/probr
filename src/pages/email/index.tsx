import { Route, Routes, Navigate } from 'react-router-dom';
import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { MonoValue } from '@/components/output/MonoValue';
import { StatusBadge, type Status } from '@/components/output/StatusBadge';
import { KeyValueGrid } from '@/components/output/KeyValueGrid';
import { email } from '@/api/endpoints';
import { v } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import { formatNumber } from '@/utils/formatters';
import type { EmailDiagnose, EmailDkim, EmailHealth, EmailMx, EmailSpf } from '@/api/types';

function gradeStatus(grade?: string): Status {
  if (!grade) return 'unknown';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'pass';
  if (g.startsWith('B') || g.startsWith('C')) return 'warn';
  return 'fail';
}

function gradeColor(grade?: string): string {
  const s = gradeStatus(grade);
  if (s === 'pass') return 'text-data-green';
  if (s === 'warn') return 'text-data-yellow';
  if (s === 'fail') return 'text-data-red';
  return 'text-slate-400';
}

function scoreBarColor(score?: number): string {
  if (score === undefined) return 'bg-surface-700';
  if (score >= 90) return 'bg-data-green';
  if (score >= 70) return 'bg-data-yellow';
  return 'bg-data-red';
}

// Humanize snake_case issue codes and assign severity.
const ISSUE_INFO: Record<string, { label: string; severity: 'fail' | 'warn' | 'info'; hint?: string }> = {
  no_mx_record: { label: 'No MX records', severity: 'fail', hint: 'Domain cannot receive mail.' },
  no_spf_record: { label: 'No SPF record', severity: 'fail', hint: 'No sender authorization policy published.' },
  no_dmarc_record: { label: 'No DMARC record', severity: 'fail', hint: 'No alignment / reporting policy. Add a _dmarc TXT.' },
  no_dkim_record: { label: 'No DKIM records', severity: 'warn', hint: 'Outgoing mail will likely be flagged.' },
  spf_soft_fail: { label: 'SPF uses ~all (soft fail)', severity: 'warn' },
  spf_neutral: { label: 'SPF uses ?all (neutral)', severity: 'warn', hint: 'Allows spoofing. Consider -all.' },
  spf_pass_all: { label: 'SPF allows all senders (+all)', severity: 'fail' },
  dmarc_policy_none: { label: 'DMARC policy is none', severity: 'warn', hint: 'Monitoring only — no enforcement.' },
  dmarc_no_rua: { label: 'DMARC has no rua= reporting address', severity: 'info' },
  multiple_spf_records: { label: 'Multiple SPF records found', severity: 'fail' },
};

function describeIssue(raw: string | { severity?: string; message?: string; code?: string }): {
  label: string;
  severity: 'fail' | 'warn' | 'info';
  hint?: string;
} {
  if (typeof raw === 'string') {
    const info = ISSUE_INFO[raw];
    if (info) return info;
    return { label: raw.replace(/_/g, ' '), severity: 'warn' };
  }
  const code = raw.code ?? '';
  const info = code ? ISSUE_INFO[code] : undefined;
  const sev = (raw.severity === 'error' || raw.severity === 'fail'
    ? 'fail'
    : raw.severity === 'warn'
      ? 'warn'
      : 'info') as 'fail' | 'warn' | 'info';
  return {
    label: raw.message ?? info?.label ?? code ?? 'Issue',
    severity: info?.severity ?? sev,
    hint: info?.hint,
  };
}

function Health() {
  const q = useQ('domain');
  return (
    <ToolPage<EmailHealth>
      title="Email Health"
      description="SPF, DKIM, DMARC, MX and TLS deliverability checks."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => email.health(d)}
      toolName="Email Health"
      toolPath="/email/health"
    >
      {(d) => <EmailHealthReport d={d} />}
    </ToolPage>
  );
}

function EmailHealthReport({ d }: { d: EmailHealth }) {
  const mx = d.mx ?? [];
  const spf = d.spf ?? [];
  const dmarc = d.dmarc ?? [];
  const dkim = d.dkim ?? [];
  const issues = d.issues ?? [];
  const grade = d.grade;
  const score = d.score;

  const checks: Array<{ key: string; label: string; status: Status; detail: string }> = [
    {
      key: 'mx',
      label: 'MX',
      status: mx.length ? 'pass' : 'fail',
      detail: mx.length ? `${mx.length} host${mx.length === 1 ? '' : 's'}` : 'missing',
    },
    {
      key: 'spf',
      label: 'SPF',
      status: spf.length ? (spfAllTone(spf[0]) === 'fail' ? 'warn' : 'pass') : 'fail',
      detail: spf.length ? spfAllToken(spf[0]) ?? 'present' : 'missing',
    },
    {
      key: 'dmarc',
      label: 'DMARC',
      status: dmarc.length ? 'pass' : 'fail',
      detail: dmarc.length ? 'present' : 'missing',
    },
    {
      key: 'dkim',
      label: 'DKIM',
      status: dkim.length ? (activeDkim(dkim).length ? 'pass' : 'warn') : 'fail',
      detail: dkim.length
        ? `${activeDkim(dkim).length}/${dkim.length} active`
        : 'no selectors',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Scorecard hero */}
      <ResultCard accent>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`font-display text-6xl leading-none ${gradeColor(grade)}`}>
              {grade ?? '—'}
            </div>
            <div className="min-w-[10rem]">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">
                Email score · {d.domain}
              </div>
              <div className="mono text-2xl text-slate-100 leading-none mt-0.5">
                {score ?? '—'}
                <span className="text-slate-500 text-sm mono">/100</span>
              </div>
              <div className="mt-2 h-1.5 w-44 rounded-full bg-surface-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${scoreBarColor(score)}`}
                  style={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-[16rem]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {checks.map((c) => (
                <div
                  key={c.key}
                  className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">
                      {c.label}
                    </span>
                    <StatusBadge status={c.status} size="sm" glow={c.status === 'pass'}>
                      {c.status === 'pass'
                        ? 'OK'
                        : c.status === 'warn'
                          ? 'WARN'
                          : c.status === 'fail'
                            ? 'FAIL'
                            : '—'}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 truncate">{c.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ResultCard>

      {/* Findings */}
      {issues.length > 0 && (
        <ResultCard title={`Findings · ${issues.length}`}>
          <ul className="space-y-1.5">
            {issues.map((iss, i) => {
              const info = describeIssue(iss);
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <StatusBadge
                    status={info.severity === 'fail' ? 'fail' : info.severity === 'warn' ? 'warn' : 'info'}
                    size="sm"
                  >
                    {info.severity.toUpperCase()}
                  </StatusBadge>
                  <div className="min-w-0">
                    <div className="text-slate-200">{info.label}</div>
                    {info.hint && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{info.hint}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </ResultCard>
      )}

      {/* MX hosts */}
      <ResultCard title={`MX hosts · ${mx.length}`}>
        {mx.length === 0 ? (
          <span className="text-xs text-slate-500">No MX records.</span>
        ) : (
          <MxList mx={mx} />
        )}
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SPF */}
        <ResultCard title="SPF">
          {spf.length === 0 ? (
            <span className="text-xs text-slate-500">No SPF record.</span>
          ) : (
            <div className="space-y-2">
              {spf.map((r, i) => (
                <SpfRecord key={i} record={r} />
              ))}
            </div>
          )}
        </ResultCard>

        {/* DMARC */}
        <ResultCard title="DMARC">
          {dmarc.length === 0 ? (
            <span className="text-xs text-slate-500">No DMARC record (_dmarc TXT).</span>
          ) : (
            <div className="space-y-2">
              {dmarc.map((r, i) => (
                <DmarcRecord key={i} record={r} />
              ))}
            </div>
          )}
        </ResultCard>
      </div>

      {/* DKIM */}
      <ResultCard title={`DKIM selectors · ${dkim.length}`}>
        {dkim.length === 0 ? (
          <span className="text-xs text-slate-500">No DKIM selectors discovered.</span>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dkim.map((k, i) => (
              <DkimCard key={(k.selector ?? '') + i} selector={k.selector} record={k.record} />
            ))}
          </div>
        )}
      </ResultCard>
    </div>
  );
}

// ---------- SPF helpers ----------

function spfAllToken(record?: string): string | undefined {
  if (!record) return undefined;
  const m = /\s([+\-~?])all\b/i.exec(record);
  if (!m) return undefined;
  const map: Record<string, string> = { '+': '+all (pass)', '-': '-all (fail)', '~': '~all (soft fail)', '?': '?all (neutral)' };
  return map[m[1]] ?? m[0].trim();
}

function spfAllTone(record?: string): Status {
  if (!record) return 'unknown';
  const m = /\s([+\-~?])all\b/i.exec(record);
  if (!m) return 'unknown';
  switch (m[1]) {
    case '-':
      return 'pass';
    case '~':
      return 'warn';
    case '?':
      return 'warn';
    case '+':
      return 'fail';
  }
  return 'unknown';
}

function SpfRecord({ record }: { record: string }) {
  const tokens = record.trim().split(/\s+/);
  return (
    <div className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        {tokens.map((t, i) => {
          const tone = spfTokenTone(t);
          return (
            <span
              key={i}
              className={`mono text-[11px] px-1.5 py-0.5 rounded border ${tokenClass(tone)}`}
              title={spfTokenTitle(t)}
            >
              {t}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function spfTokenTone(t: string): Status {
  if (/^v=spf1$/i.test(t)) return 'info';
  if (/^[+\-~?]?all$/i.test(t)) {
    const sign = t.startsWith('-') ? '-' : t.startsWith('~') ? '~' : t.startsWith('?') ? '?' : '+';
    if (sign === '-') return 'pass';
    if (sign === '+') return 'fail';
    return 'warn';
  }
  if (/^include:/i.test(t) || /^a$|^a:/i.test(t) || /^mx$|^mx:/i.test(t)) return 'info';
  if (/^ip4:|^ip6:/i.test(t)) return 'info';
  if (/^redirect=/i.test(t)) return 'info';
  return 'unknown';
}

function spfTokenTitle(t: string): string {
  if (/^v=spf1$/i.test(t)) return 'SPF version 1';
  if (/^include:/i.test(t)) return `Include policies from ${t.slice(8)}`;
  if (/^ip4:|^ip6:/i.test(t)) return 'Allowed sender IP';
  if (/^[+\-~?]?all$/i.test(t)) return 'Default policy for unmatched senders';
  return t;
}

function tokenClass(tone: Status): string {
  switch (tone) {
    case 'pass':
      return 'border-data-green/40 bg-data-green/10 text-data-green';
    case 'warn':
      return 'border-data-yellow/40 bg-data-yellow/10 text-data-yellow';
    case 'fail':
      return 'border-data-red/40 bg-data-red/10 text-data-red';
    case 'info':
      return 'border-brand-500/40 bg-brand-500/10 text-brand-200';
    default:
      return 'border-surface-700 bg-surface-800 text-slate-300';
  }
}

// ---------- DMARC helpers ----------

function parseDmarc(record: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of record.split(';')) {
    const [k, ...rest] = part.split('=');
    if (!k || rest.length === 0) continue;
    out[k.trim().toLowerCase()] = rest.join('=').trim();
  }
  return out;
}

function DmarcRecord({ record }: { record: string }) {
  const parsed = parseDmarc(record);
  const policy = parsed.p;
  const policyTone: Status =
    policy === 'reject' ? 'pass' : policy === 'quarantine' ? 'warn' : policy === 'none' ? 'warn' : 'unknown';
  const pct = parsed.pct ? Number(parsed.pct) : 100;
  return (
    <div className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {policy && (
          <StatusBadge status={policyTone} size="sm">
            p={policy}
          </StatusBadge>
        )}
        {parsed.sp && (
          <span className="mono text-[11px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300">
            sp={parsed.sp}
          </span>
        )}
        {parsed.pct && (
          <span className="mono text-[11px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300">
            pct={pct}%
          </span>
        )}
        {parsed.adkim && (
          <span className="mono text-[11px] text-slate-500">adkim={parsed.adkim}</span>
        )}
        {parsed.aspf && (
          <span className="mono text-[11px] text-slate-500">aspf={parsed.aspf}</span>
        )}
      </div>
      {(parsed.rua || parsed.ruf) && (
        <div className="text-[11px] space-y-0.5">
          {parsed.rua && (
            <div>
              <span className="text-slate-500">rua</span>{' '}
              <span className="mono text-slate-300 break-all">{parsed.rua}</span>
            </div>
          )}
          {parsed.ruf && (
            <div>
              <span className="text-slate-500">ruf</span>{' '}
              <span className="mono text-slate-300 break-all">{parsed.ruf}</span>
            </div>
          )}
        </div>
      )}
      <details>
        <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-300">
          raw
        </summary>
        <div className="mt-1 mono text-[11px] text-slate-400 break-all">{record}</div>
      </details>
    </div>
  );
}

// ---------- DKIM helpers ----------

function parseDkim(record?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!record) return out;
  for (const part of record.split(';')) {
    const [k, ...rest] = part.split('=');
    if (!k || rest.length === 0) continue;
    out[k.trim().toLowerCase()] = rest.join('=').trim();
  }
  return out;
}

function activeDkim(records: Array<{ selector?: string; record?: string }>): typeof records {
  return records.filter((k) => {
    const p = parseDkim(k.record);
    return p.p && p.p.length > 0;
  });
}

function DkimCard({ selector, record }: { selector?: string; record?: string }) {
  const parsed = parseDkim(record);
  const hasKey = !!parsed.p && parsed.p.length > 0;
  const isRotated = !hasKey && (parsed.n?.toLowerCase().includes('rotation') ?? false);
  const status: Status = hasKey ? 'pass' : isRotated ? 'info' : 'warn';
  const keyType = parsed.k ?? 'rsa';
  return (
    <div className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={status} size="sm">
            {hasKey ? 'ACTIVE' : isRotated ? 'ROTATED' : 'EMPTY'}
          </StatusBadge>
          <MonoValue value={selector ?? ''} size="sm" copyable>
            {selector ?? '—'}
          </MonoValue>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{keyType}</span>
      </div>
      {hasKey ? (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
            Public key · {parsed.p.length} chars
          </div>
          <div className="mono text-[10px] text-slate-400 break-all max-h-16 overflow-hidden hover:max-h-none transition-all">
            {parsed.p}
          </div>
        </div>
      ) : isRotated ? (
        <div className="mt-2 text-[11px] text-slate-500 italic">
          Per BCP — selector reserved for key rotation.
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-data-yellow">No public key (p=) present.</div>
      )}
    </div>
  );
}

// ---------- MX helpers ----------

function MxList({ mx }: { mx: Array<{ exchange?: string; priority?: number }> }) {
  const sorted = [...mx].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const maxPrio = Math.max(...sorted.map((m) => m.priority ?? 0), 1);
  return (
    <div className="space-y-1.5">
      {sorted.map((m, i) => {
        const prio = m.priority ?? 0;
        const isPrimary = i === 0;
        return (
          <div
            key={(m.exchange ?? '') + i}
            className="flex items-center gap-3 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2"
          >
            <div className="flex flex-col items-center w-10 shrink-0">
              <span className={`mono text-sm ${isPrimary ? 'text-brand-300' : 'text-slate-300'}`}>
                {prio}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500">prio</span>
            </div>
            <div className="flex-1 min-w-0">
              <MonoValue
                value={m.exchange ?? ''}
                type="domain"
                copyable
                size="sm"
                linkTo={`/dns/lookup?q=${encodeURIComponent(m.exchange ?? '')}`}
              >
                {m.exchange ?? '—'}
              </MonoValue>
              <div className="mt-1 h-1 rounded-full bg-surface-800 overflow-hidden">
                <div
                  className={`h-full ${isPrimary ? 'bg-brand-400' : 'bg-surface-700'}`}
                  style={{ width: `${100 - (prio / maxPrio) * 80}%` }}
                />
              </div>
            </div>
            {isPrimary && (
              <StatusBadge status="pass" size="sm" glow>
                Primary
              </StatusBadge>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Diagnose() {
  const q = useQ('domain');
  return (
    <ToolPage<EmailDiagnose>
      title="Email Full Diagnostic"
      description="Per-check verdicts (MX, SPF, DMARC, DKIM) with the underlying records."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => email.diagnose(d)}
      toolName="Email Diagnose"
      toolPath="/email/diagnose"
    >
      {(d) => <EmailDiagnoseReport d={d} />}
    </ToolPage>
  );
}

function diagLevelTone(level?: string): Status {
  switch ((level ?? '').toLowerCase()) {
    case 'pass':
    case 'ok':
      return 'pass';
    case 'warn':
    case 'warning':
      return 'warn';
    case 'fail':
    case 'error':
      return 'fail';
    case 'info':
      return 'info';
    default:
      return 'unknown';
  }
}

const DIAG_TITLES: Record<string, string> = {
  mx: 'MX records',
  spf: 'SPF policy',
  dmarc: 'DMARC policy',
  dkim: 'DKIM selectors',
  tls: 'TLS',
  mta_sts: 'MTA-STS',
  tls_rpt: 'TLS-RPT',
  dnssec: 'DNSSEC',
};

function EmailDiagnoseReport({ d }: { d: EmailDiagnose }) {
  const diagnostics = d.diagnostics ?? [];
  const summary = d.summary ?? ({} as EmailDiagnose['summary']);
  const mx = summary.mx ?? [];
  const spf = summary.spf ?? [];
  const dmarc = summary.dmarc ?? [];
  const dkim = summary.dkim ?? [];

  const counts = diagnostics.reduce(
    (acc, c) => {
      const t = diagLevelTone(c.level);
      if (t === 'pass') acc.pass++;
      else if (t === 'warn') acc.warn++;
      else if (t === 'fail') acc.fail++;
      else acc.other++;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0, other: 0 },
  );

  return (
    <div className="space-y-4">
      {/* Hero */}
      <ResultCard accent>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Email diagnostic</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none break-all">
                {d.domain}
              </span>
              <span className="text-[11px] text-slate-500 mono">
                {diagnostics.length} check{diagnostics.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <DiagPill tone="pass" count={counts.pass} label="Pass" />
            <DiagPill tone="warn" count={counts.warn} label="Warn" />
            <DiagPill tone="fail" count={counts.fail} label="Fail" />
            {counts.other > 0 && <DiagPill tone="info" count={counts.other} label="Info" />}
          </div>
        </div>
      </ResultCard>

      {/* Per-check verdicts */}
      <ResultCard title={`Checks · ${diagnostics.length}`}>
        {diagnostics.length === 0 ? (
          <span className="text-xs text-slate-500">No diagnostics returned.</span>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {diagnostics.map((c, i) => {
              const tone = diagLevelTone(c.level);
              return (
                <div
                  key={(c.id ?? '') + i}
                  className="flex items-start gap-3 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2"
                >
                  <StatusBadge status={tone} size="sm" glow={tone === 'pass'}>
                    {(c.level ?? '—').toUpperCase()}
                  </StatusBadge>
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100">
                      {DIAG_TITLES[(c.id ?? '').toLowerCase()] ?? c.id ?? 'Check'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{c.message ?? '—'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ResultCard>

      {/* Underlying records (reuse health visualizations) */}
      <ResultCard title={`MX hosts · ${mx.length}`}>
        {mx.length === 0 ? (
          <span className="text-xs text-slate-500">No MX records.</span>
        ) : (
          <MxList mx={mx} />
        )}
      </ResultCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard title="SPF">
          {spf.length === 0 ? (
            <span className="text-xs text-slate-500">No SPF record.</span>
          ) : (
            <div className="space-y-2">
              {spf.map((r, i) => (
                <SpfRecord key={i} record={r} />
              ))}
            </div>
          )}
        </ResultCard>

        <ResultCard title="DMARC">
          {dmarc.length === 0 ? (
            <span className="text-xs text-slate-500">No DMARC record (_dmarc TXT).</span>
          ) : (
            <div className="space-y-2">
              {dmarc.map((r, i) => (
                <DmarcRecord key={i} record={r} />
              ))}
            </div>
          )}
        </ResultCard>
      </div>

      <ResultCard title={`DKIM selectors · ${dkim.length}`}>
        {dkim.length === 0 ? (
          <span className="text-xs text-slate-500">No DKIM selectors discovered.</span>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dkim.map((k, i) => (
              <DkimCard key={(k.selector ?? '') + i} selector={k.selector} record={k.record} />
            ))}
          </div>
        )}
      </ResultCard>
    </div>
  );
}

function DiagPill({ tone, count, label }: { tone: Status; count: number; label: string }) {
  const dim = count === 0;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${tokenClass(tone)} ${
        dim ? 'opacity-40' : ''
      }`}
    >
      <span className="mono text-sm leading-none">{count}</span>
      <span className="text-[10px] uppercase tracking-wider leading-none">{label}</span>
    </div>
  );
}

function makeSimple(title: string, path: string, fn: (d: string) => Promise<unknown>) {
  return function Component() {
    const q = useQ('domain');
    return (
      <ToolPage<unknown>
        title={title}
        defaultInput={q}
        validate={v.domain}
        autoRunOnMount
        run={(d) => fn(d) as Promise<{ data: unknown; meta: { timestamp: string; request_id: string } }>}
        toolName={title}
        toolPath={path}
      >
        {(d) => <KeyValueGrid data={d} />}
      </ToolPage>
    );
  };
}

const MxPage = function MxPage() {
  const q = useQ('domain');
  return (
    <ToolPage<EmailMx>
      title="Email · MX"
      description="Mail exchanger records ordered by priority."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => email.mx(d)}
      toolName="Email · MX"
      toolPath="/email/mx"
    >
      {(d) => <EmailMxReport d={d} />}
    </ToolPage>
  );
};

function EmailMxReport({ d }: { d: EmailMx }) {
  const mx = d.mx ?? [];
  const sorted = [...mx].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const providers = new Set<string>();
  for (const m of mx) {
    const host = (m.exchange ?? '').toLowerCase();
    const parts = host.split('.').filter(Boolean);
    if (parts.length >= 2) providers.add(parts.slice(-2).join('.'));
  }
  const primary = sorted[0];

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">MX records</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none break-all">
                {d.domain}
              </span>
              <StatusBadge status={mx.length ? 'pass' : 'fail'} size="sm" glow={!!mx.length}>
                {mx.length ? 'Receives mail' : 'No MX'}
              </StatusBadge>
            </div>
            {primary && (
              <div className="mt-2 text-[11px] text-slate-500">
                Primary:{' '}
                <span className="mono text-slate-300">{primary.exchange ?? '—'}</span>{' '}
                <span className="text-slate-600">· prio {primary.priority ?? '—'}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Hosts" value={mx.length} accent />
            <Stat label="Providers" value={providers.size} />
            <Stat
              label="Backup"
              value={sorted.length > 1 ? `${sorted.length - 1}` : '—'}
            />
          </div>
        </div>
      </ResultCard>

      <ResultCard title={`Mail exchangers · ${mx.length}`}>
        {mx.length === 0 ? (
          <span className="text-xs text-slate-500">No MX records.</span>
        ) : (
          <MxList mx={mx} />
        )}
      </ResultCard>

      {providers.size > 0 && (
        <ResultCard title="Provider domains">
          <div className="flex flex-wrap gap-1.5">
            {[...providers].map((p) => (
              <span
                key={p}
                className="mono text-[11px] px-2 py-0.5 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200"
              >
                {p}
              </span>
            ))}
          </div>
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

const SpfPage = function SpfPage() {
  const q = useQ('domain');
  return (
    <ToolPage<EmailSpf>
      title="Email · SPF"
      description="Sender Policy Framework records and the qualifiers they apply."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => email.spf(d)}
      toolName="Email · SPF"
      toolPath="/email/spf"
    >
      {(d) => <EmailSpfReport d={d} />}
    </ToolPage>
  );
};

const SPF_ALL_INFO: Record<string, { label: string; tone: Status; desc: string }> = {
  '-': { label: '-all (fail)', tone: 'pass', desc: 'Reject unauthorized senders. Strongest policy.' },
  '~': { label: '~all (soft fail)', tone: 'warn', desc: 'Mark unauthorized senders as suspicious. Common transitional state.' },
  '?': { label: '?all (neutral)', tone: 'warn', desc: 'No statement about unauthorized senders. Allows spoofing.' },
  '+': { label: '+all (pass)', tone: 'fail', desc: 'Allow everyone. Dangerous — any sender appears authorized.' },
};

function EmailSpfReport({ d }: { d: EmailSpf }) {
  const records = d.records ?? [];
  const primary = records[0];
  const allMatch = primary ? /\s([+\-~?])all\b/i.exec(primary) : null;
  const allSign = allMatch?.[1] ?? null;
  const allInfo = allSign ? SPF_ALL_INFO[allSign] : null;

  const tokens = primary ? primary.trim().split(/\s+/) : [];
  const includes = tokens.filter((t) => /^include:/i.test(t)).map((t) => t.slice(8));
  const ip4 = tokens.filter((t) => /^ip4:/i.test(t)).map((t) => t.slice(4));
  const ip6 = tokens.filter((t) => /^ip6:/i.test(t)).map((t) => t.slice(4));
  const aMech = tokens.filter((t) => /^a$|^a:/i.test(t));
  const mxMech = tokens.filter((t) => /^mx$|^mx:/i.test(t));
  const redirect = tokens.find((t) => /^redirect=/i.test(t))?.slice(9);
  const exp = tokens.find((t) => /^exp=/i.test(t))?.slice(4);

  const multipleRecords = records.length > 1;

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">SPF policy</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none break-all">
                {d.domain}
              </span>
              <StatusBadge
                status={records.length ? 'pass' : 'fail'}
                size="sm"
                glow={!!records.length && !multipleRecords}
              >
                {records.length ? 'Published' : 'Missing'}
              </StatusBadge>
              {multipleRecords && (
                <StatusBadge status="fail" size="sm">
                  Multiple records
                </StatusBadge>
              )}
              {allInfo && (
                <StatusBadge status={allInfo.tone} size="sm">
                  {allInfo.label}
                </StatusBadge>
              )}
            </div>
            {allInfo && (
              <div className="mt-1.5 text-[11px] text-slate-500">{allInfo.desc}</div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Includes" value={includes.length} accent />
            <Stat label="IP4" value={ip4.length} />
            <Stat label="IP6" value={ip6.length} />
            <Stat label="a / mx" value={aMech.length + mxMech.length} />
            <Stat label="Mechanisms" value={Math.max(0, tokens.length - 1)} />
            <Stat label="Records" value={records.length} />
          </div>
        </div>
      </ResultCard>

      {multipleRecords && (
        <ResultCard title="RFC 7208 violation">
          <div className="text-xs text-slate-300">
            Domains MUST publish at most one SPF record. Receivers will treat this as{' '}
            <span className="text-data-red mono">permerror</span> and ignore the policy.
          </div>
        </ResultCard>
      )}

      <ResultCard title={`Records · ${records.length}`}>
        {records.length === 0 ? (
          <span className="text-xs text-slate-500">No v=spf1 record at the root.</span>
        ) : (
          <div className="space-y-2">
            {records.map((r, i) => (
              <SpfRecord key={i} record={r} />
            ))}
          </div>
        )}
      </ResultCard>

      {primary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {includes.length > 0 && (
            <ResultCard title={`Includes · ${includes.length}`}>
              <div className="flex flex-col gap-1.5">
                {includes.map((inc) => (
                  <div
                    key={inc}
                    className="flex items-center justify-between gap-2 rounded-md border border-surface-700 bg-surface-900/40 px-3 py-1.5"
                  >
                    <MonoValue
                      value={inc}
                      type="domain"
                      copyable
                      size="sm"
                      linkTo={`/email/spf?q=${encodeURIComponent(inc)}`}
                    >
                      {inc}
                    </MonoValue>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      include
                    </span>
                  </div>
                ))}
              </div>
            </ResultCard>
          )}

          {(ip4.length > 0 || ip6.length > 0) && (
            <ResultCard title={`Explicit IPs · ${ip4.length + ip6.length}`}>
              <div className="flex flex-wrap gap-1">
                {ip4.map((ip) => (
                  <MonoValue
                    key={ip}
                    value={ip}
                    type={ip.includes('/') ? 'cidr' : 'ip'}
                    size="xs"
                    linkTo={`/network/${ip.includes('/') ? 'cidr' : 'ip'}?q=${encodeURIComponent(ip)}`}
                  >
                    {ip}
                  </MonoValue>
                ))}
                {ip6.map((ip) => (
                  <MonoValue
                    key={ip}
                    value={ip}
                    type={ip.includes('/') ? 'cidr' : 'ip'}
                    size="xs"
                    linkTo={`/network/${ip.includes('/') ? 'cidr' : 'ip'}?q=${encodeURIComponent(ip)}`}
                  >
                    {ip}
                  </MonoValue>
                ))}
              </div>
            </ResultCard>
          )}

          {(aMech.length > 0 || mxMech.length > 0 || redirect || exp) && (
            <ResultCard title="Other mechanisms">
              <div className="flex flex-wrap gap-1.5">
                {aMech.map((t) => (
                  <span
                    key={t}
                    className="mono text-[11px] px-1.5 py-0.5 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200"
                    title="Authorize the A records of this name"
                  >
                    {t}
                  </span>
                ))}
                {mxMech.map((t) => (
                  <span
                    key={t}
                    className="mono text-[11px] px-1.5 py-0.5 rounded border border-brand-500/40 bg-brand-500/10 text-brand-200"
                    title="Authorize the MX exchangers of this name"
                  >
                    {t}
                  </span>
                ))}
                {redirect && (
                  <span
                    className="mono text-[11px] px-1.5 py-0.5 rounded border border-data-yellow/40 bg-data-yellow/10 text-data-yellow"
                    title="Replace evaluation with the policy of another domain"
                  >
                    redirect={redirect}
                  </span>
                )}
                {exp && (
                  <span
                    className="mono text-[11px] px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800 text-slate-300"
                    title="Explanation TXT for failures"
                  >
                    exp={exp}
                  </span>
                )}
              </div>
            </ResultCard>
          )}
        </div>
      )}
    </div>
  );
}
const DmarcPage = makeSimple('Email · DMARC', '/email/dmarc', email.dmarc);
const DkimPage = function DkimPage() {
  const q = useQ('domain');
  return (
    <ToolPage<EmailDkim>
      title="Email · DKIM"
      description="DomainKeys Identified Mail selectors discovered for the domain."
      defaultInput={q}
      validate={v.domain}
      autoRunOnMount
      run={(d) => email.dkim(d)}
      toolName="Email · DKIM"
      toolPath="/email/dkim"
    >
      {(d) => <EmailDkimReport d={d} />}
    </ToolPage>
  );
};

function approxRsaBits(p: string): number | null {
  // DKIM p= is base64 SubjectPublicKeyInfo. Approximate modulus bit-length.
  if (!p) return null;
  // base64 -> bytes
  const bytes = Math.floor((p.length * 3) / 4);
  // SPKI overhead for RSA is ~38 bytes for 2048/4096.
  const approx = (bytes - 38) * 8;
  if (approx <= 0) return null;
  // Snap to common sizes.
  const targets = [512, 768, 1024, 1536, 2048, 3072, 4096];
  let best = targets[0];
  let bestDelta = Math.abs(approx - best);
  for (const t of targets) {
    const dlt = Math.abs(approx - t);
    if (dlt < bestDelta) {
      best = t;
      bestDelta = dlt;
    }
  }
  return best;
}

function keyStrengthTone(bits: number | null, keyType: string): Status {
  if (keyType === 'ed25519') return 'pass';
  if (bits === null) return 'unknown';
  if (bits >= 2048) return 'pass';
  if (bits >= 1024) return 'warn';
  return 'fail';
}

function EmailDkimReport({ d }: { d: EmailDkim }) {
  const records = d.dkim ?? [];
  const checked = d.selectors_checked ?? records.length;
  const found = records.length;

  type Bucket = 'active' | 'rotated' | 'empty';
  const buckets: Record<Bucket, typeof records> = { active: [], rotated: [], empty: [] };
  for (const r of records) {
    const p = parseDkim(r.record);
    if (p.p && p.p.length > 0) buckets.active.push(r);
    else if (p.n?.toLowerCase().includes('rotation')) buckets.rotated.push(r);
    else buckets.empty.push(r);
  }

  const activeKeyBits = buckets.active.map((r) => {
    const parsed = parseDkim(r.record);
    return approxRsaBits(parsed.p ?? '');
  });
  const minBits = activeKeyBits.filter((b): b is number => b !== null).reduce(
    (acc, b) => Math.min(acc, b),
    Infinity,
  );

  return (
    <div className="space-y-4">
      <ResultCard accent>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">DKIM selectors</div>
            <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
              <span className="font-display text-3xl text-brand-300 leading-none break-all">
                {d.domain}
              </span>
              <StatusBadge
                status={buckets.active.length ? 'pass' : found ? 'warn' : 'fail'}
                size="sm"
                glow={buckets.active.length > 0}
              >
                {buckets.active.length
                  ? `${buckets.active.length} active`
                  : found
                    ? 'No active keys'
                    : 'No selectors'}
              </StatusBadge>
              {minBits !== Infinity && (
                <StatusBadge
                  status={minBits >= 2048 ? 'pass' : minBits >= 1024 ? 'warn' : 'fail'}
                  size="sm"
                >
                  ≥{minBits}-bit RSA
                </StatusBadge>
              )}
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500">
              Probed {formatNumber(checked)} common selector{checked === 1 ? '' : 's'} ·{' '}
              <span className="text-slate-300 mono">{found}</span> found
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
            <Stat label="Active" value={buckets.active.length} accent />
            <Stat label="Rotated" value={buckets.rotated.length} />
            <Stat label="Empty" value={buckets.empty.length} />
            <Stat label="Probed" value={checked} />
            <Stat label="Found" value={found} />
            <Stat label="Coverage" value={`${Math.round((found / Math.max(checked, 1)) * 100)}%`} />
          </div>
        </div>
      </ResultCard>

      {buckets.active.length > 0 && (
        <ResultCard title={`Active selectors · ${buckets.active.length}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {buckets.active.map((k, i) => (
              <DkimDetailCard key={(k.selector ?? '') + i} selector={k.selector} record={k.record} />
            ))}
          </div>
        </ResultCard>
      )}

      {buckets.rotated.length > 0 && (
        <ResultCard title={`Reserved for rotation · ${buckets.rotated.length}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {buckets.rotated.map((k, i) => (
              <DkimDetailCard key={(k.selector ?? '') + i} selector={k.selector} record={k.record} />
            ))}
          </div>
        </ResultCard>
      )}

      {buckets.empty.length > 0 && (
        <ResultCard title={`Empty (no p=) · ${buckets.empty.length}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {buckets.empty.map((k, i) => (
              <DkimDetailCard key={(k.selector ?? '') + i} selector={k.selector} record={k.record} />
            ))}
          </div>
        </ResultCard>
      )}

      {records.length === 0 && (
        <ResultCard title="No DKIM selectors">
          <div className="text-xs text-slate-500">
            Probed {formatNumber(checked)} common selectors. The domain may not sign outgoing mail,
            or it uses uncommon selector names.
          </div>
        </ResultCard>
      )}
    </div>
  );
}

function DkimDetailCard({ selector, record }: { selector?: string; record?: string }) {
  const parsed = parseDkim(record);
  const hasKey = !!parsed.p && parsed.p.length > 0;
  const isRotated = !hasKey && (parsed.n?.toLowerCase().includes('rotation') ?? false);
  const status: Status = hasKey ? 'pass' : isRotated ? 'info' : 'warn';
  const keyType = (parsed.k ?? 'rsa').toLowerCase();
  const bits = hasKey && keyType === 'rsa' ? approxRsaBits(parsed.p!) : null;
  const tone = keyStrengthTone(bits, keyType);
  const flags = (parsed.t ?? '').split(':').filter(Boolean);
  const hashes = (parsed.h ?? '').split(':').filter(Boolean);
  const services = (parsed.s ?? '').split(':').filter(Boolean);

  return (
    <div className="rounded-md border border-surface-700 bg-surface-900/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={status} size="sm">
            {hasKey ? 'ACTIVE' : isRotated ? 'ROTATED' : 'EMPTY'}
          </StatusBadge>
          <MonoValue value={selector ?? ''} size="sm" copyable>
            {selector ?? '—'}
          </MonoValue>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mono text-[10px] uppercase tracking-wider text-slate-500">{keyType}</span>
          {bits !== null && (
            <StatusBadge status={tone} size="sm">
              {bits}b
            </StatusBadge>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
        {parsed.v && <KvChip k="v" v={parsed.v} />}
        {hashes.map((h) => (
          <KvChip key={h} k="h" v={h} />
        ))}
        {services.map((s) => (
          <KvChip key={s} k="s" v={s} />
        ))}
        {flags.map((f) => (
          <KvChip key={f} k="t" v={f} tone={f === 'y' ? 'warn' : 'info'} />
        ))}
      </div>

      {hasKey ? (
        <details className="mt-2">
          <summary className="text-[10px] uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-300">
            Public key · {parsed.p!.length} chars
          </summary>
          <div className="mt-1 mono text-[10px] text-slate-400 break-all max-h-32 overflow-auto">
            {parsed.p}
          </div>
        </details>
      ) : isRotated ? (
        <div className="mt-2 text-[11px] text-slate-500 italic">
          Per BCP — selector reserved for key rotation (n= explains).
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-data-yellow">No public key (p=) present.</div>
      )}
    </div>
  );
}

function KvChip({ k, v, tone = 'info' }: { k: string; v: string; tone?: Status }) {
  return (
    <span
      className={`mono px-1.5 py-0.5 rounded border ${tokenClass(tone)}`}
    >
      <span className="text-slate-500">{k}=</span>
      {v}
    </span>
  );
}

export default function EmailRoutes() {
  return (
    <Routes>
      <Route path="health" element={<Health />} />
      <Route path="diagnose" element={<Diagnose />} />
      <Route path="mx" element={<MxPage />} />
      <Route path="spf" element={<SpfPage />} />
      <Route path="dmarc" element={<DmarcPage />} />
      <Route path="dkim" element={<DkimPage />} />
      <Route path="*" element={<Navigate to="health" replace />} />
    </Routes>
  );
}
