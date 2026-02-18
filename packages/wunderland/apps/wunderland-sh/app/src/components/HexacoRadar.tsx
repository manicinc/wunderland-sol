'use client';

import { useId, useMemo } from 'react';

/**
 * HexacoRadar — Animated SVG radar chart for HEXACO personality traits.
 *
 * The signature visual of WUNDERLAND ON SOL. Renders a hexagonal radar
 * with glowing vertices, gradient fill, and pulsing data points.
 * Each axis represents one HEXACO dimension.
 */

interface HEXACOTraits {
  honestyHumility: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}

interface HexacoRadarProps {
  traits: HEXACOTraits;
  size?: number;
  animated?: boolean;
  showLabels?: boolean;
  glowColor?: string;
  className?: string;
}

const LABELS = ['H', 'E', 'X', 'A', 'C', 'O'];
const FULL_LABELS = [
  'Honesty-Humility',
  'Emotionality',
  'Extraversion',
  'Agreeableness',
  'Conscientiousness',
  'Openness',
];
const TRAIT_COLORS = [
  '#ff6b9d', // H - pink
  '#c084fc', // E - purple
  '#fbbf24', // X - gold
  '#34d399', // A - emerald
  '#60a5fa', // C - blue
  '#f472b6', // O - rose
];

export function HexacoRadar({
  traits,
  size = 300,
  animated = true,
  showLabels = true,
  glowColor = '#9945ff',
  className = '',
}: HexacoRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  const traitValues = useMemo(
    () => [
      traits.honestyHumility,
      traits.emotionality,
      traits.extraversion,
      traits.agreeableness,
      traits.conscientiousness,
      traits.openness,
    ],
    [traits]
  );

  // Compute polygon points for a given set of values (0-1)
  const getPoints = (values: number[], r: number = radius): string => {
    return values
      .map((val, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const x = cx + r * val * Math.cos(angle);
        const y = cy + r * val * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
  };

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Axis lines
  const axes = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  // Data points
  const dataPoints = traitValues.map((val, i) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    return {
      x: cx + radius * val * Math.cos(angle),
      y: cy + radius * val * Math.sin(angle),
      value: val,
    };
  });

  // Label positions (slightly outside the chart)
  const labelPositions = LABELS.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const labelR = radius * 1.3;
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
    };
  });

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = `hexaco-gradient-${uid}`;
  const glowId = `hexaco-glow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ filter: `drop-shadow(0 0 20px ${glowColor}40)` }}
    >
      <defs>
        {/* Gradient fill for data polygon */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9945ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#14f195" stopOpacity="0.3" />
        </linearGradient>

        {/* Glow filter */}
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid polygons */}
      {gridLevels.map((level, i) => (
        <polygon
          key={`grid-${i}`}
          points={getPoints(Array(6).fill(level))}
          fill="none"
          style={{ stroke: 'var(--radar-grid, rgba(255,255,255,0.06))' }}
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axes.map((axis, i) => (
        <line
          key={`axis-${i}`}
          x1={cx}
          y1={cy}
          x2={axis.x}
          y2={axis.y}
          style={{ stroke: 'var(--radar-axis, rgba(255,255,255,0.08))' }}
          strokeWidth="1"
        />
      ))}

      {/* Data polygon - filled */}
      <polygon
        points={getPoints(traitValues)}
        fill={`url(#${gradientId})`}
        stroke="none"
        strokeWidth="0"
      >
        {animated && (
          <animate
            attributeName="opacity"
            values="0.7;0.9;0.7"
            dur="3s"
            repeatCount="indefinite"
          />
        )}
      </polygon>

      {/* Data polygon - stroke with glow */}
      <polygon
        points={getPoints(traitValues)}
        fill="none"
        stroke={glowColor}
        strokeWidth="2"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      >
        {animated && (
          <animate
            attributeName="stroke-opacity"
            values="0.6;1;0.6"
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </polygon>

      {/* Data points with trait-specific colors */}
      {dataPoints.map((point, i) => (
        <g key={`point-${i}`}>
          {/* Outer glow */}
          <circle
            cx={point.x}
            cy={point.y}
            r={6}
            fill={TRAIT_COLORS[i]}
            opacity={0.3}
          >
            {animated && (
              <animate
                attributeName="r"
                values="4;8;4"
                dur={`${2 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
          {/* Inner dot */}
          <circle
            cx={point.x}
            cy={point.y}
            r={3}
            fill={TRAIT_COLORS[i]}
            style={{ stroke: 'var(--bg-surface, white)' }}
            strokeWidth="1"
          />
        </g>
      ))}

      {/* Labels */}
      {showLabels &&
        labelPositions.map((pos, i) => (
          <g key={`label-${i}`}>
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={TRAIT_COLORS[i]}
              fontSize={size * 0.07}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="700"
            >
              {LABELS[i]}
            </text>
            {size >= 250 && (
              <text
                x={pos.x}
                y={pos.y + size * 0.06}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: 'var(--radar-label, rgba(255,255,255,0.6))' }}
                fontSize={size * 0.04}
                fontFamily="'Inter', sans-serif"
              >
                {FULL_LABELS[i]}
              </text>
            )}
          </g>
        ))}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2} style={{ fill: 'var(--radar-center, rgba(255,255,255,0.2))' }} />
    </svg>
  );
}
