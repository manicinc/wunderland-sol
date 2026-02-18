"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { clsx } from "clsx";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="rounded-full border border-slate-200/60 bg-white/80 p-2 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
      >
        <SunMedium className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={clsx(
        "group relative inline-flex items-center rounded-full border border-slate-200/60 bg-white/80 px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-white/20"
      )}
    >
      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {isDark ? "Dark" : "Light"}
      </span>
      {isDark ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
    </button>
  );
}
