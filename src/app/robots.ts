import { MetadataRoute } from 'next';

const baseUrl = 'https://swells.surf';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      // Answer-engine crawlers that read pages to cite in AI answers.
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      // Training-only scrapers with no citation/answer benefit to this site.
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'ByteSpider', disallow: '/' },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
