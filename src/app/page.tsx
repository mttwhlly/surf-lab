// src/app/page.tsx
'use client';

import Image from 'next/image';
import { useSurfReport } from './hooks/useSurfReport';
import { SurfReportCard } from './components/surf/SurfReportCard';
import { ErrorCard } from './components/ui/ErrorCard';
import { DataFreshnessIndicator } from './components/ui/DataFreshnessIndicator';

export default function SurfApp() {
  const { 
    report: surfReport, 
    loading: reportLoading, 
    error: reportError,
    dataFreshness,
    nextUpdateTime,
    reportAge,
    isRefetching
  } = useSurfReport();

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

        {/* Data Freshness Indicator */}
        {/* <DataFreshnessIndicator 
          freshness={dataFreshness}
          reportAge={reportAge}
          nextUpdate={nextUpdateTime}
          isRefetching={isRefetching}
        /> */}

        {/* AI Surf Report */}
        <SurfReportCard report={surfReport} loading={reportLoading} />

        {/* Error Display */}
        {reportError && (
          <ErrorCard message={reportError} />
        )}
      </div>
   
      <pre className='mt-4 text-sm text-gray-400 max-w-2xl w-full mx-auto whitespace-pre-wrap pt-2 pb-3 px-4 border-gray-200 border-1 border-dashed rounded-xl'>
        <span className='mr-2 font-bold'>Heads up!</span>
        This AI-powered surf report uses real ocean data and updates 4x daily (5 AM, 9 AM, 1 PM, 4 PM ET). Always check conditions yourself before paddling out.
      </pre>
    </div>
  );
}