'use client';

import { useMemo } from 'react';

interface UsageMeterProps {
  value: number;
  max: number;
  label?: string;
  unit?: string;
  size?: number;
  className?: string;
}

export function UsageMeter({
  value,
  max,
  label,
  unit,
  size = 160,
  className = '',
}: UsageMeterProps) {
  const percentage = max > 0 ? Math.min(value / max, 1) : 0;
  const isWarning = percentage > 0.8;

  // Arc geometry: semicircle from 180deg to 0deg (left to right, top half)
  const cx = size / 2;
  const cy = size / 2 + 4; // slight offset so the arc sits centered visually
  const strokeWidth = size * 0.065;
  const outerRingWidth = size * 0.04;
  const arcRadius = size / 2 - outerRingWidth - strokeWidth / 2 - 4;
  const outerRingRadius = size / 2 - 2;

  // Tick geometry
  const tickOuterR = arcRadius + strokeWidth / 2 + 4;
  const tickInnerR = arcRadius + strokeWidth / 2 + 2;
  const tickCount = 11; // 0%, 10%, 20%, ..., 100%

  // Unique ID for gradients to avoid clashes if multiple meters on the page
  const uid = useMemo(
    () => `usage-meter-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  // Helper: angle in radians for a given progress (0 = left/180deg, 1 = right/0deg)
  function progressToAngle(t: number): number {
    // Map [0,1] to [PI, 0] (left to right along top semicircle)
    return Math.PI * (1 - t);
  }

  function polarToCartesian(angle: number, r: number): { x: number; y: number } {
    return {
      x: cx + Math.cos(angle) * r,
      y: cy - Math.sin(angle) * r,
    };
  }

  // Build arc path from startProgress to endProgress
  function arcPath(startT: number, endT: number, r: number): string {
    const startAngle = progressToAngle(startT);
    const endAngle = progressToAngle(endT);
    const start = polarToCartesian(startAngle, r);
    const end = polarToCartesian(endAngle, r);
    const sweepRange = startAngle - endAngle; // positive since startAngle > endAngle
    const largeArc = sweepRange > Math.PI ? 1 : 0;
    // Sweep flag 0 = counter-clockwise in SVG coords (which is our left-to-right)
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  // Outer ring arc (full semicircle)
  function outerRingPath(): string {
    const startAngle = progressToAngle(0);
    const endAngle = progressToAngle(1);
    const start = polarToCartesian(startAngle, outerRingRadius);
    const end = polarToCartesian(endAngle, outerRingRadius);
    return `M ${start.x} ${start.y} A ${outerRingRadius} ${outerRingRadius} 0 1 0 ${end.x} ${end.y}`;
  }

  // Generate tick marks
  const ticks = useMemo(() => {
    return Array.from({ length: tickCount }, (_, i) => {
      const t = i / (tickCount - 1);
      const angle = progressToAngle(t);
      const outer = polarToCartesian(angle, tickOuterR);
      const inner = polarToCartesian(angle, tickInnerR);
      const isMajor = i % 5 === 0;
      return { outer, inner, isMajor };
    });
  }, [tickOuterR, tickInnerR, tickCount]);

  // Text formatting
  const displayValue = Math.round(value);
  const displayMax = Math.round(max);

  const viewBoxHeight = size / 2 + 36; // enough room for label below

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <svg
        width={size}
        height={viewBoxHeight}
        viewBox={`0 0 ${size} ${viewBoxHeight}`}
      >
        <defs>
          {/* Gold gradient for fill arc */}
          <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b6914" />
            <stop offset="50%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#e8d48a" />
          </linearGradient>

          {/* Warning gradient (coral/red) */}
          <linearGradient id={`${uid}-warning`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c94a27" />
            <stop offset="50%" stopColor="#e86a4a" />
            <stop offset="100%" stopColor="#ff8a6a" />
          </linearGradient>

          {/* Metallic ring gradient */}
          <linearGradient id={`${uid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8d48a" />
            <stop offset="25%" stopColor="#c9a227" />
            <stop offset="50%" stopColor="#b08d57" />
            <stop offset="75%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#8b6914" />
          </linearGradient>

          {/* Glow filter */}
          <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer decorative metallic ring */}
        <path
          d={outerRingPath()}
          fill="none"
          stroke={`url(#${uid}-ring)`}
          strokeWidth={outerRingWidth}
          strokeLinecap="round"
          opacity={0.6}
        />

        {/* Background arc (dark gray track) */}
        <path
          d={arcPath(0, 1, arcRadius)}
          fill="none"
          stroke="rgba(100, 100, 120, 0.25)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {percentage > 0 && (
          <path
            d={arcPath(0, percentage, arcRadius)}
            fill="none"
            stroke={`url(#${uid}-${isWarning ? 'warning' : 'gold'})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={`url(#${uid}-glow)`}
          />
        )}

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            stroke={
              tick.isMajor
                ? 'rgba(201, 162, 39, 0.6)'
                : 'rgba(201, 162, 39, 0.25)'
            }
            strokeWidth={tick.isMajor ? 1.5 : 0.8}
            strokeLinecap="round"
          />
        ))}

        {/* Center value text */}
        <text
          x={cx}
          y={cy - size * 0.04}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'IBM Plex Mono', monospace"
          fontWeight="700"
          fontSize={size * 0.14}
          fill={isWarning ? 'var(--color-error, #e86a4a)' : 'var(--color-text, #e0e0e0)'}
        >
          {displayValue}
          <tspan
            fontWeight="400"
            fontSize={size * 0.09}
            fill="var(--color-text-dim, #6b6b7b)"
          >
            {' / '}
            {displayMax}
          </tspan>
        </text>

        {/* Unit text */}
        {unit && (
          <text
            x={cx}
            y={cy + size * 0.1}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight="400"
            fontSize={size * 0.075}
            fill="var(--color-text-dim, #6b6b7b)"
          >
            {unit}
          </text>
        )}

        {/* Label below the gauge */}
        {label && (
          <text
            x={cx}
            y={cy + size * 0.22}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.08}
            fontWeight="500"
            fill="var(--color-text-muted, #9898a8)"
            letterSpacing="0.03em"
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}
