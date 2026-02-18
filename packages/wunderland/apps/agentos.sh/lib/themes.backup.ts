// Enhanced Theme configuration for AgentOS Landing with Neumorphic Design
export type ThemeName = 'sakura-sunset' | 'twilight-neo' | 'aurora-daybreak' | 'warm-embrace' | 'retro-terminus';

export interface ColorScheme {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    glass?: string; // Glass morphism background
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    placeholder?: string;
    contrast?: string; // High contrast for accessibility
  };
  accent: {
    primary: string;
    secondary: string;
    hover?: string;
    focus?: string;
    gradient?: string; // Gradient accents
  };
  border: {
    primary: string;
    interactive: string;
    subtle?: string;
  };
  glow?: {
    color: string;
    intensity: string;
  };
  neumorphic?: {
    light: string; // Light shadow color
    dark: string;  // Dark shadow color
    ambient: string; // Ambient light color
  };
}

export interface Theme {
  name: string;
  description: string;
  descriptor: string;
  light: ColorScheme;
  dark: ColorScheme;
  animations: {
    particles: string;
    transitions: string;
    glows: string;
    hover: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  'sakura-sunset': {
    name: 'Sakura Sunset',
    description: 'Digital empathy with warm pink tones',
    descriptor: 'Warm & expressive',
    light: {
      background: {
        primary: 'hsl(340, 45%, 97%)',
        secondary: 'hsl(340, 40%, 94%)',
        tertiary: 'hsl(340, 35%, 90%)',
        glass: 'hsla(340, 45%, 97%, 0.8)'
      },
      text: {
        primary: 'hsl(340, 30%, 20%)',
        secondary: 'hsl(340, 25%, 35%)',
        muted: 'hsl(340, 20%, 50%)',
        placeholder: 'hsl(335, 30%, 65%)',
        contrast: 'hsl(340, 35%, 15%)'
      },
      accent: {
        primary: 'hsl(335, 75%, 58%)',
        secondary: 'hsl(345, 70%, 65%)',
        hover: 'hsl(335, 80%, 52%)',
        focus: 'hsl(335, 70%, 48%)',
        gradient: 'linear-gradient(135deg, hsl(335, 75%, 58%), hsl(345, 70%, 65%))'
      },
      border: {
        primary: 'hsl(340, 20%, 85%)',
        interactive: 'hsl(335, 60%, 60%)',
        subtle: 'hsl(340, 15%, 92%)'
      },
      glow: {
        color: 'hsl(335, 75%, 58%)',
        intensity: '0.2'
      },
      neumorphic: {
        light: 'hsla(340, 40%, 100%, 0.8)',
        dark: 'hsla(340, 30%, 80%, 0.3)',
        ambient: 'hsla(335, 75%, 58%, 0.1)'
      }
    },
    dark: {
      background: {
        primary: 'hsl(340, 25%, 16%)',
        secondary: 'hsl(340, 22%, 22%)',
        tertiary: 'hsl(340, 20%, 28%)',
        glass: 'hsla(340, 25%, 16%, 0.8)'
      },
      text: {
        primary: 'hsl(25, 60%, 92%)',
        secondary: 'hsl(345, 25%, 75%)',
        muted: 'hsl(340, 15%, 60%)',
        placeholder: 'hsl(335, 70%, 82%)',
        contrast: 'hsl(25, 70%, 96%)'
      },
      accent: {
        primary: 'hsl(335, 80%, 72%)',
        secondary: 'hsl(345, 75%, 80%)',
        hover: 'hsl(335, 85%, 78%)',
        focus: 'hsl(335, 75%, 65%)',
        gradient: 'linear-gradient(135deg, hsl(335, 80%, 72%), hsl(345, 75%, 80%))'
      },
      border: {
        primary: 'hsl(340, 15%, 35%)',
        interactive: 'hsl(335, 70%, 60%)',
        subtle: 'hsl(340, 18%, 25%)'
      },
      glow: {
        color: 'hsl(335, 80%, 72%)',
        intensity: '0.3'
      },
      neumorphic: {
        light: 'hsla(340, 20%, 30%, 0.2)',
        dark: 'hsla(340, 30%, 10%, 0.6)',
        ambient: 'hsla(335, 80%, 72%, 0.15)'
      }
    },
    animations: {
      particles: 'cherry-blossoms',
      transitions: 'smooth-organic',
      glows: 'soft-pearlescent',
      hover: 'magnetic-gentle'
    }
  },

  'twilight-neo': {
    name: 'Twilight Neo',
    description: 'High-tech precision with cyan energy',
    descriptor: 'High-contrast tech',
    light: {
      background: {
        primary: 'hsl(210, 50%, 98%)',
        secondary: 'hsl(210, 45%, 95%)',
        tertiary: 'hsl(210, 40%, 92%)'
      },
      text: {
        primary: 'hsl(220, 40%, 20%)',
        secondary: 'hsl(220, 30%, 40%)',
        muted: 'hsl(220, 20%, 55%)',
        placeholder: 'hsl(180, 50%, 50%)'
      },
      accent: {
        primary: 'hsl(180, 85%, 45%)',
        secondary: 'hsl(270, 75%, 55%)',
        hover: 'hsl(180, 90%, 40%)',
        focus: 'hsl(180, 80%, 38%)'
      },
      border: {
        primary: 'hsl(220, 25%, 85%)',
        interactive: 'hsl(180, 70%, 50%)'
      },
      glow: {
        color: 'hsl(180, 85%, 45%)',
        intensity: '0.25'
      }
    },
    dark: {
      background: {
        primary: 'hsl(220, 30%, 8%)',
        secondary: 'hsl(220, 28%, 12%)',
        tertiary: 'hsl(220, 25%, 16%)'
      },
      text: {
        primary: 'hsl(200, 70%, 94%)',
        secondary: 'hsl(200, 50%, 80%)',
        muted: 'hsl(200, 30%, 60%)',
        placeholder: 'hsl(180, 80%, 70%)'
      },
      accent: {
        primary: 'hsl(180, 95%, 60%)',
        secondary: 'hsl(270, 85%, 65%)',
        hover: 'hsl(180, 100%, 65%)',
        focus: 'hsl(180, 90%, 55%)'
      },
      border: {
        primary: 'hsl(220, 20%, 25%)',
        interactive: 'hsl(180, 80%, 50%)'
      },
      glow: {
        color: 'hsl(180, 95%, 60%)',
        intensity: '0.5'
      }
    },
    animations: {
      particles: 'data-streams',
      transitions: 'sharp-geometric',
      glows: 'electric-pulse',
      hover: 'glitch-effect'
    }
  },

  'aurora-daybreak': {
    name: 'Aurora Daybreak',
    description: 'Clean and refreshing balanced theme',
    descriptor: 'Calm & optimistic',
    light: {
      background: {
        primary: 'hsl(210, 60%, 98%)',
        secondary: 'hsl(210, 40%, 95%)',
        tertiary: 'hsl(210, 30%, 92%)'
      },
      text: {
        primary: 'hsl(220, 30%, 25%)',
        secondary: 'hsl(220, 25%, 45%)',
        muted: 'hsl(220, 20%, 65%)',
        placeholder: 'hsl(330, 70%, 78%)'
      },
      accent: {
        primary: 'hsl(330, 85%, 65%)',
        secondary: 'hsl(260, 75%, 70%)',
        hover: 'hsl(330, 90%, 60%)',
        focus: 'hsl(330, 80%, 58%)'
      },
      border: {
        primary: 'hsl(210, 25%, 85%)',
        interactive: 'hsl(330, 70%, 65%)'
      },
      glow: {
        color: 'hsl(330, 85%, 65%)',
        intensity: '0.2'
      }
    },
    dark: {
      background: {
        primary: 'hsl(210, 30%, 12%)',
        secondary: 'hsl(210, 28%, 18%)',
        tertiary: 'hsl(210, 25%, 24%)'
      },
      text: {
        primary: 'hsl(210, 50%, 92%)',
        secondary: 'hsl(210, 40%, 75%)',
        muted: 'hsl(210, 30%, 60%)',
        placeholder: 'hsl(330, 70%, 78%)'
      },
      accent: {
        primary: 'hsl(330, 85%, 72%)',
        secondary: 'hsl(260, 75%, 78%)',
        hover: 'hsl(330, 90%, 75%)',
        focus: 'hsl(330, 80%, 68%)'
      },
      border: {
        primary: 'hsl(210, 20%, 30%)',
        interactive: 'hsl(330, 70%, 65%)'
      },
      glow: {
        color: 'hsl(330, 85%, 72%)',
        intensity: '0.3'
      }
    },
    animations: {
      particles: 'soft-motes',
      transitions: 'smooth-gentle',
      glows: 'diffused-pastel',
      hover: 'subtle-lift'
    }
  },

  'warm-embrace': {
    name: 'Warm Embrace',
    description: 'Cozy and inviting with amber tones',
    descriptor: 'Earthy & grounded',
    light: {
      background: {
        primary: 'hsl(35, 70%, 96%)',
        secondary: 'hsl(35, 50%, 92%)',
        tertiary: 'hsl(35, 40%, 88%)'
      },
      text: {
        primary: 'hsl(30, 20%, 25%)',
        secondary: 'hsl(30, 18%, 40%)',
        muted: 'hsl(30, 15%, 55%)',
        placeholder: 'hsl(25, 60%, 70%)'
      },
      accent: {
        primary: 'hsl(25, 75%, 55%)',
        secondary: 'hsl(45, 70%, 50%)',
        hover: 'hsl(25, 80%, 50%)',
        focus: 'hsl(25, 70%, 48%)'
      },
      border: {
        primary: 'hsl(30, 20%, 80%)',
        interactive: 'hsl(25, 60%, 55%)'
      },
      glow: {
        color: 'hsl(25, 75%, 55%)',
        intensity: '0.2'
      }
    },
    dark: {
      background: {
        primary: 'hsl(30, 20%, 12%)',
        secondary: 'hsl(30, 18%, 18%)',
        tertiary: 'hsl(30, 16%, 24%)'
      },
      text: {
        primary: 'hsl(35, 50%, 92%)',
        secondary: 'hsl(35, 40%, 75%)',
        muted: 'hsl(35, 30%, 60%)',
        placeholder: 'hsl(25, 60%, 70%)'
      },
      accent: {
        primary: 'hsl(25, 75%, 65%)',
        secondary: 'hsl(45, 70%, 60%)',
        hover: 'hsl(25, 80%, 68%)',
        focus: 'hsl(25, 70%, 60%)'
      },
      border: {
        primary: 'hsl(30, 15%, 30%)',
        interactive: 'hsl(25, 60%, 55%)'
      },
      glow: {
        color: 'hsl(25, 75%, 65%)',
        intensity: '0.25'
      }
    },
    animations: {
      particles: 'warm-sparks',
      transitions: 'tangible-smooth',
      glows: 'amber-diffused',
      hover: 'comfortable-rise'
    }
  },

  'retro-terminus': {
    name: 'Retro Terminus',
    description: 'Minimalist terminal aesthetic',
    descriptor: 'Precision retro',
    light: {
      background: {
        primary: 'hsl(0, 0%, 98%)',
        secondary: 'hsl(0, 0%, 95%)',
        tertiary: 'hsl(0, 0%, 92%)'
      },
      text: {
        primary: 'hsl(0, 0%, 10%)',
        secondary: 'hsl(0, 0%, 30%)',
        muted: 'hsl(0, 0%, 50%)',
        placeholder: 'hsl(120, 80%, 35%)'
      },
      accent: {
        primary: 'hsl(120, 85%, 30%)',
        secondary: 'hsl(120, 80%, 35%)',
        hover: 'hsl(120, 90%, 25%)',
        focus: 'hsl(120, 85%, 28%)'
      },
      border: {
        primary: 'hsl(0, 0%, 80%)',
        interactive: 'hsl(120, 85%, 35%)'
      },
      glow: {
        color: 'hsl(120, 85%, 30%)',
        intensity: '0.1'
      }
    },
    dark: {
      background: {
        primary: 'hsl(0, 0%, 5%)',
        secondary: 'hsl(0, 0%, 8%)',
        tertiary: 'hsl(0, 0%, 12%)'
      },
      text: {
        primary: 'hsl(120, 80%, 70%)',
        secondary: 'hsl(120, 60%, 50%)',
        muted: 'hsl(120, 40%, 35%)',
        placeholder: 'hsl(120, 70%, 60%)'
      },
      accent: {
        primary: 'hsl(120, 85%, 75%)',
        secondary: 'hsl(120, 80%, 65%)',
        hover: 'hsl(120, 90%, 78%)',
        focus: 'hsl(120, 85%, 70%)'
      },
      border: {
        primary: 'hsl(0, 0%, 20%)',
        interactive: 'hsl(120, 85%, 75%)'
      },
      glow: {
        color: 'hsl(120, 85%, 75%)',
        intensity: '0.15'
      }
    },
    animations: {
      particles: 'ascii-rain',
      transitions: 'instant-sharp',
      glows: 'terminal-scanline',
      hover: 'block-select'
    }
  }
};

// Helper function to apply theme to CSS variables
export function applyTheme(themeName: ThemeName, isDark?: boolean) {
  const theme = themes[themeName];
  const root = document.documentElement;

  // Determine if dark mode based on parameter or current HTML class
  const useDarkMode = isDark ?? root.classList.contains('dark');
  const colors = useDarkMode ? theme.dark : theme.light;

  // Apply colors
  Object.entries(colors).forEach(([category, values]) => {
    Object.entries(values as Record<string, string>).forEach(([key, value]) => {
      root.style.setProperty(`--color-${category}-${key}`, value);
    });
  });

  // Apply animation properties
  root.style.setProperty('--animation-particles', theme.animations.particles);
  root.style.setProperty('--animation-transitions', theme.animations.transitions);
  root.style.setProperty('--animation-glows', theme.animations.glows);
  root.style.setProperty('--animation-hover', theme.animations.hover);

  // Store theme preference
  localStorage.setItem('agentos-theme', themeName);
  root.setAttribute('data-theme', themeName);
}

// Get default theme based on system preference
export function getDefaultTheme(): ThemeName {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('agentos-theme') as ThemeName;
    if (saved && themes[saved]) return saved;

    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'twilight-neo' : 'aurora-daybreak';
  }
  return 'aurora-daybreak';
}
