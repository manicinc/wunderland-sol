/**
 * Theme Builder - Create, customize, and export themes
 * @module @framers/codex-extensions/themes
 */

import type {
  Theme,
  ThemeManifest,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeEffects,
  ThemeCategory,
  PluginAuthor,
  DeepPartial,
} from '../types';

/**
 * Default theme configurations
 */
export const DEFAULT_THEMES: Record<string, Omit<Theme, 'manifest'>> = {
  light: {
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f8f9fa',
      bgTertiary: '#e9ecef',
      bgPaper: '#fafaf9',
      bgOverlay: 'rgba(0, 0, 0, 0.5)',
      textPrimary: '#0a0a0a',
      textSecondary: '#495057',
      textMuted: '#6c757d',
      textInverse: '#ffffff',
      accent: '#0891b2',
      accentHover: '#0e7490',
      accentMuted: '#cffafe',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0284c7',
      border: '#d4d4d8',
      borderMuted: '#e5e5e5',
      borderFocus: '#0891b2',
      syntax: {
        keyword: '#d73a49',
        string: '#032f62',
        number: '#005cc5',
        comment: '#6a737d',
        function: '#6f42c1',
        variable: '#24292e',
        operator: '#d73a49',
      },
    },
    typography: {
      fontFamily: {
        sans: '"Inter", system-ui, -apple-system, sans-serif',
        serif: '"Merriweather", Georgia, serif',
        mono: '"JetBrains Mono", "Fira Code", monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      unit: 4,
      scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64],
    },
    effects: {
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        full: '9999px',
      },
      shadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
      transition: {
        fast: '150ms ease',
        normal: '200ms ease',
        slow: '300ms ease',
      },
    },
  },

  dark: {
    colors: {
      bgPrimary: '#0a0a0a',
      bgSecondary: '#171717',
      bgTertiary: '#262626',
      bgPaper: '#0f0f0f',
      bgOverlay: 'rgba(0, 0, 0, 0.8)',
      textPrimary: '#fafafa',
      textSecondary: '#a3a3a3',
      textMuted: '#737373',
      textInverse: '#0a0a0a',
      accent: '#22d3ee',
      accentHover: '#06b6d4',
      accentMuted: '#164e63',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#38bdf8',
      border: '#27272a',
      borderMuted: '#3f3f46',
      borderFocus: '#22d3ee',
      syntax: {
        keyword: '#ff7b72',
        string: '#a5d6ff',
        number: '#79c0ff',
        comment: '#8b949e',
        function: '#d2a8ff',
        variable: '#c9d1d9',
        operator: '#ff7b72',
      },
    },
    typography: {
      fontFamily: {
        sans: '"Inter", system-ui, -apple-system, sans-serif',
        serif: '"Merriweather", Georgia, serif',
        mono: '"JetBrains Mono", "Fira Code", monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      unit: 4,
      scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64],
    },
    effects: {
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        full: '9999px',
      },
      shadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      },
      transition: {
        fast: '150ms ease',
        normal: '200ms ease',
        slow: '300ms ease',
      },
    },
  },

  terminal: {
    colors: {
      bgPrimary: '#0d0208',
      bgSecondary: '#1a1a1a',
      bgTertiary: '#252525',
      bgPaper: '#0a0a0a',
      bgOverlay: 'rgba(0, 0, 0, 0.9)',
      textPrimary: '#00ff41',
      textSecondary: '#00cc33',
      textMuted: '#008f11',
      textInverse: '#0d0208',
      accent: '#00ff41',
      accentHover: '#00cc33',
      accentMuted: '#003b00',
      success: '#00ff41',
      warning: '#ffb000',
      error: '#ff3131',
      info: '#00d4ff',
      border: '#00ff41',
      borderMuted: '#003b00',
      borderFocus: '#00ff41',
      syntax: {
        keyword: '#ff6ac1',
        string: '#9aedfe',
        number: '#ff9f43',
        comment: '#5c6370',
        function: '#00ff41',
        variable: '#00ff41',
        operator: '#ff6ac1',
      },
    },
    typography: {
      fontFamily: {
        sans: '"VT323", "Courier New", monospace',
        serif: '"VT323", "Courier New", monospace',
        mono: '"VT323", "Courier New", monospace',
      },
      fontSize: {
        xs: '0.875rem',
        sm: '1rem',
        base: '1.125rem',
        lg: '1.25rem',
        xl: '1.5rem',
        '2xl': '1.875rem',
        '3xl': '2.25rem',
      },
      fontWeight: {
        normal: 400,
        medium: 400,
        semibold: 400,
        bold: 400,
      },
      lineHeight: {
        tight: 1.2,
        normal: 1.4,
        relaxed: 1.6,
      },
    },
    spacing: {
      unit: 4,
      scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64],
    },
    effects: {
      borderRadius: {
        none: '0',
        sm: '0',
        md: '0',
        lg: '0',
        full: '0',
      },
      shadow: {
        none: 'none',
        sm: '0 0 5px rgba(0, 255, 65, 0.3)',
        md: '0 0 10px rgba(0, 255, 65, 0.4)',
        lg: '0 0 20px rgba(0, 255, 65, 0.5)',
      },
      transition: {
        fast: '100ms linear',
        normal: '150ms linear',
        slow: '200ms linear',
      },
    },
  },

  sepia: {
    colors: {
      bgPrimary: '#f4ecd8',
      bgSecondary: '#e8dcc8',
      bgTertiary: '#dcd0bc',
      bgPaper: '#faf6eb',
      bgOverlay: 'rgba(62, 47, 29, 0.5)',
      textPrimary: '#3e2f1d',
      textSecondary: '#5a4a35',
      textMuted: '#8b7355',
      textInverse: '#f4ecd8',
      accent: '#8b4513',
      accentHover: '#6b3410',
      accentMuted: '#d4b896',
      success: '#2d5a27',
      warning: '#b8860b',
      error: '#8b0000',
      info: '#2f4f4f',
      border: '#c4b49a',
      borderMuted: '#d4c4aa',
      borderFocus: '#8b4513',
      syntax: {
        keyword: '#8b0000',
        string: '#2f4f4f',
        number: '#8b4513',
        comment: '#8b7355',
        function: '#4a3728',
        variable: '#3e2f1d',
        operator: '#8b0000',
      },
    },
    typography: {
      fontFamily: {
        sans: '"Lora", Georgia, serif',
        serif: '"Lora", Georgia, serif',
        mono: '"Courier Prime", "Courier New", monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.3,
        normal: 1.6,
        relaxed: 1.8,
      },
    },
    spacing: {
      unit: 4,
      scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64],
    },
    effects: {
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.375rem',
        full: '9999px',
      },
      shadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(62, 47, 29, 0.1)',
        md: '0 4px 6px -1px rgba(62, 47, 29, 0.15)',
        lg: '0 10px 15px -3px rgba(62, 47, 29, 0.2)',
      },
      transition: {
        fast: '150ms ease',
        normal: '250ms ease',
        slow: '350ms ease',
      },
    },
  },
};

