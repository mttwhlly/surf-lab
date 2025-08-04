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
      const response = await fetch('/api/surf-report', {
        headers: {
          'Accept': 'application/json',
          // Add cache control to prefer cached data
          'Cache-Control': 'max-age=60', // Accept 1-minute old data
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    
    // Optimized for pre-cached data approach
    refetchInterval: 10 * 60 * 1000, // Check every 10 minutes (data is pre-generated)
    
    // Data is considered fresh for 15 minutes (since cron runs 4x daily)
    staleTime: 15 * 60 * 1000, // 15 minutes
    
    // Keep in memory for longer since updates are less frequent
    gcTime: 4 * 60 * 60 * 1000, // 4 hours (between cron runs)
    
    // Less aggressive refetching since data is pre-generated
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    
    // Don't poll in background to save battery
    refetchIntervalInBackground: false,
    
    // Fewer retries since server should have cached data
    retry: 1,
    retryDelay: 5000, // 5 second delay before retry
    
    // Enable background updates for better UX
    refetchOnMount: 'always', // Always check for fresh data on mount
  });

  // Calculate data freshness for UI indicators
  const getDataFreshness = () => {
    if (!report?.timestamp) return null;
    
    const reportTime = new Date(report.timestamp);
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - reportTime.getTime()) / (1000 * 60));
    
    if (ageMinutes < 5) return 'fresh';
    if (ageMinutes < 30) return 'recent';
    if (ageMinutes < 120) return 'stale';
    return 'old';
  };

  const getNextUpdateTime = () => {
    // Next cron run times: 5:00, 9:00, 13:00, 16:00 ET
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentHour = et.getHours();
    
    const nextHours = [5, 9, 13, 16];
    let nextHour = nextHours.find(hour => hour > currentHour);
    
    if (!nextHour) {
      // Next update is tomorrow at 5 AM
      nextHour = 5;
      et.setDate(et.getDate() + 1);
    }
    
    et.setHours(nextHour, 0, 0, 0);
    return et;
  };

  return {
    report: report || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    isRefetching,
    lastUpdated: dataUpdatedAt,
    isStale,
    // New helpers for UI
    dataFreshness: getDataFreshness(),
    nextUpdateTime: getNextUpdateTime(),
    reportAge: report?.timestamp ? 
      Math.floor((Date.now() - new Date(report.timestamp).getTime()) / (1000 * 60)) : null
  };
}