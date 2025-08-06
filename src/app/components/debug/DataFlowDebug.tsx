// src/app/components/debug/DataFlowDebug.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Database, Clock, Zap } from 'lucide-react';

interface DebugProps {
  report: any;
  loading: boolean;
  isRefetching: boolean;
  dataFreshness: string | null;
  reportAge: number | null;
  nextUpdateTime: Date | null;
}

export function DataFlowDebug({ 
  report, 
  loading, 
  isRefetching, 
  dataFreshness, 
  reportAge, 
  nextUpdateTime 
}: DebugProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (process.env.NODE_ENV !== 'development') return null;

  const getStatusColor = () => {
    if (loading) return 'bg-blue-50 border-blue-200 text-blue-800';
    if (isRefetching) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    if (dataFreshness === 'fresh') return 'bg-green-50 border-green-200 text-green-800';
    if (dataFreshness === 'recent') return 'bg-green-50 border-green-200 text-green-800';
    if (dataFreshness === 'stale') return 'bg-orange-50 border-orange-200 text-orange-800';
    return 'bg-red-50 border-red-200 text-red-800';
  };

  const getStatusIcon = () => {
    if (loading || isRefetching) return <Zap className="w-4 h-4" />;
    return <Database className="w-4 h-4" />;
  };

  const formatNextUpdate = () => {
    if (!nextUpdateTime) return 'Unknown';
    
    const now = new Date();
    const diffMs = nextUpdateTime.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 1) return 'Within 1 hour';
    return `In ${diffHours} hours`;
  };

  return (
    <div className={`mt-6 border rounded-lg ${getStatusColor()}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">
            {loading ? 'Loading...' : isRefetching ? 'Refreshing...' : 'Using Cached Data'}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-current/20">
          <div className="mt-3 space-y-2 text-sm">
            
            {/* Data Source */}
            <div className="flex justify-between">
              <span className="font-medium">Data Source:</span>
              <span>{loading ? 'Fetching...' : 'Database Cache'}</span>
            </div>

            {/* Report Info */}
            {report && (
              <>
                <div className="flex justify-between">
                  <span className="font-medium">Report ID:</span>
                  <span className="font-mono text-xs">{report.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Generated:</span>
                  <span>{new Date(report.timestamp).toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Cached Until:</span>
                  <span>{new Date(report.cached_until).toLocaleString()}</span>
                </div>
              </>
            )}

            {/* Freshness */}
            <div className="flex justify-between">
              <span className="font-medium">Freshness:</span>
              <span className="capitalize">{dataFreshness || 'Unknown'}</span>
            </div>

            {reportAge && (
              <div className="flex justify-between">
                <span className="font-medium">Age:</span>
                <span>{Math.floor(reportAge / 60)}h {reportAge % 60}m</span>
              </div>
            )}

            {/* Next Update */}
            <div className="flex justify-between">
              <span className="font-medium">Next Cron:</span>
              <span>{formatNextUpdate()}</span>
            </div>

            {/* Wave Data Source */}
            {report?.conditions && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <div className="flex justify-between">
                  <span className="font-medium">Wave Height:</span>
                  <span>{report.conditions.wave_height_ft}ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Period:</span>
                  <span>{report.conditions.wave_period_sec}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Score:</span>
                  <span>{report.conditions.surfability_score}/100</span>
                </div>
              </div>
            )}

            {/* API Endpoint */}
            <div className="mt-3 pt-3 border-t border-current/20">
              <div className="text-xs opacity-75">
                <div><strong>Endpoint:</strong> /api/surf-report</div>
                <div><strong>Method:</strong> GET (cached)</div>
                <div><strong>Cron:</strong> 4x daily (5,9,13,16 ET)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}