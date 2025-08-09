// src/app/hooks/useSurfReportOptimized.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SurfReport } from '../types/surf-report';

interface OptimizedState {
  report: SurfReport | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  isPolling: boolean;
}

export function useSurfReportOptimized() {
  const [state, setState] = useState<OptimizedState>({
    report: null,
    loading: true,
    error: null,
    lastUpdate: null,
    isPolling: false
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const lastReportId = useRef<string | null>(null);
  const retryCount = useRef(0);
  const isInitialized = useRef(false);

  // Smart polling interval calculator (pure function, no dependencies)
  const calculatePollingInterval = useCallback((reportTimestamp?: string) => {
    if (!reportTimestamp) return 30000; // 30 seconds if no data
    
    const reportAge = Date.now() - new Date(reportTimestamp).getTime();
    const ageHours = reportAge / (1000 * 60 * 60);
    
    if (ageHours < 1) return 2 * 60 * 1000;  // 2 minutes for fresh data
    if (ageHours < 2) return 5 * 60 * 1000;  // 5 minutes for recent data
    return 10 * 60 * 1000; // 10 minutes for older data
  }, []);

  const fetchReport = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        console.log('🔄 Initial surf report fetch...');
        setState(prev => ({ ...prev, loading: true }));
      }

      const response = await fetch('/api/surf-report', {
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const report = await response.json();
      
      // Only update if it's a new report or initial load
      if (isInitial || report.id !== lastReportId.current) {
        if (!isInitial) {
          console.log('📡 New surf report detected:', report.id);
        }
        
        lastReportId.current = report.id;
        setState(prev => ({
          ...prev,
          report,
          loading: false,
          error: null,
          lastUpdate: new Date()
        }));
      } else if (!isInitial) {
        console.log('📋 No new surf report (same ID)');
      }

      retryCount.current = 0; // Reset retry count on success
      
    } catch (error) {
      console.error('❌ Error fetching surf report:', error);
      
      retryCount.current++;
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  const scheduleNextPoll = useCallback((reportTimestamp?: string) => {
    // Clear any existing timeout
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }

    const interval = calculatePollingInterval(reportTimestamp);
    
    intervalRef.current = setTimeout(async () => {
      await fetchReport(false);
      // Don't schedule here - let the effect handle it
    }, interval);
    
    console.log(`⏰ Next poll scheduled in ${Math.round(interval / 60000)} minutes`);
  }, [calculatePollingInterval, fetchReport]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = undefined;
    }
    setState(prev => ({ ...prev, isPolling: false }));
    console.log('⏹️ Polling stopped');
  }, []);

  const refresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    await fetchReport(false);
  }, [fetchReport]);

  // Handle visibility changes for battery optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Page hidden - stopping polls');
        stopPolling();
      } else {
        console.log('👁️ Page visible - refreshing and resuming polls');
        fetchReport(false);
        setState(prev => ({ ...prev, isPolling: true }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchReport, stopPolling]);

  // Schedule next poll when report changes
  useEffect(() => {
    if (state.report && !state.loading && state.isPolling) {
      scheduleNextPoll(state.report.timestamp);
    }
  }, [state.report?.id, state.loading, state.isPolling, scheduleNextPoll]); // Only depend on report ID

  // Initialize once
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      
      console.log('🚀 Initializing optimized surf report hook');
      
      // Fetch initial data
      fetchReport(true).then(() => {
        // Start polling after initial fetch
        setState(prev => ({ ...prev, isPolling: true }));
      });
    }

    return () => {
      stopPolling();
    };
  }, []); // Empty dependency array - only run once

  // Calculate data freshness
  const getDataFreshness = () => {
    if (!state.report?.timestamp) return null;
    
    const reportTime = new Date(state.report.timestamp);
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - reportTime.getTime()) / (1000 * 60));
    
    if (ageMinutes < 15) return 'fresh';
    if (ageMinutes < 60) return 'recent';  
    if (ageMinutes < 240) return 'stale';
    return 'old';
  };

  const getNextUpdateTime = () => {
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

  return {
    report: state.report,
    loading: state.loading,
    error: state.error,
    refetch: refresh,
    isRefetching: false,
    lastUpdated: state.lastUpdate,
    dataFreshness: getDataFreshness(),
    reportAge: state.report?.timestamp ? 
      Math.floor((Date.now() - new Date(state.report.timestamp).getTime()) / (1000 * 60)) : null,
    nextUpdateTime: getNextUpdateTime(),
    method: 'optimized-polling' as const,
    connectionState: state.isPolling ? 'polling' : 'idle',
    
    debugInfo: {
      method: 'Optimized Polling (Fixed)',
      isPolling: state.isPolling,
      retryCount: retryCount.current,
      lastReportId: lastReportId.current,
      pollingActive: !!intervalRef.current,
      initialized: isInitialized.current
    }
  };
}