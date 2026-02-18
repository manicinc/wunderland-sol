#!/usr/bin/env node
/* eslint-disable */
/**
 * Generate Stripe product images for Rabbit Hole Inc plans.
 * Creates 2 branded PNGs (Starter, Pro) at 512x512.
 * Starter = cold silver/gunmetal metallic, understated.
 * Pro = rich gold foil, warm tones, premium.
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('Install sharp first: npm install sharp');
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '..', 'apps', 'rabbithole', 'assets', 'stripe-products');

const S = {
  void: '#030305',
  voidDeep: '#060609',
  textBright: '#f0f0f8',
  textDim: '#505068',
};

const PALETTES = {
  starter: {
    // Cold silver / gunmetal
    primary: '#8a8a9e',
    light: '#b8b8cc',
    mid: '#9e9eb4',
    dark: '#5a5a6e',
    highlight: '#d4d4e4',
    accent: '#9a9ab0',
    logoGold1: '#8a8a9e', // logo goes silver too
    logoGold2: '#b8b8cc',
    logoGold3: '#d4d4e4',
    logoGold4: '#9a9ab0',
    vortex1: '#6a6a80',
    vortex2: '#8a8a9e',
    vortex3: '#9e9eb4',
    particle1: '#9e9eb4',
    particle2: '#b8b8cc',
    particle3: '#d4d4e4',
    sheen1: '#9e9eb4',
    sheen2: '#b8b8cc',
    sheen3: '#d4d4e4',
    bgTint: '#08080c',
    bgMid: '#0a0a10',
    coreGlow: '#b8b8cc',
    edgeGlow: '#6a6a80',
    holo1: '#6a6a80',
    holo2: '#8a8a9e',
    holo3: '#9e9eb4',
    holo4: '#b8b8cc',
    holoOpacity: 0.02,
    priceColor: '#b8b8cc',
    brandColor: '#9a9ab0',
    brandOpacity: '0.7',
    tierColor: '#d4d4e4',
  },
  pro: {
    // Rich warm gold
    primary: '#c9a227',
    light: '#f5e6a3',
    mid: '#e8d48a',
    dark: '#8b6914',
    highlight: '#fffbe6',
    accent: '#c9a227',
    logoGold1: '#8b6914',
    logoGold2: '#c9a227',
    logoGold3: '#f5e6a3',
    logoGold4: '#e8d48a',
    vortex1: '#c9a227',
    vortex2: '#e8d48a',
    vortex3: '#f5e6a3',
    particle1: '#e8d48a',
    particle2: '#f5e6a3',
    particle3: '#fffbe6',
    sheen1: '#c9a227',
    sheen2: '#e8d48a',
    sheen3: '#f5e6a3',
    bgTint: '#0c0a06',
    bgMid: '#100d06',
    coreGlow: '#f5e6a3',
    edgeGlow: '#c9a227',
    holo1: '#8b6914',
    holo2: '#c9a227',
    holo3: '#e8d48a',
    holo4: '#f5e6a3',
    holoOpacity: 0.05,
    priceColor: '#e8d48a',
    brandColor: '#c9a227',
    brandOpacity: '0.9',
    tierColor: '#f5e6a3',
  },
};

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/mo',
    agents: '1 Wunderbot',
    subtitle: '500 AI messages/mo included',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/mo',
    agents: '5 Wunderbots',
    subtitle: '2,500 AI messages/mo included',
  },
];

function spiralArc(cx, cy, startR, endR, startAngle, sweep, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = startR + (endR - startR) * t;
    const a = (startAngle + sweep * t) * (Math.PI / 180);
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function ptsToD(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
  return d;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSVG(plan) {
  const id = plan.id;
  const P = PALETTES[id];
  const cx = 256,
    cy = 120;
  const rand = seededRandom(id === 'starter' ? 42 : 97);
  const isPro = id === 'pro';

  // Starter: fewer, subtler elements. Pro: more, brighter.
  const armCount = isPro ? 8 : 5;
  const ringCount = isPro ? 18 : 10;
  const pCount = isPro ? 160 : 60;
  const streakCount = isPro ? 10 : 8;
  const hazeCount = isPro ? 7 : 4;
  const bandCount = isPro ? 10 : 3;
  const sheenCount = isPro ? 8 : 2;

  // Opacity multipliers
  const gM = isPro ? 1.0 : 0.5; // glow multiplier

  // --- Spiral arms ---
  const spiralArms = [];
  for (let a = 0; a < armCount; a++) {
    const base = (360 / armCount) * a + (rand() * 25 - 12);
    const pts = spiralArc(cx, cy, 15, 250, base, 320 + rand() * 100, 55);
    const colors = [P.vortex1, P.vortex2, P.vortex3];
    const color = colors[a % 3];
    const opacity = (0.04 + rand() * 0.08) * gM;
    const width = 0.6 + rand() * (isPro ? 2.8 : 1.6);
    spiralArms.push(
      `<path d="${ptsToD(pts)}" fill="none" stroke="${color}" stroke-width="${width.toFixed(1)}" opacity="${opacity.toFixed(3)}" stroke-linecap="round"/>`
    );
  }

  // --- Vortex rings ---
  const vortexRings = [];
  for (let i = 0; i < ringCount; i++) {
    const t = i / ringCount;
    const r = 10 + t * 250;
    const ry = r * (0.25 + t * 0.25);
    const rotation = i * (isPro ? 20 : 30) + rand() * 22;
    const opacity = (isPro ? 0.03 : 0.015) + (1 - t) * (isPro ? 0.14 : 0.06);
    const strokeW = 0.2 + (1 - t) * (isPro ? 1.2 : 0.6);
    const colors = [P.vortex1, P.vortex2, P.vortex3];
    vortexRings.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${r.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${rotation.toFixed(1)},${cx},${cy})" fill="none" stroke="${colors[i % 3]}" stroke-width="${strokeW.toFixed(2)}" opacity="${opacity.toFixed(3)}"/>`
    );
  }

  // --- Particles ---
  const particles = [];
  for (let i = 0; i < pCount; i++) {
    const angle = rand() * 360;
    const dist = 8 + rand() * 270;
    const rad = angle * (Math.PI / 180);
    const px = cx + dist * Math.cos(rad) * (0.75 + rand() * 0.5);
    const py = cy + dist * Math.sin(rad) * (0.35 + rand() * 0.4);
    const size = 0.3 + rand() * (isPro ? 3.0 : 1.6);
    const opacity = 0.03 + rand() * (isPro ? 0.2 : 0.12);
    const colors = [P.particle1, P.particle2, P.particle3];
    if (py > -20 && py < 532 && px > -20 && px < 532) {
      particles.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${size.toFixed(1)}" fill="${colors[Math.floor(rand() * 3)]}" opacity="${opacity.toFixed(3)}"/>`
      );
    }
  }

  // --- Light streaks ---
  const streaks = [];
  for (let i = 0; i < streakCount; i++) {
    const angle = (360 / streakCount) * i + rand() * 8;
    const rad = angle * (Math.PI / 180);
    const innerR = 18 + rand() * 16;
    const outerR = 110 + rand() * 150;
    const x1 = cx + innerR * Math.cos(rad);
    const y1 = cy + innerR * Math.sin(rad) * 0.38;
    const x2 = cx + outerR * Math.cos(rad);
    const y2 = cy + outerR * Math.sin(rad) * 0.38;
    const opacity = (isPro ? 0.005 : 0.005) + rand() * (isPro ? 0.01 : 0.01);
    streaks.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${P.highlight}" stroke-width="0.3" opacity="${opacity.toFixed(3)}"/>`
    );
  }

  // --- Outer haze ---
  const hazeRings = [];
  for (let i = 0; i < hazeCount; i++) {
    const r = 120 + i * 40;
    const opacity = (isPro ? 0.015 : 0.006) + (hazeCount - 1 - i) * (isPro ? 0.006 : 0.003);
    const rot = i * 26;
    hazeRings.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.34}" transform="rotate(${rot},${cx},${cy})" fill="none" stroke="${[P.vortex1, P.vortex2][i % 2]}" stroke-width="${1.2 + i * 0.4}" opacity="${opacity.toFixed(3)}"/>`
    );
  }

  // --- Holographic bands ---
  const holoBands = [];
  for (let i = 0; i < bandCount; i++) {
    const y = 20 + (i * 480) / bandCount + rand() * 20;
    const opacity = P.holoOpacity + rand() * (isPro ? 0.04 : 0.01);
    const colors = [P.holo1, P.holo2, P.holo3, P.holo4];
    const height = 1.5 + rand() * (isPro ? 5 : 2);
    holoBands.push(
      `<rect x="-50" y="${y.toFixed(1)}" width="620" height="${height.toFixed(1)}" fill="${colors[i % 4]}" opacity="${opacity.toFixed(3)}" transform="skewY(${isPro ? -22 : -18})"/>`
    );
  }

  // --- Sheen streaks ---
  const sheenStreaks = [];
  for (let i = 0; i < sheenCount; i++) {
    const x = 60 + (i * 400) / sheenCount + rand() * 40;
    const opacity = (isPro ? 0.025 : 0.008) + rand() * (isPro ? 0.04 : 0.01);
    const width = 0.8 + rand() * (isPro ? 3.5 : 1.5);
    const colors = [P.sheen1, P.sheen2, P.sheen3];
    sheenStreaks.push(
      `<line x1="${x.toFixed(1)}" y1="-20" x2="${(x - 120).toFixed(1)}" y2="540" stroke="${colors[i % 3]}" stroke-width="${width.toFixed(1)}" opacity="${opacity.toFixed(3)}"/>`
    );
  }

  // Logo positioning
  const logoScale = 0.18;
  const logoW = 512 * logoScale;
  const logoX = cx - logoW / 2;
  const logoY = cy - logoW * 0.58;

  // Text Y positions
  const brandY = cy + 62;
  const incY = brandY + 14;
  const tierY = incY + 42;
  const priceY = tierY + 40;
  const dividerY = priceY + 14;
  const agentsY = dividerY + 26;
  const subtitleY = agentsY + 19;
  const badgeY = plan.subtitle ? subtitleY + 12 : agentsY + 16;
  const badgeTextY = badgeY + 16;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg_${id}" cx="50%" cy="23%" r="78%">
      <stop offset="0%" stop-color="${P.bgMid}"/>
      <stop offset="35%" stop-color="${P.bgTint}"/>
      <stop offset="100%" stop-color="${S.void}"/>
    </radialGradient>

    <!-- Edge glow -->
    <radialGradient id="edgeglow_${id}" cx="50%" cy="50%" r="72%">
      <stop offset="55%" stop-color="${S.void}" stop-opacity="0"/>
      <stop offset="80%" stop-color="${P.edgeGlow}" stop-opacity="${isPro ? '0.04' : '0.02'}"/>
      <stop offset="95%" stop-color="${P.edgeGlow}" stop-opacity="${isPro ? '0.08' : '0.04'}"/>
      <stop offset="100%" stop-color="${P.edgeGlow}" stop-opacity="${isPro ? '0.05' : '0.03'}"/>
    </radialGradient>

    <!-- Core glow -->
    <radialGradient id="core_${id}" cx="50%" cy="23%" r="${isPro ? '20' : '16'}%">
      <stop offset="0%" stop-color="${P.coreGlow}" stop-opacity="${isPro ? '0.18' : '0.1'}"/>
      <stop offset="20%" stop-color="${P.primary}" stop-opacity="${isPro ? '0.08' : '0.05'}"/>
      <stop offset="50%" stop-color="${P.dark}" stop-opacity="${isPro ? '0.03' : '0.02'}"/>
      <stop offset="100%" stop-color="${S.void}" stop-opacity="0"/>
    </radialGradient>

    <!-- Ambient -->
    <radialGradient id="ambient_${id}" cx="50%" cy="23%" r="50%">
      <stop offset="0%" stop-color="${P.primary}" stop-opacity="${isPro ? '0.05' : '0.03'}"/>
      <stop offset="40%" stop-color="${P.dark}" stop-opacity="${isPro ? '0.02' : '0.01'}"/>
      <stop offset="100%" stop-color="${S.void}" stop-opacity="0"/>
    </radialGradient>

    ${
      isPro
        ? `<!-- Pro: subtle warm tint (not glowing, just color) -->
    <radialGradient id="aura1_${id}" cx="35%" cy="30%" r="42%">
      <stop offset="0%" stop-color="#e8d48a" stop-opacity="0.025"/>
      <stop offset="100%" stop-color="${S.void}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aura2_${id}" cx="65%" cy="20%" r="38%">
      <stop offset="0%" stop-color="#c9a227" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="${S.void}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aura3_${id}" cx="50%" cy="60%" r="45%">
      <stop offset="0%" stop-color="#8b6914" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="${S.void}" stop-opacity="0"/>
    </radialGradient>`
        : ''
    }

    <!-- Logo gradient -->
    <linearGradient id="logoGrad_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${P.logoGold1}"/>
      <stop offset="25%" stop-color="${P.logoGold2}"/>
      <stop offset="50%" stop-color="${P.logoGold3}"/>
      <stop offset="75%" stop-color="${P.logoGold4}"/>
      <stop offset="100%" stop-color="${P.logoGold1}"/>
    </linearGradient>

    <!-- Foil sweep -->
    <linearGradient id="foil_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${P.sheen1}" stop-opacity="0"/>
      <stop offset="25%" stop-color="${P.sheen1}" stop-opacity="${isPro ? '0.04' : '0.015'}"/>
      <stop offset="40%" stop-color="${P.sheen2}" stop-opacity="${isPro ? '0.07' : '0.02'}"/>
      <stop offset="55%" stop-color="${P.sheen3}" stop-opacity="${isPro ? '0.09' : '0.025'}"/>
      <stop offset="70%" stop-color="${P.sheen2}" stop-opacity="${isPro ? '0.04' : '0.01'}"/>
      <stop offset="100%" stop-color="${P.sheen1}" stop-opacity="0"/>
    </linearGradient>

    <linearGradient id="foil2_${id}" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${P.sheen3}" stop-opacity="0"/>
      <stop offset="35%" stop-color="${P.sheen2}" stop-opacity="${isPro ? '0.05' : '0.01'}"/>
      <stop offset="50%" stop-color="${P.sheen1}" stop-opacity="${isPro ? '0.07' : '0.015'}"/>
      <stop offset="65%" stop-color="${P.sheen2}" stop-opacity="${isPro ? '0.04' : '0.008'}"/>
      <stop offset="100%" stop-color="${P.sheen3}" stop-opacity="0"/>
    </linearGradient>

    <linearGradient id="bottomFade_${id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${S.void}" stop-opacity="0"/>
      <stop offset="20%" stop-color="${S.void}" stop-opacity="0"/>
      <stop offset="45%" stop-color="${S.void}" stop-opacity="0.4"/>
      <stop offset="65%" stop-color="${S.void}" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="${S.void}" stop-opacity="0.97"/>
    </linearGradient>

    <linearGradient id="topEdge_${id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${P.primary}" stop-opacity="${isPro ? '0.08' : '0.05'}"/>
      <stop offset="3%" stop-color="${P.primary}" stop-opacity="${isPro ? '0.025' : '0.015'}"/>
      <stop offset="8%" stop-color="${S.void}" stop-opacity="0"/>
    </linearGradient>

    <linearGradient id="bar_${id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${P.dark}" stop-opacity="0.0"/>
      <stop offset="20%" stop-color="${P.primary}" stop-opacity="${isPro ? '0.12' : '0.06'}"/>
      <stop offset="50%" stop-color="${P.light}" stop-opacity="${isPro ? '0.22' : '0.1'}"/>
      <stop offset="80%" stop-color="${P.primary}" stop-opacity="${isPro ? '0.12' : '0.06'}"/>
      <stop offset="100%" stop-color="${P.dark}" stop-opacity="0.0"/>
    </linearGradient>

    <linearGradient id="divider_${id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${P.primary}" stop-opacity="0.0"/>
      <stop offset="50%" stop-color="${P.light}" stop-opacity="${isPro ? '0.35' : '0.25'}"/>
      <stop offset="100%" stop-color="${P.primary}" stop-opacity="0.0"/>
    </linearGradient>

    <!-- Brushed metal -->
    <pattern id="brushed_${id}" x="0" y="0" width="512" height="3" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="512" y2="0" stroke="#fff" stroke-width="0.3" opacity="${isPro ? '0.006' : '0.012'}"/>
      <line x1="0" y1="1.5" x2="512" y2="1.5" stroke="#000" stroke-width="0.3" opacity="${isPro ? '0.01' : '0.02'}"/>
    </pattern>

    <filter id="shadow_${id}">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>
    </filter>
    <filter id="glow_${id}">
      <feGaussianBlur stdDeviation="${isPro ? '6' : '3'}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="bloom_${id}">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <clipPath id="card_${id}">
      <rect width="512" height="512" rx="24"/>
    </clipPath>
  </defs>

  <g clip-path="url(#card_${id})">

    <rect width="512" height="512" fill="${S.void}"/>
    <rect width="512" height="512" fill="url(#bg_${id})"/>
    <rect width="512" height="512" fill="url(#brushed_${id})"/>
    <rect width="512" height="512" fill="url(#edgeglow_${id})"/>
    <rect width="512" height="512" fill="url(#topEdge_${id})"/>

    ${
      isPro
        ? `<rect width="512" height="512" fill="url(#aura1_${id})"/>
    <rect width="512" height="512" fill="url(#aura2_${id})"/>
    <rect width="512" height="512" fill="url(#aura3_${id})"/>`
        : ''
    }

    ${hazeRings.join('\n    ')}
    <rect width="512" height="512" fill="url(#ambient_${id})"/>
    ${streaks.join('\n    ')}
    ${spiralArms.join('\n    ')}
    ${vortexRings.join('\n    ')}
    ${holoBands.join('\n    ')}
    ${sheenStreaks.join('\n    ')}
    ${particles.join('\n    ')}

    <rect width="512" height="512" fill="url(#core_${id})"/>
    <rect width="512" height="512" fill="url(#foil_${id})"/>
    <rect width="512" height="512" fill="url(#foil2_${id})"/>

    <!-- Core bright point -->
    <ellipse cx="${cx}" cy="${cy}" rx="${isPro ? '8' : '6'}" ry="${isPro ? '4' : '3'}" fill="${P.coreGlow}" opacity="${isPro ? '0.15' : '0.1'}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${isPro ? '3' : '3'}" ry="${isPro ? '1.5' : '1.5'}" fill="#fff" opacity="${isPro ? '0.1' : '0.08'}"/>

    <!-- Logo -->
    <g transform="translate(${logoX.toFixed(1)}, ${logoY.toFixed(1)}) scale(${logoScale})" filter="url(#${isPro ? 'bloom' : 'glow'}_${id})">
      <path d="M 256 56 C 368 56, 456 144, 456 256 C 456 338, 394 408, 318 428 L 318 434 C 318 444, 308 454, 298 454 L 298 494 L 214 494 L 214 454 C 204 454, 194 444, 194 434 L 194 428 C 118 408, 56 338, 56 256 C 56 144, 144 56, 256 56 Z"
            fill="url(#logoGrad_${id})" opacity="${isPro ? '0.95' : '0.7'}"/>
      <path d="M 256 98 C 348 98, 420 170, 420 256 C 420 318, 378 374, 308 390 L 298 390 C 288 390, 278 400, 278 410 L 278 466 L 234 466 L 234 410 C 234 400, 224 390, 214 390 L 204 390 C 134 374, 92 318, 92 256 C 92 170, 164 98, 256 98 Z"
            fill="${S.voidDeep}"/>
      <g fill="url(#logoGrad_${id})">
        <path d="M174 270 Q170 170 192 120 Q200 96 220 96 Q240 96 240 130 Q240 192 230 270 Q206 266 174 270Z"/>
        <path d="M338 270 Q342 170 320 120 Q312 96 292 96 Q272 96 272 130 Q272 192 282 270 Q306 266 338 270Z"/>
        <ellipse cx="256" cy="322" rx="112" ry="92"/>
      </g>
    </g>

    <rect width="512" height="512" fill="url(#bottomFade_${id})"/>

    <!-- RABBIT HOLE INC -->
    <text x="${cx}" y="${brandY}" text-anchor="middle"
          font-family="'Cormorant Garamond', 'Georgia', serif"
          font-size="20" font-weight="600" letter-spacing="8"
          fill="${P.brandColor}" opacity="${P.brandOpacity}">
      RABBIT HOLE
    </text>
    <text x="${cx}" y="${incY}" text-anchor="middle"
          font-family="'Tenor Sans', 'Helvetica Neue', sans-serif"
          font-size="10" font-weight="400" letter-spacing="5"
          fill="${P.brandColor}" opacity="0.5">
      INC
    </text>

    <!-- Plan name -->
    <text x="${cx}" y="${tierY}" text-anchor="middle"
          font-family="'Cormorant Garamond', 'Georgia', serif"
          font-size="36" font-weight="600" fill="${P.tierColor}"
          letter-spacing="2"
          filter="url(#shadow_${id})">
      ${plan.name}
    </text>

    <!-- Price -->
    <text x="${cx - 14}" y="${priceY}" text-anchor="middle"
          font-family="'IBM Plex Mono', monospace"
          font-size="32" font-weight="700" fill="${P.priceColor}">
      ${plan.price}
    </text>
    <text x="${cx + 28}" y="${priceY}" text-anchor="start"
          font-family="'IBM Plex Mono', monospace"
          font-size="15" font-weight="400" fill="${S.textDim}">
      ${plan.period}
    </text>

    <line x1="170" y1="${dividerY}" x2="342" y2="${dividerY}"
          stroke="url(#divider_${id})" stroke-width="0.8"/>

    <text x="${cx}" y="${agentsY}" text-anchor="middle"
          font-family="'IBM Plex Mono', monospace"
          font-size="18" font-weight="600" fill="${S.textBright}">
      ${plan.agents}
    </text>

    ${
      plan.subtitle
        ? `<text x="${cx}" y="${subtitleY}" text-anchor="middle"
          font-family="'IBM Plex Mono', monospace"
          font-size="11" font-weight="500" fill="${P.accent}" opacity="0.65">
      ${plan.subtitle}
    </text>`
        : ''
    }

    <rect x="171" y="${badgeY}" width="170" height="24" rx="12"
          fill="${P.accent}" fill-opacity="0.05"
          stroke="${P.accent}" stroke-width="0.5" stroke-opacity="0.15"/>
    <text x="${cx}" y="${badgeTextY}" text-anchor="middle"
          font-family="'IBM Plex Mono', monospace"
          font-size="8.5" font-weight="600" letter-spacing="1.5"
          fill="${P.brandColor}" opacity="0.5">
      FULL WUNDERLAND ACCESS
    </text>

    <rect x="0" y="497" width="512" height="15" fill="url(#bar_${id})"/>
    <rect x="0" y="497" width="512" height="0.5" fill="${P.primary}" opacity="${isPro ? '0.2' : '0.05'}"/>

    <g opacity="${isPro ? '0.25' : '0.1'}" stroke="${P.primary}" stroke-width="${isPro ? '1.5' : '1'}">
      <polyline points="14,40 14,14 40,14" fill="none" stroke-linecap="round"/>
      <polyline points="472,14 498,14 498,40" fill="none" stroke-linecap="round"/>
      <polyline points="14,472 14,498 40,498" fill="none" stroke-linecap="round"/>
      <polyline points="472,498 498,498 498,472" fill="none" stroke-linecap="round"/>
    </g>

    <rect x="0.5" y="0.5" width="511" height="511" rx="24"
          fill="none" stroke="${P.primary}" stroke-width="${isPro ? '0.8' : '0.4'}" opacity="${isPro ? '0.12' : '0.04'}"/>

  </g>
</svg>`;
}

/**
 * Physical Card Logo — 1000x200, black-on-white binary.
 * Just the keyhole+rabbit logo + "RABBIT HOLE INC" wordmark + plan name.
 */
