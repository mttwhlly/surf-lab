'use client';

import { useQuery } from '@tanstack/react-query';
import { SurfReport } from '../types/surf-report';

export function useSurfReport() {
  const {
    data: report,
    isLoading,
    error,
    refetch
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
    staleTime: 2 * 60 * 60 * 1000,  // 2 hours - AI reports change slowly
    gcTime: 6 * 60 * 60 * 1000,     // 6 hours - keep in memory longer
    refetchInterval: 4 * 60 * 60 * 1000, // 4 hours - matches your cache
    retry: 2, // AI generation can be expensive, fewer retries
  });

  return {
    report: report || null,
    loading: isLoading,
    error: error?.message || null,
    refetch
  };
}