/**
 * @file HEXACO Avatar SVG Generator
 * @description Procedurally generates unique SVG avatars from HEXACO personality traits.
 * Deterministic: same traits + seedId always produce the same avatar.
 * Pure function, no React dependency.
 *
 * Visual mapping:
 * - Honesty → symmetry & pattern regularity
 * - Emotionality → color warmth/saturation
 * - Extraversion → shape size/complexity & radiating elements
 * - Agreeableness → corner rounding & softness
 * - Conscientiousness → line precision & grid alignment
 * - Openness → color variety & shape diversity
 */

export interface HexacoAvatarTraits {
  honesty: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}

export interface HexacoAvatarParams {
  traits: HexacoAvatarTraits;
  seed: string;
  size: number;
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (Mulberry32)
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Shape generators
// ---------------------------------------------------------------------------

function generatePolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  irregularity: number,
  rng: () => number
): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const r = radius * (1 - irregularity * 0.3 + irregularity * 0.6 * rng());
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

function generateRoundedPolygonPath(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  roundness: number,
  irregularity: number,
  rng: () => number
): string {
  const vertices: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const r = radius * (1 - irregularity * 0.3 + irregularity * 0.6 * rng());
    vertices.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }

  if (roundness < 0.05) {
    return `M ${vertices.map((v) => `${v.x.toFixed(2)} ${v.y.toFixed(2)}`).join(' L ')} Z`;
  }

  const parts: string[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const prev = vertices[(i - 1 + vertices.length) % vertices.length];
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    const t = roundness * 0.35;
    const cp1x = lerp(curr.x, prev.x, t);
    const cp1y = lerp(curr.y, prev.y, t);
    const cp2x = lerp(curr.x, next.x, t);
    const cp2y = lerp(curr.y, next.y, t);

    if (i === 0) {
      parts.push(`M ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}`);
    } else {
      parts.push(`L ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}`);
    }
    parts.push(`Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateAvatarSVG(params: HexacoAvatarParams): string {
  const { traits, seed, size } = params;
  const rng = mulberry32(hashString(seed));

  const cx = size / 2;
  const cy = size / 2;
  const baseRadius = size * 0.38;

  // --- Derive visual parameters from traits ---

  // Extraversion → number of sides (3-10), shape complexity
  const sides = Math.round(lerp(4, 10, traits.extraversion));

  // Agreeableness → roundness (0-1)
  const roundness = traits.agreeableness;

  // Honesty → symmetry (low irregularity = high symmetry)
  const irregularity = 1 - traits.honesty;

  // Emotionality → color warmth: low = cool (200-260 hue), high = warm (0-40 hue)
  const baseHue = traits.emotionality < 0.5
    ? lerp(200, 260, 1 - traits.emotionality * 2)
    : lerp(340, 40, (traits.emotionality - 0.5) * 2);

  // Conscientiousness → saturation consistency & precision
  const baseSaturation = lerp(40, 85, traits.conscientiousness);
  const baseLightness = lerp(35, 55, 0.5 + traits.emotionality * 0.3);

  // Openness → color variety (hue spread for accents)
  const hueSpread = lerp(10, 120, traits.openness);

  // --- Generate colors ---
  const bgColor = hslToHex(baseHue, baseSaturation * 0.3, 12);
  const primaryColor = hslToHex(baseHue, baseSaturation, baseLightness);
  const accentHue1 = (baseHue + hueSpread) % 360;
  const accentHue2 = (baseHue + hueSpread * 2) % 360;
  const accentColor1 = hslToHex(accentHue1, baseSaturation * 0.8, baseLightness + 10);
  const accentColor2 = hslToHex(accentHue2, baseSaturation * 0.6, baseLightness + 15);

  // --- Build SVG ---
  const svgParts: string[] = [];

  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
  );

  // Background
  svgParts.push(`<rect width="${size}" height="${size}" fill="${bgColor}" rx="${Math.round(size * 0.08)}"/>`);

  // Optional grid pattern (conscientiousness)
  if (traits.conscientiousness > 0.6) {
    const gridSpacing = Math.round(lerp(size * 0.25, size * 0.08, traits.conscientiousness));
    const gridOpacity = lerp(0.03, 0.1, traits.conscientiousness).toFixed(3);
    svgParts.push(`<g stroke="${primaryColor}" stroke-width="0.5" opacity="${gridOpacity}">`);
    for (let i = gridSpacing; i < size; i += gridSpacing) {
      svgParts.push(`<line x1="${i}" y1="0" x2="${i}" y2="${size}"/>`);
      svgParts.push(`<line x1="0" y1="${i}" x2="${size}" y2="${i}"/>`);
    }
    svgParts.push('</g>');
  }

  // Main shape
  const mainPath = generateRoundedPolygonPath(cx, cy, baseRadius, sides, roundness, irregularity, rng);
  svgParts.push(
    `<path d="${mainPath}" fill="${primaryColor}" opacity="0.85" stroke="${accentColor1}" stroke-width="1.5"/>`
  );

  // Inner shape (smaller, rotated)
  const innerRadius = baseRadius * lerp(0.35, 0.6, traits.extraversion);
  const innerSides = Math.max(3, sides - 2);
  const innerPath = generateRoundedPolygonPath(cx, cy, innerRadius, innerSides, roundness * 0.7, irregularity * 0.5, rng);
  svgParts.push(`<path d="${innerPath}" fill="${accentColor1}" opacity="0.6"/>`);

  // Accent dots (extraversion controls count)
  const dotCount = Math.round(lerp(0, 8, traits.extraversion));
  for (let i = 0; i < dotCount; i++) {
    const angle = (Math.PI * 2 * i) / dotCount + rng() * 0.3;
    const dist = baseRadius * lerp(0.7, 1.2, rng());
    const dotR = lerp(1.5, 4, rng()) * (size / 100);
    const dx = cx + dist * Math.cos(angle);
    const dy = cy + dist * Math.sin(angle);
    const dotColor = i % 2 === 0 ? accentColor1 : accentColor2;
    svgParts.push(`<circle cx="${dx.toFixed(2)}" cy="${dy.toFixed(2)}" r="${dotR.toFixed(2)}" fill="${dotColor}" opacity="0.5"/>`);
  }

  // Central glyph (openness controls complexity)
  if (traits.openness > 0.5) {
    const glyphRadius = innerRadius * 0.4;
    const glyphSides = Math.round(lerp(3, 7, traits.openness));
    const glyphPoints = generatePolygonPoints(cx, cy, glyphRadius, glyphSides, 0, rng);
    svgParts.push(
      `<polygon points="${glyphPoints}" fill="none" stroke="${accentColor2}" stroke-width="1" opacity="0.7"/>`
    );
  }

  svgParts.push('</svg>');
  return svgParts.join('\n');
}
