'use client';

import { useTheme } from './ThemeProvider';
import styles from './LanternToggle.module.scss';

interface LanternToggleProps {
  className?: string;
}

export function LanternToggle({ className = '' }: LanternToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`${styles.toggle} ${isDark ? styles.lit : styles.dim} ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.icon}
      >
        {/* Lantern hook/handle */}
        <path
          d="M12 1C12 1 10 2 10 3.5V4H14V3.5C14 2 12 1 12 1Z"
          fill="currentColor"
          opacity={isDark ? 1 : 0.5}
        />

        {/* Handle ring */}
        <path d="M9 4H15V5H9V4Z" fill="currentColor" opacity={isDark ? 1 : 0.5} />

        {/* Top cap */}
        <path d="M8 5H16L15 7H9L8 5Z" fill="currentColor" opacity={isDark ? 1 : 0.5} />

        {/* Glass body - main chamber */}
        <path
          d="M9 7H15V18H9V7Z"
          fill={isDark ? 'url(#rhLanternGlow)' : 'url(#rhLanternGlowDim)'}
          stroke="currentColor"
          strokeWidth="0.5"
          opacity={isDark ? 1 : 0.7}
        />

        {/* Flame - visible in both modes, just dimmer in light */}
        <g style={{ opacity: isDark ? 1 : 0.4, transition: 'opacity 0.4s ease' }}>
          {/* Outer flame glow */}
          <ellipse
            cx="12"
            cy="13"
            rx="2.5"
            ry="4"
            fill={isDark ? 'url(#rhFlameGlow)' : 'url(#rhFlameGlowDim)'}
            opacity="0.6"
          >
            <animate attributeName="rx" values="2.5;2.8;2.5" dur="0.8s" repeatCount="indefinite" />
            <animate attributeName="ry" values="4;4.5;4" dur="0.8s" repeatCount="indefinite" />
          </ellipse>

          {/* Inner flame */}
          <path
            d="M12 9C12 9 10 11 10 13C10 14.5 10.8 15.5 12 16C13.2 15.5 14 14.5 14 13C14 11 12 9 12 9Z"
            fill={isDark ? 'url(#rhFlameInner)' : 'url(#rhFlameInnerDim)'}
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
            <animate attributeName="ry" values="1.5;2;1.5" dur="0.6s" repeatCount="indefinite" />
          </ellipse>
        </g>

        {/* Bottom cap */}
        <path d="M9 18H15L16 20H8L9 18Z" fill="currentColor" opacity={isDark ? 1 : 0.5} />

        {/* Bottom foot */}
        <path
          d="M10 20H14V21C14 21.5 13.5 22 13 22H11C10.5 22 10 21.5 10 21V20Z"
          fill="currentColor"
          opacity={isDark ? 1 : 0.5}
        />

        {/* Gradient definitions */}
        <defs>
          {/* Lit state gradients */}
          <radialGradient id="rhLanternGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e8d48a" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#c9a227" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8b6914" stopOpacity="0.3" />
          </radialGradient>

          <radialGradient id="rhFlameGlow" cx="50%" cy="70%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="rhFlameInner" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#e8d48a" />
            <stop offset="100%" stopColor="#c9a227" />
          </linearGradient>

          {/* Dim state gradients (for light mode) */}
          <radialGradient id="rhLanternGlowDim" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e8d48a" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#c9a227" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b6914" stopOpacity="0.15" />
          </radialGradient>

          <radialGradient id="rhFlameGlowDim" cx="50%" cy="70%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="rhFlameInnerDim" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#e8d48a" />
            <stop offset="100%" stopColor="#c9a227" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}
