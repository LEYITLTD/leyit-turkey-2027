import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: 'Light Upon Light — Turkey 2027',
  description: 'Event booking platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
