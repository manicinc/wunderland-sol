import type { Metadata } from 'next'
import './globals.css'
import '@framers/codex-viewer/styles.css'

export const metadata: Metadata = {
  title: 'Codex Template',
  description: 'Starter kit for publishing your own Codex using @framers/codex-viewer.',
  openGraph: {
    title: 'Codex Template',
    description: 'Fork me to bootstrap a fully-themed Codex knowledge base.',
    url: 'https://frame.dev/codex',
    siteName: 'Frame.dev',
    images: [
      {
        url: 'https://frame.dev/og/codex-template.png',
        width: 1200,
        height: 630,
        alt: 'Codex Template preview'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@frame_dev',
    title: 'Codex Template',
    description: 'Analog knowledge OS starter.',
    images: ['https://frame.dev/og/codex-template.png']
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#f8f5ee]">
      <body className="min-h-screen bg-gradient-to-b from-[#fdfbf6] via-[#f8f5ee] to-[#f3efe2] text-gray-900 antialiased selection:bg-amber-200 selection:text-gray-900">
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
          {children}
        </div>
      </body>
    </html>
  )
}

