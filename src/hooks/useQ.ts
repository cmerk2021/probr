import { useSearchParams } from 'react-router-dom';
import { useSettingsStore } from '@/store/settingsStore';

export type DefaultKind = 'domain' | 'ip' | 'url';

/**
 * Returns the `?q=` URL param, falling back to a user-configured default when provided.
 * Pass `'domain'`, `'ip'`, or `'url'` to use the corresponding Settings value as the fallback.
 * Any other string is used verbatim as the fallback.
 */
export function useQ(fallback?: DefaultKind | string): string {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const defaultDomain = useSettingsStore((s) => s.defaultDomain);
  const defaultIp = useSettingsStore((s) => s.defaultIp);
  if (q) return q;
  if (!fallback) return '';
  if (fallback === 'domain') return defaultDomain;
  if (fallback === 'ip') return defaultIp;
  if (fallback === 'url') return `https://${defaultDomain}`;
  return fallback;
}
