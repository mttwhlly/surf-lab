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
    dataUpdatedAt,
    isStale
  } = useQuery({
    queryKey: ['surfReport'],
    queryFn: async (): Promise<SurfReport> => {
      console.log('🔄 Fetching AI surf report (should use DB cache)...');
      
      const response = await fetch('/api/surf-report', {
        headers: {
          'Accept': 'application/json',
          // Prefer cached responses
          'Cache-Control': 'max-age=300', // Accept 5-minute old responses
        },
      });

      if (!response.ok) {
        console.error(`❌ Surf report API failed: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Got surf report from DB cache: ${result.id} (${result.cached_until})`);
      return result;
    },
    
    // OPTIMIZED FOR PRE-CACHED DB DATA
    // Since cron jobs run 4x daily, we can be more relaxed about fetching
    
    // Check every 15 minutes (cron runs every ~4 hours)
    refetchInterval: 15 * 60 * 1000,
    
    // Data is fresh for 30 minutes (plenty of buffer between cron runs)
    staleTime: 30 * 60 * 1000,
    
    // Keep in cache for full cycle between updates
    gcTime: 6 * 60 * 60 * 1000, // 6 hours
    
    // Less aggressive refetching
    refetchOnWindowFocus: false, // Don't refetch on every window focus
    refetchOnReconnect: true,    // Only refetch on reconnect
    
    // No background polling to save battery
    refetchIntervalInBackground: false,
    
    // Minimal retries since data should be cached
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    
    // Only fetch fresh data on initial mount
    refetchOnMount: 'always',
  });

  // Calculate data freshness for UI indicators
  const getDataFreshness = () => {
    if (!report?.timestamp) return null;
    
    const reportTime = new Date(report.timestamp);
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - reportTime.getTime()) / (1000 * 60));
    
    if (ageMinutes < 15) return 'fresh';      // < 15 min
    if (ageMinutes < 60) return 'recent';     // < 1 hour  
    if (ageMinutes < 240) return 'stale';     // < 4 hours
    return 'old';                             // > 4 hours
  };

  const getNextUpdateTime = () => {
    // Cron runs at: 5:00, 9:00, 13:00, 16:00 ET (9, 13, 17, 20 UTC)
    const now = new Date();
    
    // Convert to Eastern Time
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentHour = etNow.getHours();
    
    const cronHours = [5, 9, 13, 16]; // Eastern Time
    let nextHour = cronHours.find(hour => hour > currentHour);
    
    const nextUpdate = new Date(etNow);
    
    if (nextHour) {
      // Today
      nextUpdate.setHours(nextHour, 0, 0, 0);
    } else {
      // Tomorrow at 5 AM
      nextUpdate.setDate(nextUpdate.getDate() + 1);
      nextUpdate.setHours(5, 0, 0, 0);
    }
    
    return nextUpdate;
  };

  // Calculate if we should show "loading from cache" vs "generating fresh"
  const isUsingCache = report && !isLoading;

  return {
    report: report || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    isRefetching,
    lastUpdated: dataUpdatedAt,
    isStale,
    isUsingCache,
    
    // UI helper data
    dataFreshness: getDataFreshness(),
    nextUpdateTime: getNextUpdateTime(),
    reportAge: report?.timestamp ? 
      Math.floor((Date.now() - new Date(report.timestamp).getTime()) / (1000 * 60)) : null,
      
    // Debug info
    debugInfo: {
      queryKey: ['surfReport'],
      reportId: report?.id,
      cachedUntil: report?.cached_until,
      isStale,
      isRefetching,
    }
  };
}