/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        codex: {
          // Analog paper tones
          paper: {
            light: '#fafaf9',
            dark: '#0a0a0a',
          },
          // Primary text
          text: {
            light: '#0a0a0a',
            dark: '#fafafa',
          },
          // Accent colors (cyan/teal for links, highlights)
          accent: {
            light: '#0891b2', // cyan-600
            dark: '#22d3ee',  // cyan-400
          },
          // Border colors
          border: {
            light: '#d4d4d8', // zinc-300
            dark: '#27272a',  // zinc-800
          },
          // Muted text (metadata, timestamps)
          muted: {
            light: '#71717a', // zinc-500
            dark: '#a1a1aa',  // zinc-400
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Consolas',
          'Monaco',
          'monospace',
        ],
      },
      boxShadow: {
        'analog-light': 'inset 0 2px 8px rgba(0,0,0,0.06), inset 0 -2px 8px rgba(0,0,0,0.03)',
        'analog-dark': 'inset 0 2px 8px rgba(255,255,255,0.03), inset 0 -2px 8px rgba(255,255,255,0.02)',
      },
      backgroundImage: {
        'paper-texture': `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.codex.text.light'),
            '--tw-prose-headings': theme('colors.codex.text.light'),
            '--tw-prose-links': theme('colors.codex.accent.light'),
            '--tw-prose-bold': theme('colors.codex.text.light'),
            '--tw-prose-counters': theme('colors.codex.muted.light'),
            '--tw-prose-bullets': theme('colors.codex.muted.light'),
            '--tw-prose-hr': theme('colors.codex.border.light'),
            '--tw-prose-quotes': theme('colors.codex.text.light'),
            '--tw-prose-quote-borders': theme('colors.codex.accent.light'),
            '--tw-prose-captions': theme('colors.codex.muted.light'),
            '--tw-prose-code': theme('colors.codex.text.light'),
            '--tw-prose-pre-code': theme('colors.codex.text.light'),
            '--tw-prose-pre-bg': theme('colors.gray.900'),
            '--tw-prose-th-borders': theme('colors.codex.border.light'),
            '--tw-prose-td-borders': theme('colors.codex.border.light'),
          },
        },
        invert: {
          css: {
            '--tw-prose-body': theme('colors.codex.text.dark'),
            '--tw-prose-headings': theme('colors.codex.text.dark'),
            '--tw-prose-links': theme('colors.codex.accent.dark'),
            '--tw-prose-bold': theme('colors.codex.text.dark'),
            '--tw-prose-counters': theme('colors.codex.muted.dark'),
            '--tw-prose-bullets': theme('colors.codex.muted.dark'),
            '--tw-prose-hr': theme('colors.codex.border.dark'),
            '--tw-prose-quotes': theme('colors.codex.text.dark'),
            '--tw-prose-quote-borders': theme('colors.codex.accent.dark'),
            '--tw-prose-captions': theme('colors.codex.muted.dark'),
            '--tw-prose-code': theme('colors.codex.text.dark'),
            '--tw-prose-pre-code': theme('colors.codex.text.dark'),
            '--tw-prose-pre-bg': theme('colors.gray.950'),
            '--tw-prose-th-borders': theme('colors.codex.border.dark'),
            '--tw-prose-td-borders': theme('colors.codex.border.dark'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

