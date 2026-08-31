'use client';

import { useQuery } from '@tanstack/react-query';
import { SurfReport } from '../types/surf-report';

interface Options {
  initialData?: SurfReport | null;
  locationSlug: string;
}

export function useSurfReportOptimized({ initialData, locationSlug }: Options) {
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['surfReport', locationSlug],
    queryFn: async (): Promise<SurfReport> => {
      console.log(`🔄 Fetching surf report for ${locationSlug}...`);

      const response = await fetch(`/api/surf-report?location=${locationSlug}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'public, max-age=1800',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const dataSource = response.headers.get('X-Data-Source');
      const responseTime = response.headers.get('X-Response-Time');
      console.log(`✅ Got surf report from ${dataSource} in ${responseTime}`);

      return response.json();
    },

    staleTime: 30 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
    retry: 1,
    retryDelay: 2000,
    refetchOnMount: true,

    initialData: initialData ?? undefined,
    initialDataUpdatedAt: initialData?.timestamp
      ? new Date(initialData.timestamp).getTime()
      : undefined,

    networkMode: 'online',
    enabled: true,
  });

  return {
    report: report || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
