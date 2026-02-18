'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface RabbitVortexProps {
  size?: number;
  className?: string;
}

export default function RabbitVortex({ size = 500, className = '' }: RabbitVortexProps) {
  const [isHovered, setIsHovered] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [time, setTime] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let animationId: number;
    const startTime = Date.now();

    const animate = () => {
      setTime((Date.now() - startTime) / 1000);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // ─── SPIRAL ARMS ───
  // Generate logarithmic spiral paths for dramatic visual
  const spiralArms = Array.from({ length: 4 }, (_, armIdx) => {
    const baseAngle = (armIdx / 4) * Math.PI * 2;
    const points: string[] = [];
    const steps = 60;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const angle = baseAngle + t * Math.PI * 3 + time * 0.4;
      const r = 20 + t * 210;
      const x = 250 + Math.cos(angle) * r;
      const y = 250 + Math.sin(angle) * r * 0.4; // perspective compression
      points.push(`${s === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return { d: points.join(' '), armIdx };
  });

  // ─── TUNNEL RINGS ───
  const tunnelRings = Array.from({ length: 20 }, (_, i) => {
    const depth = i / 20;
    const compressed = Math.pow(depth, 1.5);
    const scale = 1 - compressed * 0.88;
    const radius = 230 * scale;
    const opacity = isLight ? 0.15 + (1 - depth) * 0.35 : 0.06 + (1 - depth) * 0.3;
    const rotation = time * (6 + i * 3) + i * 18;
    const strokeWidth = (2.2 * scale + 0.4) * (isLight ? 0.9 : 1);
    const pulse = 1 + Math.sin(time * 2 + i * 0.5) * 0.03;

    return { radius: radius * pulse, opacity, rotation, depth, strokeWidth, i };
  });

  // ─── PARTICLES ───
  const particles = Array.from({ length: 40 }, (_, i) => {
    const particleTime = time + i * 0.28;
    const angle = (i / 40) * Math.PI * 2 + particleTime * 0.6;
    const depthPhase = (particleTime * 0.3 + i * 0.06) % 1;
    const radius = 30 + (1 - depthPhase) * 220;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.38;
    const particleOpacity = (1 - depthPhase) * (isLight ? 0.65 : 0.6);
    const particleSize = 1.2 + (1 - depthPhase) * 2.8;

    return { x, y, opacity: particleOpacity, size: particleSize, depthPhase, i };
  });

  // ─── EMISSIVE SPARKS ─── (bright points that flash)
  const sparks = Array.from({ length: 12 }, (_, i) => {
    const sparkTime = time * 1.2 + i * 1.8;
    const angle = (i / 12) * Math.PI * 2 + sparkTime * 0.3;
    const r = 60 + Math.sin(sparkTime * 0.7) * 80;
    const x = 250 + Math.cos(angle) * r;
    const y = 250 + Math.sin(angle) * r * 0.35;
    const flash = Math.pow(Math.max(0, Math.sin(sparkTime * 2.5)), 3);
    return { x, y, flash, i };
  });

  // Rabbit animation
  const rabbitY = Math.sin(time * 1.2) * 6;
  const rabbitRotation = Math.sin(time * 0.6) * 2;
  const glowIntensity = isHovered ? 1.6 : 1;
  const earWiggle = Math.sin(time * 2) * 3;

  // Void pulsation
  const voidPulse = 1 + Math.sin(time * 1.5) * 0.08;
  const voidGlow = 0.5 + Math.sin(time * 2) * 0.15;

  // ─── PALETTES ───
  const darkPalette = {
    bg: '#030305',
    voidCenter: '#000000',
    voidEdge: '#06040c',
    spiralColors: ['#00e5ff', '#bf5af2', '#ff2d92', '#00e5ff'],
    ringColor: (depth: number) => {
      const h = 240 + depth * 80 + Math.sin(time * 0.5 + depth * 4) * 20;
      const s = 35 + depth * 20;
      const l = 25 + (1 - depth) * 20;
      return `hsl(${h}, ${s}%, ${l}%)`;
    },
    ringHighlight: (depth: number) => {
      const h = 180 + depth * 160 + Math.sin(time * 0.6) * 30;
      return `hsl(${h}, 60%, 60%)`;
    },
    particle: ['#00e5ff', '#bf5af2', '#ff2d92'],
    spark: '#ffffff',
    rabbitBody: { start: '#e0e4ec', mid: '#c8cdd8', end: '#b0b6c4' },
    rabbitEye: '#0a0a12',
    rabbitShine: '#fff',
    whisker: 'rgba(200,205,220,0.5)',
    sparkle: ['#00e5ff', '#bf5af2'],
    hoverGlow: 'drop-shadow(0 0 60px rgba(0, 229, 255, 0.35))',
  };

  const lightPalette = {
    bg: '#faf8f4',
    voidCenter: '#c4b48a',
    voidEdge: '#e0d6bc',
    spiralColors: ['#c9a227', '#b08d57', '#8b6914', '#c9a227'],
    ringColor: (depth: number) => {
      const h = 38 + depth * 15 + Math.sin(time * 0.4) * 8;
      const s = 50 + depth * 15;
      const l = 55 + (1 - depth) * 15;
      return `hsl(${h}, ${s}%, ${l}%)`;
    },
    ringHighlight: (depth: number) => {
      const h = 30 + depth * 40 + Math.sin(time * 0.6) * 15;
      return `hsl(${h}, 65%, 60%)`;
    },
    particle: ['#c9a227', '#b8860b', '#daa520'],
    spark: '#e8d48a',
    rabbitBody: { start: '#d8d2c8', mid: '#c4bdb0', end: '#b0a898' },
    rabbitEye: '#f8f6f2',
    rabbitShine: '#c9a227',
    whisker: 'rgba(139,105,20,0.4)',
    sparkle: ['#c9a227', '#e8d48a'],
    hoverGlow: 'drop-shadow(0 0 60px rgba(139, 105, 20, 0.35))',
  };

  const p = isLight ? lightPalette : darkPalette;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 500 500"
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: 'pointer',
        transition: mounted ? 'filter 0.3s ease, opacity 0.4s ease' : 'none',
        filter: isHovered ? p.hoverGlow : 'none',
        opacity: mounted ? 1 : 0,
      }}
    >
      <defs>
        <radialGradient id="vortexDepth" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.voidCenter} stopOpacity={isLight ? 0.4 : 0.98} />
          <stop offset="20%" stopColor={p.voidEdge} stopOpacity={isLight ? 0.2 : 0.75} />
          <stop offset="55%" stopColor={p.bg} stopOpacity={isLight ? 0.08 : 0.4} />
          <stop offset="100%" stopColor={p.bg} stopOpacity="0" />
        </radialGradient>

        <filter id="spiralGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={isLight ? 3 : 4} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="vortexGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={isLight ? 2 : 3} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="sparkFlash" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="rabbitGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={3 * glowIntensity} result="blur1" />
          <feGaussianBlur stdDeviation={8 * glowIntensity} result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="rabbitFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.rabbitBody.start} />
          <stop offset="50%" stopColor={p.rabbitBody.mid} />
          <stop offset="100%" stopColor={p.rabbitBody.end} />
        </linearGradient>

        <linearGradient id="earPink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isLight ? '#c9a227' : '#8a7aa0'} />
          <stop offset="100%" stopColor={isLight ? '#8b6914' : '#6b5a80'} />
        </linearGradient>

        {/* Spiral arm gradients */}
        {spiralArms.map(({ armIdx }) => (
          <linearGradient key={`sg-${armIdx}`} id={`spiralGrad-${armIdx}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={p.spiralColors[armIdx]} stopOpacity="0" />
            <stop offset="30%" stopColor={p.spiralColors[armIdx]} stopOpacity="0.8" />
            <stop offset="70%" stopColor={p.spiralColors[(armIdx + 1) % 4]} stopOpacity="0.6" />
            <stop offset="100%" stopColor={p.spiralColors[(armIdx + 1) % 4]} stopOpacity="0.1" />
          </linearGradient>
        ))}
      </defs>

      {/* Background — transparent so the page bg shows through (prevents dark flash on light-mode load) */}
      <rect width="500" height="500" fill="transparent" />

      {/* ─── SPIRAL ARMS ─── */}
      <g filter="url(#spiralGlow)">
        {spiralArms.map(({ d, armIdx }) => (
          <path
            key={`spiral-${armIdx}`}
            d={d}
            fill="none"
            stroke={`url(#spiralGrad-${armIdx})`}
            strokeWidth={isLight ? 2.5 : 2}
            strokeLinecap="round"
            opacity={isLight ? 0.4 : 0.5}
          />
        ))}
      </g>

      {/* ─── TUNNEL RINGS ─── */}
      <g>
        {tunnelRings.map(({ radius, opacity, rotation, depth, strokeWidth, i }) => (
          <g key={i} transform={`rotate(${rotation}, 250, 250)`}>
            <ellipse
              cx="250"
              cy="250"
              rx={radius}
              ry={radius * 0.38}
              fill="none"
              stroke={p.ringColor(depth)}
              strokeWidth={strokeWidth}
              opacity={opacity}
              filter={isLight ? 'url(#vortexGlow)' : undefined}
            />
            {i % 3 === 0 && (
              <ellipse
                cx="250"
                cy="250"
                rx={radius + 2}
                ry={radius * 0.38 + 1}
                fill="none"
                stroke={p.ringHighlight(depth)}
                strokeWidth={isLight ? 0.8 : 0.6}
                opacity={isLight ? 0.35 : 0.2}
                strokeDasharray="8 16 4 12"
              />
            )}
          </g>
        ))}

        {/* Radial guide lines */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * 360 + time * 12;
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={`beam-${i}`}
              x1="250"
              y1="250"
              x2={250 + Math.cos(rad) * 235}
              y2={250 + Math.sin(rad) * 90}
              stroke={p.spiralColors[i % 4]}
              strokeWidth="0.6"
              opacity={
                isLight
                  ? 0.06 + Math.sin(time * 1.5 + i) * 0.04
                  : 0.04 + Math.sin(time * 1.5 + i) * 0.04
              }
              strokeDasharray="2 12 4 18"
            />
          );
        })}

        {/* Central void — pulsing abyss */}
        <ellipse
          cx="250"
          cy="250"
          rx={38 * voidPulse}
          ry={14 * voidPulse}
          fill={isLight ? '#a89868' : '#000'}
          opacity={isLight ? 0.6 : 0.98}
        />
        {/* Void rim glow */}
        <ellipse
          cx="250"
          cy="250"
          rx={44 * voidPulse}
          ry={16 * voidPulse}
          fill="none"
          stroke={p.spiralColors[0]}
          strokeWidth={isLight ? 1.5 : 2}
          opacity={voidGlow}
          filter="url(#vortexGlow)"
        />
        <ellipse
          cx="250"
          cy="250"
          rx={50 * voidPulse}
          ry={18 * voidPulse}
          fill="none"
          stroke={p.spiralColors[2]}
          strokeWidth={0.8}
          opacity={voidGlow * 0.5}
        />

        {/* Depth overlay */}
        <circle cx="250" cy="250" r="250" fill="url(#vortexDepth)" />
      </g>

      {/* ─── PARTICLES ─── */}
      <g filter="url(#vortexGlow)">
        {particles.map(({ x, y, opacity, size, i }) => (
          <circle
            key={`p-${i}`}
            cx={250 + x}
            cy={250 + y}
            r={size}
            fill={p.particle[i % 3]}
            opacity={opacity}
          />
        ))}
      </g>

      {/* ─── EMISSIVE SPARKS ─── */}
      <g filter="url(#sparkFlash)">
        {sparks.map(({ x, y, flash, i }) =>
          flash > 0.1 ? (
            <circle
              key={`spark-${i}`}
              cx={x}
              cy={y}
              r={1.5 + flash * 2}
              fill={p.spark}
              opacity={flash * (isLight ? 0.7 : 0.85)}
            />
          ) : null
        )}
      </g>

      {/* ─── CUTE BUNNY ─── */}
      <g
        filter="url(#rabbitGlow)"
        transform={`translate(250, ${200 + rabbitY}) rotate(${rabbitRotation})`}
        style={{ transition: 'transform 0.15s ease-out' }}
      >
        <g transform="translate(-35, -45)">
          {/* Back body/tail area */}
          <ellipse cx="55" cy="65" rx="28" ry="22" fill="url(#rabbitFill)" opacity="0.95" />

          {/* Fluffy tail */}
          <circle cx="78" cy="65" r="8" fill="url(#rabbitFill)" />
          <circle
            cx="80"
            cy="63"
            r="4"
            fill={isLight ? '#c9a227' : '#c8cdd8'}
            opacity={isLight ? 0.25 : 0.4}
          />

          {/* Main body */}
          <ellipse cx="40" cy="60" rx="24" ry="20" fill="url(#rabbitFill)" />

          {/* Front chest */}
          <ellipse cx="22" cy="58" rx="14" ry="16" fill="url(#rabbitFill)" />

          {/* Head */}
          <ellipse cx="15" cy="38" rx="18" ry="16" fill="url(#rabbitFill)" />

          {/* Cheek fluff */}
          <ellipse
            cx="8"
            cy="44"
            rx="8"
            ry="6"
            fill={isLight ? '#c9a227' : '#c8cdd8'}
            opacity={isLight ? 0.15 : 0.25}
          />

          {/* Back ear with wiggle */}
          <g transform={`rotate(${-5 + earWiggle * 0.5}, 20, 25)`}>
            <ellipse
              cx="28"
              cy="8"
              rx="6"
              ry="22"
              fill="url(#rabbitFill)"
              transform="rotate(15, 28, 8)"
            />
            <ellipse
              cx="28"
              cy="10"
              rx="3"
              ry="16"
              fill="url(#earPink)"
              opacity="0.6"
              transform="rotate(15, 28, 10)"
            />
          </g>

          {/* Front ear with wiggle */}
          <g transform={`rotate(${earWiggle}, 8, 25)`}>
            <ellipse
              cx="8"
              cy="5"
              rx="5"
              ry="24"
              fill="url(#rabbitFill)"
              transform="rotate(-10, 8, 5)"
            />
            <ellipse
              cx="8"
              cy="7"
              rx="2.5"
              ry="18"
              fill="url(#earPink)"
              opacity="0.6"
              transform="rotate(-10, 8, 7)"
            />
          </g>

          {/* Eye */}
          <ellipse cx="8" cy="36" rx="5" ry="5.5" fill={p.rabbitEye} />
          <circle cx="6" cy="34" r="2" fill={p.rabbitShine} opacity="0.9" />
          <circle cx="10" cy="37" r="1" fill={p.rabbitShine} opacity="0.6" />

          {/* Nose */}
          <ellipse cx="-1" cy="42" rx="3" ry="2.5" fill={isLight ? '#d4a0b0' : '#c0a0b8'} />

          {/* Whiskers */}
          <g stroke={p.whisker} strokeWidth="0.8" strokeLinecap="round">
            <line x1="-4" y1="40" x2="-18" y2="36" />
            <line x1="-4" y1="43" x2="-20" y2="43" />
            <line x1="-4" y1="46" x2="-18" y2="50" />
          </g>

          {/* Mouth */}
          <path
            d="M -1 45 Q 3 48 6 45"
            stroke={isLight ? '#c09090' : '#a08898'}
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />

          {/* Front paws */}
          <ellipse cx="12" cy="72" rx="6" ry="4" fill="url(#rabbitFill)" />
          <ellipse cx="24" cy="74" rx="5" ry="3.5" fill="url(#rabbitFill)" />

          {/* Back legs */}
          <ellipse
            cx="58"
            cy="78"
            rx="10"
            ry="6"
            fill="url(#rabbitFill)"
            transform="rotate(-15, 58, 78)"
          />
          <ellipse
            cx="48"
            cy="80"
            rx="8"
            ry="5"
            fill="url(#rabbitFill)"
            transform="rotate(-10, 48, 80)"
          />
        </g>

        {/* Sparkles around bunny */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const sparkleAngle = (i / 6) * Math.PI * 2 + time * 1.5;
          const sparkleRadius = 50 + Math.sin(time * 2 + i) * 10;
          return (
            <circle
              key={`sparkle-${i}`}
              cx={Math.cos(sparkleAngle) * sparkleRadius}
              cy={Math.sin(sparkleAngle) * sparkleRadius * 0.5}
              r={1.8 + Math.sin(time * 3 + i) * 0.8}
              fill={p.sparkle[i % 2]}
              opacity={0.6 + Math.sin(time * 2 + i) * 0.3}
            />
          );
        })}
      </g>
    </svg>
  );
}
