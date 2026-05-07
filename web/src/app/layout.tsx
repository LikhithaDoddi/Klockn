// Root layout — wraps every page with global providers
// Auth state, query client, and toast notifications live here

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Klockn — Availability-First Event Scheduling',
  description: 'Find the best date for your event before you publish it.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* TODO: wrap with <AuthProvider>, <QueryClientProvider>, <ToastProvider> */}
        {children}
      </body>
    </html>
  )
}
