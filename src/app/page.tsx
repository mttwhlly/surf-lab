'use client';

import Image from 'next/image';
import { useSurfData } from './hooks/useSurfData';
import { useSurfReport } from './hooks/useSurfReport';
import { SurfReportCard } from './components/surf/SurfReportCard';
import { ErrorCard } from './components/ui/ErrorCard';

export default function SurfApp() {
  const { 
    data: surfData, 
    loading: surfLoading, 
    error: surfError,
    isRefetching,
    lastUpdated,
    prefetchIfNeeded
  } = useSurfData();
  
  const { 
    report: surfReport, 
    loading: reportLoading, 
    error: reportError 
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
        {/* AI Surf Report */}
        <SurfReportCard report={surfReport} loading={reportLoading} />

        {/* Error Display */}
        {(surfError || reportError) && (
          <ErrorCard message={surfError || reportError || 'Unknown error'} />
        )}
      </div>
    </div>
  );
}