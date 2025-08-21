import { Metadata } from 'next';
import { SurfAppClient } from './components/SurfAppClient';

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

// Server-side function to fetch current surf report
async function getCurrentSurfReport() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'https://canisurf.today';
    
    const response = await fetch(`${baseUrl}/api/surf-report`, {
      // Cache for 5 minutes to avoid excessive API calls during build
      next: { revalidate: 300 },
      headers: {
        'User-Agent': 'SurfLab-Metadata-Generator/1.0'
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Could not fetch surf report for metadata:', error);
  }
  
  return null;
}

// Generate dynamic metadata based on current surf conditions
export async function generateMetadata(): Promise<Metadata> {
  const surfReport = await getCurrentSurfReport();
  
  if (surfReport) {
    const waveHeight = surfReport.conditions.wave_height_ft;
    const condition = extractConditionFromReport(surfReport.report);
    const windSpeed = Math.round(surfReport.conditions.wind_speed_kts);
    const waterTemp = Math.round(surfReport.conditions.water_temperature_f || 72);
    
    const title = `${condition} Surf - ${waveHeight}ft waves | Can I Surf Today?`;
    const description = `${condition} surf conditions in St. Augustine! ${waveHeight}ft waves, ${windSpeed}kt winds, ${waterTemp}°F water. Real-time surf report updated 4 times daily.`;
    
    // Dynamic OG image URL with current conditions
    const ogImageUrl = `/api/og?height=${waveHeight}&condition=${encodeURIComponent(condition)}&wind=${windSpeed}&temp=${waterTemp}`;
    
    return {
      title,
      description,
      openGraph: {
        title: `${condition} Surf - ${waveHeight}ft waves | St. Augustine`,
        description: `Current surf: ${condition} conditions with ${waveHeight}ft waves and ${windSpeed}kt winds in St. Augustine, FL`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${condition} surf conditions - ${waveHeight}ft waves in St. Augustine`,
          }
        ],
      },
      twitter: {
        title,
        description,
        images: [ogImageUrl],
      },
    };
  }
  
  // Fallback to default metadata if no surf report available
  return {
    title: 'Can I Surf Today? - St. Augustine, FL',
    description: 'Real-time AI-powered surf report for St. Augustine, Florida. Get current wave conditions, wind data, and surf recommendations updated 4 times daily.',
  };
}

// Server component that renders the client component
export default function SurfPage() {
  return <SurfAppClient />;
}