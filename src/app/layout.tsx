import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google'
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: 'SURF LAB',
  description: 'Real-time surf conditions with wave visualization',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SURF LAB',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0077cc',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className={`
        font-sans 
        text-black 
        min-h-screen 
        transition-all 
        duration-[3000ms] 
        bg-white 
        overflow-x-hidden 
        antialiased
      `}>
        {children}
      </body>
    </html>
  )
}