/**
 * @file KeyholeIcon.tsx
 * @description Rabbit Hole brand icon - keyhole with rabbit silhouette
 * Uses champagne gold gradient, theme-aware inner cutout for light/dark modes
 */

'use client';

import React from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface KeyholeIconProps {
  size?: number;
  className?: string;
  id?: string;
}

export function KeyholeIcon({ size = 64, className, id = 'keyhole' }: KeyholeIconProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  // Unique ID prefix to avoid gradient conflicts when multiple icons are rendered
  const gradientId = `${id}-${size}`;

  // In dark mode: cream cutout contrasts against dark bg
  // In light mode: dark obsidian cutout contrasts against light bg
  const innerColors = isLight
    ? { start: '#1a1625', mid: '#12101a', end: '#08050a' }
    : { start: '#faf7f2', mid: '#f5f0e8', end: '#ede8e0' };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Rabbit Hole logo"
    >
      <defs>
        {/* Champagne Gold - rich metallic gradient */}
        <linearGradient id={`goldGrad-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b6914" />
          <stop offset="25%" stopColor="#c9a227" />
          <stop offset="45%" stopColor="#e8d48a" />
          <stop offset="55%" stopColor="#f5e6a3" />
          <stop offset="70%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>

        {/* Inner cutout - adapts to theme for contrast */}
        <linearGradient id={`innerGrad-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={innerColors.start} />
          <stop offset="50%" stopColor={innerColors.mid} />
          <stop offset="100%" stopColor={innerColors.end} />
        </linearGradient>
      </defs>

      {/* Keyhole frame */}
      <path
        d="M 50 6
           C 72 6, 90 24, 90 46
           C 90 62, 78 76, 62 80
           L 62 82
           C 62 84, 60 86, 58 86
           L 58 94
           L 42 94
           L 42 86
           C 40 86, 38 84, 38 82
           L 38 80
           C 22 76, 10 62, 10 46
           C 10 24, 28 6, 50 6
           Z"
        fill={`url(#goldGrad-${gradientId})`}
      />

      {/* Inner keyhole cutout */}
      <path
        d="M 50 14
           C 68 14, 82 28, 82 46
           C 82 58, 74 70, 60 73
           L 58 73
           C 56 73, 54 75, 54 77
           L 54 88
           L 46 88
           L 46 77
           C 46 75, 44 73, 42 73
           L 40 73
           C 26 70, 18 58, 18 46
           C 18 28, 32 14, 50 14
           Z"
        fill={`url(#innerGrad-${gradientId})`}
      />

      {/* Rabbit silhouette */}
      <g fill={`url(#goldGrad-${gradientId})`}>
        {/* Left ear */}
        <path
          d="M34 50
             Q33 30 37 20
             Q39 14 43 14
             Q47 14 47 22
             Q47 34 45 50
             Q40 49 34 50Z"
        />
        {/* Right ear */}
        <path
          d="M66 50
             Q67 30 63 20
             Q61 14 57 14
             Q53 14 53 22
             Q53 34 55 50
             Q60 49 66 50Z"
        />
        {/* Body */}
        <ellipse cx="50" cy="60" rx="22" ry="18" />
      </g>
    </svg>
  );
}

export default KeyholeIcon;
