import type { ReactNode } from 'react';
import { useApi } from '@/hooks/useApi';
import type { ApiResult } from '@/api/client';
import { ToolInput } from '@/components/shared/ToolInput';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { JsonViewer } from '@/components/output/JsonViewer';
import { useSettingsStore } from '@/store/settingsStore';
import { CopyButton } from '@/components/shared/CopyButton';
import { Eye, EyeOff } from 'lucide-react';

interface Props<T> {
  title: string;
  description?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultInput?: string;
  helpText?: string;
  validate?: (v: string) => string | null;
  run: (value: string) => Promise<ApiResult<T>>;
  toolPath: string;
  toolName: string;
  children: (data: T, value: string) => ReactNode;
  autoRunOnMount?: boolean;
  inputMono?: boolean;
}

export function ToolPage<T>({
  title,
  description,
  inputLabel,
  inputPlaceholder,
  defaultInput,
  helpText,
  validate,
  run,
  toolPath,
  toolName,
  children,
  autoRunOnMount,
  inputMono = true,
}: Props<T>) {
  const api = useApi<T>();
  const { showRawJson, toggleRawJson } = useSettingsStore();
  let lastInput = defaultInput ?? '';

  const handleSubmit = (value: string) => {
    lastInput = value;
    api
      .execute(() => run(value), {
        historyTool: toolName,
        historyToolPath: toolPath,
        historyInput: value,
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-slate-400">{description}</p>}
      </header>

      <ToolInput
        label={inputLabel}
        placeholder={inputPlaceholder}
        defaultValue={defaultInput}
        helpText={helpText}
        validate={validate}
        onSubmit={handleSubmit}
        loading={api.loading}
        autoSubmitOnMount={autoRunOnMount}
        monoInput={inputMono}
      />

      {api.loading && <LoadingState lines={4} />}
      {api.error && <ErrorState error={api.error} onRetry={() => handleSubmit(lastInput)} />}

      {api.data && !api.loading && (
        <div className="space-y-5 animate-slide-up-fade">
          <div>{children(api.data, lastInput)}</div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleRawJson}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-300"
            >
              {showRawJson ? <EyeOff size={12} /> : <Eye size={12} />}
              {showRawJson ? 'Hide raw JSON' : 'Show raw JSON'}
            </button>
            {api.meta && (
              <div className="text-[11px] text-slate-500 mono flex items-center gap-3 flex-wrap">
                <span>request_id: {api.meta.request_id}</span>
                {api.meta.duration_ms !== undefined && <span>· {api.meta.duration_ms}ms</span>}
                {api.meta.rateLimit?.remaining !== undefined && (
                  <span
                    className={
                      api.meta.rateLimit.remaining === 0
                        ? 'text-data-red'
                        : api.meta.rateLimit.remaining < 5
                          ? 'text-data-yellow'
                          : 'text-slate-400'
                    }
                  >
                    · rate: {api.meta.rateLimit.remaining}
                    {api.meta.rateLimit.limit !== undefined && `/${api.meta.rateLimit.limit}`}
                  </span>
                )}
                <CopyButton
                  value={JSON.stringify(api.data, null, 2)}
                  label="Copy JSON"
                />
              </div>
            )}
          </div>
          {showRawJson && <JsonViewer data={api.data} />}
        </div>
      )}
    </div>
  );
}