function generateCardLogoSVG(plan) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1000" height="200" viewBox="0 0 1000 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="1000" height="200" fill="#ffffff"/>

  <!-- Keyhole+rabbit logo -->
  <g transform="translate(30, 12) scale(0.34)">
    <path d="M 256 56 C 368 56, 456 144, 456 256 C 456 338, 394 408, 318 428 L 318 434 C 318 444, 308 454, 298 454 L 298 494 L 214 494 L 214 454 C 204 454, 194 444, 194 434 L 194 428 C 118 408, 56 338, 56 256 C 56 144, 144 56, 256 56 Z"
          fill="#000000"/>
    <path d="M 256 98 C 348 98, 420 170, 420 256 C 420 318, 378 374, 308 390 L 298 390 C 288 390, 278 400, 278 410 L 278 466 L 234 466 L 234 410 C 234 400, 224 390, 214 390 L 204 390 C 134 374, 92 318, 92 256 C 92 170, 164 98, 256 98 Z"
          fill="#ffffff"/>
    <g fill="#000000">
      <path d="M174 270 Q170 170 192 120 Q200 96 220 96 Q240 96 240 130 Q240 192 230 270 Q206 266 174 270Z"/>
      <path d="M338 270 Q342 170 320 120 Q312 96 292 96 Q272 96 272 130 Q272 192 282 270 Q306 266 338 270Z"/>
      <ellipse cx="256" cy="322" rx="112" ry="92"/>
    </g>
  </g>

  <!-- RABBIT HOLE INC -->
  <text x="230" y="88" font-family="'Cormorant Garamond', 'Georgia', serif"
        font-size="36" font-weight="600" letter-spacing="10" fill="#000000">
    RABBIT HOLE
  </text>
  <text x="232" y="116" font-family="'Tenor Sans', 'Helvetica Neue', sans-serif"
        font-size="16" font-weight="400" letter-spacing="8" fill="#000000">
    INC
  </text>

  <!-- Thin divider -->
  <line x1="230" y1="130" x2="580" y2="130" stroke="#000000" stroke-width="1"/>

  <!-- Plan name -->
  <text x="232" y="168" font-family="'IBM Plex Mono', monospace"
        font-size="28" font-weight="600" letter-spacing="3" fill="#000000">
    ${plan.name}
  </text>

  <!-- Price -->
  <text x="400" y="168" font-family="'IBM Plex Mono', monospace"
        font-size="22" font-weight="400" fill="#000000">
    ${plan.price}${plan.period}
  </text>
