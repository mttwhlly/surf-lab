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
    <div className='pb-20'>
      {/* Top Controls */}
      <div className="fixed top-0 left-0 right-0 mx-2 sm:mx-4 lg:mx-8 shadow-md z-50 flex p-4 mt-5 rounded-full justify-between items-center bg-white/80 backdrop-blur-xs border-b border-black/10">
        <Image 
          src="/wave-logo.svg"
          alt="Surf Lab Logo"
          width={48}
          height={48}
          priority
        />
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto mb-10 px-5 py-5 relative z-20 min-h-screen mt-[100px] shadow-lg rounded-3xl">

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