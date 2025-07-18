'use client';

import Image from 'next/image';
import { useSurfData } from './hooks/useSurfData';
import { useSurfReport } from './hooks/useSurfReport';
import { WeatherHeader } from './components/surf/WeatherHeader';
import { SurfDetails } from './components/surf/SurfDetails';
import { TideCard } from './components/surf/TideCard';
import { StatusCard } from './components/surf/StatusCard';
import { SurfReportCard } from './components/surf/SurfReportCard';
import { ErrorCard } from './components/ui/ErrorCard';

export default function SurfApp() {
  const { data: surfData, loading: surfLoading, error: surfError } = useSurfData();
  const { report: surfReport, loading: reportLoading, error: reportError } = useSurfReport();

  return (
    <div className='flex flex-col items-center justify-start min-h-screen mb-12'>
      {/* Top Controls */}
      <div className="m-8">
        <Image 
          src="/wave-logo.svg"
          alt="Surf Lab Logo"
          width={48}
          height={48}
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