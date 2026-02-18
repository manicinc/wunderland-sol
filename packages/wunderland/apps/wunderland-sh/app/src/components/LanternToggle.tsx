'use client';

import { useTheme } from './ThemeProvider';

interface LanternToggleProps {
  className?: string;
}

export function LanternToggle({ className = '' }: LanternToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`lantern-toggle ${isDark ? 'lantern-toggle--lit' : 'lantern-toggle--dim'} ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="lantern-icon"
      >
        {/* Lantern hook/handle */}
        <path
          d="M12 1C12 1 10 2 10 3.5V4H14V3.5C14 2 12 1 12 1Z"
          className="lantern-hook"
          fill="currentColor"
          opacity={isDark ? 1 : 0.5}
        />

        {/* Handle ring */}
        <path
          d="M9 4H15V5H9V4Z"
          className="lantern-cap"
          fill="currentColor"
          opacity={isDark ? 1 : 0.5}
        />

        {/* Top cap */}
        <path
          d="M8 5H16L15 7H9L8 5Z"
          className="lantern-cap"
          fill="currentColor"
          opacity={isDark ? 1 : 0.5}
        />

        {/* Glass body - main chamber */}
        <path
          d="M9 7H15V18H9V7Z"
          className="lantern-glass"
          fill={isDark ? 'url(#lanternGlow)' : 'url(#lanternGlowDim)'}
          stroke="currentColor"
          strokeWidth="0.5"
          opacity={isDark ? 1 : 0.7}
        />

        {/* Flame - visible in both modes, just dimmer in light */}
        <g className="lantern-flame" style={{ opacity: isDark ? 1 : 0.4, transition: 'opacity 0.4s ease' }}>
          {/* Outer flame glow */}
          <ellipse
            cx="12"
            cy="13"
            rx="2.5"
            ry="4"
            fill={isDark ? 'url(#flameGlow)' : 'url(#flameGlowDim)'}
            opacity="0.6"
          >
            <animate
              attributeName="rx"
              values="2.5;2.8;2.5"
              dur="0.8s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="ry"
              values="4;4.5;4"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Inner flame */}
          <path
            d="M12 9C12 9 10 11 10 13C10 14.5 10.8 15.5 12 16C13.2 15.5 14 14.5 14 13C14 11 12 9 12 9Z"
            fill={isDark ? 'url(#flameInner)' : 'url(#flameInnerDim)'}
          >
            <animate
              attributeName="d"
              values="M12 9C12 9 10 11 10 13C10 14.5 10.8 15.5 12 16C13.2 15.5 14 14.5 14 13C14 11 12 9 12 9Z;M12 8.5C12 8.5 9.5 11 9.5 13C9.5 14.8 10.5 16 12 16.5C13.5 16 14.5 14.8 14.5 13C14.5 11 12 8.5 12 8.5Z;M12 9C12 9 10 11 10 13C10 14.5 10.8 15.5 12 16C13.2 15.5 14 14.5 14 13C14 11 12 9 12 9Z"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>

          {/* Flame core */}
          <ellipse cx="12" cy="14" rx="1" ry="1.5" fill={isDark ? '#fff' : 'rgba(255,255,255,0.7)'}>
            <animate
              attributeName="ry"
              values="1.5;2;1.5"
              dur="0.6s"
              repeatCount="indefinite"
            />
          </ellipse>
        </g>

        {/* Bottom cap */}
        <path
          d="M9 18H15L16 20H8L9 18Z"
          className="lantern-cap"
          fill="currentColor"
          opacity={isDark ? 1 : 0.5}
        />

        {/* Bottom foot */}
        <path
          d="M10 20H14V21C14 21.5 13.5 22 13 22H11C10.5 22 10 21.5 10 21V20Z"
          className="lantern-base"
          fill="currentColor"
          opacity={isDark ? 1 : 0.5}
        />

        {/* Gradient definitions */}
        <defs>
          {/* Lit state gradients */}
          <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.3" />
          </radialGradient>

          <radialGradient id="flameGlow" cx="50%" cy="70%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="flameInner" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Dim state gradients (for light mode) */}
          <radialGradient id="lanternGlowDim" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#d97706" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0.15" />
          </radialGradient>

          <radialGradient id="flameGlowDim" cx="50%" cy="70%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="flameInnerDim" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}
