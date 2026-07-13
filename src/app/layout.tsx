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
               'https://canisurf.today';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Can I Surf Today?',
    template: '%s | Can I Surf Today?'
  },
  description: 'Real-time AI-powered surf reports for US surf spots — St. Augustine, Rockaway Beach, Huntington Beach, and more. Updated 4 times daily.',
  keywords: [
    'surf report',
    'surf conditions',
    'wave forecast',
    'AI surf report',
    'surf forecast AI',
    'can I surf today',
    'St. Augustine surf',
    'Rockaway Beach surf',
    'Huntington Beach surf',
    'Oahu surf',
    'Florida surf conditions',
  ],
  
  // Basic metadata
  applicationName: 'Can I Surf Today?',
  authors: [{ name: 'Can I Surf Today' }],
  creator: 'Can I Surf Today',
  publisher: 'Can I Surf Today',
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
    title: 'Can I Surf Today?',
    description: 'Real-time AI-powered surf reports for US surf spots. Current waves, wind, and surf recommendations updated 4 times daily.',
    siteName: 'Can I Surf Today?',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Can I Surf Today? - St. Augustine surf conditions with wave and weather data',
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
    description: 'Real-time AI surf reports for US surf spots. Current waves, wind, and surf recommendations updated 4 times daily.',
    site: '@canisurftoday', // Replace with your Twitter handle if you have one
    creator: '@canisurftoday',
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
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#ffffff' },
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
        {/* DNS prefetch for fonts */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="/" />
        
        {/* Additional Open Graph tags for better social sharing */}
        <meta property="og:updated_time" content={new Date().toISOString()} />
        <meta property="article:author" content="Surf Lab" />
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
              "description": "Real-time AI-powered surf report for St. Augustine, Florida",
              "url": "/",
              "applicationCategory": "WeatherApplication",
              "operatingSystem": "Any",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "Can I Surf Today"
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