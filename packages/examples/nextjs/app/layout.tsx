import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bilan SDK Example',
  description: 'Example integration of Bilan SDK with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
} 