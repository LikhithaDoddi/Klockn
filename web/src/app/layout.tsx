import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Klockn — Group Scheduling & AI Booking App',
  description:
    'Klockn is a privacy-first group scheduling app. Connect your calendar, build groups, and let AI find the moment everyone is free — then book hotels, flights, tickets, and rides for the whole group.',
  keywords: [
    'group scheduling',
    'family calendar',
    'AI scheduling',
    'travel companion',
    'shared availability',
    'group calendar',
    'AI booking',
    'when is everyone free',
    'group travel planner',
    'family trip planner',
  ],
  metadataBase: new URL('https://klockn.com'),
  alternates: { canonical: 'https://klockn.com' },
  openGraph: {
    title: 'Klockn — Finally, a time that works for everyone.',
    description:
      'Share your calendar. Let AI find the moment everyone is free. Book hotels, rides, and tickets for the whole group.',
    url: 'https://klockn.com',
    siteName: 'Klockn',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Klockn group scheduling app' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Klockn — Finally, a time that works for everyone.',
    description:
      'Share your calendar. Let AI find the moment everyone is free. Book hotels, rides, and tickets for the whole group.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
