import type { Metadata, Viewport } from 'next';
import { Lacquer } from 'next/font/google';
import { QueryProvider } from './providers/QueryProvider';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './globals.css';

const lacquer = Lacquer({
  subsets: ['latin'],
  variable: '--font-lacquer',
  weight: '400',
  display: 'swap',
  preload: true,
})

// Get the base URL for absolute URLs in metadata
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
               process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
               'https://surf-report-rouge.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Can I Surf Today?',
    template: '%s | Can I Surf Today?'
  },
  description: 'Real-time AI-powered surf report for St. Augustine, Florida. Get current wave conditions, wind data, and surf recommendations updated 4 times daily.',
  keywords: [
    'surf report',
    'St. Augustine surf',
    'Florida surf conditions', 
    'wave forecast',
    'AI surf report',
    'surf conditions',
    'Vilano Beach',
    'surf forecast AI'
  ],
  
  // Basic metadata
  applicationName: 'Can I Surf Today?',
  authors: [{ name: 'Matt Whalley' }],
  creator: 'Matt Whalley',
  publisher: 'Can I Surf Today?',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // Open Graph metadata for social sharing
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    title: 'Can I Surf Today? St. Augustine, FL',
    description: 'Real-time AI-powered surf conditions for St. Augustine, Florida. Current waves, wind, and surf recommendations.',
    siteName: 'Can I Surf Today?',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Can I Surf Today? logo with wave graphics',
        type: 'image/png',
      },
      {
        url: '/og-image-square.png',
        width: 1200,
        height: 1200,
        alt: 'Can I Surf Today? logo with wave graphics',
        type: 'image/png',
      }
    ],
  },

  // Twitter metadata
  twitter: {
    card: 'summary_large_image',
    title: 'Can I Surf Today?',
    description: 'St. Augustine Surf Report powered by real-time data and AI',
    // site: '@surflab', // Replace with your Twitter handle if you have one
    // creator: '@surflab',
    images: [
      {
        url: '/twitter-image.png',
        alt: 'Can I Surf Today? - St. Augustine surf conditions',
        width: 1200,
        height: 600,
      }
    ],
  },

  // PWA and mobile
  manifest: '/manifest.json',
  
  // Icons
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
  },

  // Additional metadata for better SEO
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verification (add your verification codes if you have them)
  verification: {
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },

  // Category for app stores
  category: 'weather',
  
  // Geographic metadata
  other: {
    'geo.region': 'US-FL',
    'geo.placename': 'St. Augustine, Florida',
    'geo.position': '29.9;-81.3',
    'ICBM': '29.9, -81.3',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0077cc' },
    { media: '(prefers-color-scheme: dark)', color: '#0077cc' },
  ],
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${lacquer.className} antialiased`}>
      <head>
        {/* Additional meta tags for better caching and performance */}
        <meta httpEquiv="Cache-Control" content="public, max-age=300, stale-while-revalidate=600" />
        
        {/* Preconnect to external domains for better performance */}
        <link rel="preconnect" href="https://api.open-meteo.com" />
        <link rel="preconnect" href="https://api.tidesandcurrents.noaa.gov" />
        
        {/* DNS prefetch for fonts */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={baseUrl} />
        
        {/* Additional Open Graph tags for better social sharing */}
        <meta property="og:updated_time" content={new Date().toISOString()} />
        <meta property="article:author" content="Can I Surf Today?" />
        <meta property="article:section" content="Weather" />
        <meta property="article:tag" content="surf,weather,forecast,Florida" />
        
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Can I Surf Today?",
              "description": "Real-time AI-powered surf conditions for St. Augustine, Florida. Current waves, wind, and surf recommendations.",
              "url": baseUrl,
              "applicationCategory": "WeatherApplication",
              "operatingSystem": "Any",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "Can I Surf Today?"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 29.9,
                "longitude": -81.3
              },
              "areaServed": {
                "@type": "City",
                "name": "St. Augustine",
                "addressRegion": "FL",
                "addressCountry": "US"
              }
            })
          }}
        />
      </head>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}