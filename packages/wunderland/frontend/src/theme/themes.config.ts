// File: frontend/src/theme/themes.config.ts
/**
 * @file themes.config.ts
 * @description Defines the TypeScript interfaces, array of available theme definitions,
 * and default theme ID constants for the "Ephemeral Harmony v3.0" application.
 * This configuration is used by the ThemeManager to understand and apply themes.
 * @role Provides type safety, a structured list of themes, and centralizes default theme IDs.
 * @version 3.2.2 - Fixed interface naming error
 */

export const DEFAULT_OVERALL_THEME_ID = 'sakura-sunset';
export const DEFAULT_DARK_THEME_ID = 'sakura-sunset';
export const DEFAULT_LIGHT_THEME_ID = 'aurora-daybreak';

export interface ThemeCssVariableMap {
  // Font Families
  '--font-family-sans'?: string;
  '--font-family-mono'?: string;
  '--font-family-display'?: string;
  '--font-family-retro-sans'?: string;
  '--font-family-retro-mono'?: string;

  // Background Colors
  '--color-bg-primary-h': string; '--color-bg-primary-s': string; '--color-bg-primary-l': string; '--color-bg-primary-a'?: string;
  '--color-bg-secondary-h': string; '--color-bg-secondary-s': string; '--color-bg-secondary-l': string; '--color-bg-secondary-a'?: string;
  '--color-bg-tertiary-h': string; '--color-bg-tertiary-s': string; '--color-bg-tertiary-l': string; '--color-bg-tertiary-a'?: string;
  '--color-bg-quaternary-h'?: string; '--color-bg-quaternary-s'?: string; '--color-bg-quaternary-l'?: string; '--color-bg-quaternary-a'?: string;
  '--color-bg-quinary-h'?: string; '--color-bg-quinary-s'?: string; '--color-bg-quinary-l'?: string; '--color-bg-quinary-a'?: string;
  '--color-bg-senary-h'?: string; '--color-bg-senary-s'?: string; '--color-bg-senary-l'?: string; '--color-bg-senary-a'?: string;

  '--color-bg-glass-h': string; '--color-bg-glass-s': string; '--color-bg-glass-l': string; '--color-bg-glass-a': string;
  '--color-border-glass-h': string; '--color-border-glass-s': string; '--color-border-glass-l': string; '--color-border-glass-a': string;
  '--blur-glass': string;
  '--color-bg-holographic-accent-h'?: string; '--color-bg-holographic-accent-s'?: string; '--color-bg-holographic-accent-l'?: string; '--color-bg-holographic-accent-a'?: string;

  // Text Colors
  '--color-text-primary-h': string; '--color-text-primary-s': string; '--color-text-primary-l': string; '--color-text-primary-a'?: string;
  '--color-text-secondary-h': string; '--color-text-secondary-s': string; '--color-text-secondary-l': string; '--color-text-secondary-a'?: string;
  '--color-text-muted-h': string; '--color-text-muted-s': string; '--color-text-muted-l': string; '--color-text-muted-a'?: string;
  '--color-input-placeholder-focused-h'?: string; '--color-input-placeholder-focused-s'?: string; '--color-input-placeholder-focused-l'?: string; '--color-input-placeholder-focused-a'?: string;
  '--color-text-on-primary-h': string; '--color-text-on-primary-s': string; '--color-text-on-primary-l': string; '--color-text-on-primary-a'?: string;
  '--color-text-on-secondary-h': string; '--color-text-on-secondary-s': string; '--color-text-on-secondary-l': string; '--color-text-on-secondary-a'?: string;
  '--color-text-accent-h'?: string; '--color-text-accent-s'?: string; '--color-text-accent-l'?: string; '--color-text-accent-a'?: string;

  // Accent Colors
  '--color-accent-primary-h': string; '--color-accent-primary-s': string; '--color-accent-primary-l': string; '--color-accent-primary-a'?: string;
  '--color-accent-primary-light-h'?: string; '--color-accent-primary-light-s'?: string; '--color-accent-primary-light-l'?: string; '--color-accent-primary-light-a'?: string;
  '--color-accent-primary-dark-h'?: string; '--color-accent-primary-dark-s'?: string; '--color-accent-primary-dark-l'?: string; '--color-accent-primary-dark-a'?: string;
  '--color-accent-secondary-h': string; '--color-accent-secondary-s': string; '--color-accent-secondary-l': string; '--color-accent-secondary-a'?: string;
  '--color-accent-interactive-h': string; '--color-accent-interactive-s': string; '--color-accent-interactive-l': string; '--color-accent-interactive-a'?: string;
  '--color-accent-glow-h': string; '--color-accent-glow-s': string; '--color-accent-glow-l': string; '--color-accent-glow-a': string;
  '--color-holographic-glow-1-h'?: string; '--color-holographic-glow-1-s'?: string; '--color-holographic-glow-1-l'?: string; '--color-holographic-glow-1-a'?: string;
  '--color-holographic-glow-2-h'?: string; '--color-holographic-glow-2-s'?: string; '--color-holographic-glow-2-l'?: string; '--color-holographic-glow-2-a'?: string;

