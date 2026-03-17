import { useState, useEffect, useCallback } from 'react';
import type { ApiResponse } from '../types';

export function useFetch<T>(
  fetchFn: () => Promise<T[]>,
  deps: unknown[] = [],
): ApiResponse<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFetch = useCallback(fetchFn, deps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    stableFetch()
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stableFetch]);

  return { data, loading, error };
}
