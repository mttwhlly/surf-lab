'use client';

import Image from 'next/image';
import { useSurfReportOptimized } from './hooks/useSurfReportOptimized';
import { SurfReportCard } from './components/surf/SurfReportCard';
import { ErrorCard } from './components/ui/ErrorCard';
import { DataFlowDebug } from './components/debug/DataFlowDebug';
import { PerformanceMonitor } from './components/debug/PerformanceMonitor';

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
    debugInfo,
    performanceMetrics
  } = useSurfReportOptimized();

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

      {/* Main Container */}
      <div className="mt-8 px-4 max-w-3xl w-full">
        {/* Performance Monitor - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <PerformanceMonitor
            report={surfReport}
            loading={reportLoading}
            performanceMetrics={performanceMetrics}
            dataFreshness={dataFreshness}
            reportAge={reportAge}
          />
        )}

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
          This AI surf report uses real ocean and weather data, however, it can make mistakes so always check conditions yourself before paddling out.
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