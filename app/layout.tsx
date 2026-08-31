import type { Metadata } from 'next'
import { Bricolage_Grotesque, IBM_Plex_Mono, Public_Sans } from 'next/font/google'
import './globals.css'
import '../styles/tokens.css'

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-display-family',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-family',
})

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-body-family',
})

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
    <html
      lang="en"
      data-mode="dark"
      className={`${bricolageGrotesque.variable} ${ibmPlexMono.variable} ${publicSans.variable}`}
      style={{
        // tokens.css defines --font-display/--font-mono/--font-body as literal
        // font-family strings; point them at next/font's self-hosted faces
        // (with the same fallback stacks) instead of loading Google Fonts via
        // <link> tags, which Next's App Router doesn't manage for you.
        ['--font-display' as string]: 'var(--font-display-family), sans-serif',
        ['--font-mono' as string]: 'var(--font-mono-family), monospace',
        ['--font-body' as string]: 'var(--font-body-family), system-ui, sans-serif',
      }}
    >
      <body>
        <script
          // Runs before paint to avoid a flash of the wrong mode on the
          // public marketing/auth pages, which persist appearance to
          // localStorage (see lib/appearance.ts). Dark is the default (set
          // above on <html>), so this only needs to de-escalate to light
          // when that's what the visitor explicitly chose last time. The
          // board sets data-mode itself once it mounts, so this is
          // harmless there too.
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=localStorage.getItem('noteflow-appearance');if(m==='light')document.documentElement.setAttribute('data-mode','light');}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  )
}