  // Logo Specific Accent Colors
  '--color-logo-primary-h'?: string; '--color-logo-primary-s'?: string; '--color-logo-primary-l'?: string; '--color-logo-primary-a'?: string;
  '--color-logo-secondary-h'?: string; '--color-logo-secondary-s'?: string; '--color-logo-secondary-l'?: string; '--color-logo-secondary-a'?: string;
  '--color-logo-main-text-h'?: string; '--color-logo-main-text-s'?: string; '--color-logo-main-text-l'?: string; '--color-logo-main-text-a'?: string;
  '--color-logo-subtitle-text-h'?: string; '--color-logo-subtitle-text-s'?: string; '--color-logo-subtitle-text-l'?: string; '--color-logo-subtitle-text-a'?: string;

  // Button Colors
  '--color-button-primary-bg-h'?: string; '--color-button-primary-bg-s'?: string; '--color-button-primary-bg-l'?: string; '--color-button-primary-bg-a'?: string;
  '--color-button-primary-text-h'?: string; '--color-button-primary-text-s'?: string; '--color-button-primary-text-l'?: string; '--color-button-primary-text-a'?: string;
  '--color-button-secondary-bg-h'?: string; '--color-button-secondary-bg-s'?: string; '--color-button-secondary-bg-l'?: string; '--color-button-secondary-bg-a'?: string;
  '--color-button-secondary-text-h'?: string; '--color-button-secondary-text-s'?: string; '--color-button-secondary-text-l'?: string; '--color-button-secondary-text-a'?: string;
  '--color-button-accent-bg-h'?: string; '--color-button-accent-bg-s'?: string; '--color-button-accent-bg-l'?: string; '--color-button-accent-bg-a'?: string;
  '--color-button-accent-text-h'?: string; '--color-button-accent-text-s'?: string; '--color-button-accent-text-l'?: string; '--color-button-accent-text-a'?: string;
  '--color-button-glow-h'?: string; '--color-button-glow-s'?: string; '--color-button-glow-l'?: string; '--color-button-glow-a'?: string;

  // Border Colors
  '--color-border-primary-h': string; '--color-border-primary-s': string; '--color-border-primary-l': string; '--color-border-primary-a'?: string;
  '--color-border-secondary-h': string; '--color-border-secondary-s': string; '--color-border-secondary-l': string; '--color-border-secondary-a'?: string;
  '--color-border-interactive-h': string; '--color-border-interactive-s': string; '--color-border-interactive-l': string; '--color-border-interactive-a'?: string;
  '--color-border-translucent-h': string; '--color-border-translucent-s': string; '--color-border-translucent-l': string; '--color-border-translucent-a': string;

  // Shadow Configuration
  '--shadow-color-h': string; '--shadow-color-s': string; '--shadow-color-l': string;
  '--shadow-highlight-modifier': string;
  '--shadow-opacity-soft': string;
  '--shadow-opacity-medium': string;
  '--shadow-opacity-strong'?: string;
  '--shadow-opacity-deep': string;

  // Voice Visualization Colors
  '--color-voice-user-h': string; '--color-voice-user-s': string; '--color-voice-user-l': string; '--color-voice-user-a'?: string;
  '--color-voice-ai-speaking-h': string; '--color-voice-ai-speaking-s': string; '--color-voice-ai-speaking-l': string; '--color-voice-ai-speaking-a'?: string;
  '--color-voice-ai-h'?: string; '--color-voice-ai-s'?: string; '--color-voice-ai-l'?: string; '--color-voice-ai-a'?: string;
  '--color-voice-ai-thinking-h': string; '--color-voice-ai-thinking-s': string; '--color-voice-ai-thinking-l': string; '--color-voice-ai-thinking-a'?: string;
  '--voice-pulse-opacity': string;

  // Semantic Colors
  '--color-info-h': string; '--color-info-s': string; '--color-info-l': string; '--color-info-a'?: string;
  '--color-success-h': string; '--color-success-s': string; '--color-success-l': string; '--color-success-a'?: string;
  '--color-warning-h': string; '--color-warning-s': string; '--color-warning-l': string; '--color-warning-a'?: string;
  '--color-error-h': string; '--color-error-s': string; '--color-error-l': string; '--color-error-a'?: string;
  '--color-error-text-h'?: string; '--color-error-text-s'?: string; '--color-error-text-l'?: string; '--color-error-text-a'?: string;
  '--color-danger-h'?: string; '--color-danger-s'?: string; '--color-danger-l'?: string; '--color-danger-text-h'?: string; '--color-danger-text-s'?: string; '--color-danger-text-l'?: string; '--color-danger-text-a'?: string;
  '--color-warning-text-h'?: string; '--color-warning-text-s'?: string; '--color-warning-text-l'?: string; '--color-warning-text-a'?: string;

  // Code Block Theming
  '--color-bg-code-block-h'?: string; '--color-bg-code-block-s'?: string; '--color-bg-code-block-l'?: string; '--color-bg-code-block-a'?: string;
  '--color-text-code-block-h'?: string; '--color-text-code-block-s'?: string; '--color-text-code-block-l'?: string; '--color-text-code-block-a'?: string;
  '--color-bg-code-inline-h'?: string; '--color-bg-code-inline-s'?: string; '--color-bg-code-inline-l'?: string; '--color-bg-code-inline-a'?: string;
  '--color-text-code-inline-h'?: string; '--color-text-code-inline-s'?: string; '--color-text-code-inline-l'?: string; '--color-text-code-inline-a'?: string;
  '--color-border-code-inline-h'?: string; '--color-border-code-inline-s'?: string; '--color-border-code-inline-l'?: string; '--color-border-code-inline-a'?: string;

