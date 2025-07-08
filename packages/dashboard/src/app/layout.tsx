import type { Metadata } from 'next'
import './globals.css'

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
        {children}
      </body>
    </html>
  )
} 