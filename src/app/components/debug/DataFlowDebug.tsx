'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Database, Clock, Zap, AlertCircle } from 'lucide-react';

interface DebugProps {
  report: any;
  loading: boolean;
  isRefetching: boolean;
  dataFreshness: string | null;
  reportAge: number | null;
  nextUpdateTime: Date | null;
  method?: 'sse' | 'react-query';
  connectionState?: string;
  debugInfo?: any;
}

export function DataFlowDebug({ 
  report, 
  loading, 
  isRefetching, 
  dataFreshness, 
  reportAge, 
  nextUpdateTime,
  method = 'react-query',
  connectionState = 'unknown',
  debugInfo = null
}: DebugProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCacheTest, setShowCacheTest] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  if (process.env.NODE_ENV !== 'development') return null;

  const runCacheTest = async () => {
    setIsRunningTest(true);
    setTestResults([]);
    
    const results = [];
    
    // Test 1: First request
    console.log('🧪 Test 1: First request');
    const start1 = Date.now();
    try {
      const response1 = await fetch('/api/surf-report', {
        headers: { 'X-Debug': 'true' }
      });
      const duration1 = Date.now() - start1;
      const dataSource1 = response1.headers.get('X-Data-Source');
      
      results.push({
        test: 'First Request',
        duration: duration1,
        dataSource: dataSource1,
        status: response1.ok ? 'success' : 'error'
      });
    } catch (error) {
      results.push({
        test: 'First Request',
        duration: 0,
        dataSource: 'error',
        status: 'error',
        error: error.message
      });
    }
    
    setTestResults([...results]);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Second request
    const start2 = Date.now();
    try {
      const response2 = await fetch('/api/surf-report', {
        headers: { 'X-Debug': 'true' }
      });
      const duration2 = Date.now() - start2;
      const dataSource2 = response2.headers.get('X-Data-Source');
      
      results.push({
        test: 'Second Request',
        duration: duration2,
        dataSource: dataSource2,
        status: response2.ok ? 'success' : 'error'
      });
    } catch (error) {
      results.push({
        test: 'Second Request',
        duration: 0,
        dataSource: 'error',
        status: 'error',
        error: error.message
      });
    }
    
    setTestResults([...results]);
    setIsRunningTest(false);
  };

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
            {loading ? 'Loading...' : isRefetching ? 'Refreshing...' : 'Debug Panel'}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-current/20">
          <div className="mt-3 space-y-2 text-sm">
            
            {/* Connection Method */}
            <div className="flex justify-between">
              <span className="font-medium">Method:</span>
              <span className={method === 'sse' ? 'text-green-600' : 'text-blue-600'}>
                {method === 'sse' ? 'Server-Sent Events' : 'React Query'}
              </span>
            </div>

            {/* Connection State (for SSE) */}
            {method === 'sse' && (
              <div className="flex justify-between">
                <span className="font-medium">Connection:</span>
                <span className={
                  connectionState === 'connected' ? 'text-green-600' :
                  connectionState === 'connecting' ? 'text-blue-600' :
                  'text-red-600'
                }>
                  {connectionState}
                </span>
              </div>
            )}
            
            {/* Data Source */}
            <div className="flex justify-between">
              <span className="font-medium">Data Source:</span>
              <span>{loading ? 'Fetching...' : method === 'sse' ? 'Live Stream' : 'Database Cache'}</span>
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

            {/* Cache Test Section */}
            <div className="mt-4 pt-3 border-t border-current/20">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Cache Performance Test</span>
                <button
                  onClick={() => setShowCacheTest(!showCacheTest)}
                  className="text-xs px-2 py-1 bg-white/50 rounded hover:bg-white/70"
                >
                  {showCacheTest ? 'Hide' : 'Show'}
                </button>
              </div>

              {showCacheTest && (
                <div className="space-y-3">
                  <button
                    onClick={runCacheTest}
                    disabled={isRunningTest}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isRunningTest ? (
                      <>
                        <Zap className="w-3 h-3 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        Test Cache
                      </>
                    )}
                  </button>

                  {testResults.length > 0 && (
                    <div className="space-y-2">
                      {testResults.map((result, i) => (
                        <div key={i} className="text-xs p-2 bg-white/30 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{result.test}</span>
                            <span className={result.duration < 200 ? 'text-green-600' : 'text-orange-600'}>
                              {result.duration}ms
                            </span>
                          </div>
                          <div className="text-opacity-75">
                            Source: {result.dataSource}
                          </div>
                          {result.error && (
                            <div className="text-red-600">Error: {result.error}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

            {/* Debug Info Section */}
            {debugInfo && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <div className="text-xs opacity-75">
                  <div><strong>Method:</strong> {debugInfo.method}</div>
                  {debugInfo.connected !== undefined && (
                    <div><strong>Connected:</strong> {debugInfo.connected ? 'Yes' : 'No'}</div>
                  )}
                  {debugInfo.reconnectAttempts !== undefined && (
                    <div><strong>Reconnect Attempts:</strong> {debugInfo.reconnectAttempts}</div>
                  )}
                  {debugInfo.sseError && (
                    <div><strong>SSE Error:</strong> {debugInfo.sseError}</div>
                  )}
                  {debugInfo.sseSupported !== undefined && (
                    <div><strong>SSE Supported:</strong> {debugInfo.sseSupported ? 'Yes' : 'No'}</div>
                  )}
                </div>
              </div>
            )}

            {/* API Endpoint */}
            <div className="mt-3 pt-3 border-t border-current/20">
              <div className="text-xs opacity-75">
                <div><strong>Endpoint:</strong> {method === 'sse' ? '/api/surf-stream' : '/api/surf-report'}</div>
                <div><strong>Protocol:</strong> {method === 'sse' ? 'Server-Sent Events' : 'HTTP GET (cached)'}</div>
                <div><strong>Cron:</strong> 4x daily (5,9,13,16 ET)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}