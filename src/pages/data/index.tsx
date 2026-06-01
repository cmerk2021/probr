import { Route, Routes, Navigate } from 'react-router-dom';
import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { MonoValue } from '@/components/output/MonoValue';
import { StatusBadge } from '@/components/output/StatusBadge';
import { DataTable } from '@/components/output/DataTable';
import { KeyValueGrid } from '@/components/output/KeyValueGrid';
import { data } from '@/api/endpoints';
import { v } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import type {
  CountryInfo,
  CurrencyInfo,
  LanguageInfo,
  PostalInfo,
  TimezoneInfo,
} from '@/api/types';

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b last:border-b-0 border-surface-800/80">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 w-32 shrink-0 pt-0.5">{k}</div>
      <div className="text-sm text-slate-200 min-w-0">{children}</div>
    </div>
  );
}

function Country() {
  const q = useQ();
  return (
    <ToolPage<CountryInfo>
      title="Country Information"
      defaultInput={q || 'US'}
      validate={(s) => (s.length >= 2 ? null : 'Enter an ISO country code')}
      autoRunOnMount
      run={(c) => data.country(c)}
      toolName="Country"
      toolPath="/data/country"
    >
      {(d) => {
        const name = typeof d.name === 'string' ? d.name : d.name?.common ?? d.cca2;
        const official = typeof d.name === 'object' ? d.name?.official : '';
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ResultCard
              title={
                <span>
                  <span className="text-3xl mr-2">{flagEmoji(d.cca2)}</span>
                  {name}
                </span>
              }
              accent
            >
              <Row k="Official">{official ?? '—'}</Row>
              <Row k="Codes">
                <MonoValue size="xs">{d.cca2}</MonoValue> <MonoValue size="xs">{d.cca3 ?? '—'}</MonoValue>
              </Row>
              <Row k="Region">{d.region ?? '—'}</Row>
              <Row k="Capital">{Array.isArray(d.capital) ? d.capital.join(', ') : d.capital ?? '—'}</Row>
              <Row k="Calling code"><span className="mono">{d.calling_code ?? '—'}</span></Row>
              <Row k="TLDs">
                <div className="flex gap-1 flex-wrap">
                  {(d.tld ?? []).map((t) => (
                    <MonoValue key={t} size="xs">{t}</MonoValue>
                  ))}
                </div>
              </Row>
            </ResultCard>
            <ResultCard title="Languages">
              <KeyValueGrid data={d.languages} />
            </ResultCard>
            <ResultCard title="Currencies">
              <KeyValueGrid data={d.currencies} />
            </ResultCard>
          </div>
        );
      }}
    </ToolPage>
  );
}

function flagEmoji(cca2?: string): string {
  if (!cca2 || cca2.length !== 2) return '';
  const A = 0x1f1e6;
  return String.fromCodePoint(...[...cca2.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65));
}

function Language() {
  const q = useQ();
  return (
    <ToolPage<LanguageInfo>
      title="Language Information"
      defaultInput={q || 'en'}
      autoRunOnMount
      run={(c) => data.language(c)}
      toolName="Language"
      toolPath="/data/language"
    >
      {(d) => (
        <ResultCard title={d.name ?? d.code} accent>
          <Row k="Code"><MonoValue size="sm">{d.code}</MonoValue></Row>
          <Row k="Name">{d.name ?? '—'}</Row>
          <Row k="Native">{d.native ?? '—'}</Row>
        </ResultCard>
      )}
    </ToolPage>
  );
}

function Timezone() {
  const q = useQ();
  return (
    <ToolPage<TimezoneInfo>
      title="Timezone"
      defaultInput={q || 'America/Los_Angeles'}
      inputMono={false}
      autoRunOnMount
      run={(tz) => data.timezone(tz)}
      toolName="Timezone"
      toolPath="/data/timezone"
    >
      {(d) => (
        <ResultCard title={d.timezone} accent>
          <Row k="Current time"><span className="mono text-brand-200">{d.current_time ?? d.now_utc ?? '—'}</span></Row>
          <Row k="UTC offset"><span className="mono">{d.iso_offset ?? '—'}</span></Row>
          <Row k="Now (UTC)"><span className="mono text-slate-400">{d.now_utc ?? '—'}</span></Row>
        </ResultCard>
      )}
    </ToolPage>
  );
}

function Currency() {
  return (
    <ToolPage<CurrencyInfo>
      title="Currency Rates"
      defaultInput="rates"
      autoRunOnMount
      run={() => data.currency()}
      toolName="Currency"
      toolPath="/data/currency"
    >
      {(d) => (
        <div className="space-y-4">
          <ResultCard title={`Base · ${d.base ?? '—'}`} accent>
            {d.note && <div className="text-xs text-slate-500 mb-2">{d.note}</div>}
            <DataTable
              rows={Object.entries(d.currencies ?? {}).map(([code, value]) => ({ code, value }))}
              columns={[
                { key: 'code', header: 'Code', render: (r) => <MonoValue size="xs">{r.code as string}</MonoValue> },
                {
                  key: 'value',
                  header: 'Value',
                  render: (r) => <span className="mono text-data-blue">{String(r.value)}</span>,
                },
              ]}
            />
          </ResultCard>
        </div>
      )}
    </ToolPage>
  );
}

function Postal() {
  const q = useQ();
  return (
    <ToolPage<PostalInfo>
      title="Postal Code Validator"
      defaultInput={q || '94103'}
      validate={v.postal}
      autoRunOnMount
      run={(p) => data.postal(p)}
      toolName="Postal Code"
      toolPath="/data/postal"
    >
      {(d) => (
        <ResultCard title={d.postal} accent>
          <Row k="Valid">
            <StatusBadge status={d.valid ? 'pass' : 'fail'} size="sm" glow>
              {d.valid ? 'Yes' : 'No'}
            </StatusBadge>
          </Row>
          <Row k="Candidate countries">
            <div className="flex flex-wrap gap-1.5">
              {(d.candidate_countries ?? []).map((c) => (
                <span key={c} className="mono text-xs rounded border border-surface-700 bg-surface-800 px-2 py-1">
                  {flagEmoji(c)} {c}
                </span>
              ))}
            </div>
          </Row>
        </ResultCard>
      )}
    </ToolPage>
  );
}

export default function DataRoutes() {
  return (
    <Routes>
      <Route path="country" element={<Country />} />
      <Route path="language" element={<Language />} />
      <Route path="timezone" element={<Timezone />} />
      <Route path="currency" element={<Currency />} />
      <Route path="postal" element={<Postal />} />
      <Route path="*" element={<Navigate to="country" replace />} />
    </Routes>
  );
}
