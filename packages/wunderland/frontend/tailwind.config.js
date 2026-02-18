/* tailwindcss-intellisense-disable */
// File: frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

/**
 * @file tailwind.config.js
 * @description Tailwind CSS configuration for the "Ephemeral Harmony" design system.
 * Integrates with SCSS-driven CSS custom properties for dynamic theming.
 * Defines core typography, extended shadows for neomorphic/holographic effects,
 * and new animations, providing a rich utility set for the application.
 * @version 2.0.0
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Relies on a 'dark' class on the html element, managed by ThemeManager.ts
  theme: {
    extend: {
      colors: {
        // Token aliases for cross-app consistency
        base: {
          100: 'var(--bg-primary)',
          200: 'var(--bg-secondary)',
          300: 'var(--bg-tertiary)',
        },
        text: {
          base: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border-primary)',
          subtle: 'var(--border-subtle)',
          interactive: 'var(--border-interactive)',
        },
        // Primary color with shades
        primary: {
          light: 'hsl(var(--color-accent-primary-light-h, var(--color-accent-primary-h)) var(--color-accent-primary-light-s, var(--color-accent-primary-s)) var(--color-accent-primary-light-l, calc(var(--color-accent-primary-l) + 15%)) / <alpha-value>)', // Lighter shade
          DEFAULT: 'hsl(var(--color-accent-primary-h) var(--color-accent-primary-s) var(--color-accent-primary-l) / <alpha-value>)', // Main shade
          dark: 'hsl(var(--color-accent-primary-dark-h, var(--color-accent-primary-h)) var(--color-accent-primary-dark-s, var(--color-accent-primary-s)) var(--color-accent-primary-dark-l, calc(var(--color-accent-primary-l) - 10%)) / <alpha-value>)', // Darker shade
          // If you need specific numeric shades like -400, -500, -600, you define them here
          // and ensure corresponding CSS vars exist in your themes or derive them.
          // For example, if your theme defines --color-accent-primary-400-h/s/l:
          // 400: 'hsl(var(--color-accent-primary-400-h) var(--color-accent-primary-400-s) var(--color-accent-primary-400-l) / <alpha-value>)',
          // 500: 'hsl(var(--color-accent-primary-500-h) var(--color-accent-primary-500-s) var(--color-accent-primary-500-l) / <alpha-value>)', // This could be your DEFAULT
        },
        'primary-focus': 'hsl(var(--color-accent-primary-h) calc(var(--color-accent-primary-s) + 5%) calc(var(--color-accent-primary-l) + 8%) / <alpha-value>)', // Kept for specific focus if needed
        'primary-content': 'hsl(var(--color-text-on-primary-h) var(--color-text-on-primary-s) var(--color-text-on-primary-l) / <alpha-value>)',

        // Secondary color (can also be defined with shades)
        secondary: {
            DEFAULT: 'hsl(var(--color-accent-secondary-h) var(--color-accent-secondary-s) var(--color-accent-secondary-l) / <alpha-value>)',
        },
        'secondary-focus': 'hsl(var(--color-accent-secondary-h) calc(var(--color-accent-secondary-s) + 5%) calc(var(--color-accent-secondary-l) + 8%) / <alpha-value>)',
        'secondary-content': 'hsl(var(--color-text-on-secondary-h) var(--color-text-on-secondary-s) var(--color-text-on-secondary-l) / <alpha-value>)',
        
        accent: 'hsl(var(--color-accent-primary-h) var(--color-accent-primary-s) var(--color-accent-primary-l) / <alpha-value>)',


        neutral: 'hsl(var(--color-bg-secondary-h) var(--color-bg-secondary-s) var(--color-bg-secondary-l) / <alpha-value>)',
        'neutral-focus': 'hsl(var(--color-bg-secondary-h) var(--color-bg-secondary-s) calc(var(--color-bg-secondary-l) - 8%) / <alpha-value>)',

        // Using your extended base colors
        'base-100': 'hsl(var(--color-bg-primary-h) var(--color-bg-primary-s) var(--color-bg-primary-l) / <alpha-value>)',
        'base-200': 'hsl(var(--color-bg-secondary-h) var(--color-bg-secondary-s) var(--color-bg-secondary-l) / <alpha-value>)',
        'base-300': 'hsl(var(--color-bg-tertiary-h) var(--color-bg-tertiary-s) var(--color-bg-tertiary-l) / <alpha-value>)',
        'base-400': 'hsl(var(--color-bg-quaternary-h, var(--color-bg-tertiary-h)) var(--color-bg-quaternary-s, var(--color-bg-tertiary-s)) var(--color-bg-quaternary-l, calc(var(--color-bg-tertiary-l) - 5%)) / <alpha-value>)',
        'base-500': 'hsl(var(--color-bg-quinary-h, var(--color-bg-tertiary-h)) var(--color-bg-quinary-s, var(--color-bg-tertiary-s)) var(--color-bg-quinary-l, calc(var(--color-bg-tertiary-l) - 10%)) / <alpha-value>)',
        'base-600': 'hsl(var(--color-bg-senary-h, var(--color-bg-tertiary-h)) var(--color-bg-senary-s, var(--color-bg-tertiary-s)) var(--color-bg-senary-l, calc(var(--color-bg-tertiary-l) - 15%)) / <alpha-value>)',
        'base-content': 'hsl(var(--color-text-primary-h) var(--color-text-primary-s) var(--color-text-primary-l) / <alpha-value>)',

        info: 'hsl(var(--color-info-h) var(--color-info-s) var(--color-info-l) / <alpha-value>)',
        success: 'hsl(var(--color-success-h) var(--color-success-s) var(--color-success-l) / <alpha-value>)',
        warning: 'hsl(var(--color-warning-h) var(--color-warning-s) var(--color-warning-l) / <alpha-value>)',
        error: 'hsl(var(--color-error-h) var(--color-error-s) var(--color-error-l) / <alpha-value>)',
        
        'glass-bg': 'var(--color-bg-glass, hsla(220, 25%, 95%, 0.5))',
        'glass-border': 'var(--color-border-glass, hsla(220, 25%, 80%, 0.3))',

        'voice-user': 'hsl(var(--color-voice-user-h) var(--color-voice-user-s) var(--color-voice-user-l) / <alpha-value>)',
        'voice-ai': 'hsl(var(--color-voice-ai-h) var(--color-voice-ai-s) var(--color-voice-ai-l) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans, Inter)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
        mono: ['var(--font-mono, JetBrains Mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        display: ['var(--font-display, Lexend Deca)', 'var(--font-sans, Inter)', 'sans-serif'], // Lexend Deca as primary display
      },
      borderRadius: {
        'xs': 'var(--radius-xs, 0.125rem)',
        'sm': 'var(--radius-sm, 0.25rem)',
        'md': 'var(--radius-md, 0.375rem)',
        'lg': 'var(--radius-lg, 0.5rem)',
        'xl': 'var(--radius-xl, 0.75rem)',
        '2xl': 'var(--radius-2xl, 1rem)',
        '3xl': 'var(--radius-3xl, 1.5rem)',
        'full': 'var(--radius-full, 9999px)',
        'holo': 'var(--radius-holo, 0.625rem)', // Custom radius for holographic elements
      },
      spacing: { // Matches SCSS variables
        'spacing-unit': 'var(--spacing-unit, 0.25rem)', // 4px
        'header-h': 'var(--header-height, 4.5rem)',
        'footer-h': 'var(--footer-height, 3.5rem)',
        'chat-log-h': 'var(--chat-log-height, 200px)',
      },
      height: {
        'header': 'var(--header-height, 4.5rem)',
        'footer': 'var(--footer-height, 3.5rem)',
      },
      minHeight: {
        'header': 'var(--header-height, 4.5rem)',
        'footer': 'var(--footer-height, 3.5rem)',
      },
      boxShadow: {
        // Neomorphic shadows (theme-dependent via CSS vars in SCSS)
        'neo-sm': 'var(--shadow-neo-sm)',
        'neo-md': 'var(--shadow-neo-md)',
        'neo-lg': 'var(--shadow-neo-lg)',
        'neo-inset-sm': 'var(--shadow-neo-inset-sm)',
        'neo-inset-md': 'var(--shadow-neo-inset-md)',
        // Holographic glows
        'holo-glow-sm': '0 0 8px 1px var(--color-accent-glow, hsla(180, 90%, 60%, 0.4))',
        'holo-glow-md': '0 0 15px 3px var(--color-accent-glow, hsla(180, 90%, 60%, 0.5))',
        'holo-glow-lg': '0 0 25px 5px var(--color-accent-glow, hsla(180, 90%, 60%, 0.6))',
        // Standard shadows for depth (can also be theme-dependent)
        'depth-sm': '0 2px 4px hsla(var(--shadow-color-h, 0) var(--shadow-color-s, 0%) var(--shadow-color-l, 0%) / var(--shadow-opacity-sm, 0.05))',
        'depth-md': '0 5px 10px hsla(var(--shadow-color-h, 0) var(--shadow-color-s, 0%) var(--shadow-color-l, 0%) / var(--shadow-opacity-md, 0.1))',
        'depth-lg': '0 10px 20px hsla(var(--shadow-color-h, 0) var(--shadow-color-s, 0%) var(--shadow-color-l, 0%) / var(--shadow-opacity-lg, 0.15))',
      },
      opacity: {
        '15': '0.15',
        '35': '0.35',
        '65': '0.65',
        '85': '0.85',
      },
      animation: {
        // Core UI
        'fade-in': 'fadeIn var(--duration-smooth) var(--ease-out-quad) forwards',
        'fade-out': 'fadeOut var(--duration-smooth) var(--ease-out-quad) forwards',
        'slide-in-up': 'slideInUp var(--duration-movement) var(--ease-out-expo) forwards',
        'slide-in-down': 'slideInDown var(--duration-movement) var(--ease-out-expo) forwards',
        'subtle-pulse': 'subtlePulse var(--duration-pulse-slow) var(--ease-in-out-sine) infinite',
        'subtle-glow': 'subtleGlow var(--duration-pulse-medium) var(--ease-in-out-sine) infinite alternate',
        // Holographic & Ephemeral
        'holo-shimmer': 'holoShimmer var(--duration-pulse-long) linear infinite',
        'ephemeral-appear': 'ephemeralAppear var(--duration-movement) var(--ease-out-quint) forwards',
        'ephemeral-vanish': 'ephemeralVanish var(--duration-movement) var(--ease-in-quint) forwards',
        // Voice Visualization
        'voice-aura-pulse': 'voiceAuraPulse var(--duration-pulse-medium) var(--ease-out-sine) infinite',
        'voice-light-streak': 'voiceLightStreak var(--duration-pulse-fast) linear infinite',
      },
      keyframes: {
        fadeIn: { 'from': { opacity: '0' }, 'to': { opacity: '1' } },
        fadeOut: { 'from': { opacity: '1' }, 'to': { opacity: '0' } },
        slideInUp: { 'from': { opacity: '0', transform: 'translateY(20px)' }, 'to': { opacity: '1', transform: 'translateY(0)' } },
        slideInDown: { 'from': { opacity: '0', transform: 'translateY(-20px)' }, 'to': { opacity: '1', transform: 'translateY(0)' } },
        subtlePulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: 'var(--opacity-start, 1)' },
          '50%': { transform: 'scale(var(--scale-pulse, 1.02))', opacity: 'var(--opacity-pulse, 0.85)' },
        },
        subtleGlow: { // For text or small elements
          'from': { textShadow: '0 0 4px var(--color-accent-glow)' },
          'to': { textShadow: '0 0 10px var(--color-accent-glow), 0 0 1px var(--color-accent-glow)' },
        },
        holoShimmer: { // For background gradients or borders
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        ephemeralAppear: {
          'from': { opacity: '0', transform: 'scale(0.9) translateY(10px)' },
          'to': { opacity: 'var(--opacity-final, 0.85)', transform: 'scale(1) translateY(0)' }
        },
        ephemeralVanish: {
          'from': { opacity: 'var(--opacity-start, 0.85)', transform: 'scale(1) translateY(0)' },
          'to': { opacity: '0', transform: 'scale(0.9) translateY(-10px)' }
        },
        voiceAuraPulse: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { opacity: 'var(--voice-pulse-opacity, 0.5)' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        voiceLightStreak: { // Example for more dynamic visualization
          '0%': { transform: 'translateY(-100%)', opacity: '0.7' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
      },
      backgroundImage: {
        'holo-grid-pattern': 'var(--bg-holo-grid-pattern)', // Defined in SCSS
        'noise-texture': 'var(--bg-noise-texture)', // Defined in SCSS
      },
      transitionTimingFunction: {
        'ease-out-quint': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'ease-in-out-sine': 'cubic-bezier(0.37, 0, 0.63, 1)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms')({ strategy: 'class' }),
    plugin(function ({ addUtilities, theme, addComponents, e }) {
      const iconSizes = {
        '.icon-xs': { width: theme('spacing')['3.5'], height: theme('spacing')['3.5'] },
        '.icon-sm': { width: theme('spacing')['4'], height: theme('spacing')['4'] },
        '.icon-base': { width: theme('spacing')['5'], height: theme('spacing')['5'] },
        '.icon-lg': { width: theme('spacing')['6'], height: theme('spacing')['6'] },
        '.icon-xl': { width: theme('spacing')['8'], height: theme('spacing')['8'] },
      };
      addUtilities(iconSizes);

      const motionSafeUtilities = {
        '.motion-safe-transition': { '@media (prefers-reduced-motion: no-preference)': { transitionProperty: theme('transitionProperty.DEFAULT'), transitionTimingFunction: theme('transitionTimingFunction.DEFAULT'), transitionDuration: theme('transitionDuration.DEFAULT') } },
      };
      addUtilities(motionSafeUtilities);

      addComponents({ // Add this block for the btn class
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`, // Example padding
          borderRadius: theme('borderRadius.md'), // Example border-radius
          fontWeight: theme('fontWeight.medium'),
          // Add other default styles for your button here
          // For example, background, text color, hover states, etc.
          
          // You can also add variants like .btn-primary, .btn-secondary
          // based on your extended colors in tailwind.config.js
        },
        '.btn-primary': {
            // Styles for primary button, could @apply the base .btn or extend it
            backgroundColor: 'hsl(var(--color-accent-primary-h) var(--color-accent-primary-s) var(--color-accent-primary-l) / var(--color-accent-primary-a))',
          color: 'hsl(var(--color-text-on-primary-h) var(--color-text-on-primary-s) var(--color-text-on-primary-l) / var(--color-text-on-primary-a))',
          '&:hover': {
            backgroundColor: 'hsl(var(--color-accent-primary-h) var(--color-accent-primary-s) calc(var(--color-accent-primary-l) - 5%) / var(--color-accent-primary-a))',
          },
        },
        '.btn-secondary': {
          backgroundColor: 'hsl(var(--color-accent-secondary-h) var(--color-accent-secondary-s) var(--color-accent-secondary-l) / var(--color-accent-secondary-a))',
          color: 'hsl(var(--color-text-on-secondary-h) var(--color-text-on-secondary-s) var(--color-text-on-secondary-l) / var(--color-text-on-secondary-a))',
          '&:hover': {
            backgroundColor: 'hsl(var(--color-accent-secondary-h) var(--color-accent-secondary-s) calc(var(--color-accent-secondary-l) - 5%) / var(--color-accent-secondary-a))',
          },
        },
        // Custom Scrollbar for Futuristic theme
        '.custom-scrollbar-futuristic': {
          // Define webkit scrollbar styles directly
          '&::-webkit-scrollbar': {
            width: theme('width')['1.5'], // Use theme values
            height: theme('height')['1.5'], // Use theme values
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'hsla(var(--neutral-hue, 220), 20%, 20%, 0.3)',
            borderRadius: theme('borderRadius.full'), // Use theme values
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'hsla(var(--agent-interviewer-accent-hue), calc(var(--agent-interviewer-accent-saturation) + 15%), calc(var(--agent-interviewer-accent-lightness) + 10%), 0.6)',
            borderRadius: theme('borderRadius.full'), // Use theme values
            border: '1px solid hsla(var(--neutral-hue, 220), 20%, 15%, 0.5)',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'hsla(var(--agent-interviewer-accent-hue), calc(var(--agent-interviewer-accent-saturation) + 15%), calc(var(--agent-interviewer-accent-lightness) + 10%), 0.8)',
          },
          // Standard scrollbar properties (Firefox)
          'scrollbarWidth': 'thin',
          'scrollbarColor': 'hsla(var(--agent-interviewer-accent-hue), calc(var(--agent-interviewer-accent-saturation) + 15%), calc(var(--agent-interviewer-accent-lightness) + 10%), 0.6) hsla(var(--neutral-hue, 220), 20%, 20%, 0.3)',
        },
        // Custom Scrollbar for Nerf
        '.nerf-scrollbar': {
          // Define webkit scrollbar styles directly
          '&::-webkit-scrollbar': {
            width: theme('width')['2'], // Use theme values
            height: theme('height')['2'], // Use theme values
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'hsla(var(--neutral-hue, 220), 15%, 15%, 0.3)',
            borderRadius: theme('borderRadius.full'), // Use theme values
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'hsla(var(--agent-nerf-accent-hue), var(--agent-nerf-accent-saturation), var(--agent-nerf-accent-lightness), 0.6)',
            borderRadius: theme('borderRadius.full'), // Use theme values
            border: '2px solid hsla(var(--neutral-hue, 220), 15%, 15%, 0.3)',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'var(--agent-nerf-accent-color)',
          },
          // Standard scrollbar properties (Firefox)
          'scrollbarWidth': 'auto', // Or 'thin'
          'scrollbarColor': 'hsla(var(--agent-nerf-accent-hue), var(--agent-nerf-accent-saturation), var(--agent-nerf-accent-lightness), 0.6) hsla(var(--neutral-hue, 220), 15%, 15%, 0.3)',
        },
        // Custom Scrollbar for Thin variant
        '.custom-scrollbar-thin': {
          // Define webkit scrollbar styles directly
          '&::-webkit-scrollbar': {
            width: theme('width')['1'], // Very thin
            height: theme('height')['1'], // Very thin
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'hsla(var(--neutral-hue, 220), 10%, 10%, 0.2)', // Lighter track for thin look
            borderRadius: theme('borderRadius.full'),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.5)', // Use a general accent color
            borderRadius: theme('borderRadius.full'),
            border: '0.5px solid hsla(var(--neutral-hue, 220), 10%, 15%, 0.3)', // Very subtle border
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.7)',
          },
          // Standard scrollbar properties (Firefox)
          'scrollbarWidth': 'thin',
          'scrollbarColor': 'hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.5) hsla(var(--neutral-hue, 220), 10%, 10%, 0.2)',
        },
        // Custom Scrollbar for Architectron (Updated with new styles)
        '.architectron-scrollbar': {
          '&::-webkit-scrollbar': {
            width: theme('width')['2'],
            height: theme('height')['2'],
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'hsla(var(--neutral-hue, 230), 20%, 18%, 0.4)',
            borderRadius: theme('borderRadius.full'),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.65)',
            borderRadius: theme('borderRadius.full'),
            border: '2px solid hsla(var(--neutral-hue, 230), 20%, 18%, 0.4)',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'var(--agent-architectron-accent-color)',
          },
          'scrollbarWidth': 'auto',
          'scrollbarColor': 'hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.65) hsla(var(--neutral-hue, 230), 20%, 18%, 0.4)',
        },
      });
    }),
  ],
};