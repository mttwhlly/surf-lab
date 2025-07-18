'use client';

import { useState, useEffect, useCallback } from 'react';

interface SurfReport {
  id: string;
  timestamp: string;
  location: string;
  report: string;
  conditions: {
    wave_height_ft: number;
    wave_period_sec: number;
    wind_speed_kts: number;
    wind_direction_deg: number;
    tide_state: string;
    weather_description: string;
    surfability_score: number;
  };
  recommendations: {
    board_type: string;
    wetsuit_thickness?: string;
    skill_level: 'beginner' | 'intermediate' | 'advanced';
    best_spots?: string[];
    timing_advice?: string;
  };
  cached_until: string;
}

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
      
      // Validate the response structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format');
      }

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