  // Radii
  '--radius-xs'?: string; '--radius-sm'?: string; '--radius-md'?: string; '--radius-lg'?: string;
  '--radius-xl'?: string; '--radius-2xl'?: string; '--radius-3xl'?: string; '--radius-full'?: string;
  '--radius-holo'?: string; '--radius-retro'?: string; // Retained for explicitness, though Terminus uses specific values

  // Terminus specific
  '--terminal-color-mode'?: 'amber' | 'green' | 'cyan' | 'white';
  '--color-phosphor-h'?: string; '--color-phosphor-s'?: string; '--color-phosphor-l'?: string; '--color-phosphor-a'?: string;
  '--crt-scanline-opacity'?: string;
  '--crt-flicker-intensity'?: string;
  '--terminal-cursor-blink'?: string;
  '--grid-line-opacity'?: string;
  '--text-shadow-phosphor'?: string;

  // Particle/Burst Colors (as defined in your design system)
  '--color-petal-1-h'?: string; '--color-petal-1-s'?: string; '--color-petal-1-l'?: string; '--color-petal-1-a'?: string;
  '--color-petal-2-h'?: string; '--color-petal-2-s'?: string; '--color-petal-2-l'?: string; '--color-petal-2-a'?: string;
  '--color-petal-3-h'?: string; '--color-petal-3-s'?: string; '--color-petal-3-l'?: string; '--color-petal-3-a'?: string;
  '--color-petal-4-h'?: string; '--color-petal-4-s'?: string; '--color-petal-4-l'?: string; '--color-petal-4-a'?: string;
  '--color-burst-pink-h'?: string; '--color-burst-pink-s'?: string; '--color-burst-pink-l'?: string; '--color-burst-pink-a'?: string;
  '--color-burst-violet-h'?: string; '--color-burst-violet-s'?: string; '--color-burst-violet-l'?: string; '--color-burst-violet-a'?: string;
  '--color-burst-coral-h'?: string; '--color-burst-coral-s'?: string; '--color-burst-coral-l'?: string; '--color-burst-coral-a'?: string;
  '--color-burst-lavender-h'?: string; '--color-burst-lavender-s'?: string; '--color-burst-lavender-l'?: string; '--color-burst-lavender-a'?: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  isDark: boolean;
  energy: 'feminine' | 'masculine' | 'neutral' | 'agnostic';
  cssVariables: Partial<ThemeCssVariableMap>;
}

