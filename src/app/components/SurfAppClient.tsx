'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useSurfReportOptimized } from '../hooks/useSurfReportOptimized';
import { SurfReportCard } from './surf/SurfReportCard';
import { ErrorCard } from './ui/ErrorCard';
import { useEffect, useState } from 'react';
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
  const lower = report.toLowerCase();
  for (const [condition, keywords] of Object.entries(conditionKeywords)) {
    if (keywords.some(k => lower.includes(k))) return condition;
  }
  return 'Current';
}

interface Props {
  initialReport?: SurfReport | null;
  locationSlug: string;
}

const widestLocationName = LOCATIONS.reduce(
  (a, b) => (b.name.length > a.length ? b.name : a),
  ''
);

export function SurfAppClient({ initialReport, locationSlug }: Props) {
  const router = useRouter();
  const location = getLocation(locationSlug);
  const locationName = location?.name ?? locationSlug;
  const [open, setOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const { report: surfReport, loading: reportLoading, error: reportError } =
    useSurfReportOptimized({ initialData: initialReport, locationSlug });

  useEffect(() => {
    if (surfReport && !reportLoading) {
      const condition = extractConditionFromReport(surfReport.report);
      document.title = `${condition} Surf - ${surfReport.conditions.wave_height_ft}ft waves | Can I Surf Today?`;
    } else if (!reportLoading) {
      document.title = `Can I Surf Today? - ${locationName}`;
    }
  }, [surfReport, reportLoading, locationName]);

  useEffect(() => {
    if (!open && !sourcesOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setSourcesOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, sourcesOpen]);

  function handleLocationChange(slug: string) {
    localStorage.setItem(STORAGE_KEY, slug);
    setOpen(false);
    router.push(`/${slug}`);
  }

  return (
    <>
      <motion.div
        className="flex flex-col items-center justify-start min-h-screen pb-28"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="mt-8">
          <Image src="/wave-logo.svg" alt="Can I Surf Today? Logo" width={64} height={64} priority />
        </div>

        <div className="mt-6 px-4 max-w-3xl w-full">
          <SurfReportCard report={surfReport} loading={reportLoading} />
          {reportError && <ErrorCard message={reportError} />}
        </div>

        <div className="mx-auto max-w-3xl w-full px-4 mt-6">
          <p className="text-sm font-mono text-gray-400 mx-auto whitespace-pre-wrap pt-2 pb-3 px-4 border-gray-200 border-1 border-dashed rounded-xl">
            <span className="mr-2 font-bold">Heads up!</span>
            {'This AI surf report uses '}
            <span className="relative inline-block">
              <button
                onClick={() => setSourcesOpen(o => !o)}
                className="underline underline-offset-2 decoration-dashed hover:text-gray-600 transition-colors cursor-pointer"
              >
                real ocean and weather data
              </button>
              <AnimatePresence>
                {sourcesOpen && (
                  <motion.div
                    className="absolute bottom-full left-1/2 mb-3 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50"
                    style={{ translateX: '-50%', transformOrigin: 'bottom center' }}
                    initial={{ opacity: 0, scale: 0.92, y: 6 }}
                    animate={{ opacity: 1, scale: 1,    y: 0 }}
                    exit={{    opacity: 0, scale: 0.92, y: 6 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.7 }}
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs font-mono font-semibold uppercase tracking-widest text-gray-400">Data sources</p>
                    </div>
                    {[
                      { label: 'Open-Meteo Marine', detail: 'Waves, swell, sea temp', href: 'https://open-meteo.com/en/docs/marine-weather-api' },
                      { label: 'Open-Meteo Weather', detail: 'Wind, air temp, conditions', href: 'https://open-meteo.com/en/docs' },
                      { label: 'NOAA Tides & Currents', detail: 'Tide height & predictions', href: 'https://tidesandcurrents.noaa.gov' },
                    ].map(({ label, detail, href }) => (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <span className="text-sm font-medium font-mono text-gray-800">{label}</span>
                        <span className="text-xs font-mono text-gray-400">{detail}</span>
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </span>
            {', however, it can make mistakes so always check conditions yourself before paddling out.'}
          </p>
        </div>
      </motion.div>

      {/* Transparent scrim captures outside clicks for any open popover */}
      <AnimatePresence>
        {(open || sourcesOpen) && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setOpen(false); setSourcesOpen(false); }}
          />
        )}
      </AnimatePresence>

      {/* Dock bar */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 pointer-events-none">
        <div className="pointer-events-auto flex items-center bg-white border border-gray-200 rounded-2xl shadow-lg">
          {/* Location dock item */}
          <div className="relative">
            <motion.button
              onClick={() => setOpen(o => !o)}
              whileTap={{ scale: 0.93 }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium font-mono transition-colors ${
                open ? 'text-gray-900 bg-gray-100' : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-label="Change location"
              aria-expanded={open}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              {/* Ghost establishes fixed width = widest name; visible span sits on top */}
              <span className="relative whitespace-nowrap">
                <span className="invisible select-none">{widestLocationName}</span>
                <span className="absolute inset-0 flex items-center justify-center">{locationName}</span>
              </span>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </motion.div>
            </motion.button>

            {/* Location menu */}
            <AnimatePresence>
              {open && (
                <motion.div
                  className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                  style={{ transformOrigin: 'bottom left', minWidth: '100%' }}
                  initial={{ opacity: 0, scale: 0.92, y: 8 }}
                  animate={{ opacity: 1, scale: 1,    y: 0 }}
                  exit={{    opacity: 0, scale: 0.92, y: 8 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.7 }}
                >
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      visible: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
                      hidden:  {},
                    }}
                  >
                    {LOCATIONS.map((loc) => (
                      <motion.button
                        key={loc.slug}
                        variants={{
                          visible: { opacity: 1, x: 0 },
                          hidden:  { opacity: 0, x: -4 },
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                        onClick={() => handleLocationChange(loc.slug)}
                        className={`w-full text-left px-4 py-2.5 text-sm font-mono whitespace-nowrap transition-colors ${
                          loc.slug === locationSlug
                            ? 'bg-gray-100 text-gray-900 font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {loc.name}
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Future dock items slot in here as siblings */}
        </div>
      </div>
    </>
  );
}