</svg>`;
}

/**
 * Branding Icon — 256x256, just the keyhole+rabbit mark.
 * Transparent background, gold/silver per plan.
 */
function generateBrandIconSVG(plan) {
  const P = PALETTES[plan.id];
  const id = plan.id;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iconGrad_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${P.logoGold1}"/>
      <stop offset="25%" stop-color="${P.logoGold2}"/>
      <stop offset="50%" stop-color="${P.logoGold3}"/>
      <stop offset="75%" stop-color="${P.logoGold4}"/>
      <stop offset="100%" stop-color="${P.logoGold1}"/>
    </linearGradient>
  </defs>

  <g transform="translate(12, 4) scale(0.45)">
    <path d="M 256 56 C 368 56, 456 144, 456 256 C 456 338, 394 408, 318 428 L 318 434 C 318 444, 308 454, 298 454 L 298 494 L 214 494 L 214 454 C 204 454, 194 444, 194 434 L 194 428 C 118 408, 56 338, 56 256 C 56 144, 144 56, 256 56 Z"
          fill="url(#iconGrad_${id})"/>
    <path d="M 256 98 C 348 98, 420 170, 420 256 C 420 318, 378 374, 308 390 L 298 390 C 288 390, 278 400, 278 410 L 278 466 L 234 466 L 234 410 C 234 400, 224 390, 214 390 L 204 390 C 134 374, 92 318, 92 256 C 92 170, 164 98, 256 98 Z"
          fill="transparent"/>
    <g fill="url(#iconGrad_${id})">
      <path d="M174 270 Q170 170 192 120 Q200 96 220 96 Q240 96 240 130 Q240 192 230 270 Q206 266 174 270Z"/>
      <path d="M338 270 Q342 170 320 120 Q312 96 292 96 Q272 96 272 130 Q272 192 282 270 Q306 266 338 270Z"/>
      <ellipse cx="256" cy="322" rx="112" ry="92"/>
    </g>
  </g>
</svg>`;
}

