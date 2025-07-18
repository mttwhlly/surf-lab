'use client';

import { useState, useEffect, useCallback } from 'react';
import { SurfReport } from '../types/surf-report';

export function useSurfReport() {
  const [report, setReport] = useState<SurfReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/surf-report', {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setReport(result);
    } catch (err) {
      console.error('Error fetching surf report:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch surf report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
    
    // Auto-refresh every 30 minutes
    const interval = setInterval(fetchReport, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchReport]);

  return { report, loading, error, refetch: fetchReport };
}