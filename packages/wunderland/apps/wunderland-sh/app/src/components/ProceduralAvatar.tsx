'use client';

import { useId, useMemo } from 'react';

/**
 * ProceduralAvatar — Generates unique geometric patterns from HEXACO traits.
 *
 * Each agent has a visually distinct identity derived from their personality:
 * - H (Honesty-Humility) → number of sides / symmetry
 * - E (Emotionality) → color warmth / intensity
 * - X (Extraversion) → pattern scale / boldness
 * - A (Agreeableness) → curve smoothness
 * - C (Conscientiousness) → pattern regularity / precision
 * - O (Openness) → color variety / gradient complexity
 */

interface HEXACOTraits {
  honestyHumility: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}

interface ProceduralAvatarProps {
  traits: HEXACOTraits;
  size?: number;
  className?: string;
  glow?: boolean;
}

// Deterministic pseudo-random from traits
function traitSeed(traits: HEXACOTraits): number {
  const vals = [
    traits.honestyHumility,
    traits.emotionality,
    traits.extraversion,
    traits.agreeableness,
    traits.conscientiousness,
    traits.openness,
  ];
  let h = 0;
  for (const v of vals) {
    h = ((h << 5) - h + Math.round(v * 1000)) | 0;
  }
  return Math.abs(h);
}

function hslFromTraits(
  traits: HEXACOTraits,
  offset: number = 0
): string {
  // Base hue from emotionality + openness
  const hue = ((traits.emotionality * 200 + traits.openness * 160 + offset) % 360);
  // Saturation from extraversion
  const sat = 50 + traits.extraversion * 40;
  // Lightness from honesty-humility
  const light = 45 + traits.honestyHumility * 20;
  return `hsl(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(light)}%)`;
}

export function ProceduralAvatar({
  traits,
  size = 64,
  className = '',
  glow = true,
}: ProceduralAvatarProps) {
  const avatar = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.42;
    const seed = traitSeed(traits);

    // Number of shape layers (3-6 based on conscientiousness)
    const layers = 3 + Math.round(traits.conscientiousness * 3);

    // Primary + secondary colors
    const color1 = hslFromTraits(traits, 0);
    const color2 = hslFromTraits(traits, 120);
    const color3 = hslFromTraits(traits, 240);

    // Build geometric layers
    const shapes: { path: string; color: string; opacity: number }[] = [];

    for (let layer = 0; layer < layers; layer++) {
      const layerFrac = layer / layers;
      const layerR = r * (1 - layerFrac * 0.6);

      // Sides: 3-8 based on honesty + layer offset
      const sides = 3 + Math.round(traits.honestyHumility * 5 + layer) % 6;

      // Rotation offset based on openness
      const rotOffset = (traits.openness * Math.PI * 2) / sides + (layer * Math.PI) / layers;

      // Smoothness: agreeableness controls whether we use straight or curved segments
      const smooth = traits.agreeableness > 0.6;

      // Generate polygon or curved shape points
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides + rotOffset;
        // Radius modulation from extraversion
        const rMod = layerR * (0.7 + traits.extraversion * 0.3 * (1 + 0.15 * Math.sin(angle * (seed % 7 + 2))));
        points.push({
          x: cx + rMod * Math.cos(angle),
          y: cy + rMod * Math.sin(angle),
        });
      }

      let path: string;
      if (smooth && sides > 3) {
        // Curved path (Catmull-Rom-like via quadratic bezier)
        const pts = [...points, points[0], points[1]];
        const parts: string[] = [`M ${(pts[0].x + pts[1].x) / 2} ${(pts[0].y + pts[1].y) / 2}`];
        for (let i = 1; i < pts.length - 1; i++) {
          parts.push(`Q ${pts[i].x} ${pts[i].y} ${(pts[i].x + pts[i + 1].x) / 2} ${(pts[i].y + pts[i + 1].y) / 2}`);
        }
        parts.push('Z');
        path = parts.join(' ');
      } else {
        path = `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
      }

      // Alternate colors across layers
      const colors = [color1, color2, color3];
      const color = colors[layer % 3];
      const opacity = 0.15 + (1 - layerFrac) * 0.35;

      shapes.push({ path, color, opacity });
    }

    // Center ring (derived from conscientiousness)
    const ringR = r * 0.15 * (0.5 + traits.conscientiousness * 0.5);

    return { shapes, color1, color2, color3, ringR, cx, cy };
  }, [traits, size]);

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradId = `avatar-grad-${uid}`;
  const glowId = `avatar-glow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={glow ? { filter: `drop-shadow(0 0 ${size * 0.1}px ${avatar.color1}40)` } : undefined}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={avatar.color1} stopOpacity="0.6" />
          <stop offset="100%" stopColor={avatar.color2} stopOpacity="0.1" />
        </radialGradient>
        {glow && (
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Background circle */}
      <circle
        cx={avatar.cx}
        cy={avatar.cy}
        r={size * 0.45}
        fill={`url(#${gradId})`}
        opacity={0.3}
      />

      {/* Geometric layers */}
      {avatar.shapes.map((shape, i) => (
        <path
          key={i}
          d={shape.path}
          fill={shape.color}
          fillOpacity={shape.opacity}
          stroke={shape.color}
          strokeWidth={0.5}
          strokeOpacity={shape.opacity + 0.1}
          filter={glow && i === 0 ? `url(#${glowId})` : undefined}
        />
      ))}

      {/* Center ring */}
      <circle
        cx={avatar.cx}
        cy={avatar.cy}
        r={avatar.ringR}
        fill="none"
        stroke={avatar.color3}
        strokeWidth={1.5}
        opacity={0.6}
      />
      <circle
        cx={avatar.cx}
        cy={avatar.cy}
        r={avatar.ringR * 0.5}
        fill={avatar.color1}
        opacity={0.5}
      />
    </svg>
  );
}
