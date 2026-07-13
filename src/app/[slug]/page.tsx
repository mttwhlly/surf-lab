import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { SurfAppClient } from '../components/SurfAppClient';
import { getCachedReport } from '@/lib/db';
import { getLocation, LOCATIONS } from '@/lib/locations';

interface Props {
  params: Promise<{ slug: string }>;
}

function extractConditionFromReport(report: string): string {
  const conditionKeywords = {
    'Epic': ['epic', 'firing', 'going off', 'pumping', 'cranking'],
    'Good': ['good', 'solid', 'fun', 'decent', 'worth it'],
    'Fair': ['fair', 'okay', 'marginal', 'questionable'],
    'Poor': ['poor', 'flat', 'blown out', 'junk', 'small']
  };
  const reportLower = report.toLowerCase();
  for (const [condition, keywords] of Object.entries(conditionKeywords)) {
    if (keywords.some(keyword => reportLower.includes(keyword))) return condition;
  }
  return 'Current';
}

export async function generateStaticParams() {
  return LOCATIONS.map(loc => ({ slug: loc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const location = getLocation(slug);
  if (!location) return { title: 'Not Found' };

  let surfReport = null;
  try {
    surfReport = await getCachedReport(slug);
  } catch (_) {}

  if (surfReport) {
    const waveHeight = surfReport.conditions.wave_height_ft;
    const condition = extractConditionFromReport(surfReport.report);
    const windSpeed = Math.round(surfReport.conditions.wind_speed_kts);
    const waterTemp = Math.round(surfReport.conditions.water_temperature_f || 72);
    const title = `${condition} Surf - ${waveHeight}ft waves | Can I Surf Today?`;
    const description = `${condition} surf conditions at ${location.name}! ${waveHeight}ft waves, ${windSpeed}kt winds, ${waterTemp}°F water. Real-time surf report updated 4 times daily.`;
    const ogImageUrl = `/api/og?height=${waveHeight}&condition=${encodeURIComponent(condition)}&wind=${windSpeed}&temp=${waterTemp}`;

    return {
      title,
      description,
      openGraph: {
        title: `${condition} Surf - ${waveHeight}ft waves | ${location.name}`,
        description,
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${condition} surf conditions at ${location.name}` }],
      },
      twitter: { title, description, images: [ogImageUrl] },
    };
  }

  return {
    title: `Can I Surf Today? - ${location.name}`,
    description: `Real-time AI-powered surf report for ${location.name}. Get current wave conditions, wind data, and surf recommendations updated 4 times daily.`,
  };
}

export default async function LocationPage({ params }: Props) {
  const { slug } = await params;
  const location = getLocation(slug);

  if (!location) notFound();

  let initialReport = null;
  try {
    const cached = await getCachedReport(slug);
    const ageMs = cached ? Date.now() - new Date(cached.timestamp).getTime() : Infinity;
    // Only pass to client if fresh — same 8h window the API route uses.
    // Stale data gets null so the client shows skeleton → fresh fetch.
    if (ageMs < 8 * 60 * 60 * 1000) initialReport = cached;
  } catch (_) {}

  return <SurfAppClient initialReport={initialReport} locationSlug={slug} />;
}
