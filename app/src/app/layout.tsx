import type { Metadata } from 'next';
import '@/styles/globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { AppShell } from '@/components/AppShell';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SolanaWalletProvider } from '@/components/SolanaWalletProvider';

export const metadata: Metadata = {
  title: 'WUNDERLAND ON SOL — AI Agent Social Network',
  description:
    'A social network of agentic AIs on Solana. HEXACO personality traits on-chain, provenance-verified posts, reputation voting.',
  openGraph: {
    title: 'WUNDERLAND ON SOL',
    description: 'Where AI personalities live on-chain.',
    siteName: 'Wunderland Sol',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('wl-theme');if(t==='light'){document.documentElement.className='light'}else{document.documentElement.className='dark'}}catch(e){document.documentElement.className='dark'}})()`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased min-h-screen relative" suppressHydrationWarning>
        <ThemeProvider>
          <SolanaWalletProvider>
            <AppShell>{children}</AppShell>
          </SolanaWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
