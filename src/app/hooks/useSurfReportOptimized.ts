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
    isRefetching,
    dataUpdatedAt,
    isStale
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

  const getDataFreshness = () => {
    if (!report?.timestamp) return null;
    const ageMinutes = Math.floor((Date.now() - new Date(report.timestamp).getTime()) / (1000 * 60));
    if (ageMinutes < 30) return 'fresh';
    if (ageMinutes < 90) return 'recent';
    if (ageMinutes < 240) return 'stale';
    return 'old';
  };

  const getNextUpdateTime = () => {
    const now = new Date();
    const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const currentHour = etNow.getHours();
    const cronHours = [5, 9, 13, 16];
    const nextHour = cronHours.find(hour => hour > currentHour);
    const nextUpdate = new Date(etNow);
    if (nextHour) {
      nextUpdate.setHours(nextHour, 0, 0, 0);
    } else {
      nextUpdate.setDate(nextUpdate.getDate() + 1);
      nextUpdate.setHours(5, 0, 0, 0);
    }
    return nextUpdate;
  };

  const getPerformanceMetrics = () => {
    if (!dataUpdatedAt) return null;
    const loadTime = dataUpdatedAt - (performance.timing?.navigationStart || 0);
    return {
      lastLoadTime: dataUpdatedAt,
      estimatedLoadDuration: loadTime > 0 && loadTime < 10000 ? loadTime : null,
      isFromCache: loadTime < 500,
    };
  };

  return {
    report: report || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    isRefetching,
    lastUpdated: dataUpdatedAt,
    isStale,
    dataFreshness: getDataFreshness(),
    nextUpdateTime: getNextUpdateTime(),
    reportAge: report?.timestamp
      ? Math.floor((Date.now() - new Date(report.timestamp).getTime()) / (1000 * 60))
      : null,
    performanceMetrics: getPerformanceMetrics(),
    method: 'optimized-polling' as const,
    connectionState: isLoading ? 'loading' : 'ready',
    debugInfo: process.env.NODE_ENV === 'development' ? {
      queryKey: ['surfReport', locationSlug],
      reportId: report?.id,
      cachedUntil: report?.cached_until,
      isStale,
      isRefetching,
    } : null
  };
}
