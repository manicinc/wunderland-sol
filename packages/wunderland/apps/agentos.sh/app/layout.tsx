import type { ReactNode } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import '../styles/tokens.css';
import './globals.css';
import { defaultLocale } from '../i18n';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk' });

export default function RootLayout({ children }: { children: ReactNode }) {
  const lang = defaultLocale;
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * { box-sizing: border-box; }
          html, body { width: 100%; margin: 0; padding: 0; }
          html { height: 100%; overflow-x: hidden; background: var(--color-background-primary); }
          body { min-height: 100vh; overflow-x: hidden; background: var(--color-background-primary); color: var(--color-text-primary); }
          
          /* Default Theme Variables (Pre-load) - WCAG AA Compliant */
          :root {
             --color-background-primary: hsl(220, 30%, 98%);
             --color-background-secondary: hsl(220, 25%, 95%);
             --color-background-tertiary: hsl(220, 20%, 92%);
             --color-text-primary: hsl(222, 47%, 8%);
             --color-text-secondary: hsl(220, 35%, 22%);
             --color-text-muted: hsl(220, 25%, 35%);
             --color-accent-primary: hsl(250, 95%, 55%);
             --color-accent-secondary: hsl(280, 85%, 60%);
             --color-accent-tertiary: hsl(340, 85%, 65%);
             --color-accent-hover: hsl(250, 95%, 45%);
             --color-border-subtle: hsl(220, 15%, 85%);
             --color-border-interactive: hsl(250, 50%, 75%);
             --font-grotesk: 'Space Grotesk', system-ui, -apple-system, sans-serif;
          }
          .dark {
             --color-background-primary: hsl(240, 20%, 3%);
             --color-background-secondary: hsl(240, 18%, 8%);
             --color-background-tertiary: hsl(240, 16%, 12%);
             --color-text-primary: hsl(220, 30%, 98%);
             --color-text-secondary: hsl(220, 25%, 85%);
             --color-text-muted: hsl(220, 22%, 72%);
             --color-accent-primary: hsl(250, 100%, 70%);
             --color-accent-secondary: hsl(280, 90%, 75%);
             --color-accent-tertiary: hsl(340, 90%, 70%);
             --color-accent-hover: hsl(250, 100%, 80%);
             --color-border-subtle: hsl(240, 10%, 20%);
             --color-border-interactive: hsl(250, 50%, 45%);
          }
          
          .skip-to-content { position: absolute; left: -9999px; z-index: 999; padding: 1rem 1.5rem; background: var(--color-accent-primary); color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 600; }
          .skip-to-content:focus { left: 1rem; top: 1rem; outline: 2px solid var(--color-accent-secondary); outline-offset: 2px; }
          .skeleton { position: relative; overflow: hidden; background: var(--color-background-secondary); border-radius: 0.5rem; }
          .skeleton::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, var(--color-background-tertiary) 50%, transparent 100%); animation: skeleton-shimmer 2s ease-in-out infinite; }
          @keyframes skeleton-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          
          /* Critical CSS for Hero to prevent FOUC/CLS */
          .hero-critical { display: flex; flex-direction: column; justify-content: center; position: relative; min-height: 100vh; overflow: hidden; background: var(--color-background-primary); }
          .hero-critical > * { position: relative; z-index: 1; }

          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
            .motion-safe {
              animation: none !important;
              transition: none !important;
            }
          }
        `
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${grotesk.variable} grainy min-h-screen antialiased transition-theme bg-background-primary text-text-primary`}
      >
        {children}
      </body>
    </html>
  );
}

