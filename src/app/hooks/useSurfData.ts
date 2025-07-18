'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SurfData } from '../types/surf';

export function useSurfData() {
  const queryClient = useQueryClient();

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
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    // Adaptive refetch based on surf quality
    refetchInterval: (data) => {
      if (!data) return 5 * 60 * 1000; // 5 minutes default
      
      // More frequent updates for good conditions
      if (data.score >= 70) return 2 * 60 * 1000; // 2 minutes
      if (data.score >= 50) return 3 * 60 * 1000; // 3 minutes
      return 5 * 60 * 1000; // 5 minutes for poor conditions
    },
    // Stale time based on conditions - good surf = shorter stale time
    staleTime: (data) => {
      if (!data) return 2 * 60 * 1000;
      return data.score >= 60 ? 1 * 60 * 1000 : 3 * 60 * 1000;
    }
  });

  // Smart prefetch when conditions might be changing
  const prefetchIfNeeded = () => {
    if (data?.score && data.score >= 40 && data.score <= 70) {
      // Marginal conditions - prefetch more aggressively
      queryClient.prefetchQuery({
        queryKey: ['surfData'],
        staleTime: 30 * 1000 // 30 seconds
      });
    }
  };

  return {
    data: data || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    isRefetching,
    lastUpdated: dataUpdatedAt,
    prefetchIfNeeded
  };
}