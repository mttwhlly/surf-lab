'use client';

import { useQuery } from '@tanstack/react-query';
import { SurfReport } from '../types/surf-report';

export function useSurfReport() {
  const {
    data: report,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['surfReport'],
    queryFn: async (): Promise<SurfReport> => {
      const response = await fetch('/api/surf-report', {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    // React Query polls every 5 minutes to CHECK if server has new data
    refetchInterval: 5 * 60 * 1000, // 5 minutes - check server for updates
    
    // Consider data stale after 5 minutes (triggers background refetch to server)
    staleTime: 5 * 60 * 1000, // 5 minutes - but server may return same cached report
    
    // Keep in browser memory for 2 hours (matches server DB cache)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    
    // Refetch when window regains focus (check server for updates)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    
    // Don't poll in background (saves battery), but server cache is still shared
    refetchIntervalInBackground: false,
    
    // Reduce retries since server handles data reliability
    retry: 2,
  });

  return {
    report: report || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    isRefetching,
    lastUpdated: dataUpdatedAt
  };
}