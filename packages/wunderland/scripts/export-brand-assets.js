const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// ─── CONFIGURATION ────────────────────────────────────────

const ROOT = path.join(__dirname, '..');

const BRANDS = {
  rabbithole: {
    name: 'Rabbit Hole Inc',
    outputDir: path.join(ROOT, 'apps/rabbithole/assets'),
    colorVersions: ['gold', 'obsidian'],
    backgrounds: {
      cream: { r: 248, g: 246, b: 242 },
      dark: { r: 26, g: 21, b: 32 },
    },
    logoDimensions: [380, 80],
  },
  wunderland: {
    name: 'Wunderland',
    outputDir: path.join(ROOT, 'apps/wunderland-sh/assets'),
    colorVersions: ['neon', 'monochrome', 'gold'],
    backgrounds: {
      dark: { r: 10, g: 10, b: 15 },
      light: { r: 248, g: 246, b: 242 },
    },
    logoDimensions: [460, 100],
  },
};

const ICON_SIZES = [512, 1024];
const LOGO_SCALES = [2, 4];

// ─── UTILITY ──────────────────────────────────────────────

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── RABBIT HOLE SVG GENERATORS ───────────────────────────

function rhGenerateIconSVG({ colorVersion, size = 64, forDarkBg = false }) {
  const isGold = colorVersion === 'gold';
  const useGold = isGold || forDarkBg;

  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="goldGrad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b6914"/>
            <stop offset="25%" stop-color="#c9a227"/>
            <stop offset="45%" stop-color="#e8d48a"/>
            <stop offset="55%" stop-color="#f5e6a3"/>
            <stop offset="70%" stop-color="#c9a227"/>
            <stop offset="100%" stop-color="#8b6914"/>
        </linearGradient>
        <linearGradient id="obsidianBase${size}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#08050a"/>
            <stop offset="25%" stop-color="#12101a"/>
            <stop offset="50%" stop-color="#1a1625"/>
            <stop offset="75%" stop-color="#12101a"/>
            <stop offset="100%" stop-color="#08050a"/>
        </linearGradient>
        <linearGradient id="obsidianReflect${size}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(200,195,210,0.0)"/>
            <stop offset="35%" stop-color="rgba(220,215,230,0.12)"/>
            <stop offset="45%" stop-color="rgba(245,240,255,0.22)"/>
            <stop offset="55%" stop-color="rgba(220,215,230,0.12)"/>
            <stop offset="100%" stop-color="rgba(200,195,210,0.0)"/>
        </linearGradient>
        <linearGradient id="obsidianEdge${size}" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(180,175,195,0.08)"/>
            <stop offset="50%" stop-color="rgba(160,155,175,0.04)"/>
            <stop offset="100%" stop-color="rgba(140,135,155,0.0)"/>
        </linearGradient>
        <linearGradient id="innerGrad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#faf7f2"/>
            <stop offset="50%" stop-color="#f5f0e8"/>
            <stop offset="100%" stop-color="#ede8e0"/>
        </linearGradient>
        <linearGradient id="innerGradCool${size}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f8f6f4"/>
            <stop offset="50%" stop-color="#f0eeec"/>
            <stop offset="100%" stop-color="#e8e6e4"/>
        </linearGradient>
    </defs>
    <g>
        <path d="
            M 50 6
            C 72 6, 90 24, 90 46
            C 90 62, 78 76, 62 80
            L 62 82
            C 62 84, 60 86, 58 86
            L 58 94
            L 42 94
            L 42 86
            C 40 86, 38 84, 38 82
            L 38 80
            C 22 76, 10 62, 10 46
            C 10 24, 28 6, 50 6
            Z
        " fill="${useGold ? `url(#goldGrad${size})` : `url(#obsidianBase${size})`}"/>
        ${
          !useGold
            ? `<path d="
            M 50 6
            C 72 6, 90 24, 90 46
            C 90 62, 78 76, 62 80
            L 62 82
            C 62 84, 60 86, 58 86
            L 58 94
            L 42 94
            L 42 86
            C 40 86, 38 84, 38 82
            L 38 80
            C 22 76, 10 62, 10 46
            C 10 24, 28 6, 50 6
            Z
        " fill="url(#obsidianReflect${size})"/>
        <path d="
            M 50 6
            C 72 6, 90 24, 90 46
            C 90 62, 78 76, 62 80
            L 62 82
            C 62 84, 60 86, 58 86
            L 58 94
            L 42 94
            L 42 86
            C 40 86, 38 84, 38 82
            L 38 80
            C 22 76, 10 62, 10 46
            C 10 24, 28 6, 50 6
            Z
        " fill="url(#obsidianEdge${size})"/>`
            : ''
        }
    </g>
    <path d="
        M 50 14
        C 68 14, 82 28, 82 46
        C 82 58, 74 70, 60 73
        L 58 73
        C 56 73, 54 75, 54 77
        L 54 88
        L 46 88
        L 46 77
        C 46 75, 44 73, 42 73
        L 40 73
        C 26 70, 18 58, 18 46
        C 18 28, 32 14, 50 14
        Z
    " fill="${useGold ? `url(#innerGrad${size})` : `url(#innerGradCool${size})`}"/>
    <g>
        <g fill="${useGold ? `url(#goldGrad${size})` : `url(#obsidianBase${size})`}">
            <path d="M34 50
                     Q33 30 37 20
                     Q39 14 43 14
                     Q47 14 47 22
                     Q47 34 45 50
                     Q40 49 34 50Z"/>
            <path d="M66 50
                     Q67 30 63 20
                     Q61 14 57 14
                     Q53 14 53 22
                     Q53 34 55 50
                     Q60 49 66 50Z"/>
            <ellipse cx="50" cy="60" rx="22" ry="18"/>
        </g>
        ${
          !useGold
            ? `<g fill="url(#obsidianReflect${size})">
            <path d="M34 50 Q33 30 37 20 Q39 14 43 14 Q47 14 47 22 Q47 34 45 50 Q40 49 34 50Z"/>
            <path d="M66 50 Q67 30 63 20 Q61 14 57 14 Q53 14 53 22 Q53 34 55 50 Q60 49 66 50Z"/>
            <ellipse cx="50" cy="60" rx="22" ry="18"/>
        </g>
        <g fill="url(#obsidianEdge${size})">
            <path d="M34 50 Q33 30 37 20 Q39 14 43 14 Q47 14 47 22 Q47 34 45 50 Q40 49 34 50Z"/>
            <path d="M66 50 Q67 30 63 20 Q61 14 57 14 Q53 14 53 22 Q53 34 55 50 Q60 49 66 50Z"/>
            <ellipse cx="50" cy="60" rx="22" ry="18"/>
        </g>`
            : ''
        }
    </g>
</svg>`;
}

function rhGeneratePrimaryLogoSVG({
  colorVersion,
  showTagline = true,
  taglineText = "FOUNDER'S CLUB",
  forDarkBg = false,
}) {
  const height = showTagline ? 80 : 64;
  const isGold = colorVersion === 'gold';
  const useGold = isGold || forDarkBg;
  const textColor = useGold ? '#c9a227' : '#1a1625';
  const taglineColor = useGold ? '#a6851e' : '#3a3545';

  return `<svg width="380" height="${height}" viewBox="0 0 380 ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="goldIconGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b6914"/>
            <stop offset="25%" stop-color="#c9a227"/>
            <stop offset="45%" stop-color="#e8d48a"/>
            <stop offset="55%" stop-color="#f5e6a3"/>
            <stop offset="70%" stop-color="#c9a227"/>
            <stop offset="100%" stop-color="#8b6914"/>
        </linearGradient>
        <linearGradient id="obsidianBaseLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#08050a"/>
            <stop offset="25%" stop-color="#12101a"/>
            <stop offset="50%" stop-color="#1a1625"/>
            <stop offset="75%" stop-color="#12101a"/>
            <stop offset="100%" stop-color="#08050a"/>
        </linearGradient>
        <linearGradient id="obsidianReflectLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(200,195,210,0.0)"/>
            <stop offset="35%" stop-color="rgba(220,215,230,0.12)"/>
            <stop offset="45%" stop-color="rgba(245,240,255,0.22)"/>
            <stop offset="55%" stop-color="rgba(220,215,230,0.12)"/>
            <stop offset="100%" stop-color="rgba(200,195,210,0.0)"/>
        </linearGradient>
        <linearGradient id="obsidianEdgeLogo" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(180,175,195,0.08)"/>
            <stop offset="50%" stop-color="rgba(160,155,175,0.04)"/>
            <stop offset="100%" stop-color="rgba(140,135,155,0.0)"/>
        </linearGradient>
        <linearGradient id="innerGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#faf7f2"/>
            <stop offset="50%" stop-color="#f5f0e8"/>
            <stop offset="100%" stop-color="#ede8e0"/>
        </linearGradient>
        <linearGradient id="innerGradCoolLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f8f6f4"/>
            <stop offset="50%" stop-color="#f0eeec"/>
            <stop offset="100%" stop-color="#e8e6e4"/>
        </linearGradient>
    </defs>
    <g transform="translate(2, ${showTagline ? 2 : 0}) scale(0.62)">
        <path d="M 50 6 C 72 6, 90 24, 90 46 C 90 62, 78 76, 62 80 L 62 82 C 62 84, 60 86, 58 86 L 58 94 L 42 94 L 42 86 C 40 86, 38 84, 38 82 L 38 80 C 22 76, 10 62, 10 46 C 10 24, 28 6, 50 6 Z"
              fill="${useGold ? 'url(#goldIconGradLogo)' : 'url(#obsidianBaseLogo)'}"/>
        ${
          !useGold
            ? `<path d="M 50 6 C 72 6, 90 24, 90 46 C 90 62, 78 76, 62 80 L 62 82 C 62 84, 60 86, 58 86 L 58 94 L 42 94 L 42 86 C 40 86, 38 84, 38 82 L 38 80 C 22 76, 10 62, 10 46 C 10 24, 28 6, 50 6 Z"
              fill="url(#obsidianReflectLogo)"/>
        <path d="M 50 6 C 72 6, 90 24, 90 46 C 90 62, 78 76, 62 80 L 62 82 C 62 84, 60 86, 58 86 L 58 94 L 42 94 L 42 86 C 40 86, 38 84, 38 82 L 38 80 C 22 76, 10 62, 10 46 C 10 24, 28 6, 50 6 Z"
              fill="url(#obsidianEdgeLogo)"/>`
            : ''
        }
        <path d="M 50 14 C 68 14, 82 28, 82 46 C 82 58, 74 70, 60 73 L 58 73 C 56 73, 54 75, 54 77 L 54 88 L 46 88 L 46 77 C 46 75, 44 73, 42 73 L 40 73 C 26 70, 18 58, 18 46 C 18 28, 32 14, 50 14 Z"
              fill="${useGold ? 'url(#innerGradLogo)' : 'url(#innerGradCoolLogo)'}"/>
        <g fill="${useGold ? 'url(#goldIconGradLogo)' : 'url(#obsidianBaseLogo)'}">
            <path d="M34 50 Q33 30 37 20 Q39 14 43 14 Q47 14 47 22 Q47 34 45 50 Q40 49 34 50Z"/>
            <path d="M66 50 Q67 30 63 20 Q61 14 57 14 Q53 14 53 22 Q53 34 55 50 Q60 49 66 50Z"/>
            <ellipse cx="50" cy="60" rx="22" ry="18"/>
        </g>
        ${
          !useGold
            ? `<g fill="url(#obsidianReflectLogo)">
            <path d="M34 50 Q33 30 37 20 Q39 14 43 14 Q47 14 47 22 Q47 34 45 50 Q40 49 34 50Z"/>
            <path d="M66 50 Q67 30 63 20 Q61 14 57 14 Q53 14 53 22 Q53 34 55 50 Q60 49 66 50Z"/>
            <ellipse cx="50" cy="60" rx="22" ry="18"/>
        </g>
        <g fill="url(#obsidianEdgeLogo)">
            <path d="M34 50 Q33 30 37 20 Q39 14 43 14 Q47 14 47 22 Q47 34 45 50 Q40 49 34 50Z"/>
            <path d="M66 50 Q67 30 63 20 Q61 14 57 14 Q53 14 53 22 Q53 34 55 50 Q60 49 66 50Z"/>
            <ellipse cx="50" cy="60" rx="22" ry="18"/>
        </g>`
            : ''
        }
    </g>
    <text x="72" y="${showTagline ? 34 : 28}"
          font-family="Cormorant Garamond, Georgia, serif"
          font-size="34"
          font-weight="600"
          fill="${textColor}"
          letter-spacing="4">RABBIT HOLE</text>
    <text x="74" y="${showTagline ? 52 : 46}"
          font-family="Tenor Sans, Helvetica, Arial, sans-serif"
          font-size="11"
          font-weight="400"
          fill="${textColor}"
          letter-spacing="4">INC</text>
    ${
      showTagline
        ? `<text x="74" y="72"
          font-family="Tenor Sans, Helvetica, Arial, sans-serif"
          font-size="9"
          font-weight="400"
          fill="${taglineColor}"
          letter-spacing="2">${escapeHtml(taglineText)}</text>`
        : ''
    }
</svg>`;
}

// ─── WUNDERLAND SVG GENERATORS ────────────────────────────

function wlGetGradientDefs(id, forLight, colorVersion) {
  if (colorVersion === 'neon') {
    return `
        <linearGradient id="primaryGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0ea5e9"/>
            <stop offset="40%" stop-color="#38bdf8"/>
            <stop offset="70%" stop-color="#c9a227"/>
            <stop offset="100%" stop-color="#eab308"/>
        </linearGradient>
        <linearGradient id="blueGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="50%" stop-color="#0ea5e9"/>
            <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
        <linearGradient id="goldGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a16207"/>
            <stop offset="50%" stop-color="#c9a227"/>
            <stop offset="100%" stop-color="#eab308"/>
        </linearGradient>
        <linearGradient id="textGrad${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${forLight ? '#0369a1' : '#38bdf8'}"/>
            <stop offset="50%" stop-color="${forLight ? '#0ea5e9' : '#7dd3fc'}"/>
            <stop offset="100%" stop-color="${forLight ? '#a16207' : '#eab308'}"/>
        </linearGradient>
        <linearGradient id="mirrorSurface${id}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${forLight ? '#e0f2fe' : '#0c4a6e'}" stop-opacity="0.9"/>
            <stop offset="30%" stop-color="${forLight ? '#bae6fd' : '#075985'}" stop-opacity="0.7"/>
            <stop offset="50%" stop-color="${forLight ? '#7dd3fc' : '#0284c7'}" stop-opacity="0.5"/>
            <stop offset="70%" stop-color="${forLight ? '#bae6fd' : '#075985'}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${forLight ? '#e0f2fe' : '#0c4a6e'}" stop-opacity="0.15"/>
        </linearGradient>
        <linearGradient id="mirrorShimmer${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.2"/>
            <stop offset="30%" stop-color="#7dd3fc" stop-opacity="0.8"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="70%" stop-color="#eab308" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#c9a227" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="reflectionGrad${id}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6"/>
            <stop offset="40%" stop-color="#0ea5e9" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0.08"/>
        </linearGradient>
        <linearGradient id="frameGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${forLight ? '#1e3a5f' : '#0f172a'}"/>
            <stop offset="50%" stop-color="${forLight ? '#0f2942' : '#020617'}"/>
            <stop offset="100%" stop-color="${forLight ? '#1e3a5f' : '#0f172a'}"/>
        </linearGradient>
        <linearGradient id="frameHighlight${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6"/>
            <stop offset="50%" stop-color="#c9a227" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.6"/>
        </linearGradient>
        <filter id="frameShadow${id}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
        </filter>`;
  } else if (colorVersion === 'monochrome') {
    const color = forLight ? '#1e293b' : '#e2e8f0';
    const colorMid = forLight ? '#334155' : '#cbd5e1';
    const colorLight = forLight ? '#475569' : '#f1f5f9';
    return `
        <linearGradient id="primaryGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="${colorMid}"/>
        </linearGradient>
        <linearGradient id="blueGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
        <linearGradient id="goldGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colorMid}"/>
            <stop offset="100%" stop-color="${colorMid}"/>
        </linearGradient>
        <linearGradient id="textGrad${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
        <linearGradient id="mirrorSurface${id}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${colorLight}" stop-opacity="0.5"/>
            <stop offset="50%" stop-color="${colorMid}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${colorLight}" stop-opacity="0.1"/>
        </linearGradient>
        <linearGradient id="mirrorShimmer${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
            <stop offset="50%" stop-color="${colorLight}" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="reflectionGrad${id}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.08"/>
        </linearGradient>
        <linearGradient id="frameGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
        <linearGradient id="frameHighlight${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colorLight}" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="${colorLight}" stop-opacity="0.5"/>
        </linearGradient>
        <filter id="frameShadow${id}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
        </filter>`;
  } else {
    // gold
    return `
        <linearGradient id="primaryGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#92702a"/>
            <stop offset="50%" stop-color="#c9a227"/>
            <stop offset="100%" stop-color="#eab308"/>
        </linearGradient>
        <linearGradient id="blueGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#92702a"/>
            <stop offset="50%" stop-color="#c9a227"/>
            <stop offset="100%" stop-color="#eab308"/>
        </linearGradient>
        <linearGradient id="goldGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a16207"/>
            <stop offset="25%" stop-color="#c9a227"/>
            <stop offset="50%" stop-color="#fde047"/>
            <stop offset="75%" stop-color="#c9a227"/>
            <stop offset="100%" stop-color="#a16207"/>
        </linearGradient>
        <linearGradient id="textGrad${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${forLight ? '#92702a' : '#c9a227'}"/>
            <stop offset="50%" stop-color="${forLight ? '#a16207' : '#fde047'}"/>
            <stop offset="100%" stop-color="${forLight ? '#92702a' : '#c9a227'}"/>
        </linearGradient>
        <linearGradient id="mirrorSurface${id}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.6"/>
            <stop offset="50%" stop-color="#fde047" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#fef9c3" stop-opacity="0.1"/>
        </linearGradient>
        <linearGradient id="mirrorShimmer${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#c9a227" stop-opacity="0.2"/>
            <stop offset="50%" stop-color="#fef9c3" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#c9a227" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="reflectionGrad${id}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#c9a227" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="#92702a" stop-opacity="0.08"/>
        </linearGradient>
        <linearGradient id="frameGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#78350f"/>
            <stop offset="50%" stop-color="#451a03"/>
            <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
        <linearGradient id="frameHighlight${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fde047" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#eab308" stop-opacity="0.5"/>
        </linearGradient>
        <filter id="frameShadow${id}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
        </filter>`;
  }
}

function wlGenerateIconSVG({ colorVersion, size = 64, forLight = false }) {
  const id = `icon${size}${forLight ? 'L' : 'D'}`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
        ${wlGetGradientDefs(id, forLight, colorVersion)}
    </defs>
    <polygon points="50,2 84,18 98,50 84,82 50,98 16,82 2,50 16,18"
             fill="url(#frameGrad${id})"
             filter="url(#frameShadow${id})"/>
    <polygon points="50,2 84,18 98,50 84,82 50,98 16,82 2,50 16,18"
             fill="none"
             stroke="url(#frameHighlight${id})"
             stroke-width="1.5"/>
    <polygon points="50,10 76,22 88,50 76,78 50,90 24,78 12,50 24,22"
             fill="url(#mirrorSurface${id})"/>
    <polygon points="50,10 76,22 88,50 76,78 50,90 24,78 12,50 24,22"
             fill="none"
             stroke="url(#blueGrad${id})"
             stroke-width="2"/>
    <path d="M24,28 L34,50 L50,32 L66,50 L76,28"
          fill="none"
          stroke="url(#primaryGrad${id})"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"/>
    <line x1="16" y1="50" x2="84" y2="50"
          stroke="url(#mirrorShimmer${id})"
          stroke-width="2.5"/>
    <path d="M24,72 L34,50 L50,68 L66,50 L76,72"
          fill="none"
          stroke="url(#reflectionGrad${id})"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"/>
    <line x1="50" y1="2" x2="50" y2="10" stroke="url(#goldGrad${id})" stroke-width="2"/>
    <line x1="50" y1="90" x2="50" y2="98" stroke="url(#goldGrad${id})" stroke-width="2"/>
    <line x1="2" y1="50" x2="12" y2="50" stroke="url(#goldGrad${id})" stroke-width="2"/>
    <line x1="88" y1="50" x2="98" y2="50" stroke="url(#goldGrad${id})" stroke-width="2"/>
</svg>`;
}

