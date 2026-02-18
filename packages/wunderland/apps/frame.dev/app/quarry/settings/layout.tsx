import type { Metadata } from 'next'

/**
 * Settings Page Layout
 * SEO metadata for the settings page
 */
export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure your Quarry Codex preferences. Manage API keys, appearance, vault settings, and integrations.',
  openGraph: {
    title: 'Settings | Quarry Codex',
    description: 'Configure your Quarry Codex preferences and integrations.',
    images: ['/og-codex.png'],
  },
  twitter: {
    card: 'summary',
    title: 'Settings | Quarry Codex',
    description: 'Configure your Quarry Codex preferences.',
  },
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
