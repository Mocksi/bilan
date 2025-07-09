import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '../components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Bilan Dashboard',
  description: 'Trust analytics dashboard for AI products',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
} 