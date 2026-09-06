import { QueryClient } from '@tanstack/react-query';
import { ApiError, NetworkError } from './errors';

/**
 * Defaults tuned for a phone on Philippine mobile data, where a request is
 * slow and sometimes simply does not arrive.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Long enough that moving between tabs doesn't refetch everything, short
      // enough that stock and order counts aren't stale when it matters.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // Retrying a 401/403/422 just burns battery and data — the answer will
        // not change. A dropped connection is worth two more tries.
        if (error instanceof ApiError) return false;
        if (error instanceof NetworkError) return failureCount < 2;
        return failureCount < 1;
      },
      // RN has no window to focus; Expo wires AppState to this instead, so a
      // seller returning from their camera roll gets fresh data.
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});
