import fs from 'node:fs'
import path from 'node:path'
import type { Config } from 'tailwindcss'

function loadCodexPreset() {
  const candidates = [
    path.resolve(__dirname, '../../packages/codex-viewer/tailwind.config.js'), // local dev
    path.resolve(process.cwd(), 'packages/codex-viewer/tailwind.config.js'), // repo root (CI)
    path.resolve(process.cwd(), '../packages/codex-viewer/tailwind.config.js'), // nested runner paths
    path.resolve(process.cwd(), '../../packages/codex-viewer/tailwind.config.js'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(candidate)
    }
  }

  console.warn('[tailwind] codex-viewer preset not found, proceeding without it.')
  return {}
}

const codexConfig = loadCodexPreset()

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/codex-viewer/src/**/*.{js,ts,jsx,tsx}', // Include codex-viewer components
  ],
  darkMode: 'class',
  presets: [codexConfig as Config], // Extend codex theme
  theme: {
    // Custom breakpoints for small mobile and ultrawide screens
    screens: {
      xs: '320px', // Very small mobile (iPhone SE)
      sm: '375px', // Standard mobile
      md: '768px', // Tablet portrait
      lg: '1024px', // Tablet landscape / small desktop
      xl: '1280px', // Desktop
      '2xl': '1536px', // Large desktop
      '3xl': '1920px', // Full HD
      '4k': '2560px', // 4K / Ultrawide
    },
    extend: {
      // Touch target utilities for accessibility (WCAG AA: 44px minimum)
      minWidth: {
        touch: '44px',
        'touch-lg': '48px',
      },
      minHeight: {
        touch: '44px',
        'touch-lg': '48px',
      },
      colors: {
        // Futuristic Monochromatic Palette
        obsidian: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Sophisticated paper palette (kept for legacy support if needed, but deemphasized)
        paper: {
          50: '#FDFCFB',
          100: '#FAF8F6',
          200: '#F5F2ED',
          300: '#EDE8E0',
          400: '#DDD4C4',
          500: '#C9BAA0',
          600: '#A89374',
          700: '#8A7358',
          800: '#6B5A45',
          900: '#4A3F31',
          950: '#2A241C',
        },
        ink: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
        frame: {
          green: '#00C896',
          'green-light': '#00F4B4',
          'green-dark': '#009A74',
          'green-glow': '#00FFB8',
          accent: '#FF6B6B',
          'accent-light': '#FF9999',
        },
        // Quarry monochromatic palette
        quarry: {
          charcoal: '#1a1a1a',
          'charcoal-deep': '#0F0F0F',
          offwhite: '#F5F5F5',
          green: {
            50: '#7DDBA3',
            100: '#4FCA85',
            300: '#34C77A',
            500: '#2DB86A',
            700: '#22A55D',
            900: '#1A7F4B',
          },
        },
      },
      fontFamily: {
        'display': ['var(--font-fraunces)', 'Fraunces', 'Georgia', 'serif'],
        'sans': ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        'mono': ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
        'brand': ['var(--font-fraunces)', 'Fraunces', 'Georgia', 'serif'],
        'handwriting': ['var(--font-caveat)', 'Caveat', 'cursive'],
      },
      fontSize: {
        'responsive-xs': 'clamp(0.75rem, 1vw, 0.875rem)',
        'responsive-sm': 'clamp(0.875rem, 1.2vw, 1rem)',
        'responsive-base': 'clamp(1rem, 1.5vw, 1.125rem)',
        'responsive-lg': 'clamp(1.125rem, 2vw, 1.25rem)',
        'responsive-xl': 'clamp(1.25rem, 2.5vw, 1.5rem)',
        'responsive-2xl': 'clamp(1.5rem, 3vw, 2rem)',
        'responsive-3xl': 'clamp(1.875rem, 4vw, 2.5rem)',
        'responsive-4xl': 'clamp(2.25rem, 5vw, 3rem)',
        'responsive-5xl': 'clamp(3rem, 6vw, 4rem)',
        'responsive-6xl': 'clamp(3.75rem, 7vw, 5rem)',
        'responsive-7xl': 'clamp(4.5rem, 8vw, 6rem)',
      },
      boxShadow: {
        'paper': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        'paper-hover': '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
        'paper-lifted': '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)',
        'inner-glow': 'inset 0 0 20px rgba(0, 200, 150, 0.1)',
        'frame-glow': '0 0 40px rgba(0, 200, 150, 0.3)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'neon': '0 0 10px rgba(0, 255, 184, 0.5), 0 0 20px rgba(0, 255, 184, 0.3)',
        // Card shadows for depth and luminance
        'card-subtle': '0 2px 8px rgba(0,0,0,0.08)',
        'card-elevated': '0 8px 24px rgba(0,0,0,0.12)',
        'card-floating': '0 16px 48px rgba(0,0,0,0.18)',
        'card-inset': 'inset 0 2px 4px rgba(0,0,0,0.06)',
        // Luminous glows for accent colors
        'luminous-emerald': '0 0 40px rgba(16,185,129,0.15)',
        'luminous-cyan': '0 0 40px rgba(6,182,212,0.15)',
        'luminous-purple': '0 0 40px rgba(168,85,247,0.15)',
        'luminous-amber': '0 0 40px rgba(245,158,11,0.15)',
        // Neuromorphic shadows for Quarry
        'neuro-light': '8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.8)',
        'neuro-dark': '8px 8px 16px rgba(0,0,0,0.4), -8px -8px 16px rgba(50,50,50,0.3)',
        'neuro-inset-light': 'inset 4px 4px 8px rgba(0,0,0,0.08), inset -4px -4px 8px rgba(255,255,255,0.7)',
        'neuro-inset-dark': 'inset 4px 4px 8px rgba(0,0,0,0.35), inset -4px -4px 8px rgba(50,50,50,0.2)',
        'neuro-sm-light': '4px 4px 8px rgba(0,0,0,0.06), -4px -4px 8px rgba(255,255,255,0.7)',
        'neuro-sm-dark': '4px 4px 8px rgba(0,0,0,0.3), -4px -4px 8px rgba(50,50,50,0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'rotate-in': 'rotateIn 0.5s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'draw-line': 'drawLine 1s ease-out forwards',
        'unfold': 'unfold 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'page-turn': 'pageTurn 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        rotateIn: {
          '0%': { transform: 'rotate(-180deg) scale(0)', opacity: '0' },
          '100%': { transform: 'rotate(0) scale(1)', opacity: '1' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        pulseGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 200, 150, 0.2)',
            borderColor: 'rgba(0, 200, 150, 0.3)'
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(0, 200, 150, 0.4)',
            borderColor: 'rgba(0, 200, 150, 0.6)'
          }
        },
        drawLine: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' }
        },
        unfold: {
          '0%': { 
            transform: 'perspective(1000px) rotateX(-90deg)',
            opacity: '0'
          },
          '100%': { 
            transform: 'perspective(1000px) rotateX(0)',
            opacity: '1'
          }
        },
        pageTurn: {
          '0%': {
            transform: 'perspective(1000px) rotateY(-90deg)',
            transformOrigin: 'left center'
          },
          '100%': {
            transform: 'perspective(1000px) rotateY(0)',
            transformOrigin: 'left center'
          }
        },
        shake: {
          '10%, 90%': { transform: 'translateX(-1px)' },
          '20%, 80%': { transform: 'translateX(2px)' },
          '30%, 50%, 70%': { transform: 'translateX(-4px)' },
          '40%, 60%': { transform: 'translateX(4px)' },
        }
      },
      backgroundImage: {
        'paper-texture': "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"%3E%3Cfilter id=\"paper\"%3E%3CfeTurbulence baseFrequency=\"0.04\" numOctaves=\"5\" /%3E%3C/filter%3E%3Crect width=\"100\" height=\"100\" filter=\"url(%23paper)\" opacity=\"0.015\" /%3E%3C/svg%3E')",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
export default config