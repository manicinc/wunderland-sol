'use client';

/**
 * OrganicButton — Gradient-bordered glass button with breathing animation.
 *
 * Uses a rotating conic gradient border + glass fill. No canvas or SVG
 * path animation — pure CSS for performance and clean feel.
 */

import type { CSSProperties, ReactNode } from 'react';

interface OrganicButtonProps {
  href: string;
  label: string;
  sublabel?: string;
  color?: string;
  accentColor?: string;
  external?: boolean;
  icon?: 'github' | 'trophy' | 'globe' | 'arrow';
  className?: string;
  primary?: boolean;
}

const ICON_SVG: Record<string, ReactNode> = {
  github: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  ),
  trophy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3h14v2h-1v3c0 2.21-1.79 4-4 4h-1v2h3v2H8v-2h3v-2H9c-2.21 0-4-1.79-4-4V5H4V3h1zm2 2v3c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V5H7zm-3 13h16v2H4v-2z" />
    </svg>
  ),
  globe: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
};

export function OrganicButton({
  href,
  label,
  sublabel,
  color = '#9945ff',
  accentColor = '#14f195',
  external = false,
  icon,
  className = '',
  primary = false,
}: OrganicButtonProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener' : undefined}
      className={`
        organic-btn group relative inline-flex items-center justify-center gap-3
        rounded-2xl transition-all duration-300 min-w-[220px]
        ${primary
          ? 'px-7 py-3.5'
          : 'px-5 py-3'
        }
        ${className}
      `}
      style={{
        '--btn-color': color,
        '--btn-accent': accentColor,
      } as CSSProperties}
    >
      {/* Rotating gradient border */}
      <span className="absolute inset-0 rounded-2xl organic-btn-border" />

      {/* Glass fill */}
      <span className="absolute inset-[1px] rounded-[15px] bg-[#0a0a0f]/90 backdrop-blur-sm group-hover:bg-[#0f0f18]/90 transition-colors duration-300" />

      {/* Content */}
      <span className="relative flex items-center gap-2.5">
        {icon && (
          <span className="text-white/50 group-hover:text-white/80 transition-colors duration-300">
            {ICON_SVG[icon]}
          </span>
        )}
        <span className="flex flex-col">
          <span className={`font-display font-semibold leading-tight text-white/90 group-hover:text-white transition-colors duration-300 ${primary ? 'text-sm' : 'text-[13px]'}`}>
            {label}
          </span>
          {sublabel && (
            <span className="text-[10px] font-mono text-white/25 group-hover:text-white/40 transition-colors duration-300 leading-tight mt-0.5">
              {sublabel}
            </span>
          )}
        </span>
        {primary && (
          <span className="text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all duration-300 ml-1">
            {ICON_SVG.arrow}
          </span>
        )}
      </span>
    </a>
  );
}
