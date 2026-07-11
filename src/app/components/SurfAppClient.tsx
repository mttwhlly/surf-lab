'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSurfReportOptimized } from '../hooks/useSurfReportOptimized';
import { SurfReportCard } from './surf/SurfReportCard';
import { ErrorCard } from './ui/ErrorCard';
import { useEffect } from 'react';
import { SurfReport } from '../types/surf-report';
import { getLocation, LOCATIONS } from '../lib/locations';

const STORAGE_KEY = 'surf_location';

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
  return 'Current';
}

interface Props {
  initialReport?: SurfReport | null;
  locationSlug: string;
}

export function SurfAppClient({ initialReport, locationSlug }: Props) {
  const router = useRouter();
  const location = getLocation(locationSlug);
  const locationName = location?.name ?? locationSlug;

  const {
    report: surfReport,
    loading: reportLoading,
    error: reportError,
  } = useSurfReportOptimized({ initialData: initialReport, locationSlug });

  useEffect(() => {
    if (surfReport && !reportLoading) {
      const waveHeight = surfReport.conditions.wave_height_ft;
      const condition = extractConditionFromReport(surfReport.report);
      document.title = `${condition} Surf - ${waveHeight}ft waves | Can I Surf Today?`;
    } else if (!reportLoading) {
      document.title = `Can I Surf Today? - ${locationName}`;
    }
  }, [surfReport, reportLoading, locationName]);

  function handleLocationChange(slug: string) {
    localStorage.setItem(STORAGE_KEY, slug);
    router.push(`/${slug}`);
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen mb-12">
      <div className="mt-8">
        <Image
          src="/wave-logo.svg"
          alt="Can I Surf Today? Logo"
          width={64}
          height={64}
          priority
        />
      </div>

      {/* Location selector */}
      <div className="mt-4">
        <select
          value={locationSlug}
          onChange={e => handleLocationChange(e.target.value)}
          className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {LOCATIONS.map(loc => (
            <option key={loc.slug} value={loc.slug}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Container */}
      <div className="mt-6 px-4 max-w-3xl w-full">
        <SurfReportCard report={surfReport} loading={reportLoading} />

        {reportError && <ErrorCard message={reportError} />}
      </div>

      <div className="mx-auto max-w-3xl w-full px-4 mt-6">
        <pre className="text-sm text-gray-400 mx-auto whitespace-pre-wrap pt-2 pb-3 px-4 border-gray-200 border-1 border-dashed rounded-xl">
          <span className="mr-2 font-bold">Heads up!</span>
          This AI surf report uses real ocean and weather data, however, it can make mistakes so always check conditions yourself before paddling out.
        </pre>
      </div>
    </div>
  );
}