export const availableThemes: readonly ThemeDefinition[] = [
  {
    id: 'sakura-sunset',
    name: '🌸 Sakura Sunset',
    isDark: true,
    energy: 'feminine',
    cssVariables: {
      '--color-bg-primary-h': '345', '--color-bg-primary-s': '35%', '--color-bg-primary-l': '18%',
      '--color-bg-secondary-h': '340', '--color-bg-secondary-s': '30%', '--color-bg-secondary-l': '22%',
      '--color-bg-tertiary-h': '335', '--color-bg-tertiary-s': '25%', '--color-bg-tertiary-l': '26%',
      '--color-text-primary-h': '20', '--color-text-primary-s': '75%', '--color-text-primary-l': '94%',
      '--color-text-secondary-h': '15', '--color-text-secondary-s': '65%', '--color-text-secondary-l': '85%',
      '--color-text-muted-h': '10', '--color-text-muted-s': '45%', '--color-text-muted-l': '70%',
      '--color-accent-primary-h': '340', '--color-accent-primary-s': '92%', '--color-accent-primary-l': '76%',
      '--color-accent-secondary-h': '350', '--color-accent-secondary-s': '85%', '--color-accent-secondary-l': '70%',
      '--color-accent-interactive-h': '335', '--color-accent-interactive-s': '88%', '--color-accent-interactive-l': '65%',
      '--color-accent-glow-h': '345', '--color-accent-glow-s': '95%', '--color-accent-glow-l': '80%', '--color-accent-glow-a': '0.7',
      '--color-border-primary-h': '340', '--color-border-primary-s': '40%', '--color-border-primary-l': '35%',
      '--color-border-secondary-h': '335', '--color-border-secondary-s': '35%', '--color-border-secondary-l': '30%',
      '--color-border-interactive-h': '340', '--color-border-interactive-s': '80%', '--color-border-interactive-l': '60%',
      '--color-border-translucent-h': '340', '--color-border-translucent-s': '50%', '--color-border-translucent-l': '50%', '--color-border-translucent-a': '0.2',
      '--font-family-sans': '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
      '--font-family-mono': '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
      '--font-family-display': '"Plus Jakarta Sans", var(--font-family-sans)',
      '--shadow-color-h': '340', '--shadow-color-s': '50%', '--shadow-color-l': '5%',
      '--shadow-highlight-modifier': '1.2',
      '--shadow-opacity-soft': '0.15',
      '--shadow-opacity-medium': '0.25',
      '--shadow-opacity-deep': '0.45',
      '--color-voice-user-h': '340', '--color-voice-user-s': '90%', '--color-voice-user-l': '75%',
      '--color-voice-ai-speaking-h': '350', '--color-voice-ai-speaking-s': '85%', '--color-voice-ai-speaking-l': '70%',
      '--color-voice-ai-thinking-h': '335', '--color-voice-ai-thinking-s': '80%', '--color-voice-ai-thinking-l': '65%',
      '--voice-pulse-opacity': '0.6',
      '--color-info-h': '200', '--color-info-s': '75%', '--color-info-l': '65%',
      '--color-success-h': '140', '--color-success-s': '70%', '--color-success-l': '65%',
      '--color-warning-h': '40', '--color-warning-s': '80%', '--color-warning-l': '65%',
      '--color-error-h': '10', '--color-error-s': '85%', '--color-error-l': '65%',
      '--color-bg-glass-h': '340', '--color-bg-glass-s': '40%', '--color-bg-glass-l': '20%', '--color-bg-glass-a': '0.7',
      '--color-border-glass-h': '340', '--color-border-glass-s': '60%', '--color-border-glass-l': '50%', '--color-border-glass-a': '0.3',
      '--blur-glass': '12px',
      '--color-text-on-primary-h': '340', '--color-text-on-primary-s': '30%', '--color-text-on-primary-l': '15%',
      '--color-text-on-secondary-h': '340', '--color-text-on-secondary-s': '25%', '--color-text-on-secondary-l': '10%',
    },
  },
  {
    id: 'twilight-neo',
    name: '🌌 Twilight Neo',
    isDark: true,
    energy: 'masculine',
    cssVariables: {
      '--color-bg-primary-h': '220', '--color-bg-primary-s': '30%', '--color-bg-primary-l': '8%',
      '--color-bg-secondary-h': '215', '--color-bg-secondary-s': '28%', '--color-bg-secondary-l': '12%',
      '--color-bg-tertiary-h': '210', '--color-bg-tertiary-s': '25%', '--color-bg-tertiary-l': '16%',
      '--color-text-primary-h': '200', '--color-text-primary-s': '60%', '--color-text-primary-l': '90%',
      '--color-text-secondary-h': '195', '--color-text-secondary-s': '50%', '--color-text-secondary-l': '80%',
      '--color-text-muted-h': '190', '--color-text-muted-s': '40%', '--color-text-muted-l': '65%',
      '--color-accent-primary-h': '180', '--color-accent-primary-s': '95%', '--color-accent-primary-l': '45%',
      '--color-accent-secondary-h': '190', '--color-accent-secondary-s': '85%', '--color-accent-secondary-l': '50%',
      '--color-accent-interactive-h': '175', '--color-accent-interactive-s': '90%', '--color-accent-interactive-l': '40%',
      '--color-accent-glow-h': '185', '--color-accent-glow-s': '100%', '--color-accent-glow-l': '50%', '--color-accent-glow-a': '0.8',
      '--color-border-primary-h': '210', '--color-border-primary-s': '35%', '--color-border-primary-l': '25%',
      '--color-border-secondary-h': '205', '--color-border-secondary-s': '30%', '--color-border-secondary-l': '20%',
      '--color-border-interactive-h': '180', '--color-border-interactive-s': '85%', '--color-border-interactive-l': '40%',
      '--color-border-translucent-h': '200', '--color-border-translucent-s': '50%', '--color-border-translucent-l': '50%', '--color-border-translucent-a': '0.2',
      '--font-family-sans': '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
      '--font-family-mono': '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
      '--font-family-display': '"Plus Jakarta Sans", var(--font-family-sans)',
      '--shadow-color-h': '220', '--shadow-color-s': '60%', '--shadow-color-l': '2%',
      '--shadow-highlight-modifier': '1.5',
      '--shadow-opacity-soft': '0.2',
      '--shadow-opacity-medium': '0.35',
      '--shadow-opacity-deep': '0.6',
      '--color-voice-user-h': '175', '--color-voice-user-s': '90%', '--color-voice-user-l': '45%',
      '--color-voice-ai-speaking-h': '185', '--color-voice-ai-speaking-s': '85%', '--color-voice-ai-speaking-l': '50%',
      '--color-voice-ai-thinking-h': '180', '--color-voice-ai-thinking-s': '80%', '--color-voice-ai-thinking-l': '40%',
      '--voice-pulse-opacity': '0.7',
      '--color-info-h': '200', '--color-info-s': '75%', '--color-info-l': '60%',
      '--color-success-h': '140', '--color-success-s': '70%', '--color-success-l': '60%',
      '--color-warning-h': '40', '--color-warning-s': '80%', '--color-warning-l': '60%',
      '--color-error-h': '10', '--color-error-s': '85%', '--color-error-l': '60%',
      '--color-bg-glass-h': '210', '--color-bg-glass-s': '35%', '--color-bg-glass-l': '10%', '--color-bg-glass-a': '0.75',
      '--color-border-glass-h': '200', '--color-border-glass-s': '70%', '--color-border-glass-l': '40%', '--color-border-glass-a': '0.35',
      '--blur-glass': '16px',
      '--color-text-on-primary-h': '220', '--color-text-on-primary-s': '20%', '--color-text-on-primary-l': '95%',
      '--color-text-on-secondary-h': '220', '--color-text-on-secondary-s': '15%', '--color-text-on-secondary-l': '90%',
    },
  },
  {
    id: 'aurora-daybreak',
    name: '☀️ Aurora Daybreak',
    isDark: false,
    energy: 'neutral',
    cssVariables: {
      '--color-bg-primary-h': '340', '--color-bg-primary-s': '25%', '--color-bg-primary-l': '97%',
      '--color-bg-secondary-h': '335', '--color-bg-secondary-s': '20%', '--color-bg-secondary-l': '94%',
      '--color-bg-tertiary-h': '330', '--color-bg-tertiary-s': '15%', '--color-bg-tertiary-l': '90%',
      '--color-text-primary-h': '340', '--color-text-primary-s': '30%', '--color-text-primary-l': '18%',
      '--color-text-secondary-h': '335', '--color-text-secondary-s': '25%', '--color-text-secondary-l': '30%',
      '--color-text-muted-h': '330', '--color-text-muted-s': '20%', '--color-text-muted-l': '45%',
      '--color-accent-primary-h': '330', '--color-accent-primary-s': '90%', '--color-accent-primary-l': '65%',
      '--color-accent-secondary-h': '340', '--color-accent-secondary-s': '85%', '--color-accent-secondary-l': '60%',
      '--color-accent-interactive-h': '325', '--color-accent-interactive-s': '88%', '--color-accent-interactive-l': '55%',
      '--color-accent-glow-h': '335', '--color-accent-glow-s': '95%', '--color-accent-glow-l': '70%', '--color-accent-glow-a': '0.6',
      '--color-border-primary-h': '330', '--color-border-primary-s': '20%', '--color-border-primary-l': '80%',
      '--color-border-secondary-h': '325', '--color-border-secondary-s': '15%', '--color-border-secondary-l': '85%',
      '--color-border-interactive-h': '330', '--color-border-interactive-s': '80%', '--color-border-interactive-l': '70%',
      '--color-border-translucent-h': '330', '--color-border-translucent-s': '30%', '--color-border-translucent-l': '60%', '--color-border-translucent-a': '0.15',
      '--font-family-sans': '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
      '--font-family-mono': '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
      '--font-family-display': '"Plus Jakarta Sans", var(--font-family-sans)',
      '--shadow-color-h': '330', '--shadow-color-s': '20%', '--shadow-color-l': '50%',
      '--shadow-highlight-modifier': '0.8',
      '--shadow-opacity-soft': '0.08',
      '--shadow-opacity-medium': '0.15',
      '--shadow-opacity-deep': '0.25',
      '--color-voice-user-h': '325', '--color-voice-user-s': '85%', '--color-voice-user-l': '60%',
      '--color-voice-ai-speaking-h': '335', '--color-voice-ai-speaking-s': '80%', '--color-voice-ai-speaking-l': '65%',
      '--color-voice-ai-thinking-h': '330', '--color-voice-ai-thinking-s': '75%', '--color-voice-ai-thinking-l': '55%',
      '--voice-pulse-opacity': '0.5',
      '--color-info-h': '200', '--color-info-s': '75%', '--color-info-l': '50%',
      '--color-success-h': '140', '--color-success-s': '70%', '--color-success-l': '45%',
      '--color-warning-h': '40', '--color-warning-s': '80%', '--color-warning-l': '50%',
      '--color-error-h': '10', '--color-error-s': '85%', '--color-error-l': '50%',
      '--color-bg-glass-h': '335', '--color-bg-glass-s': '30%', '--color-bg-glass-l': '95%', '--color-bg-glass-a': '0.6',
      '--color-border-glass-h': '330', '--color-border-glass-s': '50%', '--color-border-glass-l': '70%', '--color-border-glass-a': '0.25',
      '--blur-glass': '10px',
      '--color-text-on-primary-h': '340', '--color-text-on-primary-s': '100%', '--color-text-on-primary-l': '100%',
      '--color-text-on-secondary-h': '340', '--color-text-on-secondary-s': '90%', '--color-text-on-secondary-l': '98%',
    },
  },
  {
    id: 'warm-embrace',
    name: '🤗 Warm Embrace',
    isDark: false,
    energy: 'neutral',
    cssVariables: {
      '--color-bg-primary-h': '35', '--color-bg-primary-s': '70%', '--color-bg-primary-l': '96%',
      '--color-bg-secondary-h': '30', '--color-bg-secondary-s': '65%', '--color-bg-secondary-l': '93%',
      '--color-bg-tertiary-h': '25', '--color-bg-tertiary-s': '60%', '--color-bg-tertiary-l': '90%',
      '--color-text-primary-h': '30', '--color-text-primary-s': '25%', '--color-text-primary-l': '20%',
      '--color-text-secondary-h': '25', '--color-text-secondary-s': '20%', '--color-text-secondary-l': '35%',
      '--color-text-muted-h': '20', '--color-text-muted-s': '15%', '--color-text-muted-l': '50%',
      '--color-accent-primary-h': '25', '--color-accent-primary-s': '75%', '--color-accent-primary-l': '65%',
      '--color-accent-secondary-h': '35', '--color-accent-secondary-s': '70%', '--color-accent-secondary-l': '60%',
      '--color-accent-interactive-h': '20', '--color-accent-interactive-s': '80%', '--color-accent-interactive-l': '55%',
      '--color-accent-glow-h': '30', '--color-accent-glow-s': '85%', '--color-accent-glow-l': '70%', '--color-accent-glow-a': '0.5',
      '--color-border-primary-h': '25', '--color-border-primary-s': '30%', '--color-border-primary-l': '80%',
      '--color-border-secondary-h': '20', '--color-border-secondary-s': '25%', '--color-border-secondary-l': '85%',
      '--color-border-interactive-h': '25', '--color-border-interactive-s': '70%', '--color-border-interactive-l': '70%',
      '--color-border-translucent-h': '25', '--color-border-translucent-s': '40%', '--color-border-translucent-l': '60%', '--color-border-translucent-a': '0.12',
      '--font-family-sans': '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
      '--font-family-mono': '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
      '--font-family-display': '"Plus Jakarta Sans", var(--font-family-sans)',
      '--shadow-color-h': '25', '--shadow-color-s': '30%', '--shadow-color-l': '40%',
      '--shadow-highlight-modifier': '0.7',
      '--shadow-opacity-soft': '0.06',
      '--shadow-opacity-medium': '0.12',
      '--shadow-opacity-deep': '0.2',
      '--color-voice-user-h': '20', '--color-voice-user-s': '75%', '--color-voice-user-l': '60%',
      '--color-voice-ai-speaking-h': '30', '--color-voice-ai-speaking-s': '70%', '--color-voice-ai-speaking-l': '65%',
      '--color-voice-ai-thinking-h': '25', '--color-voice-ai-thinking-s': '65%', '--color-voice-ai-thinking-l': '55%',
      '--voice-pulse-opacity': '0.45',
      '--color-info-h': '200', '--color-info-s': '75%', '--color-info-l': '45%',
      '--color-success-h': '140', '--color-success-s': '70%', '--color-success-l': '40%',
      '--color-warning-h': '40', '--color-warning-s': '80%', '--color-warning-l': '45%',
      '--color-error-h': '10', '--color-error-s': '85%', '--color-error-l': '45%',
      '--color-bg-glass-h': '30', '--color-bg-glass-s': '50%', '--color-bg-glass-l': '94%', '--color-bg-glass-a': '0.55',
      '--color-border-glass-h': '25', '--color-border-glass-s': '60%', '--color-border-glass-l': '75%', '--color-border-glass-a': '0.2',
      '--blur-glass': '8px',
      '--color-text-on-primary-h': '30', '--color-text-on-primary-s': '90%', '--color-text-on-primary-l': '98%',
      '--color-text-on-secondary-h': '30', '--color-text-on-secondary-s': '85%', '--color-text-on-secondary-l': '95%',
    },
  },
  {
    id: 'terminus-dark',
    name: '🕹️ Terminus Dark',
    isDark: true,
    energy: 'agnostic',
    cssVariables: {
      '--font-family-sans': 'var(--font-family-retro-sans, "IBM Plex Mono", "Fira Code", monospace)',
      '--font-family-mono': 'var(--font-family-retro-mono, "IBM Plex Mono", "Fira Code", monospace)',
      '--font-family-display': 'var(--font-family-retro-display, "Share Tech Mono", monospace)',
      '--color-bg-primary-h': '0', '--color-bg-primary-s': '0%', '--color-bg-primary-l': '0%',
      '--color-bg-secondary-h': '0', '--color-bg-secondary-s': '0%', '--color-bg-secondary-l': '5%',
      '--color-bg-tertiary-h': '0', '--color-bg-tertiary-s': '0%', '--color-bg-tertiary-l': '10%',
      // Phosphor color defaults to green, actual color set by --terminal-color-mode via JS
      '--color-text-primary-h': 'var(--terminal-green-h, 120)',
      '--color-text-primary-s': 'var(--terminal-green-s, 100%)',
      '--color-text-primary-l': 'var(--terminal-green-l, 68%)',
      '--color-text-secondary-h': 'var(--terminal-green-h, 120)',
      '--color-text-secondary-s': 'var(--terminal-green-s, 80%)',
      '--color-text-secondary-l': 'var(--terminal-green-l, 55%)',
      '--color-text-muted-h': 'var(--terminal-green-h, 120)',
      '--color-text-muted-s': 'var(--terminal-green-s, 60%)',
      '--color-text-muted-l': 'var(--terminal-green-l, 40%)',
      '--color-accent-primary-h': 'var(--terminal-green-h, 120)',
      '--color-accent-primary-s': 'var(--terminal-green-s, 100%)',
      '--color-accent-primary-l': 'var(--terminal-green-l, 68%)',
      '--color-accent-secondary-h': 'var(--terminal-green-h, 120)',
      '--color-accent-secondary-s': 'var(--terminal-green-s, 90%)',
      '--color-accent-secondary-l': 'var(--terminal-green-l, 60%)',
      '--color-accent-interactive-h': 'var(--terminal-green-h, 120)',
      '--color-accent-interactive-s': 'var(--terminal-green-s, 95%)',
      '--color-accent-interactive-l': 'var(--terminal-green-l, 65%)',
      '--color-accent-glow-h': 'var(--terminal-green-h, 120)',
      '--color-accent-glow-s': 'var(--terminal-green-s, 100%)',
      '--color-accent-glow-l': 'var(--terminal-green-l, 70%)',
      '--color-accent-glow-a': '0.9',
      '--color-border-primary-h': 'var(--terminal-green-h, 120)',
      '--color-border-primary-s': 'var(--terminal-green-s, 70%)',
      '--color-border-primary-l': 'var(--terminal-green-l, 30%)',
      '--color-border-secondary-h': 'var(--terminal-green-h, 120)',
      '--color-border-secondary-s': 'var(--terminal-green-s, 60%)',
      '--color-border-secondary-l': 'var(--terminal-green-l, 25%)',
      '--color-border-interactive-h': 'var(--terminal-green-h, 120)',
      '--color-border-interactive-s': 'var(--terminal-green-s, 90%)',
      '--color-border-interactive-l': 'var(--terminal-green-l, 50%)',
      '--color-border-translucent-h': 'var(--terminal-green-h, 120)',
      '--color-border-translucent-s': 'var(--terminal-green-s, 80%)',
      '--color-border-translucent-l': 'var(--terminal-green-l, 60%)',
      '--color-border-translucent-a': '0.3',
      '--shadow-color-h': '0', '--shadow-color-s': '0%', '--shadow-color-l': '0%',
      '--shadow-highlight-modifier': '2',
      '--shadow-opacity-soft': '0.3',
      '--shadow-opacity-medium': '0.5',
      '--shadow-opacity-deep': '0.8',
      '--color-voice-user-h': 'var(--terminal-green-h, 120)',
      '--color-voice-user-s': 'var(--terminal-green-s, 95%)',
      '--color-voice-user-l': 'var(--terminal-green-l, 65%)',
      '--color-voice-ai-speaking-h': 'var(--terminal-green-h, 120)',
      '--color-voice-ai-speaking-s': 'var(--terminal-green-s, 100%)',
      '--color-voice-ai-speaking-l': 'var(--terminal-green-l, 70%)',
      '--color-voice-ai-thinking-h': 'var(--terminal-green-h, 120)',
      '--color-voice-ai-thinking-s': 'var(--terminal-green-s, 85%)',
      '--color-voice-ai-thinking-l': 'var(--terminal-green-l, 55%)',
      '--voice-pulse-opacity': '0.8',
      '--color-info-h': '200', '--color-info-s': '100%', '--color-info-l': '60%',
      '--color-success-h': '120', '--color-success-s': '100%', '--color-success-l': '60%',
      '--color-warning-h': '60', '--color-warning-s': '100%', '--color-warning-l': '60%',
      '--color-error-h': '0', '--color-error-s': '100%', '--color-error-l': '60%',
      '--color-bg-glass-h': '0', '--color-bg-glass-s': '0%', '--color-bg-glass-l': '5%', '--color-bg-glass-a': '0.9',
      '--color-border-glass-h': 'var(--terminal-green-h, 120)',
      '--color-border-glass-s': 'var(--terminal-green-s, 100%)',
      '--color-border-glass-l': 'var(--terminal-green-l, 50%)',
      '--color-border-glass-a': '0.5',
      '--blur-glass': '0px',
      '--color-text-on-primary-h': '0', '--color-text-on-primary-s': '0%', '--color-text-on-primary-l': '0%',
      '--color-text-on-secondary-h': '0', '--color-text-on-secondary-s': '0%', '--color-text-on-secondary-l': '5%',
      '--radius-xs': '0px', '--radius-sm': '0px', '--radius-md': '0px', '--radius-lg': '2px',
      '--radius-xl': '2px', '--radius-2xl': '2px', '--radius-3xl': '2px', '--radius-full': '2px',
      '--radius-holo': '0px',
      '--terminal-color-mode': 'green', // Default illustrative sub-theme
      '--crt-scanline-opacity': '0.05',
      '--crt-flicker-intensity': '0.03',
      '--terminal-cursor-blink': '1s',
      '--grid-line-opacity': '0.1',
      '--text-shadow-phosphor': '0 0 4px var(--color-accent-glow)',
    }
  },
  {
    id: 'terminus-light',
    name: '⌨️ Terminus Light',
    isDark: false,
    energy: 'agnostic',
    cssVariables: {
      '--font-family-sans': 'var(--font-family-retro-sans, "IBM Plex Mono", "Fira Code", monospace)',
      '--font-family-mono': 'var(--font-family-retro-mono, "IBM Plex Mono", "Fira Code", monospace)',
      '--font-family-display': 'var(--font-family-retro-display, "Share Tech Mono", monospace)',
      '--color-bg-primary-h': '0', '--color-bg-primary-s': '0%', '--color-bg-primary-l': '98%',
      '--color-bg-secondary-h': '0', '--color-bg-secondary-s': '0%', '--color-bg-secondary-l': '95%',
      '--color-bg-tertiary-h': '0', '--color-bg-tertiary-s': '0%', '--color-bg-tertiary-l': '92%',
      // Phosphor color defaults to dark green, actual color set by --terminal-color-mode via JS
      '--color-text-primary-h': 'var(--terminal-green-h, 120)',
      '--color-text-primary-s': 'var(--terminal-green-s, 85%)',
      '--color-text-primary-l': 'var(--terminal-green-l, 30%)',
      '--color-text-secondary-h': 'var(--terminal-green-h, 120)',
      '--color-text-secondary-s': 'var(--terminal-green-s, 70%)',
      '--color-text-secondary-l': 'var(--terminal-green-l, 40%)',
      '--color-text-muted-h': 'var(--terminal-green-h, 120)',
      '--color-text-muted-s': 'var(--terminal-green-s, 50%)',
      '--color-text-muted-l': 'var(--terminal-green-l, 50%)',
      '--color-accent-primary-h': 'var(--terminal-green-h, 120)',
      '--color-accent-primary-s': 'var(--terminal-green-s, 85%)',
      '--color-accent-primary-l': 'var(--terminal-green-l, 30%)',
      '--color-accent-secondary-h': 'var(--terminal-green-h, 120)',
      '--color-accent-secondary-s': 'var(--terminal-green-s, 75%)',
      '--color-accent-secondary-l': 'var(--terminal-green-l, 35%)',
      '--color-accent-interactive-h': 'var(--terminal-green-h, 120)',
      '--color-accent-interactive-s': 'var(--terminal-green-s, 80%)',
      '--color-accent-interactive-l': 'var(--terminal-green-l, 32%)',
      '--color-accent-glow-h': 'var(--terminal-green-h, 120)',
      '--color-accent-glow-s': 'var(--terminal-green-s, 90%)',
      '--color-accent-glow-l': 'var(--terminal-green-l, 25%)',
      '--color-accent-glow-a': '0.7',
      '--color-border-primary-h': 'var(--terminal-green-h, 120)',
      '--color-border-primary-s': 'var(--terminal-green-s, 40%)',
      '--color-border-primary-l': 'var(--terminal-green-l, 60%)',
      '--color-border-secondary-h': 'var(--terminal-green-h, 120)',
      '--color-border-secondary-s': 'var(--terminal-green-s, 30%)',
      '--color-border-secondary-l': 'var(--terminal-green-l, 70%)',
      '--color-border-interactive-h': 'var(--terminal-green-h, 120)',
      '--color-border-interactive-s': 'var(--terminal-green-s, 70%)',
      '--color-border-interactive-l': 'var(--terminal-green-l, 40%)',
      '--color-border-translucent-h': 'var(--terminal-green-h, 120)',
      '--color-border-translucent-s': 'var(--terminal-green-s, 50%)',
      '--color-border-translucent-l': 'var(--terminal-green-l, 50%)',
      '--color-border-translucent-a': '0.2',
      '--shadow-color-h': '0', '--shadow-color-s': '0%', '--shadow-color-l': '60%',
      '--shadow-highlight-modifier': '0.5',
      '--shadow-opacity-soft': '0.1',
      '--shadow-opacity-medium': '0.2',
      '--shadow-opacity-deep': '0.35',
      '--color-voice-user-h': 'var(--terminal-green-h, 120)',
      '--color-voice-user-s': 'var(--terminal-green-s, 80%)',
      '--color-voice-user-l': 'var(--terminal-green-l, 35%)',
      '--color-voice-ai-speaking-h': 'var(--terminal-green-h, 120)',
      '--color-voice-ai-speaking-s': 'var(--terminal-green-s, 85%)',
      '--color-voice-ai-speaking-l': 'var(--terminal-green-l, 30%)',
      '--color-voice-ai-thinking-h': 'var(--terminal-green-h, 120)',
      '--color-voice-ai-thinking-s': 'var(--terminal-green-s, 70%)',
      '--color-voice-ai-thinking-l': 'var(--terminal-green-l, 40%)',
      '--voice-pulse-opacity': '0.6',
      '--color-info-h': '200', '--color-info-s': '80%', '--color-info-l': '40%',
      '--color-success-h': '120', '--color-success-s': '80%', '--color-success-l': '35%',
      '--color-warning-h': '60', '--color-warning-s': '80%', '--color-warning-l': '40%',
      '--color-error-h': '0', '--color-error-s': '80%', '--color-error-l': '40%',
      '--color-bg-glass-h': '0', '--color-bg-glass-s': '0%', '--color-bg-glass-l': '95%', '--color-bg-glass-a': '0.7',
      '--color-border-glass-h': 'var(--terminal-green-h, 120)',
      '--color-border-glass-s': 'var(--terminal-green-s, 60%)',
      '--color-border-glass-l': 'var(--terminal-green-l, 50%)',
      '--color-border-glass-a': '0.3',
      '--blur-glass': '0px',
      '--color-text-on-primary-h': '0', '--color-text-on-primary-s': '0%', '--color-text-on-primary-l': '95%',
      '--color-text-on-secondary-h': '0', '--color-text-on-secondary-s': '0%', '--color-text-on-secondary-l': '90%',
      '--radius-xs': '0px', '--radius-sm': '0px', '--radius-md': '0px', '--radius-lg': '2px',
      '--radius-xl': '2px', '--radius-2xl': '2px', '--radius-3xl': '2px', '--radius-full': '2px',
      '--radius-holo': '0px',
      '--terminal-color-mode': 'green', // Default illustrative sub-theme
      '--crt-scanline-opacity': '0.02',
      '--crt-flicker-intensity': '0.01',
      '--terminal-cursor-blink': '1s',
      '--grid-line-opacity': '0.05',
      '--text-shadow-phosphor': '0 0 2px var(--color-accent-glow)',
    }
  }
];