function wlGeneratePrimaryLogoSVG({
  colorVersion,
  showTagline = true,
  taglineText = 'AUTONOMOUS AGENTS',
  forLight = false,
}) {
  const height = showTagline ? 100 : 80;
  const id = `logo${forLight ? 'L' : 'D'}`;

  return `<svg width="460" height="${height}" viewBox="0 0 460 ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        ${wlGetGradientDefs(id, forLight, colorVersion)}
    </defs>
    <g transform="translate(4, ${showTagline ? 8 : 4}) scale(0.72)">
        <polygon points="50,2 84,18 98,50 84,82 50,98 16,82 2,50 16,18"
                 fill="url(#frameGrad${id})"
                 filter="url(#frameShadow${id})"/>
        <polygon points="50,2 84,18 98,50 84,82 50,98 16,82 2,50 16,18"
                 fill="none"
                 stroke="url(#frameHighlight${id})"
                 stroke-width="1.5"/>
        <polygon points="50,10 76,22 88,50 76,78 50,90 24,78 12,50 24,22"
                 fill="url(#mirrorSurface${id})"/>
        <polygon points="50,10 76,22 88,50 76,78 50,90 24,78 12,50 24,22"
                 fill="none"
                 stroke="url(#blueGrad${id})"
                 stroke-width="2"/>
        <path d="M24,28 L34,50 L50,32 L66,50 L76,28"
              fill="none"
              stroke="url(#primaryGrad${id})"
              stroke-width="5"
              stroke-linecap="round"
              stroke-linejoin="round"/>
        <line x1="16" y1="50" x2="84" y2="50"
              stroke="url(#mirrorShimmer${id})"
              stroke-width="2.5"/>
        <path d="M24,72 L34,50 L50,68 L66,50 L76,72"
              fill="none"
              stroke="url(#reflectionGrad${id})"
              stroke-width="5"
              stroke-linecap="round"
              stroke-linejoin="round"/>
        <line x1="50" y1="2" x2="50" y2="10" stroke="url(#goldGrad${id})" stroke-width="2"/>
        <line x1="50" y1="90" x2="50" y2="98" stroke="url(#goldGrad${id})" stroke-width="2"/>
        <line x1="2" y1="50" x2="12" y2="50" stroke="url(#goldGrad${id})" stroke-width="2"/>
        <line x1="88" y1="50" x2="98" y2="50" stroke="url(#goldGrad${id})" stroke-width="2"/>
    </g>
    <text x="82" y="${showTagline ? 46 : 44}"
          font-family="Syne, -apple-system, sans-serif"
          font-size="38"
          font-weight="700"
          fill="url(#textGrad${id})"
          letter-spacing="5">WUNDERLAND</text>
    ${
      showTagline
        ? `<text x="84" y="68"
          font-family="Space Mono, monospace"
          font-size="10"
          font-weight="400"
          fill="${forLight ? 'rgba(14, 165, 233, 0.7)' : 'rgba(125, 211, 252, 0.6)'}"
          letter-spacing="3">${escapeHtml(taglineText)}</text>
    <g transform="translate(82, 78)">
        <rect x="0" y="0" width="130" height="16" rx="2" fill="${forLight ? 'rgba(199, 165, 66, 0.12)' : 'rgba(199, 165, 66, 0.15)'}"/>
        <rect x="0" y="0" width="130" height="16" rx="2" fill="none" stroke="${forLight ? 'rgba(199, 165, 66, 0.35)' : 'rgba(199, 165, 66, 0.3)'}" stroke-width="0.75"/>
        <text x="12" y="11"
              font-family="Space Mono, monospace"
              font-size="7"
              font-weight="400"
              fill="${forLight ? 'rgba(161, 98, 7, 0.9)' : 'rgba(234, 179, 8, 0.85)'}"
              letter-spacing="1.5">RABBIT HOLE INC</text>
    </g>`
        : ''
    }
</svg>`;
}

