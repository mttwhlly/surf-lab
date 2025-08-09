'use client';

import Image from 'next/image';
import { useSurfReportHybrid } from './hooks/useSurfReportHybrid';
import { SurfReportCard } from './components/surf/SurfReportCard';
import { ErrorCard } from './components/ui/ErrorCard';
import { DataFlowDebug } from './components/debug/DataFlowDebug';
import { SSEStatusIndicator } from './components/ui/SSEStatusIndicator';

export default function SurfApp() {
  const { 
    report: surfReport, 
    loading: reportLoading, 
    error: reportError,
    dataFreshness,
    reportAge,
    isRefetching,
    nextUpdateTime,
    method,
    connectionState,
    debugInfo
  } = useSurfReportHybrid();

  return (
    <div className='flex flex-col items-center justify-start min-h-screen mb-12'>
      {/* Top Controls */}
      <div className="mt-8">
        <Image 
          src="/wave-logo.svg"
          alt="Surf Lab Logo"
          width={64}
          height={64}
          priority
        />
      </div>

      {/* SSE Status Indicator (only show if using SSE) */}
      {/* {method === 'sse' && (
        <div className="mt-8 mb-0">
          <SSEStatusIndicator 
            connectionState={connectionState}
            method={method}
          />
        </div>
      )} */}

      {/* Main Container */}
      <div className="mt-8 px-4 max-w-3xl w-full">
        {/* AI Surf Report */}
        <SurfReportCard report={surfReport} loading={reportLoading} />

        {/* Error Display */}
        {reportError && (
          <ErrorCard message={reportError} />
        )}
      </div>


      <div className="mx-auto max-w-2xl w-full px-4 mt-6">
        <pre className='text-sm text-gray-400 mx-auto whitespace-pre-wrap pt-2 pb-3 px-4 border-gray-200 border-1 border-dashed rounded-xl'>
          <span className='mr-2 font-bold'>Heads up!</span>
          This AI-powered surf report uses real ocean data and updates 4x daily (5 AM, 9 AM, 1 PM, 4 PM ET). 
          {method === 'sse' ? ' You\'ll get instant updates via real-time connection!' : ' Using cached data with periodic updates.'}
        </pre>
      </div>

      {/* Debug Component - Shows data flow in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="max-w-2xl w-full px-4">
          <DataFlowDebug 
            report={surfReport}
            loading={reportLoading}
            isRefetching={isRefetching}
            dataFreshness={dataFreshness}
            reportAge={reportAge}
            nextUpdateTime={nextUpdateTime}
            method={method}
            connectionState={connectionState}
            debugInfo={debugInfo}
          />
        </div>
      )}
    </div>
  );
}