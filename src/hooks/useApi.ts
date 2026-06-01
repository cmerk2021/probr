import { useCallback, useRef, useState } from 'react';
import { AlloyApiError, type ApiResult } from '@/api/client';
import { useHistoryStore } from '@/store/historyStore';
import { useSettingsStore } from '@/store/settingsStore';

interface UseApiState<T> {
  data: T | null;
  meta: ApiResult<T>['meta'] | null;
  loading: boolean;
  error: AlloyApiError | null;
}

export interface UseApiOptions {
  /** Log this call to history when executed (with success/error). */
  historyTool?: string;
  historyToolPath?: string;
  historyInput?: string;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    meta: null,
    loading: false,
    error: null,
  });
  const reqCounter = useRef(0);
  const addHistory = useHistoryStore((s) => s.add);

  const execute = useCallback(
    async (fn: () => Promise<ApiResult<T>>, opts?: UseApiOptions) => {
      const myReq = ++reqCounter.current;
      setState({ data: null, meta: null, loading: true, error: null });
      const start = performance.now();
      try {
        const result = await fn();
        if (myReq !== reqCounter.current) return result;
        setState({ data: result.data, meta: result.meta, loading: false, error: null });
        if (opts?.historyTool && useSettingsStore.getState().historyEnabled) {
          addHistory({
            tool: opts.historyTool,
            toolPath: opts.historyToolPath ?? '/',
            input: opts.historyInput ?? '',
            status: 'success',
            durationMs: Math.round(performance.now() - start),
          });
        }
        return result;
      } catch (err) {
        if (myReq !== reqCounter.current) throw err;
        const apiErr =
          err instanceof AlloyApiError
            ? err
            : new AlloyApiError({
                code: 'unknown',
                message: err instanceof Error ? err.message : 'Unknown error',
                status: 0,
                envelope: null,
              });
        setState({ data: null, meta: null, loading: false, error: apiErr });
        if (opts?.historyTool && useSettingsStore.getState().historyEnabled) {
          addHistory({
            tool: opts.historyTool,
            toolPath: opts.historyToolPath ?? '/',
            input: opts.historyInput ?? '',
            status: 'error',
            errorMessage: apiErr.message,
            durationMs: Math.round(performance.now() - start),
          });
        }
        throw apiErr;
      }
    },
    [addHistory]
  );

  const reset = useCallback(() => {
    setState({ data: null, meta: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
