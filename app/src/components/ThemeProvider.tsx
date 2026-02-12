'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read persisted preference directly (most reliable — survives hydration resets).
    let initialTheme: Theme = 'dark';
    try {
      const stored = localStorage.getItem('wl-theme');
      if (stored === 'light' || stored === 'dark') {
        initialTheme = stored;
      } else {
        // Fallback: cookie (cross-subdomain)
        const m = document.cookie.match(/wl-theme=(dark|light)/);
        if (m) initialTheme = m[1] as Theme;
      }
    } catch {
      // Fallback: read whatever class the inline script set
      initialTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }

    // Re-apply class in case hydration cleared it
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(initialTheme);

    setThemeState(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('wl-theme', theme);
    // Sync to domain cookie so docs.wunderland.sh can read it
    document.cookie = `wl-theme=${theme};path=/;domain=.wunderland.sh;max-age=31536000;SameSite=Lax`;

    // Swap favicon to match theme
    const svgIcon = document.querySelector('link[type="image/svg+xml"]') as HTMLLinkElement | null;
    if (svgIcon) {
      svgIcon.href = theme === 'light' ? '/icon-gold.svg' : '/icon.svg';
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  // Return default values during SSR / before hydration
  if (context === undefined) {
    return {
      theme: 'dark' as const,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
