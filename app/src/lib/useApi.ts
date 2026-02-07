'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJson } from './api';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry<T>(url: string, signal: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchJson<T>(url, { signal });
    } catch (e: unknown) {
      if (signal.aborted) throw e;
      lastError = e;
      // Don't retry 4xx client errors
      if (e instanceof Error) {
        const status = parseInt(e.message.match(/(\d{3})/)?.[1] ?? '0', 10);
        if (status >= 400 && status < 500) throw e;
      }
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

export function useApi<T>(url: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const requestId = useRef<number>(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    requestId.current += 1;
    const currentRequestId = requestId.current;

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchWithRetry<T>(url, controller.signal)
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