/**
 * Card Element Banner — 640x200, wider responsive format.
 * Left: logo + RABBIT HOLE INC (big) + agents below + plan/price.
 * Right: vortex swirl (Pro=golden shine, Starter=subtle metallic).
 */
function generateCardBannerSVG(plan) {
  const P = PALETTES[plan.id];
  const id = plan.id;
  const isPro = id === 'pro';
  const rand = seededRandom(id === 'starter' ? 55 : 88);

  // --- Build vortex elements for right side ---
  const vortexCx = 530,
    vortexCy = 100;
  const vortexArmCount = isPro ? 6 : 4;
  const vortexRingCount = isPro ? 12 : 6;
  const vortexParticles = isPro ? 80 : 30;

  // Spiral arms
  const arms = [];
  for (let i = 0; i < vortexArmCount; i++) {
    const startA = (360 / vortexArmCount) * i + rand() * 30;
    const pts = spiralArc(vortexCx, vortexCy, 6, 80 + rand() * 30, startA, 200 + rand() * 120, 24);
    const opacity = isPro ? 0.06 + rand() * 0.08 : 0.03 + rand() * 0.04;
    const colors = [P.vortex1, P.vortex2, P.vortex3];
    arms.push(
      `<path d="${ptsToD(pts)}" fill="none" stroke="${colors[i % 3]}" stroke-width="${0.4 + rand() * 0.6}" opacity="${opacity.toFixed(3)}"/>`
    );
  }

  // Concentric rings
  const rings = [];
  for (let i = 0; i < vortexRingCount; i++) {
    const r = 8 + i * (isPro ? 7 : 10);
    const tilt = 0.25 + rand() * 0.35;
    const rot = i * 22 + rand() * 15;
    const opacity = isPro ? 0.04 + rand() * 0.06 : 0.02 + rand() * 0.03;
    const colors = [P.vortex1, P.vortex2, P.vortex3];
    rings.push(
      `<ellipse cx="${vortexCx}" cy="${vortexCy}" rx="${r}" ry="${(r * tilt).toFixed(1)}" transform="rotate(${rot.toFixed(0)} ${vortexCx} ${vortexCy})" fill="none" stroke="${colors[i % 3]}" stroke-width="0.4" opacity="${opacity.toFixed(3)}"/>`
    );
  }

  // Particles
  const particles = [];
  for (let i = 0; i < vortexParticles; i++) {
    const angle = rand() * 360;
    const dist = 4 + rand() * 90;
    const rad = angle * (Math.PI / 180);
    const px = vortexCx + dist * Math.cos(rad) * (0.9 + rand() * 0.3);
    const py = vortexCy + dist * Math.sin(rad) * (0.5 + rand() * 0.4);
    const size = 0.2 + rand() * (isPro ? 1.8 : 0.9);
    const opacity = isPro ? 0.04 + rand() * 0.14 : 0.02 + rand() * 0.06;
    const colors = [P.particle1, P.particle2, P.particle3];
    if (px > 420 && px < 640 && py > 0 && py < 200) {
      particles.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${size.toFixed(1)}" fill="${colors[Math.floor(rand() * 3)]}" opacity="${opacity.toFixed(3)}"/>`
      );
    }
  }

  // Readable text colors
  const agentsColor = isPro ? '#f5e6a3' : '#d4d4e4';
  const subtitleColor = isPro ? '#c9a227' : '#9a9ab0';
  const accessColor = isPro ? '#e8d48a' : '#b8b8cc';
  const accessOpacity = isPro ? '0.8' : '0.7';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="640" height="200" viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bannerBg_${id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${S.void}"/>
      <stop offset="50%" stop-color="${P.bgTint}"/>
      <stop offset="100%" stop-color="${S.void}"/>
    </linearGradient>
    <linearGradient id="bannerGold_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${P.logoGold1}"/>
      <stop offset="25%" stop-color="${P.logoGold2}"/>
      <stop offset="50%" stop-color="${P.logoGold3}"/>
      <stop offset="75%" stop-color="${P.logoGold4}"/>
      <stop offset="100%" stop-color="${P.logoGold1}"/>
    </linearGradient>
    <linearGradient id="bannerBar_${id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${P.dark}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${P.primary}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${P.dark}" stop-opacity="0"/>
    </linearGradient>
    ${
      isPro
        ? `
    <radialGradient id="vortexGlow_${id}" cx="${vortexCx}" cy="${vortexCy}" r="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f5e6a3" stop-opacity="0.08"/>
      <stop offset="40%" stop-color="#c9a227" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="${S.void}" stop-opacity="0"/>
    </radialGradient>`
        : `
    <radialGradient id="vortexGlow_${id}" cx="${vortexCx}" cy="${vortexCy}" r="70" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#b8b8cc" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="${S.void}" stop-opacity="0"/>
    </radialGradient>`
    }
    <filter id="bannerBloom_${id}">
      <feGaussianBlur stdDeviation="${isPro ? '3' : '1.5'}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <rect width="640" height="200" rx="12" fill="url(#bannerBg_${id})"/>

  <!-- Top/bottom accent lines -->
  <rect x="0" y="0" width="640" height="0.5" fill="${P.primary}" opacity="${isPro ? '0.12' : '0.08'}"/>
  <rect x="0" y="192" width="640" height="8" fill="url(#bannerBar_${id})"/>
  <rect x="0" y="192" width="640" height="0.5" fill="${P.primary}" opacity="${isPro ? '0.10' : '0.06'}"/>

  <!-- Vortex on right side -->
  <g>
    <rect x="420" y="0" width="220" height="200" fill="url(#vortexGlow_${id})"/>
    ${arms.join('\n    ')}
    ${rings.join('\n    ')}
    ${particles.join('\n    ')}
    ${isPro ? `<ellipse cx="${vortexCx}" cy="${vortexCy}" rx="4" ry="2" fill="#f5e6a3" opacity="0.12"/>` : ''}
  </g>

  <!-- Logo mark -->
  <g transform="translate(28, 16) scale(0.33)">
    <path d="M 256 56 C 368 56, 456 144, 456 256 C 456 338, 394 408, 318 428 L 318 434 C 318 444, 308 454, 298 454 L 298 494 L 214 494 L 214 454 C 204 454, 194 444, 194 434 L 194 428 C 118 408, 56 338, 56 256 C 56 144, 144 56, 256 56 Z"
          fill="url(#bannerGold_${id})" opacity="0.9"/>
    <path d="M 256 98 C 348 98, 420 170, 420 256 C 420 318, 378 374, 308 390 L 298 390 C 288 390, 278 400, 278 410 L 278 466 L 234 466 L 234 410 C 234 400, 224 390, 214 390 L 204 390 C 134 374, 92 318, 92 256 C 92 170, 164 98, 256 98 Z"
          fill="${S.void}"/>
    <g fill="url(#bannerGold_${id})">
      <path d="M174 270 Q170 170 192 120 Q200 96 220 96 Q240 96 240 130 Q240 192 230 270 Q206 266 174 270Z"/>
      <path d="M338 270 Q342 170 320 120 Q312 96 292 96 Q272 96 272 130 Q272 192 282 270 Q306 266 338 270Z"/>
      <ellipse cx="256" cy="322" rx="112" ry="92"/>
    </g>
  </g>

  <!-- RABBIT HOLE INC — bigger -->
  <text x="210" y="52" font-family="'Cormorant Garamond', 'Georgia', serif"
        font-size="26" font-weight="700" letter-spacing="8"
        fill="${P.brandColor}" opacity="${isPro ? '1.0' : '0.85'}">
    RABBIT HOLE
  </text>
  <text x="212" y="70" font-family="'Tenor Sans', 'Helvetica Neue', sans-serif"
        font-size="11" font-weight="400" letter-spacing="5"
        fill="${P.brandColor}" opacity="${isPro ? '0.7' : '0.6'}">
    INC
  </text>

  <!-- Agents count — spaced below branding -->
  <text x="212" y="100" font-family="'IBM Plex Mono', monospace"
        font-size="15" font-weight="600" letter-spacing="1"
        fill="${agentsColor}">
    ${plan.agents}
  </text>
  ${
    plan.subtitle
      ? `<text x="212" y="118" font-family="'IBM Plex Mono', monospace"
        font-size="11" font-weight="400" fill="${subtitleColor}" opacity="0.8">
    ${plan.subtitle}
  </text>`
      : ''
  }

  <!-- FULL WUNDERLAND ACCESS — readable -->
  <text x="212" y="${plan.subtitle ? '140' : '124'}" font-family="'IBM Plex Mono', monospace"
        font-size="9" font-weight="600" letter-spacing="2"
        fill="${accessColor}" opacity="${accessOpacity}">
    FULL WUNDERLAND ACCESS
  </text>

  <!-- Plan name + price at bottom -->
  <text x="212" y="176" font-family="'Cormorant Garamond', 'Georgia', serif"
        font-size="28" font-weight="600" fill="${P.tierColor}" letter-spacing="2">
    ${plan.name}
  </text>
  <text x="${plan.name === 'Pro' ? '270' : '330'}" y="176" font-family="'IBM Plex Mono', monospace"
        font-size="20" font-weight="700" fill="${P.priceColor}">
    ${plan.price}<tspan font-size="12" font-weight="400" fill="${isPro ? '#c9a227' : '#8a8a9e'}" opacity="0.7">${plan.period}</tspan>
  </text>

  <!-- Corner brackets -->
  <g opacity="${isPro ? '0.18' : '0.10'}" stroke="${P.primary}" stroke-width="1">
    <polyline points="8,24 8,8 24,8" fill="none" stroke-linecap="round"/>
    <polyline points="616,8 632,8 632,24" fill="none" stroke-linecap="round"/>
    <polyline points="8,176 8,192 24,192" fill="none" stroke-linecap="round"/>
    <polyline points="616,192 632,192 632,176" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Clean up old files
  for (const old of ['wunderland-starter', 'wunderland-pro']) {
    for (const ext of ['.svg', '.png']) {
      const f = path.join(OUTPUT_DIR, old + ext);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }

  for (const plan of plans) {
    // 1. Checkout product image (512x512)
    const svg = generateSVG(plan);
    const svgPath = path.join(OUTPUT_DIR, `rabbithole-${plan.id}.svg`);
    const pngPath = path.join(OUTPUT_DIR, `rabbithole-${plan.id}.png`);
    fs.writeFileSync(svgPath, svg);
    await sharp(Buffer.from(svg)).resize(512, 512).png({ quality: 95 }).toFile(pngPath);
    console.log(`  ✓ Checkout 512x512  → ${pngPath}`);

    // 2. Physical card logo (1000x200, black on white)
    const cardSvg = generateCardLogoSVG(plan);
    const cardPath = path.join(OUTPUT_DIR, `rabbithole-${plan.id}-card-logo.png`);
    fs.writeFileSync(path.join(OUTPUT_DIR, `rabbithole-${plan.id}-card-logo.svg`), cardSvg);
    await sharp(Buffer.from(cardSvg)).resize(1000, 200).png().toFile(cardPath);
    console.log(`  ✓ Card logo 1000x200 → ${cardPath}`);

    // 3. Branding icon (256x256, transparent bg)
    const iconSvg = generateBrandIconSVG(plan);
    const iconPath = path.join(OUTPUT_DIR, `rabbithole-${plan.id}-icon.png`);
    fs.writeFileSync(path.join(OUTPUT_DIR, `rabbithole-${plan.id}-icon.svg`), iconSvg);
    await sharp(Buffer.from(iconSvg)).resize(256, 256).png().toFile(iconPath);
    console.log(`  ✓ Brand icon 256x256 → ${iconPath}`);

    // 4. Card element banner (640x200, responsive)
    const bannerSvg = generateCardBannerSVG(plan);
    const bannerPath = path.join(OUTPUT_DIR, `rabbithole-${plan.id}-banner.png`);
    fs.writeFileSync(path.join(OUTPUT_DIR, `rabbithole-${plan.id}-banner.svg`), bannerSvg);
    await sharp(Buffer.from(bannerSvg)).resize(640, 200).png({ quality: 95 }).toFile(bannerPath);
    console.log(`  ✓ Banner 640x200   → ${bannerPath}`);

    console.log('');
  }

  // File size check
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png'));
  console.log('File sizes:');
  for (const f of files.sort()) {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    const kb = (stat.size / 1024).toFixed(1);
    const ok = stat.size < 512 * 1024 ? '✓' : stat.size < 2 * 1024 * 1024 ? '~' : '✗';
    console.log(`  ${ok} ${kb}kb  ${f}`);
  }

  console.log(`\nDone! Generated ${plans.length * 4} images in: ${OUTPUT_DIR}`);
}

main().catch(console.error);
