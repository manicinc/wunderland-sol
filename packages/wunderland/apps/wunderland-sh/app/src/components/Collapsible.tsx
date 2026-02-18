'use client';

import { useState, useRef, useEffect } from 'react';

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function Collapsible({ title, defaultOpen = false, children, className = '' }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>(defaultOpen ? 'auto' : 0);

  useEffect(() => {
    if (!contentRef.current) return;

    if (open) {
      const h = contentRef.current.scrollHeight;
      setHeight(h);
      // After transition, set to auto for dynamic content
      const timer = setTimeout(() => setHeight('auto'), 300);
      return () => clearTimeout(timer);
    } else {
      // Set explicit height first so transition works
      const h = contentRef.current.scrollHeight;
      setHeight(h);
      // Force reflow then collapse
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0));
      });
    }
  }, [open]);

  // Observe content changes when open
  useEffect(() => {
    if (!open || !contentRef.current) return;
    const observer = new ResizeObserver(() => {
      if (height === 'auto' && contentRef.current) {
        // Don't interfere with transitions
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [open, height]);

  return (
    <div className={`wl-collapsible ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="wl-collapsible-trigger"
        aria-expanded={open}
      >
        <svg
          className={`wl-collapsible-chevron ${open ? 'wl-collapsible-chevron--open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="wl-collapsible-title">{title}</span>
      </button>
      <div
        className="wl-collapsible-content"
        style={{
          maxHeight: height === 'auto' ? 'none' : `${height}px`,
          opacity: open ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="wl-collapsible-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
