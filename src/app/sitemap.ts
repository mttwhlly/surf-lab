import { MetadataRoute } from 'next';
import { LOCATIONS } from './lib/locations';

const baseUrl = 'https://swells.surf';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    ...LOCATIONS.map(loc => ({
      url: `${baseUrl}/${loc.slug}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    })),
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.2 },
  ];
}
