/**
 * Visual & Neumorphic Design System for AgentOS
 * Depth-focused design with theme-adaptive visual effects
 */

export const visualThemes = {
  'sakura-sunset': {
    name: 'Sakura Sunset',
    description: 'Pearlescent pink with soft depth',
    holographic: {
      primary: 'linear-gradient(135deg, rgba(255,182,193,0.3) 0%, rgba(255,105,180,0.2) 25%, rgba(255,20,147,0.3) 50%, rgba(255,192,203,0.2) 75%, rgba(255,182,193,0.3) 100%)',
      secondary: 'linear-gradient(-45deg, rgba(255,240,245,0.1) 0%, rgba(255,182,193,0.15) 50%, rgba(255,105,180,0.1) 100%)',
      overlay: 'radial-gradient(circle at 30% 50%, rgba(255,182,193,0.08), transparent 50%)',
      shimmer: 'linear-gradient(105deg, transparent 40%, rgba(255,182,193,0.4) 50%, transparent 60%)',
      iridescent: 'conic-gradient(from 180deg at 50% 50%, rgba(255,182,193,0.2), rgba(255,105,180,0.3), rgba(255,192,203,0.2), rgba(255,240,245,0.3), rgba(255,182,193,0.2))',
    },
    neumorphic: {
      lightShadow: '8px 8px 16px rgba(255,182,193,0.15), -8px -8px 16px rgba(255,255,255,0.7)',
      darkShadow: '8px 8px 16px rgba(139,69,82,0.2), -8px -8px 16px rgba(255,182,193,0.1)',
      insetLight: 'inset 6px 6px 12px rgba(255,182,193,0.15), inset -6px -6px 12px rgba(255,255,255,0.7)',
      insetDark: 'inset 6px 6px 12px rgba(139,69,82,0.2), inset -6px -6px 12px rgba(255,182,193,0.1)',
      glowSoft: '0 0 20px rgba(255,182,193,0.3), 0 0 40px rgba(255,105,180,0.2)',
      glowIntense: '0 0 30px rgba(255,20,147,0.4), 0 0 60px rgba(255,105,180,0.3)',
    },
    glass: {
      surface: 'rgba(255,250,252,0.08)',
      border: 'rgba(255,182,193,0.2)',
      reflection: 'linear-gradient(105deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,182,193,0.05) 100%)',
    },
    depth: {
      z0: '0px',
      z1: '0.5px',
      z2: '1px',
      z3: '2px',
      z4: '4px',
      z5: '8px',
    }
  },
  'twilight-neo': {
    name: 'Twilight Neo',
    description: 'Electric cyan with sharp depth',
    holographic: {
      primary: 'linear-gradient(135deg, rgba(0,255,255,0.3) 0%, rgba(138,43,226,0.2) 25%, rgba(0,191,255,0.3) 50%, rgba(147,112,219,0.2) 75%, rgba(0,255,255,0.3) 100%)',
      secondary: 'linear-gradient(-45deg, rgba(230,230,250,0.1) 0%, rgba(0,191,255,0.15) 50%, rgba(138,43,226,0.1) 100%)',
      overlay: 'radial-gradient(circle at 70% 50%, rgba(0,191,255,0.08), transparent 50%)',
      shimmer: 'linear-gradient(105deg, transparent 40%, rgba(0,255,255,0.4) 50%, transparent 60%)',
      iridescent: 'conic-gradient(from 180deg at 50% 50%, rgba(0,255,255,0.2), rgba(138,43,226,0.3), rgba(0,191,255,0.2), rgba(147,112,219,0.3), rgba(0,255,255,0.2))',
    },
    neumorphic: {
      lightShadow: '8px 8px 16px rgba(0,191,255,0.15), -8px -8px 16px rgba(255,255,255,0.7)',
      darkShadow: '8px 8px 16px rgba(25,25,112,0.3), -8px -8px 16px rgba(0,191,255,0.1)',
      insetLight: 'inset 6px 6px 12px rgba(0,191,255,0.15), inset -6px -6px 12px rgba(255,255,255,0.7)',
      insetDark: 'inset 6px 6px 12px rgba(25,25,112,0.3), inset -6px -6px 12px rgba(0,191,255,0.1)',
      glowSoft: '0 0 20px rgba(0,191,255,0.3), 0 0 40px rgba(138,43,226,0.2)',
      glowIntense: '0 0 30px rgba(0,255,255,0.5), 0 0 60px rgba(138,43,226,0.3)',
    },
    glass: {
      surface: 'rgba(240,248,255,0.08)',
      border: 'rgba(0,191,255,0.2)',
      reflection: 'linear-gradient(105deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,191,255,0.05) 100%)',
    },
    depth: {
      z0: '0px',
      z1: '0.5px',
      z2: '1px',
      z3: '2px',
      z4: '4px',
      z5: '8px',
    }
  },
  'aurora-daybreak': {
    name: 'Aurora Daybreak',
    description: 'Balanced aurora with gentle depth',
    holographic: {
      primary: 'linear-gradient(135deg, rgba(255,0,150,0.2) 0%, rgba(100,200,255,0.2) 25%, rgba(255,100,200,0.2) 50%, rgba(150,100,255,0.2) 75%, rgba(255,0,150,0.2) 100%)',
      secondary: 'linear-gradient(-45deg, rgba(255,240,250,0.1) 0%, rgba(200,150,255,0.15) 50%, rgba(100,200,255,0.1) 100%)',
      overlay: 'radial-gradient(circle at 50% 30%, rgba(200,150,255,0.08), transparent 50%)',
      shimmer: 'linear-gradient(105deg, transparent 40%, rgba(255,150,200,0.3) 50%, transparent 60%)',
      iridescent: 'conic-gradient(from 180deg at 50% 50%, rgba(255,0,150,0.15), rgba(100,200,255,0.2), rgba(255,100,200,0.15), rgba(150,100,255,0.2), rgba(255,0,150,0.15))',
    },
    neumorphic: {
      lightShadow: '8px 8px 16px rgba(200,150,255,0.12), -8px -8px 16px rgba(255,255,255,0.7)',
      darkShadow: '8px 8px 16px rgba(50,25,75,0.25), -8px -8px 16px rgba(200,150,255,0.08)',
      insetLight: 'inset 6px 6px 12px rgba(200,150,255,0.12), inset -6px -6px 12px rgba(255,255,255,0.7)',
      insetDark: 'inset 6px 6px 12px rgba(50,25,75,0.25), inset -6px -6px 12px rgba(200,150,255,0.08)',
      glowSoft: '0 0 20px rgba(200,150,255,0.25), 0 0 40px rgba(255,100,200,0.15)',
      glowIntense: '0 0 30px rgba(255,0,150,0.35), 0 0 60px rgba(100,200,255,0.25)',
    },
    glass: {
      surface: 'rgba(250,248,255,0.06)',
      border: 'rgba(200,150,255,0.15)',
      reflection: 'linear-gradient(105deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(200,150,255,0.04) 100%)',
    },
    depth: {
      z0: '0px',
      z1: '0.5px',
      z2: '1px',
      z3: '2px',
      z4: '4px',
      z5: '8px',
    }
  },
  'warm-embrace': {
    name: 'Warm Embrace',
    description: 'Golden amber with earthy depth',
    holographic: {
      primary: 'linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(255,140,0,0.2) 25%, rgba(255,165,0,0.3) 50%, rgba(255,193,7,0.2) 75%, rgba(255,215,0,0.3) 100%)',
      secondary: 'linear-gradient(-45deg, rgba(255,248,220,0.1) 0%, rgba(255,193,7,0.15) 50%, rgba(255,140,0,0.1) 100%)',
      overlay: 'radial-gradient(circle at 30% 70%, rgba(255,193,7,0.08), transparent 50%)',
      shimmer: 'linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.4) 50%, transparent 60%)',
      iridescent: 'conic-gradient(from 180deg at 50% 50%, rgba(255,215,0,0.2), rgba(255,140,0,0.3), rgba(255,165,0,0.2), rgba(255,193,7,0.3), rgba(255,215,0,0.2))',
    },
    neumorphic: {
      lightShadow: '8px 8px 16px rgba(255,193,7,0.15), -8px -8px 16px rgba(255,255,240,0.7)',
      darkShadow: '8px 8px 16px rgba(139,90,0,0.25), -8px -8px 16px rgba(255,193,7,0.1)',
      insetLight: 'inset 6px 6px 12px rgba(255,193,7,0.15), inset -6px -6px 12px rgba(255,255,240,0.7)',
      insetDark: 'inset 6px 6px 12px rgba(139,90,0,0.25), inset -6px -6px 12px rgba(255,193,7,0.1)',
      glowSoft: '0 0 20px rgba(255,193,7,0.3), 0 0 40px rgba(255,140,0,0.2)',
      glowIntense: '0 0 30px rgba(255,215,0,0.4), 0 0 60px rgba(255,140,0,0.3)',
    },
    glass: {
      surface: 'rgba(255,250,240,0.08)',
      border: 'rgba(255,193,7,0.2)',
      reflection: 'linear-gradient(105deg, rgba(255,255,240,0.1) 0%, transparent 50%, rgba(255,193,7,0.05) 100%)',
    },
    depth: {
      z0: '0px',
      z1: '0.5px',
      z2: '1px',
      z3: '2px',
      z4: '4px',
      z5: '8px',
    }
  },
  'retro-terminus': {
    name: 'Retro Terminus',
    description: 'Terminal green with matrix depth',
    holographic: {
      primary: 'linear-gradient(135deg, rgba(0,255,0,0.3) 0%, rgba(50,205,50,0.2) 25%, rgba(0,255,0,0.3) 50%, rgba(124,252,0,0.2) 75%, rgba(0,255,0,0.3) 100%)',
      secondary: 'linear-gradient(-45deg, rgba(0,0,0,0.8) 0%, rgba(0,255,0,0.15) 50%, rgba(0,100,0,0.9) 100%)',
      overlay: 'radial-gradient(circle at 50% 50%, rgba(0,255,0,0.05), transparent 60%)',
      shimmer: 'linear-gradient(105deg, transparent 40%, rgba(0,255,0,0.6) 50%, transparent 60%)',
      iridescent: 'conic-gradient(from 180deg at 50% 50%, rgba(0,255,0,0.2), rgba(0,100,0,0.8), rgba(50,205,50,0.2), rgba(124,252,0,0.3), rgba(0,255,0,0.2))',
    },
    neumorphic: {
      lightShadow: '0 0 10px rgba(0,255,0,0.3), 4px 4px 8px rgba(0,0,0,0.9)',
      darkShadow: '0 0 20px rgba(0,255,0,0.5), 8px 8px 16px rgba(0,0,0,1)',
      insetLight: 'inset 0 0 10px rgba(0,255,0,0.2), inset 2px 2px 4px rgba(0,0,0,0.8)',
      insetDark: 'inset 0 0 20px rgba(0,255,0,0.3), inset 4px 4px 8px rgba(0,0,0,0.9)',
      glowSoft: '0 0 20px rgba(0,255,0,0.4)',
      glowIntense: '0 0 40px rgba(0,255,0,0.6), 0 0 80px rgba(0,255,0,0.3)',
    },
    glass: {
      surface: 'rgba(0,0,0,0.9)',
      border: 'rgba(0,255,0,0.4)',
      reflection: 'linear-gradient(105deg, rgba(0,255,0,0.1) 0%, transparent 50%, rgba(0,255,0,0.05) 100%)',
    },
    depth: {
      z0: '0px',
      z1: '1px',
      z2: '2px',
      z3: '3px',
      z4: '5px',
      z5: '10px',
    }
  }
};

