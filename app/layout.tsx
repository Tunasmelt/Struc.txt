import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NoteFlow',
  description: 'Turn rough input into structured notes on a corkboard',
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
