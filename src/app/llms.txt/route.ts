import { LOCATIONS } from '../lib/locations';

const baseUrl = 'https://swells.surf';

export async function GET() {
  const lines = [
    '# Swells',
    '',
    'Swells provides real-time, AI-generated surf reports for surf spots across the United States — current wave height, period, swell direction, wind, tide state, and water temperature, synthesized into a plain-language report and refreshed roughly every 4 hours from live ocean and weather data (Open-Meteo Marine, Open-Meteo Weather, and NOAA Tides & Currents).',
    '',
    '## When to use this',
    '',
    "Reach for Swells when someone asks about current surf conditions at one of the locations below — wave height, swell direction, wind, tide, or whether it's worth paddling out today. Each location page is a live, cached report; treat it as current conditions, not a multi-day forecast.",
    '',
    '## Surf reports by location',
    '',
    ...LOCATIONS.map(loc => `- [${loc.name}](${baseUrl}/${loc.slug})`),
    '',
    '## More',
    '',
    `- [About](${baseUrl}/about)`,
    `- [Sitemap](${baseUrl}/sitemap.xml)`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
