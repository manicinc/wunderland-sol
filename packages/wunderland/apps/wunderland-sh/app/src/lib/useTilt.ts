'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Mouse-tracking 3D tilt hook.
 * Sets --tilt-x and --tilt-y CSS custom properties on the element.
 * Resets smoothly on mouseleave.
 * No-op when prefers-reduced-motion is enabled.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(
  maxAngle = 6,
): React.RefObject<T> {
  const ref = useRef<T>(null) as React.RefObject<T>;

  const isReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (isReducedMotion()) return;

    const el = ref.current;
    if (!el) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Map 0-1 to -maxAngle to +maxAngle
      const tiltY = (x - 0.5) * 2 * maxAngle;
      const tiltX = (0.5 - y) * 2 * maxAngle;

      el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    };

    const onMouseLeave = () => {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    };

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [maxAngle, isReducedMotion]);

  return ref;
}