// ─── SVG-to-PNG CONVERSION ────────────────────────────────

async function svgToPng(svgString, outputPath, width, height, background) {
  let pipeline = sharp(Buffer.from(svgString), { density: 300 }).resize(
    width,
    height,
    { fit: 'contain' }
  );

  if (background) {
    pipeline = pipeline.flatten({ background });
  }

  await pipeline.png().toFile(outputPath);
}

// ─── EXPORT LOGIC ─────────────────────────────────────────

async function exportRabbitHole(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const colors = BRANDS.rabbithole.colorVersions;
  const [logoW, logoH] = BRANDS.rabbithole.logoDimensions;
  const bgs = BRANDS.rabbithole.backgrounds;
  let count = 0;

  for (const color of colors) {
    for (const mode of ['dark', 'light']) {
      const forDarkBg = mode === 'dark';
      const bg = mode === 'dark' ? bgs.dark : bgs.cream;

      // ── Logo SVG ──
      const logoSvg = rhGeneratePrimaryLogoSVG({ colorVersion: color, showTagline: true, taglineText: "FOUNDER'S CLUB", forDarkBg });
      const logoSvgFull = `<?xml version="1.0" encoding="UTF-8"?>\n${logoSvg}`;
      const logoBase = `rabbithole-logo-${color}-${mode}`;
      fs.writeFileSync(path.join(outputDir, `${logoBase}.svg`), logoSvgFull);
      count++;

      // ── Logo PNGs ──
      for (const scale of LOGO_SCALES) {
        await svgToPng(logoSvgFull, path.join(outputDir, `${logoBase}-transparent-${scale}x.png`), logoW * scale, logoH * scale);
        await svgToPng(logoSvgFull, path.join(outputDir, `${logoBase}-filled-${scale}x.png`), logoW * scale, logoH * scale, bg);
        count += 2;
      }

      // ── Icon SVG ──
      const iconSvg = rhGenerateIconSVG({ colorVersion: color, size: 100, forDarkBg });
      const iconSvgFull = `<?xml version="1.0" encoding="UTF-8"?>\n${iconSvg}`;
      const iconBase = `rabbithole-icon-${color}-${mode}`;
      fs.writeFileSync(path.join(outputDir, `${iconBase}.svg`), iconSvgFull);
      count++;

      // ── Icon PNGs ──
      for (const size of ICON_SIZES) {
        await svgToPng(iconSvgFull, path.join(outputDir, `${iconBase}-transparent-${size}.png`), size, size);
        await svgToPng(iconSvgFull, path.join(outputDir, `${iconBase}-filled-${size}.png`), size, size, bg);
        count += 2;
      }
    }
  }

  return count;
}

