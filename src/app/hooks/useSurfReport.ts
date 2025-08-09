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
      console.log('🔄 Fetching AI surf report...');
      
      const response = await fetch('/api/surf-report', {
        headers: {
          'Accept': 'application/json',
          'X-Debug': process.env.NODE_ENV === 'development' ? 'true' : 'false',
        },
      });

      if (!response.ok) {
        console.error(`❌ Surf report API failed: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Log response headers for debugging (dev only)
      if (process.env.NODE_ENV === 'development') {
        const dataSource = response.headers.get('X-Data-Source');
        const cacheStatus = response.headers.get('X-Cache-Status');
        const responseTime = response.headers.get('X-Response-Time');
        console.log(`📊 Data source: ${dataSource}, Cache: ${cacheStatus}, Time: ${responseTime}`);
      }

      const result = await response.json();
      console.log(`✅ Got surf report: ${result.id}`);
      return result;
    },
    
    // ENVIRONMENT-SPECIFIC SETTINGS
    
    // Longer intervals in production
    refetchInterval: process.env.NODE_ENV === 'production' 
      ? false  // No automatic refetching in production
      : 30 * 60 * 1000, // 30 minutes in development
    
    // Data stays fresh longer in production  
    staleTime: process.env.NODE_ENV === 'production'
      ? 4 * 60 * 60 * 1000  // 4 hours in production
      : 2 * 60 * 60 * 1000, // 2 hours in development
    
    // Keep in cache longer
    gcTime: 8 * 60 * 60 * 1000, // 8 hours
    
    // Production settings to prevent unnecessary requests
    refetchOnWindowFocus: false,
    refetchOnReconnect: process.env.NODE_ENV === 'production' ? false : true,
    refetchIntervalInBackground: false,
    
    // Minimal retries in production
    retry: process.env.NODE_ENV === 'production' ? 1 : 2,
    retryDelay: 5000,
    
    // Control initial fetching
    refetchOnMount: 'always',
    
    // Enable/disable based on environment
    enabled: true,
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

  return {
    report: report || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    isRefetching,
    lastUpdated: dataUpdatedAt,
    isStale,
    
    // UI helper data
    dataFreshness: getDataFreshness(),
    nextUpdateTime: getNextUpdateTime(),
    reportAge: report?.timestamp ? 
      Math.floor((Date.now() - new Date(report.timestamp).getTime()) / (1000 * 60)) : null,
      
    // Debug info (dev only)
    debugInfo: process.env.NODE_ENV === 'development' ? {
      queryKey: ['surfReport'],
      reportId: report?.id,
      cachedUntil: report?.cached_until,
      isStale,
      isRefetching,
      environment: process.env.NODE_ENV
    } : null
  };
}