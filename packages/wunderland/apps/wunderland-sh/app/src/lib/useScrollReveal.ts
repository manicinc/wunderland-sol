'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * IntersectionObserver hook for scroll-reveal animations.
 * Returns a ref to attach to the element and a boolean `isVisible`.
 * One-shot: once visible, stays visible.
 * Respects prefers-reduced-motion (immediately visible).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): { ref: React.RefCallback<T>; isVisible: boolean } {
  const [node, setNode] = useState<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const ref = useCallback((el: T | null) => {
    setNode((prev) => (prev === el ? prev : el));
  }, []);

  const checkReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (isVisible) return;
    if (checkReducedMotion()) {
      setIsVisible(true);
      return;
    }

    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const isInViewport = () => {
      try {
        const rect = node.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        return rect.bottom > 0 && rect.top < vh;
      } catch {
        return true;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(node);
    // Fail-open: if the element is already on screen but IO never fires (race/layout quirks),
    // reveal it shortly after mount so critical content never stays invisible.
    const fallbackTimer = window.setTimeout(() => {
      if (isInViewport()) setIsVisible(true);
    }, 600);

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [threshold, checkReducedMotion, node, isVisible]);

  return { ref, isVisible };
}

/**
 * Hook for observing multiple children at once (e.g. a grid of cards).
 * Returns a ref for the container and a Set of visible child indices.
 * Attach `data-reveal-index="N"` to each child.
 */
export function useScrollRevealGroup<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
  itemCount = 0,
): { containerRef: React.RefCallback<T>; visibleIndices: Set<number> } {
  const [container, setContainer] = useState<T | null>(null);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  const containerRef = useCallback((el: T | null) => {
    setContainer((prev) => (prev === el ? prev : el));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Mark all as visible immediately
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

    if (!container) return;
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: show everything
      const children = container.querySelectorAll('[data-reveal-index]');
      const all = new Set<number>();
      children.forEach((child) => {
        const idx = parseInt(child.getAttribute('data-reveal-index') || '0', 10);
        all.add(idx);
      });
      setVisibleIndices(all);
      return;
    }

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
  }, [threshold, itemCount, container]);

  return { containerRef, visibleIndices };
}