/**
 * Theme Builder for creating and customizing themes
 */
export class ThemeBuilder {
  private theme: Theme;

  constructor(base?: ThemeCategory | Theme) {
    if (!base) {
      this.theme = this.createDefaultTheme('light');
    } else if (typeof base === 'string') {
      this.theme = this.createDefaultTheme(base);
    } else {
      this.theme = structuredClone(base);
    }
  }

  /**
   * Set theme manifest
   */
  setManifest(manifest: Partial<ThemeManifest>): this {
    this.theme.manifest = { ...this.theme.manifest, ...manifest };
    return this;
  }

  /**
   * Set theme ID
   */
  setId(id: string): this {
    this.theme.manifest.id = id;
    return this;
  }

  /**
   * Set theme name
   */
  setName(name: string): this {
    this.theme.manifest.name = name;
    return this;
  }

  /**
   * Set theme author
   */
  setAuthor(author: PluginAuthor): this {
    this.theme.manifest.author = author;
    return this;
  }

  /**
   * Set theme description
   */
  setDescription(description: string): this {
    this.theme.manifest.description = description;
    return this;
  }

  /**
   * Set theme category
   */
  setCategory(category: ThemeCategory): this {
    this.theme.manifest.category = category;
    return this;
  }

  /**
   * Set individual colors
   */
  setColors(colors: DeepPartial<ThemeColors>): this {
    this.theme.colors = this.deepMerge(this.theme.colors, colors) as ThemeColors;
    return this;
  }

  /**
   * Set primary background
   */
  setBgPrimary(color: string): this {
    this.theme.colors.bgPrimary = color;
    return this;
  }

  /**
   * Set accent color
   */
  setAccent(color: string): this {
    this.theme.colors.accent = color;
    return this;
  }

  /**
   * Set text colors
   */
  setTextColors(primary: string, secondary?: string, muted?: string): this {
    this.theme.colors.textPrimary = primary;
    if (secondary) this.theme.colors.textSecondary = secondary;
    if (muted) this.theme.colors.textMuted = muted;
    return this;
  }

  /**
   * Set typography
   */
  setTypography(typography: DeepPartial<ThemeTypography>): this {
    this.theme.typography = this.deepMerge(
      this.theme.typography,
      typography
    ) as ThemeTypography;
    return this;
  }

  /**
   * Set font family
   */
  setFontFamily(type: 'sans' | 'serif' | 'mono', family: string): this {
    this.theme.typography.fontFamily[type] = family;
    return this;
  }

  /**
   * Set spacing
   */
  setSpacing(spacing: Partial<ThemeSpacing>): this {
    const fallback: ThemeSpacing = structuredClone(
      DEFAULT_THEMES.light.spacing ?? {
        unit: 4,
        scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64],
      }
    );

