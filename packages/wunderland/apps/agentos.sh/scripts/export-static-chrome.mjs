#!/usr/bin/env node
/**
 * Export static HTML fragments (header, footer) and CSS for docs site.
 * Renders React components to static markup so docs.agentos.sh can reuse
 * the exact same navigation and styling without running Next.js.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outDir = path.join(rootDir, 'static-doc-shell')

// Simple static header HTML (no React runtime needed)
const headerHtml = `
<header class="fixed top-0 z-50 w-full transition-all duration-300 transition-theme">
  <div class="absolute inset-0 backdrop-blur-xl border-b border-border-subtle shadow-lg"
       style="background: linear-gradient(135deg, color-mix(in oklab, var(--color-background-primary) 88%, transparent), color-mix(in oklab, var(--color-accent-primary) 14%, transparent) 50%, color-mix(in oklab, var(--color-accent-secondary) 12%, transparent)); background-color: color-mix(in oklab, var(--color-background-primary) 92%, black);"></div>
  
  <div class="relative z-10 w-full">
    <div class="mx-auto flex w-full max-w-7xl items-center justify-between px-3 sm:px-5 lg:px-6 py-3">
      <a href="https://agentos.sh" class="group flex items-center gap-2 transition-all hover:scale-[1.02]">
        <div class="relative">
          <div class="absolute inset-0 bg-accent-primary/20 blur-xl rounded-full animate-pulse-glow"></div>
          <svg class="h-10 relative z-10" viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:var(--color-accent-primary);stop-opacity:1" />
                <stop offset="100%" style="stop-color:var(--color-accent-secondary);stop-opacity:1" />
              </linearGradient>
            </defs>
            <text x="10" y="28" font-family="var(--font-inter), sans-serif" font-size="24" font-weight="700" fill="var(--color-text-primary)">Agent</text>
            <text x="90" y="28" font-family="var(--font-inter), sans-serif" font-size="24" font-weight="700" fill="url(#logo-grad)">OS</text>
          </svg>
        </div>
      </a>

      <nav class="hidden items-center gap-5 lg:gap-7 text-sm font-medium lg:flex" aria-label="Main navigation">
        <a href="https://agentos.sh/#features" class="group relative text-gray-700 hover:text-accent-primary dark:text-white/90 dark:hover:text-white transition-all duration-200 hover:-translate-y-0.5 after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-[color:var(--color-accent-primary)] after:to-[color:var(--color-accent-secondary)] after:transition-all after:duration-300 group-hover:after:w-full font-semibold">Features</a>
        <a href="https://docs.agentos.sh" class="group relative text-gray-700 hover:text-accent-primary dark:text-white/90 dark:hover:text-white transition-all duration-200 hover:-translate-y-0.5 after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-[color:var(--color-accent-primary)] after:to-[color:var(--color-accent-secondary)] after:transition-all after:duration-300 group-hover:after:w-full font-semibold">Docs</a>
        <a href="https://docs.agentos.sh/api" class="group relative text-gray-700 hover:text-accent-primary dark:text-white/90 dark:hover:text-white transition-all duration-200 hover:-translate-y-0.5 after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-[color:var(--color-accent-primary)] after:to-[color:var(--color-accent-secondary)] after:transition-all after:duration-300 group-hover:after:w-full font-semibold">API Reference</a>
        <a href="https://agentos.sh/about" class="group relative text-gray-700 hover:text-accent-primary dark:text-white/90 dark:hover:text-white transition-all duration-200 hover:-translate-y-0.5 after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-[color:var(--color-accent-primary)] after:to-[color:var(--color-accent-secondary)] after:transition-all after:duration-300 group-hover:after:w-full font-semibold">About</a>
      </nav>

      <div class="flex items-center gap-2">
        <a href="https://github.com/framersai/agentos" class="relative hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border-subtle text-text-primary hover:text-accent-primary dark:text-white/90 transition-all duration-300 hover:-translate-y-0.5 group" target="_blank" rel="noopener noreferrer" aria-label="Open AgentOS on GitHub">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          <span class="font-semibold">GitHub</span>
        </a>
      </div>
    </div>
  </div>
</header>
`

const footerHtml = `
<footer class="border-t border-purple-200/30 dark:border-purple-500/20 bg-gradient-to-br from-white/90 via-purple-50/30 to-pink-50/30 dark:from-black/80 dark:via-purple-950/40 dark:to-pink-950/40 backdrop-blur-lg py-12">
  <div class="mx-auto w-full max-w-6xl px-6">
    <div class="grid md:grid-cols-4 gap-8 mb-8">
      <div>
        <h3 class="font-bold text-text-primary mb-3">AgentOS</h3>
        <p class="text-sm text-text-secondary mb-3">
          TypeScript runtime for adaptive AI agents by Frame.dev
        </p>
        <div class="flex gap-3">
          <a href="https://github.com/framersai" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-accent-primary transition-colors" aria-label="FramersAI on GitHub">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            <span class="sr-only">GitHub</span>
          </a>
          <a href="https://www.linkedin.com/company/framersai" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-accent-primary transition-colors" aria-label="FramersAI on LinkedIn">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            <span class="sr-only">LinkedIn</span>
          </a>
          <a href="https://twitter.com/framersai" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-accent-primary transition-colors" aria-label="FramersAI on Twitter">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            <span class="sr-only">Twitter</span>
          </a>
        </div>
      </div>
      <div>
        <h3 class="font-bold text-text-primary mb-3">Resources</h3>
        <ul class="space-y-2 text-sm">
          <li><a href="https://docs.agentos.sh" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-accent-primary transition-colors">Docs (Guides)</a></li>
          <li><a href="https://docs.agentos.sh/api" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-accent-primary transition-colors">API Reference (TypeDoc/TSDoc)</a></li>
          <li><a href="https://agentos.sh/#code" class="text-text-secondary hover:text-accent-primary transition-colors">Examples</a></li>
          <li><a href="https://github.com/framersai/agentos" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-accent-primary transition-colors">GitHub</a></li>
          <li><a href="https://discord.gg/framersai" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-accent-primary transition-colors">Discord</a></li>
        </ul>
      </div>
      <div>
        <h3 class="font-bold text-text-primary mb-3">Company</h3>
        <ul class="space-y-2 text-sm">
          <li><a href="https://agentos.sh/about" class="text-text-secondary hover:text-accent-primary transition-colors">About</a></li>
          <li><a href="https://frame.dev" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-accent-primary transition-colors">Frame.dev</a></li>
          <li><a href="mailto:team@frame.dev" class="text-text-secondary hover:text-accent-primary transition-colors">team@frame.dev</a></li>
        </ul>
      </div>
      <div>
        <h3 class="font-bold text-text-primary mb-3">Legal</h3>
        <ul class="space-y-2 text-sm">
          <li><a href="https://agentos.sh/legal/terms" class="text-text-secondary hover:text-accent-primary transition-colors">Terms</a></li>
          <li><a href="https://agentos.sh/legal/privacy" class="text-text-secondary hover:text-accent-primary transition-colors">Privacy</a></li>
          <li><span class="text-text-secondary">Apache 2.0 (core) + MIT (agents, extensions, guardrails)</span></li>
        </ul>
      </div>
    </div>
    <div class="pt-6 border-t border-purple-200/30 dark:border-purple-500/20 text-center">
      <p class="text-text-secondary">&copy; ${new Date().getFullYear()} Frame.dev. All rights reserved.</p>
    </div>
  </div>
</footer>

<button type="button" id="scroll-to-top" aria-label="Scroll back to top" class="fixed bottom-6 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/90 text-slate-700 shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:border-slate-700 dark:bg-slate-900/90 dark:text-white opacity-0 pointer-events-none">
  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
</button>

<script>
(function() {
  const btn = document.getElementById('scroll-to-top');
  if (!btn) return;
  
  function updateVisibility() {
    if (window.scrollY > 320) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    } else {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    }
  }
  
  window.addEventListener('scroll', updateVisibility, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  updateVisibility();
})();
</script>
`

const headTags = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/tokens.css" />
<link rel="stylesheet" href="/site.css" />
<link rel="stylesheet" href="/site.css" />
<style>
  body { padding-top: 5rem; }
  #scroll-to-top { transition: opacity 0.3s ease; }
</style>
<script>
(function () {
  var key = 'theme';
  var root = document.documentElement;
  try {
    var stored = localStorage.getItem(key);
    var system = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var mode = stored || (system ? 'dark' : 'light');
    if (mode === 'dark') root.classList.add('dark');
    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        root.classList.toggle('dark');
        localStorage.setItem(key, root.classList.contains('dark') ? 'dark' : 'light');
      }
    });
  } catch(_) {}
})();
</script>
`

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  
  await Promise.all([
    fs.writeFile(path.join(outDir, 'head.html'), headTags),
    fs.writeFile(path.join(outDir, 'header.html'), headerHtml),
    fs.writeFile(path.join(outDir, 'footer.html'), footerHtml),
  ])
  
  console.log('✅ Static chrome exported to static-doc-shell/')
  console.log('   - head.html')
  console.log('   - header.html')
  console.log('   - footer.html')
}

main().catch((err) => {
  console.error('❌ Export failed:', err)
  process.exit(1)
})

