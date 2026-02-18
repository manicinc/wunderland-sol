"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white/80 text-slate-700 shadow-sm transition-theme dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200"
        aria-label="Toggle theme"
      >
        <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-purple-300 to-pink-300" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white/80 text-slate-700 shadow-sm transition-theme hover:bg-white hover:shadow-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
    >
      {/* Organic animated SVG, consistent with VCA */}
      <svg className="h-5 w-5 text-accent-primary" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <radialGradient id="aura-landing" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isDark ? "rgba(180,220,255,0.45)" : "rgba(255,170,210,0.35)"} />
            <stop offset="60%" stopColor={isDark ? "rgba(120,180,255,0.15)" : "rgba(255,200,230,0.12)"} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="url(#aura-landing)">
          <animate attributeName="r" dur="3s" values="21;23;21" repeatCount="indefinite" />
        </circle>
        <g>
          <circle fill={isDark ? "hsl(200,80%,65%)" : "hsl(45,95%,60%)"} cx="24" cy="24" r="8">
            <animate attributeName="r" dur="2.8s" values="7.6;8;7.6" repeatCount="indefinite" />
          </circle>
          {isDark ? (
            <circle fill="hsl(220,30%,12%)" cx="28" cy="20" r="8" />
          ) : (
            <circle fill="rgba(255,255,255,0.35)" cx="24" cy="24" r="10">
              <animate attributeName="r" dur="2.8s" values="9.5;10;9.5" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      </svg>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
