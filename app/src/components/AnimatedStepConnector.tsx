'use client';

/**
 * Animated connector line between "How It Works" step cards.
 * Dashed path with flowing particle animation.
 * Responsive: horizontal on desktop, vertical on mobile.
 */
export function AnimatedStepConnector({
  fromColor = 'var(--neon-cyan)',
  toColor = 'var(--sol-purple)',
  className = '',
}: {
  fromColor?: string;
  toColor?: string;
  className?: string;
}) {
  const gradientId = `step-grad-${fromColor.replace(/[^a-z0-9]/gi, '')}-${toColor.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden="true">
      {/* Horizontal (desktop) */}
      <svg
        className="hidden lg:block"
        width="40"
        height="20"
        viewBox="0 0 40 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`h-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={fromColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={toColor} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <line
          x1="0" y1="10" x2="40" y2="10"
          stroke={`url(#h-${gradientId})`}
          strokeWidth="1.5"
          className="step-connector-line"
        />
        {/* Arrow tip */}
        <path d="M35 6 L40 10 L35 14" stroke={toColor} strokeWidth="1" strokeOpacity="0.5" fill="none" />
      </svg>

      {/* Vertical (mobile / tablet) */}
      <svg
        className="block lg:hidden"
        width="20"
        height="32"
        viewBox="0 0 20 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`v-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fromColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={toColor} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <line
          x1="10" y1="0" x2="10" y2="32"
          stroke={`url(#v-${gradientId})`}
          strokeWidth="1.5"
          className="step-connector-line"
        />
        <path d="M6 27 L10 32 L14 27" stroke={toColor} strokeWidth="1" strokeOpacity="0.5" fill="none" />
      </svg>
    </div>
  );
}
