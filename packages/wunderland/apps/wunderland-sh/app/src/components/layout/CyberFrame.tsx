'use client';

const COLOR_MAP = {
  cyan: 'var(--neon-cyan)',
  purple: 'var(--sol-purple)',
  gold: 'var(--deco-gold)',
  green: 'var(--neon-green)',
} as const;

interface CyberFrameProps {
  children: React.ReactNode;
  variant?: keyof typeof COLOR_MAP;
  glow?: boolean;
  className?: string;
}

export default function CyberFrame({ children, variant = 'cyan', glow = false, className = '' }: CyberFrameProps) {
  const color = COLOR_MAP[variant];
  const cornerLen = 24;
  const dotR = 1.5;

  return (
    <div className={`cyber-frame ${glow ? 'cyber-frame-glow' : ''} ${className}`} style={{ '--cyber-color': color } as React.CSSProperties}>
      {/* SVG corner brackets overlay */}
      <svg
        className="cyber-frame-svg"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        {/* Top-left corner */}
        <line x1="0" y1={cornerLen} x2="0" y2="0" stroke={color} strokeOpacity="0.3" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="0" x2={cornerLen} y2="0" stroke={color} strokeOpacity="0.3" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <circle cx="0" cy="0" r={dotR} fill={color} fillOpacity="0.5" vectorEffect="non-scaling-stroke" />

        {/* Top-right corner */}
        <line x1={100 - cornerLen} y1="0" x2="100" y2="0" stroke={color} strokeOpacity="0.3" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="100" y2={cornerLen} stroke={color} strokeOpacity="0.3" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <circle cx="100" cy="0" r={dotR} fill={color} fillOpacity="0.5" vectorEffect="non-scaling-stroke" />

        {/* Bottom-left corner */}
        <line x1="0" y1={100 - cornerLen} x2="0" y2="100" stroke={color} strokeOpacity="0.3" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="100" x2={cornerLen} y2="100" stroke={color} strokeOpacity="0.3" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <circle cx="0" cy="100" r={dotR} fill={color} fillOpacity="0.5" vectorEffect="non-scaling-stroke" />

        {/* Bottom-right corner */}
        <line x1={100 - cornerLen} y1="100" x2="100" y2="100" stroke={color} strokeOpacity="0.3" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1={100 - cornerLen} x2="100" y2="100" stroke={color} strokeOpacity="0.3" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <circle cx="100" cy="100" r={dotR} fill={color} fillOpacity="0.5" vectorEffect="non-scaling-stroke" />

        {/* Edge tick marks at 25%, 50%, 75% */}
        {[25, 50, 75].map((pct) => (
          <g key={pct}>
            {/* Top edge ticks */}
            <line x1={pct} y1="0" x2={pct} y2="2" stroke={color} strokeOpacity="0.15" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
            {/* Bottom edge ticks */}
            <line x1={pct} y1="98" x2={pct} y2="100" stroke={color} strokeOpacity="0.15" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
            {/* Left edge ticks */}
            <line x1="0" y1={pct} x2="2" y2={pct} stroke={color} strokeOpacity="0.15" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
            {/* Right edge ticks */}
            <line x1="98" y1={pct} x2="100" y2={pct} stroke={color} strokeOpacity="0.15" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>

      {/* Scan-line overlay */}
      <div className="cyber-frame-scanlines" aria-hidden="true" />

      {/* Content */}
      <div className="cyber-frame-content">
        {children}
      </div>
    </div>
  );
}
