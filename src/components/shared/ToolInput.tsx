import { useEffect, useState, useId } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSettingsStore } from '@/store/settingsStore';

interface Props {
  placeholder?: string;
  defaultValue?: string;
  label?: string;
  helpText?: string;
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void;
  loading?: boolean;
  autoSubmitOnMount?: boolean;
  buttonLabel?: string;
  rightAddon?: React.ReactNode;
  className?: string;
  monoInput?: boolean;
}

export function ToolInput({
  placeholder,
  defaultValue = '',
  label,
  helpText,
  validate,
  onSubmit,
  loading,
  autoSubmitOnMount,
  buttonLabel = 'Run query',
  rightAddon,
  className,
  monoInput = true,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const id = useId();

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (autoSubmitOnMount && defaultValue && useSettingsStore.getState().autoRunOnMount) {
      submit(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (v: string) => {
    const trimmed = v.trim();
    const err = validate?.(trimmed) ?? null;
    setError(err);
    setTouched(true);
    if (!err && trimmed) onSubmit(trimmed);
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-stretch rounded-md border bg-surface-900',
          error && touched ? 'border-data-red/60' : 'border-surface-700 focus-within:border-brand-400/70',
          'transition-colors'
        )}
      >
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            if (touched) setError(validate?.(e.target.value.trim()) ?? null);
          }}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(value);
          }}
          className={cn(
            'flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-600',
            monoInput && 'mono text-brand-200'
          )}
          aria-invalid={!!error}
        />
        {rightAddon}
        <button
          type="button"
          onClick={() => submit(value)}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-3.5 m-1 rounded text-sm font-medium',
            'bg-brand-500 hover:bg-brand-400 text-white',
            'active:scale-[0.97] transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          <span>{loading ? 'Working…' : buttonLabel}</span>
        </button>
      </div>
      <div className="mt-1.5 min-h-[18px] text-[11px]">
        {error && touched ? (
          <span className="text-data-red">{error}</span>
        ) : helpText ? (
          <span className="text-slate-500">{helpText}</span>
        ) : null}
      </div>
    </div>
  );
}
