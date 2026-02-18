'use client';

import { useCallback, useRef } from 'react';
import styles from './OrnateKnob.module.scss';

interface OrnateKnobProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  size?: number;
  color?: string;
  disabled?: boolean;
  className?: string;
}

const ANGLE_START = -135;
const ANGLE_END = 135;
const ANGLE_RANGE = ANGLE_END - ANGLE_START;

export function OrnateKnob({
  value,
  onChange,
  min = 0,
  max = 100,
  label,
  size = 80,
  color = '#c9a227',
  disabled = false,
  className = '',
}: OrnateKnobProps) {
  const knobRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = ANGLE_START + normalizedValue * ANGLE_RANGE;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR - 6;
  const indicatorR = innerR - 8;
  const tickR = outerR - 1;
  const tickInnerR = outerR - 5;

  // Generate tick marks (11 ticks from start to end)
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = ANGLE_START + (i / 10) * ANGLE_RANGE;
    const rad = (a * Math.PI) / 180;
    return {
      x1: cx + Math.cos(rad) * tickInnerR,
      y1: cy + Math.sin(rad) * tickInnerR,
      x2: cx + Math.cos(rad) * tickR,
      y2: cy + Math.sin(rad) * tickR,
      major: i % 5 === 0,
    };
  });

  // Active arc path
  const arcPath = useCallback(() => {
    const startRad = (ANGLE_START * Math.PI) / 180;
    const endRad = (angle * Math.PI) / 180;
    const r = innerR - 2;
    const x1 = cx + Math.cos(startRad) * r;
    const y1 = cy + Math.sin(startRad) * r;
    const x2 = cx + Math.cos(endRad) * r;
    const y2 = cy + Math.sin(endRad) * r;
    const largeArc = angle - ANGLE_START > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }, [angle, cx, cy, innerR]);

  // Indicator line endpoint
  const indicatorRad = (angle * Math.PI) / 180;
  const indX = cx + Math.cos(indicatorRad) * indicatorR;
  const indY = cy + Math.sin(indicatorRad) * indicatorR;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !onChange) return;
      dragging.current = true;
      (e.target as SVGSVGElement).setPointerCapture?.(e.pointerId);
    },
    [disabled, onChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !onChange || !knobRef.current) return;
      const rect = knobRef.current.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      let a = (Math.atan2(dy, dx) * 180) / Math.PI;
      a = Math.max(ANGLE_START, Math.min(ANGLE_END, a));
      const norm = (a - ANGLE_START) / ANGLE_RANGE;
      const newValue = Math.round(min + norm * (max - min));
      onChange(Math.max(min, Math.min(max, newValue)));
    },
    [onChange, min, max]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const displayValue = Math.round(value);

  return (
    <div className={`${styles.container} ${className}`}>
      <svg
        ref={knobRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={`${styles.knob} ${disabled ? styles.knobDisabled : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <radialGradient id={`knob-metal-${label}`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#e8d48a" />
            <stop offset="40%" stopColor="#c9a227" />
            <stop offset="70%" stopColor="#b08d57" />
            <stop offset="100%" stopColor="#8b6914" />
          </radialGradient>
          <radialGradient id={`knob-face-${label}`} cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#2a2a3e" />
            <stop offset="100%" stopColor="#0d0d1a" />
          </radialGradient>
        </defs>

        {/* Outer decorative ring */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill={`url(#knob-metal-${label})`}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.5"
        />

        {/* Inner face */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill={`url(#knob-face-${label})`}
          stroke="rgba(201,162,39,0.3)"
          strokeWidth="0.5"
        />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? 'rgba(201,162,39,0.8)' : 'rgba(201,162,39,0.35)'}
            strokeWidth={t.major ? 1.5 : 0.8}
            strokeLinecap="round"
          />
        ))}

        {/* Active arc */}
        <path
          d={arcPath()}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.7}
          filter="url(#knob-glow)"
        />

        {/* Glow filter */}
        <defs>
          <filter id="knob-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Indicator line */}
        <line
          x1={cx}
          y1={cy}
          x2={indX}
          y2={indY}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.8} />

        {/* Value text */}
        <text
          x={cx}
          y={cy + size * 0.32}
          textAnchor="middle"
          fill="var(--color-text-dim, #6b6b7b)"
          fontSize={size * 0.13}
          fontFamily="'IBM Plex Mono', monospace"
          fontWeight="600"
        >
          {displayValue}%
        </text>
      </svg>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