    const current = this.theme.spacing ?? fallback;
    this.theme.spacing = {
      unit: spacing.unit ?? current.unit,
      scale: spacing.scale ?? current.scale,
    };
    return this;
  }

  /**
   * Set effects
   */
  setEffects(effects: DeepPartial<ThemeEffects>): this {
    const fallback: ThemeEffects = structuredClone(
      DEFAULT_THEMES.light.effects ?? {
        borderRadius: {
          none: '0',
          sm: '0.125rem',
          md: '0.375rem',
          lg: '0.5rem',
          full: '9999px',
        },
        shadow: {
          none: 'none',
          sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
        transition: {
          fast: '150ms ease',
          normal: '200ms ease',
          slow: '300ms ease',
        },
      }
    );

    const current = this.theme.effects ?? fallback;
    this.theme.effects = this.deepMerge(current, effects) as ThemeEffects;
    return this;
  }

  /**
   * Set custom CSS
   */
  setCss(css: string): this {
    this.theme.css = css;
    return this;
  }

  /**
   * Add custom CSS variables
   */
  setVariables(variables: Record<string, string>): this {
    this.theme.variables = { ...this.theme.variables, ...variables };
    return this;
  }

  /**
   * Build the theme
   */
  build(): Theme {
    // Validate required fields
    if (!this.theme.manifest.id) {
      throw new Error('Theme ID is required');
    }
    if (!this.theme.manifest.name) {
      throw new Error('Theme name is required');
    }

    // Generate version if not set
    if (!this.theme.manifest.version) {
      this.theme.manifest.version = '1.0.0';
    }

    return structuredClone(this.theme);
  }

  /**
   * Export theme to JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  /**
   * Export theme to CSS variables
   */
  toCSS(): string {
    const theme = this.build();
    const vars = this.generateCSSVariables(theme);
    
    return `:root {\n${vars.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`;
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: string): ThemeBuilder {
    const theme = JSON.parse(json) as Theme;
    return new ThemeBuilder(theme);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private createDefaultTheme(category: ThemeCategory): Theme {
    const base = DEFAULT_THEMES[category] || DEFAULT_THEMES.light;
    
    return {
      manifest: {
        id: '',
        name: '',
        version: '1.0.0',
        description: '',
        author: { name: 'Unknown' },
        category,
      },
      ...structuredClone(base),
    };
  }

  private deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object'
      ) {
        (result as Record<string, unknown>)[key] = this.deepMerge(
          targetValue as object,
          sourceValue as DeepPartial<typeof targetValue>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }

    return result;
  }

  private generateCSSVariables(theme: Theme): Array<[string, string]> {
    const vars: Array<[string, string]> = [];

    // Colors
    for (const [key, value] of Object.entries(theme.colors)) {
      if (typeof value === 'string') {
        vars.push([`--codex-${this.kebabCase(key)}`, value]);
      } else if (typeof value === 'object') {
        for (const [subKey, subValue] of Object.entries(value)) {
          vars.push([`--codex-${this.kebabCase(key)}-${this.kebabCase(subKey)}`, subValue as string]);
        }
      }
    }

    // Typography
    for (const [key, value] of Object.entries(theme.typography.fontFamily)) {
      vars.push([`--codex-font-${key}`, value]);
    }
    for (const [key, value] of Object.entries(theme.typography.fontSize)) {
      vars.push([`--codex-text-${key}`, value]);
    }

    // Effects
    if (theme.effects) {
      for (const [key, value] of Object.entries(theme.effects.borderRadius)) {
        vars.push([`--codex-radius-${key}`, value]);
      }
      for (const [key, value] of Object.entries(theme.effects.shadow)) {
        vars.push([`--codex-shadow-${key}`, value]);
      }
      for (const [key, value] of Object.entries(theme.effects.transition)) {
        vars.push([`--codex-transition-${key}`, value]);
      }
    }

    // Custom variables
    if (theme.variables) {
      for (const [key, value] of Object.entries(theme.variables)) {
        vars.push([key.startsWith('--') ? key : `--${key}`, value]);
      }
    }

    return vars;
  }

  private kebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

/**
 * Utility to apply theme to DOM
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const builder = new ThemeBuilder(theme);
  const css = builder.toCSS();

  // Find or create style element
  let styleEl = document.getElementById('codex-theme-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'codex-theme-styles';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = css + (theme.css || '');

  // Set data attribute for theme category
  document.documentElement.setAttribute('data-theme', theme.manifest.category);
}

/**
 * Remove theme from DOM
 */
export function removeTheme(): void {
  if (typeof document === 'undefined') return;

  const styleEl = document.getElementById('codex-theme-styles');
  if (styleEl) {
    styleEl.remove();
  }

  document.documentElement.removeAttribute('data-theme');
}
