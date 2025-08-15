'use client';

import { useState, useEffect } from 'react';
import { Clock, Zap, Database, CheckCircle } from 'lucide-react';

interface PerformanceMonitorProps {
  report: any;
  loading: boolean;
  performanceMetrics: any;
  dataFreshness: string | null;
  reportAge: number | null;
}

export function PerformanceMonitor({ 
  report, 
  loading, 
  performanceMetrics,
  dataFreshness,
  reportAge 
}: PerformanceMonitorProps) {
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [loadDuration, setLoadDuration] = useState<number | null>(null);

  // Track load performance
  useEffect(() => {
    if (loading && !loadStartTime) {
      setLoadStartTime(Date.now());
    } else if (!loading && loadStartTime && !loadDuration) {
      const duration = Date.now() - loadStartTime;
      setLoadDuration(duration);
      console.log(`🚀 Page load completed in ${duration}ms`);
    }
  }, [loading, loadStartTime, loadDuration]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  const getPerformanceColor = () => {
    if (loading) return 'bg-blue-50 border-blue-200 text-blue-800';
    if (!loadDuration) return 'bg-gray-50 border-gray-200 text-gray-800';
    if (loadDuration < 500) return 'bg-green-50 border-green-200 text-green-800';
    if (loadDuration < 1500) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-red-50 border-red-200 text-red-800';
  };

  const getPerformanceIcon = () => {
    if (loading) return <Zap className="w-4 h-4" />;
    if (!loadDuration) return <Clock className="w-4 h-4" />;
    if (loadDuration < 500) return <CheckCircle className="w-4 h-4" />;
    return <Database className="w-4 h-4" />;
  };

  const getPerformanceMessage = () => {
    if (loading) return 'Loading surf report...';
    if (!loadDuration) return 'Performance tracking...';
    if (loadDuration < 200) return '🚀 Lightning fast! (Pre-generated)';
    if (loadDuration < 500) return '⚡ Very fast! (Cached)';
    if (loadDuration < 1500) return '✅ Good performance';
    if (loadDuration < 3000) return '⚠️ Slow - possible fresh generation';
    return '🐌 Very slow - check cron jobs';
  };

  return (
    <div className={`mt-4 p-3 rounded-lg border ${getPerformanceColor()}`}>
      <div className="flex items-center gap-2 mb-2">
        {getPerformanceIcon()}
        <span className="font-medium text-sm">Performance Monitor</span>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span>Load Time:</span>
          <span className="font-mono">
            {loading ? 'Loading...' : loadDuration ? `${loadDuration}ms` : 'N/A'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Data Source:</span>
          <span>
            {loading ? 'Fetching...' : 
             loadDuration && loadDuration < 300 ? 'Pre-generated Cache' :
             loadDuration && loadDuration < 800 ? 'Database Cache' :
             'Fresh Generation'}
          </span>
        </div>
        
        {report && (
          <>
            <div className="flex justify-between">
              <span>Report Age:</span>
              <span>{reportAge ? `${Math.floor(reportAge / 60)}h ${reportAge % 60}m` : 'N/A'}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Freshness:</span>
              <span className="capitalize">{dataFreshness || 'Unknown'}</span>
            </div>
          </>
        )}
        
        <div className="mt-2 pt-2 border-t border-current/20">
          <div className="font-medium text-xs mb-1">{getPerformanceMessage()}</div>
          
          {loadDuration && (
            <div className="text-xs opacity-75">
              Target: &lt;200ms (pre-generated) | &lt;500ms (cached) | &lt;3000ms (fresh)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}