async function exportWunderland(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const colors = BRANDS.wunderland.colorVersions;
  const [logoW, logoH] = BRANDS.wunderland.logoDimensions;
  const bgs = BRANDS.wunderland.backgrounds;
  let count = 0;

  for (const color of colors) {
    for (const mode of ['dark', 'light']) {
      const forLight = mode === 'light';
      const bg = mode === 'dark' ? bgs.dark : bgs.light;

      // ── Logo SVG ──
      const logoSvg = wlGeneratePrimaryLogoSVG({ colorVersion: color, showTagline: true, taglineText: 'AUTONOMOUS AGENTS', forLight });
      const logoSvgFull = `<?xml version="1.0" encoding="UTF-8"?>\n${logoSvg}`;
      const logoBase = `wunderland-logo-${color}-${mode}`;
      fs.writeFileSync(path.join(outputDir, `${logoBase}.svg`), logoSvgFull);
      count++;

      // ── Logo PNGs ──
      for (const scale of LOGO_SCALES) {
        await svgToPng(logoSvgFull, path.join(outputDir, `${logoBase}-transparent-${scale}x.png`), logoW * scale, logoH * scale);
        await svgToPng(logoSvgFull, path.join(outputDir, `${logoBase}-filled-${scale}x.png`), logoW * scale, logoH * scale, bg);
        count += 2;
      }

      // ── Icon SVG ──
      const iconSvg = wlGenerateIconSVG({ colorVersion: color, size: 100, forLight });
      const iconSvgFull = `<?xml version="1.0" encoding="UTF-8"?>\n${iconSvg}`;
      const iconBase = `wunderland-icon-${color}-${mode}`;
      fs.writeFileSync(path.join(outputDir, `${iconBase}.svg`), iconSvgFull);
      count++;

      // ── Icon PNGs ──
      for (const size of ICON_SIZES) {
        await svgToPng(iconSvgFull, path.join(outputDir, `${iconBase}-transparent-${size}.png`), size, size);
        await svgToPng(iconSvgFull, path.join(outputDir, `${iconBase}-filled-${size}.png`), size, size, bg);
        count += 2;
      }
    }
  }

  return count;
}

// ─── MAIN ─────────────────────────────────────────────────

async function main() {
  console.log('Exporting brand assets...\n');
  console.log(
    'NOTE: PNGs use system fallback fonts. SVGs are the canonical format.\n'
  );

  const rhDir = BRANDS.rabbithole.outputDir;
  const wlDir = BRANDS.wunderland.outputDir;

  const rhCount = await exportRabbitHole(rhDir);
  console.log(`Rabbit Hole Inc: ${rhCount} files -> ${rhDir}`);

  const wlCount = await exportWunderland(wlDir);
  console.log(`Wunderland: ${wlCount} files -> ${wlDir}`);

  console.log(`\nTotal: ${rhCount + wlCount} files exported.`);

  // Open asset folders
  try {
    execSync(`open "${rhDir}"`);
    execSync(`open "${wlDir}"`);
  } catch {
    console.log('Could not open folders automatically.');
  }

  console.log('Done!');
}

main().catch(console.error);
