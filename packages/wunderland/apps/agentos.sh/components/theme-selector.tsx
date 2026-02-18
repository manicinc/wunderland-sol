'use client';

import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';
import { themes, ThemeName, applyTheme, getDefaultTheme } from '@/lib/themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';

// Organic blob icon
function ThemeBlobIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ts-blob" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-accent-primary)" />
          <stop offset="100%" stopColor="var(--color-accent-secondary)" />
        </linearGradient>
      </defs>
      <path
        d="M18 6c6-2 16-1 20 6s1 16-6 20-16 1-20-6 0-16 6-20z"
        fill="url(#ts-blob)"
        opacity="0.9"
      />
    </svg>
  );
}

/**
 * ThemeSelector renders the marketing theme palette picker, synchronising CSS variables with the active mode.
 */
export function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('aurora-daybreak');
  const [isOpen, setIsOpen] = useState(false);
  const { theme: mode, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const defaultTheme = getDefaultTheme();
    setCurrentTheme(defaultTheme);
  }, []);

  useEffect(() => {
    if (mounted) {
      const actualMode = mode === 'system' ? systemTheme : mode;
      const isDark = actualMode === 'dark';
      applyTheme(currentTheme, isDark);
    }
  }, [mode, systemTheme, currentTheme, mounted]);

  const handleThemeChange = (themeName: ThemeName) => {
    setCurrentTheme(themeName);
    const actualMode = mode === 'system' ? systemTheme : mode;
    const isDark = actualMode === 'dark';
    applyTheme(themeName, isDark);
    setIsOpen(false);
  };

  const renderIcon = (_themeName: ThemeName, className: string) => <ThemeBlobIcon className={className} />;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white/80 p-2 text-sm text-slate-700 shadow-sm transition hover:bg-white hover:shadow-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Select theme preset"
      >
        {renderIcon(currentTheme, 'h-5 w-5')}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="p-2 max-h-[60vh] overflow-auto">
                {Object.entries(themes).map(([key, theme]) => {
                  const themeName = key as ThemeName;
                  const isActive = currentTheme === themeName;
                  const actualMode = mode === 'system' ? systemTheme : mode;
                  const isDark = actualMode === 'dark';
                  const palette = isDark ? theme.dark : theme.light;
                  return (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(themeName)}
                      className={`group flex w-full items-start gap-3 rounded-lg p-3 text-left transition ${
                        isActive ? 'bg-accent-primary/10 text-accent-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {renderIcon(themeName, 'h-5 w-5')}
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900 dark:text-white">{theme.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{theme.description}</div>
                        {isActive && (
                          <div className="mt-2">
                            <span className="rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs font-medium text-accent-primary">
                              Active
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <div
                          className="h-3 w-3 rounded-full border border-slate-300 dark:border-slate-600"
                          style={{ backgroundColor: palette.accent.primary }}
                          aria-hidden="true"
                        />
                        <div
                          className="h-3 w-3 rounded-full border border-slate-300 dark:border-slate-600"
                          style={{ backgroundColor: palette.accent.secondary }}
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Monitor className="h-3 w-3" />
                  <span>Themes adapt to your system preference</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
