import { useState } from 'react';
import { Eye, EyeOff, KeyRound, RotateCcw, Trash2, Check } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useHistoryStore } from '@/store/historyStore';
import { clearApiCache, apiCacheSize, ALLOY_BASE_URL } from '@/api/client';
import { cn } from '@/utils/cn';

export default function SettingsPage() {
  const s = useSettingsStore();
  const historyEntries = useHistoryStore((h) => h.entries);
  const clearHistory = useHistoryStore((h) => h.clear);

  const [showKey, setShowKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState(s.apiKey);
  const [domainDraft, setDomainDraft] = useState(s.defaultDomain);
  const [ipDraft, setIpDraft] = useState(s.defaultIp);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [historyConfirm, setHistoryConfirm] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const flash = (msg: string) => {
    setSavedHint(msg);
    window.setTimeout(() => setSavedHint(null), 1500);
  };

  const saveKey = () => {
    s.setApiKey(keyDraft);
    flash('API key saved');
  };
  const saveDomain = () => {
    s.setDefaultDomain(domainDraft);
    setDomainDraft(domainDraft.trim() || 'cloudflare.com');
    flash('Default domain saved');
  };
  const saveIp = () => {
    s.setDefaultIp(ipDraft);
    setIpDraft(ipDraft.trim() || '8.8.8.8');
    flash('Default IP saved');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-slate-400">
            All settings are stored locally in your browser. Nothing is sent to a server.
          </p>
        </div>
        {savedHint && (
          <span className="inline-flex items-center gap-1.5 text-xs text-data-green">
            <Check className="w-3.5 h-3.5" /> {savedHint}
          </span>
        )}
      </header>

      {/* API access */}
      <Section
        title="API access"
        subtitle={
          <>
            Probr talks to <span className="mono text-slate-300">{ALLOY_BASE_URL}</span>. An API key is
            optional &mdash; without one you share the public rate limit pool.
          </>
        }
      >
        <Field
          label="Alloy API key"
          help="Provide a key for higher rate limits. Stored in localStorage only; sent as the x-api-key header on every request."
        >
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="sk_live_… (leave blank to disable)"
                className="w-full bg-surface-900 border border-surface-700 rounded px-9 py-2 text-sm mono outline-none focus:border-brand-400/70"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={saveKey}
              disabled={keyDraft === s.apiKey}
              className="px-3 py-2 rounded border border-brand-500/40 text-brand-200 text-xs bg-brand-500/10 hover:bg-brand-500/20 disabled:opacity-40 disabled:hover:bg-brand-500/10"
            >
              Save
            </button>
            {s.apiKey && (
              <button
                onClick={() => {
                  s.setApiKey('');
                  setKeyDraft('');
                  flash('API key cleared');
                }}
                className="px-3 py-2 rounded border border-surface-700 text-xs text-slate-300 hover:bg-surface-800"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Status:{' '}
            {s.apiKey ? (
              <span className="text-data-green">
                Active &middot; {s.apiKey.slice(0, 4)}…{s.apiKey.slice(-4)}
              </span>
            ) : (
              <span className="text-slate-400">Anonymous (shared rate limit)</span>
            )}
          </div>
        </Field>
      </Section>

      {/* Defaults */}
      <Section title="Defaults" subtitle="Seed values used as placeholders and auto-fills across tool pages.">
        <Field label="Default domain">
          <InlineEditor
            value={domainDraft}
            onChange={setDomainDraft}
            onSave={saveDomain}
            saved={domainDraft.trim() === s.defaultDomain}
            placeholder="cloudflare.com"
          />
        </Field>
        <Field label="Default IP address">
          <InlineEditor
            value={ipDraft}
            onChange={setIpDraft}
            onSave={saveIp}
            saved={ipDraft.trim() === s.defaultIp}
            placeholder="8.8.8.8"
          />
        </Field>
      </Section>

      {/* Behavior */}
      <Section title="Behavior" subtitle="Tweak how tool pages run and present results.">
        <Toggle
          label="Auto-run tools on open"
          help="When a tool page has a default value, run it immediately on page load."
          checked={s.autoRunOnMount}
          onChange={s.setAutoRunOnMount}
        />
        <Toggle
          label="Show raw JSON by default"
          help="Expand the raw JSON block beneath every tool result automatically."
          checked={s.showRawJson}
          onChange={s.toggleRawJson}
        />
        <Toggle
          label="Save runs to history"
          help="When off, queries you run are not added to the History page."
          checked={s.historyEnabled}
          onChange={s.setHistoryEnabled}
        />
      </Section>

      {/* Data */}
      <Section title="Data &amp; storage" subtitle="Manage cached responses and locally stored history.">
        <Row
          label="Response cache"
          detail={`${apiCacheSize()} cached request${apiCacheSize() === 1 ? '' : 's'} in memory`}
          action={
            <button
              onClick={() => {
                clearApiCache();
                setCacheCleared(true);
                window.setTimeout(() => setCacheCleared(false), 1500);
              }}
              className="px-3 py-1.5 rounded border border-surface-700 text-xs text-slate-200 hover:bg-surface-800"
            >
              {cacheCleared ? 'Cleared' : 'Clear cache'}
            </button>
          }
        />
        <Row
          label="Query history"
          detail={`${historyEntries.length} entr${historyEntries.length === 1 ? 'y' : 'ies'} saved locally`}
          action={
            historyConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    clearHistory();
                    setHistoryConfirm(false);
                    flash('History cleared');
                  }}
                  className="px-3 py-1.5 rounded border border-data-red/50 text-data-red text-xs hover:bg-data-red/10"
                >
                  Confirm clear
                </button>
                <button
                  onClick={() => setHistoryConfirm(false)}
                  className="px-3 py-1.5 rounded border border-surface-700 text-xs text-slate-300 hover:bg-surface-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setHistoryConfirm(true)}
                disabled={!historyEntries.length}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-data-red/40 text-data-red text-xs hover:bg-data-red/10 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear history
              </button>
            )
          }
        />
        <Row
          label="All settings"
          detail="Reset every preference on this page to its default."
          action={
            resetConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    s.resetAll();
                    setKeyDraft('');
                    setDomainDraft('cloudflare.com');
                    setIpDraft('8.8.8.8');
                    setResetConfirm(false);
                    flash('Settings reset');
                  }}
                  className="px-3 py-1.5 rounded border border-data-red/50 text-data-red text-xs hover:bg-data-red/10"
                >
                  Confirm reset
                </button>
                <button
                  onClick={() => setResetConfirm(false)}
                  className="px-3 py-1.5 rounded border border-surface-700 text-xs text-slate-300 hover:bg-surface-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setResetConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-surface-700 text-xs text-slate-300 hover:bg-surface-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset all settings
              </button>
            )
          }
        />
      </Section>
    </div>
  );
}