// Theme gradient combinations
export const themeGradients = {
  'sakura-sunset': {
    hero: 'radial-gradient(ellipse at top, rgba(255,240,245,0.9), rgba(255,182,193,0.4) 40%, rgba(255,105,180,0.2) 70%, rgba(255,20,147,0.1))',
    section: 'linear-gradient(180deg, rgba(255,250,252,0.95), rgba(255,240,245,0.8) 20%, rgba(255,182,193,0.3) 60%, rgba(255,240,245,0.9))',
    card: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,240,245,0.95), rgba(255,182,193,0.2))',
    depth1: 'linear-gradient(to bottom, rgba(255,250,252,1), rgba(255,240,245,0.98))',
    depth2: 'linear-gradient(to bottom, rgba(255,240,245,0.98), rgba(255,182,193,0.15))',
    depth3: 'linear-gradient(to bottom, rgba(255,182,193,0.15), rgba(255,105,180,0.1))',
  },
  'twilight-neo': {
    hero: 'radial-gradient(ellipse at top, rgba(240,248,255,0.9), rgba(0,191,255,0.4) 40%, rgba(138,43,226,0.3) 70%, rgba(25,25,112,0.2))',
    section: 'linear-gradient(180deg, rgba(240,248,255,0.95), rgba(230,230,250,0.8) 20%, rgba(0,191,255,0.3) 60%, rgba(240,248,255,0.9))',
    card: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,248,255,0.95), rgba(0,191,255,0.2))',
    depth1: 'linear-gradient(to bottom, rgba(240,248,255,1), rgba(230,230,250,0.98))',
    depth2: 'linear-gradient(to bottom, rgba(230,230,250,0.98), rgba(0,191,255,0.15))',
    depth3: 'linear-gradient(to bottom, rgba(0,191,255,0.15), rgba(138,43,226,0.1))',
  },
  'aurora-daybreak': {
    hero: 'radial-gradient(ellipse at top, rgba(255,250,255,0.9), rgba(200,150,255,0.35) 40%, rgba(255,100,200,0.25) 70%, rgba(100,200,255,0.15))',
    section: 'linear-gradient(180deg, rgba(255,250,255,0.95), rgba(250,248,255,0.8) 20%, rgba(200,150,255,0.25) 60%, rgba(255,250,255,0.9))',
    card: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,250,255,0.95), rgba(200,150,255,0.15))',
    depth1: 'linear-gradient(to bottom, rgba(255,250,255,1), rgba(250,248,255,0.98))',
    depth2: 'linear-gradient(to bottom, rgba(250,248,255,0.98), rgba(200,150,255,0.12))',
    depth3: 'linear-gradient(to bottom, rgba(200,150,255,0.12), rgba(255,100,200,0.08))',
  },
  'warm-embrace': {
    hero: 'radial-gradient(ellipse at top, rgba(255,253,240,0.9), rgba(255,193,7,0.4) 40%, rgba(255,140,0,0.3) 70%, rgba(139,90,0,0.2))',
    section: 'linear-gradient(180deg, rgba(255,253,240,0.95), rgba(255,248,220,0.8) 20%, rgba(255,193,7,0.3) 60%, rgba(255,253,240,0.9))',
    card: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,253,240,0.95), rgba(255,193,7,0.2))',
    depth1: 'linear-gradient(to bottom, rgba(255,253,240,1), rgba(255,248,220,0.98))',
    depth2: 'linear-gradient(to bottom, rgba(255,248,220,0.98), rgba(255,193,7,0.15))',
    depth3: 'linear-gradient(to bottom, rgba(255,193,7,0.15), rgba(255,140,0,0.1))',
  },
  'retro-terminus': {
    hero: 'radial-gradient(ellipse at center, rgba(0,0,0,0.95), rgba(0,100,0,0.8) 40%, rgba(0,255,0,0.2) 70%, rgba(0,0,0,1))',
    section: 'linear-gradient(180deg, rgba(0,0,0,0.98), rgba(0,50,0,0.9) 20%, rgba(0,255,0,0.1) 60%, rgba(0,0,0,0.98))',
    card: 'linear-gradient(135deg, rgba(0,0,0,0.95), rgba(0,50,0,0.9), rgba(0,255,0,0.1))',
    depth1: 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,50,0,0.95))',
    depth2: 'linear-gradient(to bottom, rgba(0,50,0,0.95), rgba(0,255,0,0.08))',
    depth3: 'linear-gradient(to bottom, rgba(0,255,0,0.08), rgba(0,0,0,1))',
  }
};

