'use client';

/**
 * Art Deco ornamental section divider with animated center diamond.
 * Variants: diamond (Interlocking Lattice), filigree (Mirror Scroll), keyhole (Astrolabe Portal)
 */
export function DecoSectionDivider({
  variant = 'diamond',
  className = '',
}: {
  variant?: 'diamond' | 'filigree' | 'keyhole';
  className?: string;
}) {
  if (variant === 'filigree') {
    return (
      <div className={`deco-section-divider ${className}`} aria-hidden="true">
        <svg viewBox="0 0 400 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* ── Mirror Scroll ── */}

          {/* Center medallion — gear-like shape with 8 teeth */}
          <g transform="translate(200, 20)" className="deco-center-diamond">
            {/* Gear outer ring with 8 teeth */}
            <polygon
              points="0,-10 3,-9 4,-13 6,-9 10,-10 9,-7 13,-6 9,-4 10,0 7,-1 6,4 4,0 0,1 -3,0 -6,4 -7,-1 -10,0 -9,-4 -13,-6 -9,-7 -10,-10 -6,-9 -4,-13 -3,-9"
              fill="var(--deco-gold)"
              opacity="0.4"
              transform="translate(0, 0)"
            />
            <polygon
              points="0,-10 3,-9 4,-13 6,-9 10,-10 9,-7 13,-6 9,-4 10,0 7,-1 6,4 4,0 0,1 -3,0 -6,4 -7,-1 -10,0 -9,-4 -13,-6 -9,-7 -10,-10 -6,-9 -4,-13 -3,-9"
              stroke="var(--deco-gold)"
              strokeWidth="0.5"
              fill="none"
              opacity="0.6"
              transform="translate(0, 0)"
            />
            {/* Inner circle of medallion */}
            <circle cx="0" cy="-3" r="5" stroke="var(--deco-gold)" strokeWidth="1" fill="none" opacity="0.6" />
            <circle cx="0" cy="-3" r="2" fill="var(--deco-gold)" opacity="0.8" />
          </g>

          {/* ── LEFT SIDE (mirrored from right) ── */}

          {/* Main S-curve scroll — thick outer */}
          <path
            d="M170 20 C160 20 155 10 140 10 C130 10 125 20 120 20 C115 20 110 12 100 12"
            stroke="var(--deco-gold)"
            strokeWidth="1.2"
            opacity="0.4"
            fill="none"
          />
          {/* Main S-curve scroll — thin inner */}
          <path
            d="M170 20 C160 20 155 12 140 12 C131 12 127 20 120 20 C114 20 110 14 100 14"
            stroke="var(--deco-gold)"
            strokeWidth="0.5"
            opacity="0.2"
            fill="none"
          />
          {/* Leaf finial at first curve endpoint */}
          <path
            d="M100 12 C96 9 92 10 90 13 C92 14 96 15 100 12 Z"
            fill="var(--deco-gold)"
            opacity="0.4"
          />
          {/* Second scroll section */}
          <path
            d="M90 13 C82 13 78 20 70 20 C62 20 58 14 50 14"
            stroke="var(--deco-gold)"
            strokeWidth="1.2"
            opacity="0.4"
            fill="none"
          />
          <path
            d="M90 14 C82 14 78 20 70 20 C63 20 59 15 50 15"
            stroke="var(--deco-gold)"
            strokeWidth="0.5"
            opacity="0.2"
            fill="none"
          />
          {/* Leaf finial at end */}
          <path
            d="M50 14 C46 11 42 12 40 15 C42 16 46 17 50 14 Z"
            fill="var(--deco-gold)"
            opacity="0.4"
          />
          {/* Extending line to left edge */}
          <line x1="0" y1="20" x2="50" y2="20" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" />
          {/* Terminal dot */}
          <circle cx="2" cy="20" r="1" fill="var(--deco-gold)" opacity="0.25" />

          {/* Diamond chain — left (between scroll sections) */}
          <g opacity="0.4">
            {/* Connecting thin line */}
            <line x1="92" y1="20" x2="108" y2="20" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
            {/* 3 tiny diamonds */}
            <rect x="93" y="18.5" width="3" height="3" transform="rotate(45, 94.5, 20)" fill="var(--deco-gold)" opacity="0.6" />
            <rect x="98" y="18.5" width="3" height="3" transform="rotate(45, 99.5, 20)" fill="var(--deco-gold)" opacity="0.4" />
            <rect x="103" y="18.5" width="3" height="3" transform="rotate(45, 104.5, 20)" fill="var(--deco-gold)" opacity="0.6" />
          </g>

          {/* ── RIGHT SIDE (mirror of left) ── */}

          {/* Main S-curve scroll — thick outer */}
          <path
            d="M230 20 C240 20 245 10 260 10 C270 10 275 20 280 20 C285 20 290 12 300 12"
            stroke="var(--deco-gold)"
            strokeWidth="1.2"
            opacity="0.4"
            fill="none"
          />
          {/* Main S-curve scroll — thin inner */}
          <path
            d="M230 20 C240 20 245 12 260 12 C269 12 273 20 280 20 C286 20 290 14 300 14"
            stroke="var(--deco-gold)"
            strokeWidth="0.5"
            opacity="0.2"
            fill="none"
          />
          {/* Leaf finial at first curve endpoint */}
          <path
            d="M300 12 C304 9 308 10 310 13 C308 14 304 15 300 12 Z"
            fill="var(--deco-gold)"
            opacity="0.4"
          />
          {/* Second scroll section */}
          <path
            d="M310 13 C318 13 322 20 330 20 C338 20 342 14 350 14"
            stroke="var(--deco-gold)"
            strokeWidth="1.2"
            opacity="0.4"
            fill="none"
          />
          <path
            d="M310 14 C318 14 322 20 330 20 C337 20 341 15 350 15"
            stroke="var(--deco-gold)"
            strokeWidth="0.5"
            opacity="0.2"
            fill="none"
          />
          {/* Leaf finial at end */}
          <path
            d="M350 14 C354 11 358 12 360 15 C358 16 354 17 350 14 Z"
            fill="var(--deco-gold)"
            opacity="0.4"
          />
          {/* Extending line to right edge */}
          <line x1="350" y1="20" x2="400" y2="20" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" />
          {/* Terminal dot */}
          <circle cx="398" cy="20" r="1" fill="var(--deco-gold)" opacity="0.25" />

          {/* Diamond chain — right */}
          <g opacity="0.4">
            <line x1="292" y1="20" x2="308" y2="20" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
            <rect x="293" y="18.5" width="3" height="3" transform="rotate(45, 294.5, 20)" fill="var(--deco-gold)" opacity="0.6" />
            <rect x="298" y="18.5" width="3" height="3" transform="rotate(45, 299.5, 20)" fill="var(--deco-gold)" opacity="0.4" />
            <rect x="303" y="18.5" width="3" height="3" transform="rotate(45, 304.5, 20)" fill="var(--deco-gold)" opacity="0.6" />
          </g>
        </svg>
      </div>
    );
  }

  if (variant === 'keyhole') {
    return (
      <div className={`deco-section-divider ${className}`} aria-hidden="true">
        <svg viewBox="0 0 400 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* ── Astrolabe Portal ── */}

          {/* Center double-ring */}
          <g transform="translate(200, 22)" className="deco-center-diamond">
            {/* Outer ring */}
            <circle cx="0" cy="0" r="12" stroke="var(--deco-gold)" strokeWidth="1.2" fill="none" opacity="0.4" />
            {/* Inner ring */}
            <circle cx="0" cy="0" r="8" stroke="var(--deco-gold)" strokeWidth="0.8" fill="none" opacity="0.6" />

            {/* 4 triangular markers at N/S/E/W on outer ring */}
            {/* North */}
            <polygon points="0,-14 -2,-11 2,-11" fill="var(--deco-gold)" opacity="0.6" />
            {/* South */}
            <polygon points="0,14 -2,11 2,11" fill="var(--deco-gold)" opacity="0.6" />
            {/* East */}
            <polygon points="14,0 11,-2 11,2" fill="var(--deco-gold)" opacity="0.6" />
            {/* West */}
            <polygon points="-14,0 -11,-2 -11,2" fill="var(--deco-gold)" opacity="0.6" />

            {/* Crosshair lines extending slightly beyond rings */}
            {/* Horizontal crosshair */}
            <line x1="-16" y1="0" x2="16" y2="0" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
            {/* Vertical crosshair / thin decorative vertical through rings */}
            <line x1="0" y1="-16" x2="0" y2="16" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />

            {/* Center ornate dot */}
            <circle cx="0" cy="0" r="2.5" fill="var(--deco-gold)" opacity="0.8" />
            <circle cx="0" cy="0" r="1" fill="var(--deco-gold)" opacity="0.15" />
          </g>

          {/* ── Dashed orbital arcs — left side ── */}
          <path
            d="M178 12 A18 18 0 0 1 178 32"
            stroke="var(--deco-gold)"
            strokeWidth="0.8"
            strokeDasharray="3 2"
            fill="none"
            opacity="0.25"
          />
          <path
            d="M174 10 A22 22 0 0 1 174 34"
            stroke="var(--deco-gold)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            fill="none"
            opacity="0.15"
          />

          {/* ── Dashed orbital arcs — right side ── */}
          <path
            d="M222 12 A18 18 0 0 0 222 32"
            stroke="var(--deco-gold)"
            strokeWidth="0.8"
            strokeDasharray="3 2"
            fill="none"
            opacity="0.25"
          />
          <path
            d="M226 10 A22 22 0 0 0 226 34"
            stroke="var(--deco-gold)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            fill="none"
            opacity="0.15"
          />

          {/* ── Left connecting line with perpendicular ticks ── */}
          {/* Outer line */}
          <line x1="0" y1="22" x2="165" y2="22" stroke="var(--deco-gold)" strokeWidth="1" opacity="0.3" />
          {/* Inner parallel line */}
          <line x1="20" y1="22" x2="160" y2="22" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" />
          {/* Perpendicular ticks along left line */}
          <line x1="40" y1="19" x2="40" y2="25" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
          <line x1="70" y1="19" x2="70" y2="25" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
          <line x1="100" y1="18" x2="100" y2="26" stroke="var(--deco-gold)" strokeWidth="0.7" opacity="0.3" />
          <line x1="130" y1="19" x2="130" y2="25" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
          <line x1="155" y1="19" x2="155" y2="25" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
          {/* Terminal dot */}
          <circle cx="2" cy="22" r="1.2" fill="var(--deco-gold)" opacity="0.4" />

          {/* ── Right connecting line with perpendicular ticks ── */}
          <line x1="235" y1="22" x2="400" y2="22" stroke="var(--deco-gold)" strokeWidth="1" opacity="0.3" />
          <line x1="240" y1="22" x2="380" y2="22" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" />
          {/* Perpendicular ticks along right line */}
          <line x1="245" y1="19" x2="245" y2="25" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
          <line x1="270" y1="19" x2="270" y2="25" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
          <line x1="300" y1="18" x2="300" y2="26" stroke="var(--deco-gold)" strokeWidth="0.7" opacity="0.3" />
          <line x1="330" y1="19" x2="330" y2="25" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
          <line x1="360" y1="19" x2="360" y2="25" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.25" />
          {/* Terminal dot */}
          <circle cx="398" cy="22" r="1.2" fill="var(--deco-gold)" opacity="0.4" />

          {/* Subtle secondary horizontal lines for depth */}
          <line x1="50" y1="20" x2="160" y2="20" stroke="var(--deco-gold)" strokeWidth="0.3" opacity="0.1" />
          <line x1="240" y1="20" x2="350" y2="20" stroke="var(--deco-gold)" strokeWidth="0.3" opacity="0.1" />
          <line x1="50" y1="24" x2="160" y2="24" stroke="var(--deco-gold)" strokeWidth="0.3" opacity="0.1" />
          <line x1="240" y1="24" x2="350" y2="24" stroke="var(--deco-gold)" strokeWidth="0.3" opacity="0.1" />
        </svg>
      </div>
    );
  }

  // Default: diamond → Interlocking Lattice
  return (
    <div className={`deco-section-divider ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* ── Interlocking Lattice ── */}

        {/* Center concentric diamonds */}
        <g className="deco-center-diamond">
          {/* Outer diamond (size ~20) */}
          <rect
            x="190"
            y="5"
            width="20"
            height="20"
            rx="0.5"
            transform="rotate(45, 200, 15)"
            stroke="var(--deco-gold)"
            strokeWidth="1"
            fill="var(--deco-gold)"
            fillOpacity="0.15"
            opacity="0.4"
          />
          {/* Middle diamond (size ~14) */}
          <rect
            x="193"
            y="8"
            width="14"
            height="14"
            rx="0.5"
            transform="rotate(45, 200, 15)"
            stroke="var(--deco-gold)"
            strokeWidth="0.8"
            fill="var(--deco-gold)"
            fillOpacity="0.15"
            opacity="0.6"
          />
          {/* Inner diamond (size ~8) */}
          <rect
            x="196"
            y="11"
            width="8"
            height="8"
            rx="0.3"
            transform="rotate(45, 200, 15)"
            fill="var(--deco-gold)"
            opacity="0.8"
          />

          {/* Cardinal point circles (N/S/E/W of outer diamond) */}
          {/* North */}
          <circle cx="200" cy="1" r="2" fill="var(--deco-gold)" opacity="0.4" />
          {/* South */}
          <circle cx="200" cy="29" r="2" fill="var(--deco-gold)" opacity="0.4" />
          {/* East */}
          <circle cx="214" cy="15" r="2" fill="var(--deco-gold)" opacity="0.4" />
          {/* West */}
          <circle cx="186" cy="15" r="2" fill="var(--deco-gold)" opacity="0.4" />
        </g>

        {/* ── Left connecting lines ── */}
        {/* Outer line — thicker at lower opacity */}
        <line x1="0" y1="15" x2="184" y2="15" stroke="var(--deco-gold)" strokeWidth="1" opacity="0.3" />
        {/* Inner parallel line — thinner, more transparent */}
        <line x1="20" y1="15" x2="184" y2="15" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" />
        {/* Terminal dot at left edge */}
        <circle cx="2" cy="15" r="1" fill="var(--deco-gold)" opacity="0.25" />

        {/* Left ornamental diamonds at ~25% and ~75% marks of the line */}
        {/* 25% mark (~46) */}
        <rect
          x="44"
          y="13"
          width="4"
          height="4"
          transform="rotate(45, 46, 15)"
          fill="var(--deco-gold)"
          opacity="0.4"
        />
        {/* Decorative dots flanking 25% diamond */}
        <circle cx="38" cy="15" r="0.8" fill="var(--deco-gold)" opacity="0.25" />
        <circle cx="54" cy="15" r="0.8" fill="var(--deco-gold)" opacity="0.25" />

        {/* 75% mark (~138) */}
        <rect
          x="136"
          y="13"
          width="4"
          height="4"
          transform="rotate(45, 138, 15)"
          fill="var(--deco-gold)"
          opacity="0.4"
        />
        {/* Decorative dots flanking 75% diamond */}
        <circle cx="130" cy="15" r="0.8" fill="var(--deco-gold)" opacity="0.25" />
        <circle cx="146" cy="15" r="0.8" fill="var(--deco-gold)" opacity="0.25" />

        {/* 50% mark accent (~92) */}
        <rect
          x="90"
          y="13"
          width="4"
          height="4"
          transform="rotate(45, 92, 15)"
          stroke="var(--deco-gold)"
          strokeWidth="0.5"
          fill="none"
          opacity="0.25"
        />

        {/* ── Right connecting lines ── */}
        <line x1="216" y1="15" x2="400" y2="15" stroke="var(--deco-gold)" strokeWidth="1" opacity="0.3" />
        <line x1="216" y1="15" x2="380" y2="15" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" />
        {/* Terminal dot at right edge */}
        <circle cx="398" cy="15" r="1" fill="var(--deco-gold)" opacity="0.25" />

        {/* Right ornamental diamonds at ~25% and ~75% marks */}
        {/* 25% mark (~262) */}
        <rect
          x="260"
          y="13"
          width="4"
          height="4"
          transform="rotate(45, 262, 15)"
          fill="var(--deco-gold)"
          opacity="0.4"
        />
        <circle cx="254" cy="15" r="0.8" fill="var(--deco-gold)" opacity="0.25" />
        <circle cx="270" cy="15" r="0.8" fill="var(--deco-gold)" opacity="0.25" />

        {/* 75% mark (~354) */}
        <rect
          x="352"
          y="13"
          width="4"
          height="4"
          transform="rotate(45, 354, 15)"
          fill="var(--deco-gold)"
          opacity="0.4"
        />
        <circle cx="346" cy="15" r="0.8" fill="var(--deco-gold)" opacity="0.25" />
        <circle cx="362" cy="15" r="0.8" fill="var(--deco-gold)" opacity="0.25" />

        {/* 50% mark accent (~308) */}
        <rect
          x="306"
          y="13"
          width="4"
          height="4"
          transform="rotate(45, 308, 15)"
          stroke="var(--deco-gold)"
          strokeWidth="0.5"
          fill="none"
          opacity="0.25"
        />

        {/* Subtle double-line depth accents */}
        <line x1="40" y1="13" x2="184" y2="13" stroke="var(--deco-gold)" strokeWidth="0.3" opacity="0.1" />
        <line x1="40" y1="17" x2="184" y2="17" stroke="var(--deco-gold)" strokeWidth="0.3" opacity="0.1" />
        <line x1="216" y1="13" x2="360" y2="13" stroke="var(--deco-gold)" strokeWidth="0.3" opacity="0.1" />
        <line x1="216" y1="17" x2="360" y2="17" stroke="var(--deco-gold)" strokeWidth="0.3" opacity="0.1" />
      </svg>
    </div>
  );
}
