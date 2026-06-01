import { Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { ResultCard } from '@/components/output/ResultCard';
import { MonoValue } from '@/components/output/MonoValue';
import { StatusBadge } from '@/components/output/StatusBadge';
import { DataTable } from '@/components/output/DataTable';
import { KeyValueGrid } from '@/components/output/KeyValueGrid';
import { CopyButton } from '@/components/shared/CopyButton';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { utilities, network } from '@/api/endpoints';
import { v } from '@/utils/validators';
import { useQ } from '@/hooks/useQ';
import { useApi } from '@/hooks/useApi';
import type {
  Base64Decoded,
  Base64Encoded,
  CronParse,
  HashResult,
  JwtDecoded,
  RegexTest,
  Slugified,
  UaParse,
  UlidGen,
  UuidBulk,
  UuidGen,
} from '@/api/types';
import { apiFetchRaw } from '@/api/client';

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b last:border-b-0 border-surface-800/80">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 w-32 shrink-0 pt-0.5">{k}</div>
      <div className="text-sm text-slate-200 min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ---------- Base64 ---------- */
function EncodePage() {
  const [tab, setTab] = useState<'encode' | 'decode'>('encode');
  const [text, setText] = useState('');
  const api = useApi<Base64Encoded | Base64Decoded>();
  const run = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text) return;
    api.execute(() => (tab === 'encode' ? utilities.base64Encode(text) : utilities.base64Decode(text)), {
      historyTool: `Base64 ${tab}`,
      historyToolPath: '/utilities/encode',
      historyInput: text.slice(0, 80),
    }).catch(() => {});
  };
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Base64 Encode / Decode</h1>
      </header>
      <div className="flex gap-1 border-b border-surface-700">
        {(['encode', 'decode'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs uppercase tracking-wider border-b-2 ${
              tab === t ? 'border-brand-400 text-brand-200' : 'border-transparent text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <form onSubmit={run} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={tab === 'encode' ? 'Plain text' : 'Base64 string'}
          className="w-full bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-sm text-brand-200 outline-none focus:border-brand-400/70"
        />
        <button className="px-4 py-2 text-sm font-medium bg-brand-500 hover:bg-brand-400 text-white rounded">
          {tab === 'encode' ? 'Encode' : 'Decode'}
        </button>
      </form>
      {api.loading && <LoadingState lines={3} />}
      {api.error && <ErrorState error={api.error} />}
      {api.data && (
        <ResultCard title="Result" accent>
          <pre className="mono text-xs whitespace-pre-wrap text-brand-100 break-all max-h-80 overflow-auto">
            {(api.data as Base64Encoded).encoded ?? (api.data as Base64Decoded).decoded}
          </pre>
          <div className="mt-2">
            <CopyButton
              value={(api.data as Base64Encoded).encoded ?? (api.data as Base64Decoded).decoded ?? ''}
            />
          </div>
        </ResultCard>
      )}
    </div>
  );
}

/* ---------- Hash (all 4 algos in parallel) ---------- */
function HashPage() {
  const q = useQ();
  const [input, setInput] = useState(q || 'hello world');
  const [results, setResults] = useState<HashResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input) return;
    setLoading(true);
    setError(null);
    setResults(null);
    Promise.all(
      (['md5', 'sha1', 'sha256', 'sha512'] as const).map((algo) =>
        utilities.hash(algo, input).then((r) => r.data)
      )
    )
      .then(setResults)
      .catch((e) => setError(e?.message ?? 'Failed'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cryptographic Hash</h1>
        <p className="text-sm text-slate-400">MD5, SHA-1, SHA-256, SHA-512 of any input.</p>
      </header>
      <form onSubmit={run} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-sm text-brand-200 outline-none focus:border-brand-400/70"
        />
        <button className="px-4 py-2 text-sm font-medium bg-brand-500 hover:bg-brand-400 text-white rounded">
          Hash
        </button>
      </form>
      {loading && <LoadingState lines={4} />}
      {error && <div className="text-data-red text-sm">{error}</div>}
      {results && (
        <div className="space-y-2">
          {results.map((r) => (
            <ResultCard key={r.algorithm} title={r.algorithm.toUpperCase()}>
              <div className="flex items-center justify-between gap-2">
                <code className="mono text-xs text-brand-200 break-all">{r.hash}</code>
                <CopyButton value={r.hash} />
              </div>
            </ResultCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- IDs ---------- */
function IdsPage() {
  const [uuid, setUuid] = useState<UuidGen | null>(null);
  const [ulid, setUlid] = useState<UlidGen | null>(null);
  const [bulk, setBulk] = useState<UuidBulk | null>(null);
  const [count, setCount] = useState(10);
  const newUuid = () => utilities.uuid().then((r) => setUuid(r.data));
  const newUlid = () => utilities.ulid().then((r) => setUlid(r.data));
  const newBulk = () => utilities.uuidBulk(count).then((r) => setBulk(r.data));
  useEffect(() => {
    newUuid();
    newUlid();
  }, []);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">UUID / ULID Generators</h1>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultCard
          title="UUID v4"
          accent
          actions={
            <button onClick={newUuid} className="text-xs text-brand-300 hover:text-brand-200">
              ↻ New
            </button>
          }
        >
          <MonoValue size="md" copyable value={uuid?.uuid ?? ''}>{uuid?.uuid ?? '…'}</MonoValue>
        </ResultCard>
        <ResultCard
          title="ULID"
          accent
          actions={
            <button onClick={newUlid} className="text-xs text-brand-300 hover:text-brand-200">
              ↻ New
            </button>
          }
        >
          <MonoValue size="md" copyable value={ulid?.ulid ?? ''}>{ulid?.ulid ?? '…'}</MonoValue>
        </ResultCard>
      </div>
      <ResultCard
        title="Bulk UUIDs"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-20 bg-surface-900 border border-surface-700 rounded px-2 py-1 text-xs mono text-brand-200"
            />
            <button
              onClick={newBulk}
              className="px-3 py-1 bg-brand-500 hover:bg-brand-400 text-white text-xs rounded"
            >
              Generate
            </button>
          </div>
        }
      >
        {bulk && (
          <>
            <div className="mb-2">
              <CopyButton value={bulk.uuids.join('\n')} label="Copy all" />
            </div>
            <div className="max-h-96 overflow-auto space-y-0.5">
              {bulk.uuids.map((u) => (
                <div key={u} className="mono text-xs text-slate-300">{u}</div>
              ))}
            </div>
          </>
        )}
      </ResultCard>
    </div>
  );
}

/* ---------- JWT ---------- */
function JwtPage() {
  const q = useQ();
  const sample =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const [token, setToken] = useState(q || sample);
  const api = useApi<JwtDecoded>();
  const run = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token) return;
    api.execute(() => utilities.jwtDecode(token), {
      historyTool: 'JWT Decode',
      historyToolPath: '/utilities/jwt',
      historyInput: token.slice(0, 40) + '…',
    }).catch(() => {});
  };
  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);
  const exp =
    api.data?.payload && typeof api.data.payload.exp === 'number' ? api.data.payload.exp : null;
  const expDate = exp ? new Date(exp * 1000) : null;
  const expired = expDate ? expDate.getTime() < Date.now() : null;
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">JWT Decoder</h1>
        <p className="text-sm text-slate-400">Token is decoded locally on the API. Signature is not verified.</p>
      </header>
      <form onSubmit={run} className="space-y-2">
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={4}
          className="w-full bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-xs text-brand-200 break-all outline-none focus:border-brand-400/70"
        />
        <button className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-400 text-white rounded">Decode</button>
      </form>
      {api.loading && <LoadingState lines={3} />}
      {api.error && <ErrorState error={api.error} />}
      {api.data && (
        <>
          {expDate && (
            <div className="card px-4 py-2 flex items-center gap-3">
              <StatusBadge status={expired ? 'fail' : 'pass'} glow>
                {expired ? 'Expired' : 'Valid'}
              </StatusBadge>
              <span className="text-xs text-slate-400">
                exp: <span className="mono text-slate-200">{expDate.toISOString()}</span>
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ResultCard title="Header" accent>
              <KeyValueGrid data={api.data.header} skipEmpty />
            </ResultCard>
            <ResultCard title="Payload" accent>
              <KeyValueGrid data={api.data.payload} skipEmpty />
            </ResultCard>
            <ResultCard title="Signature">
              <code className="mono text-xs text-slate-400 break-all">{api.data.signature}</code>
            </ResultCard>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- JSON ---------- */
function JsonPage() {
  const [tab, setTab] = useState<'format' | 'validate' | 'to-yaml' | 'from-yaml' | 'to-csv' | 'from-csv'>(
    'format'
  );
  const [input, setInput] = useState('{"hello":"world","arr":[1,2,3]}');
  const api = useApi<unknown>();
  const run = (e?: React.FormEvent) => {
    e?.preventDefault();
    const fn =
      tab === 'format' ? utilities.jsonFormat :
      tab === 'validate' ? utilities.jsonValidate :
      tab === 'to-yaml' ? utilities.jsonToYaml :
      tab === 'from-yaml' ? utilities.yamlToJson :
      tab === 'to-csv' ? utilities.jsonToCsv :
      utilities.csvToJson;
    api.execute(() => fn(input), {
      historyTool: `JSON ${tab}`,
      historyToolPath: '/utilities/json',
      historyInput: input.slice(0, 60),
    }).catch(() => {});
  };
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">JSON / YAML / CSV</h1>
      </header>
      <div className="flex gap-1 border-b border-surface-700 overflow-x-auto">
        {(['format', 'validate', 'to-yaml', 'from-yaml', 'to-csv', 'from-csv'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border-b-2 whitespace-nowrap ${
              tab === t ? 'border-brand-400 text-brand-200' : 'border-transparent text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <form onSubmit={run} className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          className="w-full bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-xs text-brand-200 outline-none focus:border-brand-400/70"
        />
        <button className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-400 text-white rounded">Run</button>
      </form>
      {api.loading && <LoadingState lines={3} />}
      {api.error && <ErrorState error={api.error} />}
      {api.data != null && (
        <ResultCard title="Result" accent>
          <KeyValueGrid data={api.data} />
        </ResultCard>
      )}
    </div>
  );
}

/* ---------- Regex ---------- */
function RegexPage() {
  const [pattern, setPattern] = useState('\\b\\w+@\\w+\\.\\w+\\b');
  const [flags, setFlags] = useState('g');
  const [input, setInput] = useState('Contact: hello@probr.dev or admin@example.com');
  const api = useApi<RegexTest>();
  const run = (e?: React.FormEvent) => {
    e?.preventDefault();
    api.execute(() => utilities.regexTest(pattern, input, flags), {
      historyTool: 'Regex Test',
      historyToolPath: '/utilities/regex',
      historyInput: pattern,
    }).catch(() => {});
  };
  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Regex Tester</h1>
      </header>
      <form onSubmit={run} className="space-y-2">
        <div className="flex gap-2">
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="flex-1 bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-sm text-brand-200 outline-none focus:border-brand-400/70"
            placeholder="pattern"
          />
          <input
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="w-24 bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-sm text-brand-200 outline-none focus:border-brand-400/70"
            placeholder="flags"
          />
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          className="w-full bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-xs text-brand-200 outline-none focus:border-brand-400/70"
        />
        <button className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-400 text-white rounded">Test</button>
      </form>
      {api.loading && <LoadingState lines={3} />}
      {api.error && <ErrorState error={api.error} />}
      {api.data && (
        <ResultCard title={`${api.data.count} matches`} accent>
          <DataTable
            rows={api.data.matches}
            columns={[
              { key: 'index', header: 'Index', className: 'w-16' },
              { key: 'match', header: 'Match', render: (r) => <MonoValue size="xs">{String(r.match ?? '')}</MonoValue> },
              {
                key: 'groups',
                header: 'Groups',
                render: (r) => <KeyValueGrid data={r.groups} />,
              },
            ]}
          />
        </ResultCard>
      )}
    </div>
  );
}

/* ---------- Cron ---------- */
function CronPage() {
  const q = useQ();
  return (
    <ToolPage<CronParse>
      title="Cron Parser"
      defaultInput={q || '*/15 * * * *'}
      autoRunOnMount
      run={(s) => utilities.cron(s)}
      toolName="Cron Parser"
      toolPath="/utilities/cron"
    >
      {(d) => (
        <ResultCard title={d.expression} accent>
          <Row k="Description">{d.description ?? '—'}</Row>
          <Row k="Fields"><KeyValueGrid data={d.fields} /></Row>
          {!!d.next_runs?.length && (
            <Row k="Next runs">
              <ul className="space-y-0.5">
                {d.next_runs.map((r) => (
                  <li key={r} className="mono text-xs text-slate-300">{r}</li>
                ))}
              </ul>
            </Row>
          )}
        </ResultCard>
      )}
    </ToolPage>
  );
}

/* ---------- UA ---------- */
function UaPage() {
  const q = useQ();
  return (
    <ToolPage<UaParse>
      title="User-Agent Parser"
      defaultInput={
        q ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
      inputMono={false}
      autoRunOnMount
      run={(s) => utilities.ua(s)}
      toolName="UA Parser"
      toolPath="/utilities/ua"
    >
      {(d) => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResultCard title="Browser" accent>
            <Row k="Name">{d.browser?.name ?? '—'}</Row>
            <Row k="Version"><span className="mono">{d.browser?.version ?? '—'}</span></Row>
          </ResultCard>
          <ResultCard title="OS" accent>
            <Row k="Name">{d.os?.name ?? '—'}</Row>
            <Row k="Version"><span className="mono">{d.os?.version ?? '—'}</span></Row>
          </ResultCard>
          <ResultCard title="Engine">
            <Row k="Name">{d.engine?.name ?? '—'}</Row>
            <Row k="Version"><span className="mono">{d.engine?.version ?? '—'}</span></Row>
          </ResultCard>
          <ResultCard title="Device">
            <Row k="Vendor">{d.device?.vendor ?? '—'}</Row>
            <Row k="Model">{d.device?.model ?? '—'}</Row>
            <Row k="Type">{d.device?.type ?? '—'}</Row>
          </ResultCard>
        </div>
      )}
    </ToolPage>
  );
}

/* ---------- CIDR Summarize (POST) ---------- */
function CidrSummarize() {
  const [text, setText] = useState('10.0.0.0/24\n10.0.1.0/24\n10.0.2.0/23');
  const api = useApi<unknown>();
  const run = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cidrs = text.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    if (!cidrs.length) return;
    api.execute(() => network.cidrSummarize(cidrs), {
      historyTool: 'CIDR Summarize',
      historyToolPath: '/utilities/cidr-summarize',
      historyInput: `${cidrs.length} prefixes`,
    }).catch(() => {});
  };
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">CIDR Summarize</h1>
        <p className="text-sm text-slate-400">Collapse a list of CIDRs into the minimal set of prefixes.</p>
      </header>
      <form onSubmit={run} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-sm text-brand-200 outline-none focus:border-brand-400/70"
        />
        <button className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-400 text-white rounded">Summarize</button>
      </form>
      {api.loading && <LoadingState lines={3} />}
      {api.error && <ErrorState error={api.error} />}
      {api.data != null && (
        <ResultCard title="Result" accent>
          <KeyValueGrid data={api.data} />
        </ResultCard>
      )}
    </div>
  );
}

/* ---------- QR ---------- */
function QrPage() {
  const q = useQ();
  const [input, setInput] = useState(q || 'https://probr.dev');
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    apiFetchRaw('/api/qr/generate', { data: input })
      .then((r) => setSvg(r.body))
      .catch((e) => setError(e?.message ?? 'Failed'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">QR Code Generator</h1>
      </header>
      <form onSubmit={run} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-surface-900 border border-surface-700 rounded px-3 py-2 mono text-sm text-brand-200 outline-none focus:border-brand-400/70"
        />
        <button className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-400 text-white rounded">Generate</button>
      </form>
      {loading && <LoadingState lines={3} />}
      {error && <div className="text-data-red text-sm">{error}</div>}
      {svg && (
        <ResultCard title="QR Code" accent>
          <div className="flex flex-col items-center gap-3">
            <div
              className="bg-white p-4 rounded inline-block max-w-xs"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <CopyButton value={svg} label="Copy SVG" />
          </div>
        </ResultCard>
      )}
    </div>
  );
}

/* ---------- Slug ---------- */
function SlugPage() {
  const q = useQ();
  return (
    <ToolPage<Slugified>
      title="Slugify"
      defaultInput={q || 'Hello, World! This is Probr.'}
      inputMono={false}
      autoRunOnMount
      run={(s) => utilities.slug(s)}
      toolName="Slug"
      toolPath="/utilities/slug"
    >
      {(d) => (
        <ResultCard title="Slug" accent>
          <MonoValue size="md" copyable value={d.slug}>{d.slug}</MonoValue>
        </ResultCard>
      )}
    </ToolPage>
  );
}

/* ---------- Password Generator ---------- */
function PasswordGenPage() {
  const [length, setLength] = useState(20);
  const [pw, setPw] = useState<string | null>(null);
  const gen = () => utilities.passwordGen(length).then((r) => setPw(r.data.password));
  useEffect(() => { gen(); /* eslint-disable-next-line */ }, []);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Password Generator</h1>
      </header>
      <ResultCard
        title="Password"
        accent
        actions={
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={4}
              max={128}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-20 bg-surface-900 border border-surface-700 rounded px-2 py-1 text-xs mono text-brand-200"
            />
            <button
              onClick={gen}
              className="px-3 py-1 bg-brand-500 hover:bg-brand-400 text-white text-xs rounded"
            >
              ↻ Generate
            </button>
          </div>
        }
      >
        <MonoValue size="md" copyable value={pw ?? ''}>{pw ?? '…'}</MonoValue>
      </ResultCard>
    </div>
  );
}

export default function UtilitiesRoutes() {
  return (
    <Routes>
      <Route path="encode" element={<EncodePage />} />
      <Route path="hash" element={<HashPage />} />
      <Route path="ids" element={<IdsPage />} />
      <Route path="jwt" element={<JwtPage />} />
      <Route path="json" element={<JsonPage />} />
      <Route path="regex" element={<RegexPage />} />
      <Route path="cron" element={<CronPage />} />
      <Route path="ua" element={<UaPage />} />
      <Route path="cidr-summarize" element={<CidrSummarize />} />
      <Route path="qr" element={<QrPage />} />
      <Route path="slug" element={<SlugPage />} />
      <Route path="password" element={<PasswordGenPage />} />
      <Route path="*" element={<Navigate to="ids" replace />} />
    </Routes>
  );
}