// Animation configurations for visual feel
export const themeAnimations = {
  // Liquid morph for text transitions
  liquidMorph: {
    initial: {
      opacity: 0,
      filter: 'blur(10px)',
      transform: 'scale(0.9) rotateX(90deg)',
    },
    animate: {
      opacity: 1,
      filter: 'blur(0px)',
      transform: 'scale(1) rotateX(0deg)',
    },
    exit: {
      opacity: 0,
      filter: 'blur(10px)',
      transform: 'scale(1.1) rotateX(-90deg)',
    },
    transition: {
      duration: 1.2,
      ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for liquid feel
    }
  },

  // Visual shimmer
  visualShimmer: {
    animate: {
      backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
    },
    transition: {
      duration: 3,
      ease: 'linear',
      repeat: Infinity,
    }
  },

  // Floating elements
  float: {
    animate: {
      y: [0, -10, 0, 10, 0],
      x: [0, 5, -5, 5, 0],
      rotate: [0, 1, -1, 0],
    },
    transition: {
      duration: 20,
      ease: 'easeInOut',
      repeat: Infinity,
    }
  },

  // Depth pulse
  depthPulse: {
    animate: {
      scale: [1, 1.02, 1],
      boxShadow: [
        '0 10px 30px rgba(0,0,0,0.1)',
        '0 20px 60px rgba(0,0,0,0.2)',
        '0 10px 30px rgba(0,0,0,0.1)',
      ],
    },
    transition: {
      duration: 4,
      ease: 'easeInOut',
      repeat: Infinity,
    }
  },

  // Particle convergence
  particleConverge: {
    initial: {
      scale: 0,
      opacity: 0,
      x: () => Math.random() * 200 - 100,
      y: () => Math.random() * 200 - 100,
    },
    animate: {
      scale: 1,
      opacity: [0, 1, 1, 0],
      x: 0,
      y: 0,
    },
    transition: {
      duration: 2,
      ease: [0.43, 0.13, 0.23, 0.96],
      opacity: {
        times: [0, 0.2, 0.8, 1],
      }
    }
  }
};

