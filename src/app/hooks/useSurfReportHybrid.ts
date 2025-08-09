'use client';

import { useSurfReportSSE } from './useSurfReportSSE';
import { useSurfReport } from './useSurfReport';

export function useSurfReportHybrid() {
  const sse = useSurfReportSSE();
  const reactQuery = useSurfReport();

  // Use SSE if available and connected, otherwise fall back to React Query
  const shouldUseSSE = sse.isSSESupported && 
                      sse.connectionState === 'connected' && 
                      !sse.error;

  if (shouldUseSSE) {
    return {
      report: sse.report,
      loading: sse.loading,
      error: sse.error,
      refetch: sse.refresh,
      isRefetching: false,
      lastUpdated: sse.lastUpdate,
      dataFreshness: 'fresh', // SSE data is always fresh
      method: 'sse',
      connectionState: sse.connectionState,
      debugInfo: {
        method: 'Server-Sent Events',
        connected: true,
        ...sse.debugInfo
      }
    };
  } else {
    return {
      report: reactQuery.report,
      loading: reactQuery.loading,
      error: reactQuery.error,
      refetch: reactQuery.refetch,
      isRefetching: reactQuery.isRefetching,
      lastUpdated: reactQuery.lastUpdated,
      dataFreshness: reactQuery.dataFreshness,
      method: 'react-query',
      connectionState: sse.connectionState,
      debugInfo: {
        method: 'React Query (fallback)',
        sseError: sse.error,
        sseSupported: sse.isSSESupported,
        ...reactQuery.debugInfo
      }
    };
  }
}