// ---------- Layout helpers ----------

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-surface-700 bg-surface-900/40">
      <header className="px-5 py-3 border-b border-surface-700/70">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </header>
      <div className="p-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">{label}</div>
      {children}
      {help && <div className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">{help}</div>}
    </div>
  );
}

function Toggle({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer group">
      <div>
        <div className="text-sm text-slate-200 group-hover:text-white">{label}</div>
        {help && <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{help}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked
            ? 'bg-brand-500/80 border-brand-400'
            : 'bg-surface-800 border-surface-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </label>
  );
}

function Row({
  label,
  detail,
  action,
}: {
  label: string;
  detail: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="text-sm text-slate-200">{label}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{detail}</div>
      </div>
      {action}
    </div>
  );
}

function InlineEditor({
  value,
  onChange,
  onSave,
  saved,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saved: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="flex-1 bg-surface-900 border border-surface-700 rounded px-3 py-2 text-sm mono outline-none focus:border-brand-400/70"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
        }}
      />
      <button
        onClick={onSave}
        disabled={saved}
        className="px-3 py-2 rounded border border-brand-500/40 text-brand-200 text-xs bg-brand-500/10 hover:bg-brand-500/20 disabled:opacity-40 disabled:hover:bg-brand-500/10"
      >
        Save
      </button>
    </div>
  );
}
