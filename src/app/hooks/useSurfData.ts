'use client';

import { useQuery } from '@tanstack/react-query';
import { SurfData } from '../types/surf';

export function useSurfData() {
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['surfData'],
    queryFn: async (): Promise<SurfData> => {
      const response = await fetch('/api/surfability', {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes - keep it simple for now
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
  });


  return {
    data: data || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    isRefetching,
    lastUpdated: dataUpdatedAt
  };
}