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

export const metadata: Metadata = {
  title: 'Dutch - AI Surf Report',
  description: 'St. Augustine, FL surf report powered by AI',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${lacquer.className} antialiased`}>
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