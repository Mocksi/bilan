import type { Metadata } from 'next'
import '../assets/css/tabler.min.css'

export const metadata: Metadata = {
  title: 'Bilan Analytics Dashboard',
  description: 'Trust analytics for your AI-powered application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 