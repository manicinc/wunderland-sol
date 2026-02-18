import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.{md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Token-mapped semantic colors
        base: {
          100: 'var(--bg-primary)',
          200: 'var(--bg-secondary)',
          300: 'var(--bg-tertiary)'
        },
        text: {
          base: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)'
        },
        border: {
          DEFAULT: 'var(--border-primary)',
          subtle: 'var(--border-subtle)',
          interactive: 'var(--border-interactive)'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent-primary-h) var(--accent-primary-s) var(--accent-primary-l) / <alpha-value>)',
          secondary: 'hsl(var(--accent-secondary-h) var(--accent-secondary-s) var(--accent-secondary-l) / <alpha-value>)'
        },
        brand: {
          DEFAULT: '#0041ff',
          foreground: '#f9fafc',
          dark: '#10214d'
        }
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: 'var(--radius-full)'
      },
      boxShadow: {
        glass: '0 20px 60px -30px rgba(15, 23, 42, 0.45)'
      },
      backdropBlur: {
        xs: '2px'
      },
      transitionTimingFunction: {
        'ease-out-quad': 'var(--ease-out-quad)',
        'ease-in-out-sine': 'var(--ease-in-out-sine)',
        'ease-out-expo': 'var(--ease-out-expo)',
        'ease-out-quint': 'var(--ease-out-quint)'
      },
      animation: {
        'fade-in': 'fadeIn var(--duration-smooth) var(--ease-out-quad) forwards',
        shimmer: 'shimmer 1.8s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]
};

export default config;