// Neumorphic component styles
export const neumorphicComponents = {
  card: (theme: string, isDark: boolean) => ({
    background: isDark
      ? visualThemes[theme as keyof typeof visualThemes].glass.surface
      : 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: `1px solid ${visualThemes[theme as keyof typeof visualThemes].glass.border}`,
    boxShadow: isDark
      ? visualThemes[theme as keyof typeof visualThemes].neumorphic.darkShadow
      : visualThemes[theme as keyof typeof visualThemes].neumorphic.lightShadow,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: visualThemes[theme as keyof typeof visualThemes].glass.reflection,
      pointerEvents: 'none',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: visualThemes[theme as keyof typeof visualThemes].holographic.shimmer,
      transform: 'rotate(45deg)',
      opacity: 0,
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none',
    },
    '&:hover::after': {
      opacity: 1,
      animation: 'shimmerMove 0.5s ease',
    }
  }),

  button: (theme: string, isDark: boolean, variant: 'primary' | 'secondary' = 'primary') => ({
    background: variant === 'primary'
      ? visualThemes[theme as keyof typeof visualThemes].holographic.primary
      : 'transparent',
    border: variant === 'secondary'
      ? `2px solid ${visualThemes[theme as keyof typeof visualThemes].glass.border}`
      : 'none',
    boxShadow: isDark
      ? visualThemes[theme as keyof typeof visualThemes].neumorphic.darkShadow
      : visualThemes[theme as keyof typeof visualThemes].neumorphic.lightShadow,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    transform: 'translateZ(0)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-2px) scale(1.02)',
      boxShadow: isDark
        ? visualThemes[theme as keyof typeof visualThemes].neumorphic.glowIntense
        : visualThemes[theme as keyof typeof visualThemes].neumorphic.glowSoft,
    },
    '&:active': {
      transform: 'translateY(0) scale(0.98)',
      boxShadow: isDark
        ? visualThemes[theme as keyof typeof visualThemes].neumorphic.insetDark
        : visualThemes[theme as keyof typeof visualThemes].neumorphic.insetLight,
    }
  }),

  input: (theme: string, isDark: boolean) => ({
    background: isDark
      ? 'rgba(0,0,0,0.3)'
      : 'rgba(255,255,255,0.5)',
    border: `1px solid ${visualThemes[theme as keyof typeof visualThemes].glass.border}`,
    boxShadow: visualThemes[theme as keyof typeof visualThemes].neumorphic.insetLight,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    '&:focus': {
      boxShadow: `${visualThemes[theme as keyof typeof visualThemes].neumorphic.insetDark}, 0 0 0 3px ${visualThemes[theme as keyof typeof visualThemes].glass.border}`,
      borderColor: 'transparent',
    }
  })
};

// Utility function to apply visual theme
export function applyVisualTheme(themeName: string, isDark: boolean) {
  const root = document.documentElement;
  const theme = visualThemes[themeName as keyof typeof visualThemes];

  if (!theme) return;

  // Apply CSS variables
  Object.entries(theme.holographic).forEach(([key, value]) => {
    root.style.setProperty(`--holographic-${key}`, value);
  });

  Object.entries(theme.neumorphic).forEach(([key, value]) => {
    root.style.setProperty(`--neumorphic-${key}`, value);
  });

  Object.entries(theme.glass).forEach(([key, value]) => {
    root.style.setProperty(`--glass-${key}`, value);
  });

  Object.entries(themeGradients[themeName as keyof typeof themeGradients]).forEach(([key, value]) => {
    root.style.setProperty(`--gradient-${key}`, value);
  });

  // Add theme attribute
  root.setAttribute('data-visual-theme', themeName);
  root.setAttribute('data-theme-mode', isDark ? 'dark' : 'light');
}

// Export for use in components
const visualDesignSystem = {
  visualThemes,
  themeGradients,
  themeAnimations,
  neumorphicComponents,
  applyVisualTheme,
};

export default visualDesignSystem;

