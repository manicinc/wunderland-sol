'use client';

/**
 * Art Deco ornamental section divider with animated center diamond.
 * Variants: diamond (default), filigree, keyhole
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
        <svg viewBox="0 0 400 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Left filigree */}
          <path
            d="M0 16 H130 Q140 16 142 12 L148 4 Q150 0 152 4 L158 12 Q160 16 170 16"
            stroke="var(--deco-gold)"
            strokeWidth="1"
            opacity="0.4"
          />
          <path
            d="M20 16 H135 Q142 16 144 13 L148 6 Q150 2 152 6 L156 13 Q158 16 165 16"
            stroke="var(--deco-gold)"
            strokeWidth="0.5"
            opacity="0.25"
          />
          {/* Center ornament — fleur-de-lis inspired */}
          <g transform="translate(200, 16)" className="deco-center-diamond">
            <path
              d="M0 -12 C4 -12 6 -8 6 -4 C6 0 4 2 0 4 C-4 2 -6 0 -6 -4 C-6 -8 -4 -12 0 -12 Z"
              fill="var(--deco-gold)"
              opacity="0.6"
            />
            <path
              d="M0 4 C4 4 6 8 6 12 C6 16 4 18 0 20 C-4 18 -6 16 -6 12 C-6 8 -4 4 0 4 Z"
              fill="var(--deco-gold)"
              opacity="0.4"
            />
            <circle cx="0" cy="4" r="2" fill="var(--deco-gold)" opacity="0.8" />
            {/* Tiny side flourishes */}
            <path d="M-8 0 Q-12 -2 -14 0 Q-12 2 -8 0" fill="var(--deco-gold)" opacity="0.3" />
            <path d="M8 0 Q12 -2 14 0 Q12 2 8 0" fill="var(--deco-gold)" opacity="0.3" />
          </g>
          {/* Right filigree */}
          <path
            d="M400 16 H270 Q260 16 258 12 L252 4 Q250 0 248 4 L242 12 Q240 16 230 16"
            stroke="var(--deco-gold)"
            strokeWidth="1"
            opacity="0.4"
          />
          <path
            d="M380 16 H265 Q258 16 256 13 L252 6 Q250 2 248 6 L244 13 Q242 16 235 16"
            stroke="var(--deco-gold)"
            strokeWidth="0.5"
            opacity="0.25"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'keyhole') {
    return (
      <div className={`deco-section-divider ${className}`} aria-hidden="true">
        <svg viewBox="0 0 400 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Left line */}
          <line x1="0" y1="20" x2="165" y2="20" stroke="var(--deco-gold)" strokeWidth="1" opacity="0.3" />
          <line x1="30" y1="20" x2="170" y2="20" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" strokeDasharray="2 4" />
          {/* Center keyhole */}
          <g transform="translate(200, 20)" className="deco-center-diamond">
            <circle cx="0" cy="-6" r="8" stroke="var(--deco-gold)" strokeWidth="1.5" fill="none" opacity="0.5" />
            <rect x="-3" y="0" width="6" height="12" rx="1" stroke="var(--deco-gold)" strokeWidth="1" fill="none" opacity="0.4" />
            <circle cx="0" cy="-6" r="2.5" fill="var(--deco-gold)" opacity="0.6" />
          </g>
          {/* Right line */}
          <line x1="235" y1="20" x2="400" y2="20" stroke="var(--deco-gold)" strokeWidth="1" opacity="0.3" />
          <line x1="230" y1="20" x2="370" y2="20" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" strokeDasharray="2 4" />
        </svg>
      </div>
    );
  }

  // Default: diamond
  return (
    <div className={`deco-section-divider ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left line with ornamental ends */}
        <line x1="0" y1="12" x2="172" y2="12" stroke="var(--deco-gold)" strokeWidth="1" opacity="0.3" />
        <line x1="40" y1="12" x2="175" y2="12" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" />
        {/* Left diamond */}
        <rect x="166" y="9" width="6" height="6" rx="0.5" transform="rotate(45, 169, 12)" fill="var(--deco-gold)" opacity="0.25" />
        {/* Center diamond */}
        <g className="deco-center-diamond">
          <rect x="192" y="4" width="16" height="16" rx="1" transform="rotate(45, 200, 12)" fill="var(--deco-gold)" opacity="0.5" />
          <rect x="196" y="8" width="8" height="8" rx="0.5" transform="rotate(45, 200, 12)" fill="var(--deco-gold)" opacity="0.8" />
        </g>
        {/* Right diamond */}
        <rect x="228" y="9" width="6" height="6" rx="0.5" transform="rotate(45, 231, 12)" fill="var(--deco-gold)" opacity="0.25" />
        {/* Right line */}
        <line x1="228" y1="12" x2="400" y2="12" stroke="var(--deco-gold)" strokeWidth="1" opacity="0.3" />
        <line x1="225" y1="12" x2="360" y2="12" stroke="var(--deco-gold)" strokeWidth="0.5" opacity="0.15" />
      </svg>
    </div>
  );
}
