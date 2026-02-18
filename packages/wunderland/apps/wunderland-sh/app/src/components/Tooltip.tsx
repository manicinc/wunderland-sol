'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactElement;
}

export default function Tooltip({ content, position = 'top', delay = 300, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [side, setSide] = useState(position);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchRef = useRef(false);

  const calculate = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const pad = 10;
    let s = position;
    let x = 0;
    let y = 0;

    // Preferred placement
    if (s === 'top') {
      x = rect.left + rect.width / 2;
      y = rect.top - pad;
    } else if (s === 'bottom') {
      x = rect.left + rect.width / 2;
      y = rect.bottom + pad;
    } else if (s === 'left') {
      x = rect.left - pad;
      y = rect.top + rect.height / 2;
    } else {
      x = rect.right + pad;
      y = rect.top + rect.height / 2;
    }

    // Flip if out of viewport
    if (s === 'top' && rect.top < 80) s = 'bottom';
    if (s === 'bottom' && rect.bottom > window.innerHeight - 80) s = 'top';
    if (s === 'left' && rect.left < 160) s = 'right';
    if (s === 'right' && rect.right > window.innerWidth - 160) s = 'left';

    // Recalculate for flipped side
    if (s !== position) {
      if (s === 'top') { x = rect.left + rect.width / 2; y = rect.top - pad; }
      else if (s === 'bottom') { x = rect.left + rect.width / 2; y = rect.bottom + pad; }
      else if (s === 'left') { x = rect.left - pad; y = rect.top + rect.height / 2; }
      else { x = rect.right + pad; y = rect.top + rect.height / 2; }
    }

    setSide(s);
    setCoords({ x, y });
  }, [position]);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      calculate();
      setVisible(true);
    }, delay);
  }, [calculate, delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const handleTouch = useCallback((e: React.TouchEvent) => {
    isTouchRef.current = true;
    if (visible) {
      hide();
    } else {
      e.preventDefault();
      calculate();
      setVisible(true);
    }
  }, [visible, calculate, hide]);

  // Dismiss on outside click/touch
  useEffect(() => {
    if (!visible) return;
    const dismiss = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        hide();
      }
    };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('touchstart', dismiss);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('touchstart', dismiss);
    };
  }, [visible, hide]);

  // Cleanup timer
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const transformOrigin =
    side === 'top' ? 'bottom center' :
    side === 'bottom' ? 'top center' :
    side === 'left' ? 'center right' : 'center left';

  const translate =
    side === 'top' ? 'translate(-50%, -100%)' :
    side === 'bottom' ? 'translate(-50%, 0)' :
    side === 'left' ? 'translate(-100%, -50%)' : 'translate(0, -50%)';

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => { if (!isTouchRef.current) show(); }}
        onMouseLeave={() => { if (!isTouchRef.current) hide(); }}
        onTouchStart={handleTouch}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
      {visible && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            className="wl-tooltip"
            style={{
              left: coords.x,
              top: coords.y,
              transform: translate,
              transformOrigin,
            }}
          >
            <div className={`wl-tooltip-arrow wl-tooltip-arrow--${side}`} />
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
