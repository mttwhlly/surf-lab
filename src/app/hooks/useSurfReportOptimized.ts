'use client';

import { useQuery } from '@tanstack/react-query';
import { SurfReport } from '../types/surf-report';

export function useSurfReportOptimized() {
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
      console.log('🔄 Fetching surf report...');
      
      const response = await fetch('/api/surf-report', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'public, max-age=1800', // Help with browser caching
        },
      });

      if (!response.ok) {
        console.error(`❌ Surf report API failed: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Log response headers for monitoring
      const dataSource = response.headers.get('X-Data-Source');
      const responseTime = response.headers.get('X-Response-Time');
      const reportAge = response.headers.get('X-Report-Age-Hours');
      
      console.log(`✅ Got surf report from ${dataSource} in ${responseTime} (age: ${reportAge}h)`);

      const result = await response.json();
      return result;
    },
    
    // AGGRESSIVE CACHING SETTINGS - REPORTS ARE PRE-GENERATED
    staleTime: 30 * 60 * 1000,        // 30 minutes - data stays fresh longer
    gcTime: 4 * 60 * 60 * 1000,       // 4 hours - keep in memory longer
    
    // DISABLE AUTOMATIC REFETCHING - RELY ON CRON JOBS
    refetchInterval: false,            // No background polling needed
    refetchOnWindowFocus: false,       // Don't refetch on focus
    refetchOnReconnect: false,         // Don't refetch on reconnect
    refetchIntervalInBackground: false,
    
    // FAST LOADING SETTINGS
    retry: 1,                          // Only retry once
    retryDelay: 2000,                  // Quick retry
    
    // ALWAYS FETCH ON MOUNT FOR FRESH DATA
    refetchOnMount: 'always',
    
    // NETWORK SETTINGS
    networkMode: 'online',
    
    // Enable query
    enabled: true,
  });

  // Calculate data freshness for UI indicators
  const getDataFreshness = () => {
    if (!report?.timestamp) return null;
    
    const reportTime = new Date(report.timestamp);
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - reportTime.getTime()) / (1000 * 60));
    
    if (ageMinutes < 30) return 'fresh';      // < 30 min (very fresh)
    if (ageMinutes < 90) return 'recent';     // < 1.5 hours (still good)
    if (ageMinutes < 240) return 'stale';     // < 4 hours (getting old)
    return 'old';                             // > 4 hours (quite old)
  };

  const getNextUpdateTime = () => {
    // Cron runs at: 5:00, 9:00, 13:00, 16:00 ET 
    const now = new Date();
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentHour = etNow.getHours();
    
    const cronHours = [5, 9, 13, 16];
    let nextHour = cronHours.find(hour => hour > currentHour);
    
    const nextUpdate = new Date(etNow);
    
    if (nextHour) {
      nextUpdate.setHours(nextHour, 0, 0, 0);
    } else {
      nextUpdate.setDate(nextUpdate.getDate() + 1);
      nextUpdate.setHours(5, 0, 0, 0);
    }
    
    return nextUpdate;
  };

  // Performance monitoring
  const getPerformanceMetrics = () => {
    if (!dataUpdatedAt) return null;
    
    const loadTime = dataUpdatedAt - (performance.timing?.navigationStart || 0);
    return {
      lastLoadTime: dataUpdatedAt,
      estimatedLoadDuration: loadTime > 0 && loadTime < 10000 ? loadTime : null,
      isFromCache: loadTime < 500, // Likely from cache if super fast
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
    
    // UI helper data
    dataFreshness: getDataFreshness(),
    nextUpdateTime: getNextUpdateTime(),
    reportAge: report?.timestamp ? 
      Math.floor((Date.now() - new Date(report.timestamp).getTime()) / (1000 * 60)) : null,
    
    // Performance metrics  
    performanceMetrics: getPerformanceMetrics(),
    
    // Method identifier
    method: 'optimized-polling' as const,
    connectionState: isLoading ? 'loading' : 'ready',
      
    // Debug info (dev only)
    debugInfo: process.env.NODE_ENV === 'development' ? {
      queryKey: ['surfReport'],
      reportId: report?.id,
      cachedUntil: report?.cached_until,
      isStale,
      isRefetching,
      environment: process.env.NODE_ENV,
      optimizationLevel: 'aggressive-caching-with-pre-generation'
    } : null
  };
}