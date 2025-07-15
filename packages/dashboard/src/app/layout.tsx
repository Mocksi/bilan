import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bilan Analytics Dashboard',
  description: 'Trust analytics and insights for your AI-powered application',
  icons: {
    icon: '/favicon.ico',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
} 