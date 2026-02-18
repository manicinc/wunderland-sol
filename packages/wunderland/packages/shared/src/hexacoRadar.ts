/**
 * @file HEXACO Radar Chart SVG Generator
 * @description Generates a 6-axis radar chart SVG for HEXACO personality visualization.
 * Pure function, no React dependency.
 */

export interface RadarTraits {
  honesty: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}

export interface RadarColors {
  honesty: string;
  emotionality: string;
  extraversion: string;
  agreeableness: string;
  conscientiousness: string;
  openness: string;
}

const DEFAULT_COLORS: RadarColors = {
  honesty: '#00f5ff',
  emotionality: '#ff6b6b',
  extraversion: '#ffd700',
  agreeableness: '#10ffb0',
  conscientiousness: '#8b5cf6',
  openness: '#ff00f5',
};

const TRAIT_ORDER: (keyof RadarTraits)[] = [
  'honesty',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
];

const TRAIT_SHORT: Record<string, string> = {
  honesty: 'H',
  emotionality: 'E',
  extraversion: 'X',
  agreeableness: 'A',
  conscientiousness: 'C',
  openness: 'O',
};

export interface RadarOptions {
  /** Show axis labels (H, E, X, A, C, O). Default: true. */
  showLabels?: boolean;
  /** Show grid rings. Default: true. */
  showGrid?: boolean;
  /** Number of grid rings. Default: 3. */
  gridRings?: number;
  /** Fill opacity. Default: 0.25. */
  fillOpacity?: number;
  /** Stroke width. Default: 2. */
  strokeWidth?: number;
  /** Background color. Default: transparent. */
  backgroundColor?: string;
  /** Label font size. Default: 10. */
  labelFontSize?: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleIndex: number,
  total: number
): { x: number; y: number } {
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export function generateRadarSVG(
  traits: RadarTraits,
  size: number,
  colors: RadarColors = DEFAULT_COLORS,
  options: RadarOptions = {}
): string {
  const {
    showLabels = true,
    showGrid = true,
    gridRings = 3,
    fillOpacity = 0.25,
    strokeWidth = 2,
    backgroundColor,
    labelFontSize = 10,
  } = options;

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.38;
  const labelMargin = showLabels ? size * 0.12 : 0;
  const chartRadius = maxRadius - labelMargin * 0.3;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
  );

  // Background
  if (backgroundColor) {
    parts.push(`<rect width="${size}" height="${size}" fill="${backgroundColor}"/>`);
  }

  // Grid rings
  if (showGrid) {
    for (let r = 1; r <= gridRings; r++) {
      const ringRadius = (chartRadius * r) / gridRings;
      const ringPoints = TRAIT_ORDER.map((_, i) => {
        const p = polarToCartesian(cx, cy, ringRadius, i, 6);
        return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      }).join(' ');
      parts.push(
        `<polygon points="${ringPoints}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`
      );
    }

    // Axis lines
    for (let i = 0; i < 6; i++) {
      const p = polarToCartesian(cx, cy, chartRadius, i, 6);
      parts.push(
        `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`
      );
    }
  }

  // Data polygon
  const dataPoints = TRAIT_ORDER.map((trait, i) => {
    const value = Math.max(0, Math.min(1, traits[trait] ?? 0));
    const r = chartRadius * value;
    const p = polarToCartesian(cx, cy, r, i, 6);
    return p;
  });

  const polygonStr = dataPoints.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  // Gradient-like effect: fill polygon with blended color
  const avgHue = TRAIT_ORDER.reduce((sum, trait) => {
    const c = colors[trait];
    return sum + (traits[trait] ?? 0);
  }, 0) / 6;

  parts.push(
    `<polygon points="${polygonStr}" fill="rgba(100,180,255,${fillOpacity})" stroke="rgba(200,220,255,0.6)" stroke-width="${strokeWidth}"/>`
  );

  // Data point dots with per-trait colors
  TRAIT_ORDER.forEach((trait, i) => {
    const value = Math.max(0, Math.min(1, traits[trait] ?? 0));
    const r = chartRadius * value;
    const p = polarToCartesian(cx, cy, r, i, 6);
    const color = colors[trait] ?? '#ffffff';
    parts.push(
      `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3" fill="${color}" stroke="#000" stroke-width="0.5"/>`
    );
  });

  // Labels
  if (showLabels) {
    TRAIT_ORDER.forEach((trait, i) => {
      const labelR = chartRadius + size * 0.08;
      const p = polarToCartesian(cx, cy, labelR, i, 6);
      const color = colors[trait] ?? '#ffffff';
      const label = TRAIT_SHORT[trait] ?? trait.charAt(0).toUpperCase();
      parts.push(
        `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" fill="${color}" font-size="${labelFontSize}" font-family="'IBM Plex Mono', monospace" text-anchor="middle" dominant-baseline="central" font-weight="bold">${label}</text>`
      );
    });
  }

  parts.push('</svg>');
  return parts.join('\n');
}
