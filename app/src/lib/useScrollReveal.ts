'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * IntersectionObserver hook for scroll-reveal animations.
 * Returns a ref to attach to the element and a boolean `isVisible`.
 * One-shot: once visible, stays visible.
 * Respects prefers-reduced-motion (immediately visible).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): { ref: React.RefObject<T>; isVisible: boolean } {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  const checkReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (checkReducedMotion()) {
      setIsVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, checkReducedMotion]);

  return { ref, isVisible };
}

/**
 * Hook for observing multiple children at once (e.g. a grid of cards).
 * Returns a ref for the container and a Set of visible child indices.
 * Attach `data-reveal-index="N"` to each child.
 */
export function useScrollRevealGroup<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): { containerRef: React.RefObject<T>; visibleIndices: Set<number> } {
  const containerRef = useRef<T>(null);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Mark all as visible immediately
      const container = containerRef.current;
      if (container) {
        const children = container.querySelectorAll('[data-reveal-index]');
        const all = new Set<number>();
        children.forEach((child) => {
          const idx = parseInt(child.getAttribute('data-reveal-index') || '0', 10);
          all.add(idx);
        });
        setVisibleIndices(all);
      }
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(
              (entry.target as HTMLElement).getAttribute('data-reveal-index') || '0',
              10,
            );
            setVisibleIndices((prev) => {
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    const children = container.querySelectorAll('[data-reveal-index]');
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [threshold]);

  return { containerRef, visibleIndices };
}
