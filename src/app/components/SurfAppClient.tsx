// src/app/components/SurfAppClient.tsx
'use client';

import Image from 'next/image';
import { useSurfReportOptimized } from '../hooks/useSurfReportOptimized';
import { SurfReportCard } from './surf/SurfReportCard';
import { ErrorCard } from './ui/ErrorCard';
import { DataFlowDebug } from './debug/DataFlowDebug';
import { PerformanceMonitor } from './debug/PerformanceMonitor';
import { useEffect } from 'react';

// Helper function to extract condition from AI report
function extractConditionFromReport(report: string): string {
  const conditionKeywords = {
    'Epic': ['epic', 'firing', 'going off', 'pumping', 'cranking'],
    'Good': ['good', 'solid', 'fun', 'decent', 'worth it'],
    'Fair': ['fair', 'okay', 'marginal', 'questionable'],
    'Poor': ['poor', 'flat', 'blown out', 'junk', 'small']
  };

  const reportLower = report.toLowerCase();
  
  for (const [condition, keywords] of Object.entries(conditionKeywords)) {
    if (keywords.some(keyword => reportLower.includes(keyword))) {
      return condition;
    }
  }
  
  return 'Current'; // Default fallback
}

export function SurfAppClient() {
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

  // Update document title when report changes
  useEffect(() => {
    if (surfReport && !reportLoading) {
      const waveHeight = surfReport.conditions.wave_height_ft;
      const condition = extractConditionFromReport(surfReport.report);
      
      // Update document title
      document.title = `${condition} Surf - ${waveHeight}ft waves | Can I Surf Today?`;
    } else if (!reportLoading) {
      // Reset to default title when no report
      document.title = 'Can I Surf Today? - St. Augustine, FL';
    }
  }, [surfReport, reportLoading]);

  return (
    <div className='flex flex-col items-center justify-start min-h-screen mb-12'>
      {/* Top Controls */}
      <div className="mt-8">
        <Image 
          src="/wave-logo.svg"
          alt="Can I Surf Today? Logo"
          width={64}
          height={64}
          priority
        />
      </div>

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
          This AI surf report uses real ocean and weather data, however, it can make mistakes so always check conditions yourself before paddling out.
        </pre>
      </div>

      {/* Debug Component - Shows data flow in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="max-w-2xl w-full px-4 pt-2">
          <PerformanceMonitor
            report={surfReport}
            loading={reportLoading}
            performanceMetrics={performanceMetrics}
            dataFreshness={dataFreshness}
            reportAge={reportAge}
          />
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