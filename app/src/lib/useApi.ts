'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJson } from './api';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useApi<T>(url: string): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const requestId = useRef<number>(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    requestId.current += 1;
    const currentRequestId = requestId.current;

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchJson<T>(url, { signal: controller.signal })
      .then((json) => {
        if (currentRequestId !== requestId.current) return;
        setData(json);
      })
      .catch((e: unknown) => {
        if (currentRequestId !== requestId.current) return;
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (currentRequestId !== requestId.current) return;
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [url, reloadKey]);

  return { data, loading, error, reload };
}
