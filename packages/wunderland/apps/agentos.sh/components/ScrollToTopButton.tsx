"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import clsx from "clsx";

const SHOW_AT = 320;

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AT);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      className={clsx(
        "fixed bottom-6 right-6 z-[110]", // z-index increased to be above GDPR banner (z-[100])
        "inline-flex h-12 w-12 items-center justify-center",
        "rounded-full",
        "border border-[var(--color-border-subtle)]",
        "bg-[var(--color-background-glass)]",
        "backdrop-blur-xl",
        "text-[var(--color-text-primary)]",
        "shadow-lg shadow-[var(--color-accent-primary)]/10",
        "transition-all duration-[var(--duration-smooth)]",
        "hover:-translate-y-1 hover:shadow-xl hover:border-[var(--color-border-interactive)] hover:bg-[var(--color-accent-primary)]/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]",
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
