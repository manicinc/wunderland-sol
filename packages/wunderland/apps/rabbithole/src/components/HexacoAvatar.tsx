'use client';

import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Inline SVG generators (self-contained, mirrors packages/shared/src/hexacoAvatar.ts)
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl2hex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

interface HexacoAvatarTraits {
  honesty: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}

function makeAvatarSVG(traits: HexacoAvatarTraits, seed: string, size: number): string {
  const rng = mulberry32(hashStr(seed));
  const cx = size / 2, cy = size / 2, baseR = size * 0.38;
  const sides = Math.round(lerp(4, 10, traits.extraversion));
  const roundness = traits.agreeableness;
  const irregularity = 1 - traits.honesty;
  const baseHue = traits.emotionality < 0.5 ? lerp(200, 260, 1 - traits.emotionality * 2) : lerp(340, 40, (traits.emotionality - 0.5) * 2);
  const sat = lerp(40, 85, traits.conscientiousness);
  const lit = lerp(35, 55, 0.5 + traits.emotionality * 0.3);
  const hueSpread = lerp(10, 120, traits.openness);
  const bg = hsl2hex(baseHue, sat * 0.3, 12);
  const primary = hsl2hex(baseHue, sat, lit);
  const acc1 = hsl2hex((baseHue + hueSpread) % 360, sat * 0.8, lit + 10);
  const acc2 = hsl2hex((baseHue + hueSpread * 2) % 360, sat * 0.6, lit + 15);

  const verts = (cx_: number, cy_: number, r: number, n: number, irr: number) => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
      const rr = r * (1 - irr * 0.3 + irr * 0.6 * rng());
      pts.push({ x: cx_ + rr * Math.cos(ang), y: cy_ + rr * Math.sin(ang) });
    }
    return pts;
  };

  const pathFromVerts = (vs: { x: number; y: number }[], round: number) => {
    if (round < 0.05) return `M ${vs.map(v => `${v.x.toFixed(1)} ${v.y.toFixed(1)}`).join(' L ')} Z`;
    const parts: string[] = [];
    for (let i = 0; i < vs.length; i++) {
      const prev = vs[(i - 1 + vs.length) % vs.length], curr = vs[i], next = vs[(i + 1) % vs.length];
      const t = round * 0.35;
      const c1x = lerp(curr.x, prev.x, t), c1y = lerp(curr.y, prev.y, t);
      const c2x = lerp(curr.x, next.x, t), c2y = lerp(curr.y, next.y, t);
      parts.push(i === 0 ? `M ${c1x.toFixed(1)} ${c1y.toFixed(1)}` : `L ${c1x.toFixed(1)} ${c1y.toFixed(1)}`);
      parts.push(`Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)}`);
    }
    parts.push('Z');
    return parts.join(' ');
  };

  const mainVerts = verts(cx, cy, baseR, sides, irregularity);
  const mainPath = pathFromVerts(mainVerts, roundness);
  const innerR = baseR * lerp(0.35, 0.6, traits.extraversion);
  const innerVerts = verts(cx, cy, innerR, Math.max(3, sides - 2), irregularity * 0.5);
  const innerPath = pathFromVerts(innerVerts, roundness * 0.7);

  let dots = '';
  const dc = Math.round(lerp(0, 8, traits.extraversion));
  for (let i = 0; i < dc; i++) {
    const ang = (Math.PI * 2 * i) / dc + rng() * 0.3;
    const d = baseR * lerp(0.7, 1.2, rng());
    const dr = lerp(1.5, 4, rng()) * (size / 100);
    dots += `<circle cx="${(cx + d * Math.cos(ang)).toFixed(1)}" cy="${(cy + d * Math.sin(ang)).toFixed(1)}" r="${dr.toFixed(1)}" fill="${i % 2 === 0 ? acc1 : acc2}" opacity="0.5"/>`;
  }

  let grid = '';
  if (traits.conscientiousness > 0.6) {
    const sp = Math.round(lerp(size * 0.25, size * 0.08, traits.conscientiousness));
    const op = lerp(0.03, 0.1, traits.conscientiousness).toFixed(3);
    let lines = '';
    for (let i = sp; i < size; i += sp) lines += `<line x1="${i}" y1="0" x2="${i}" y2="${size}"/><line x1="0" y1="${i}" x2="${size}" y2="${i}"/>`;
    grid = `<g stroke="${primary}" stroke-width="0.5" opacity="${op}">${lines}</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}" rx="${Math.round(size * 0.08)}"/>${grid}<path d="${mainPath}" fill="${primary}" opacity="0.85" stroke="${acc1}" stroke-width="1.5"/><path d="${innerPath}" fill="${acc1}" opacity="0.6"/>${dots}</svg>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HexacoAvatarProps {
  traits: Record<string, number>;
  seedId: string;
  size?: number;
  showRadar?: boolean;
  style?: React.CSSProperties;
}

export function HexacoAvatar({ traits, seedId, size = 64, showRadar = false, style }: HexacoAvatarProps) {
  const svgString = useMemo(() => {
    const t = {
      honesty: traits.honesty ?? 0.5,
      emotionality: traits.emotionality ?? 0.5,
      extraversion: traits.extraversion ?? 0.5,
      agreeableness: traits.agreeableness ?? 0.5,
      conscientiousness: traits.conscientiousness ?? 0.5,
      openness: traits.openness ?? 0.5,
    };
    return makeAvatarSVG(t, seedId, size);
  }, [traits, seedId, size]);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: svgString }} />
    </div>
  );
}
