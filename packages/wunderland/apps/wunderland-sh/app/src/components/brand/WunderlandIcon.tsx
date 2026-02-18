'use client';

interface WunderlandIconProps {
  size?: number;
  className?: string;
  id?: string;
  variant?: 'neon' | 'gold' | 'monochrome';
  forLight?: boolean;
}

export function WunderlandIcon({
  size = 64,
  className = '',
  id = 'wl-icon',
  variant = 'neon',
  forLight = false,
}: WunderlandIconProps) {
  const getGradients = () => {
    if (variant === 'neon') {
      return (
        <>
          {/* Electric blue to gold gradient */}
          <linearGradient id={`primaryGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="70%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>

          {/* Electric blue solid */}
          <linearGradient id={`blueGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Gold accent */}
          <linearGradient id={`goldGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a16207" />
            <stop offset="50%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>

          {/* Mirror surface */}
          <linearGradient id={`mirrorSurface${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={forLight ? '#e0f2fe' : '#0c4a6e'} stopOpacity="0.9" />
            <stop offset="30%" stopColor={forLight ? '#bae6fd' : '#075985'} stopOpacity="0.7" />
            <stop offset="50%" stopColor={forLight ? '#7dd3fc' : '#0284c7'} stopOpacity="0.5" />
            <stop offset="70%" stopColor={forLight ? '#bae6fd' : '#075985'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={forLight ? '#e0f2fe' : '#0c4a6e'} stopOpacity="0.15" />
          </linearGradient>

          {/* Mirror shimmer line */}
          <linearGradient id={`mirrorShimmer${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
            <stop offset="30%" stopColor="#7dd3fc" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="70%" stopColor="#eab308" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0.2" />
          </linearGradient>

          {/* Reflection fade */}
          <linearGradient id={`reflectionGrad${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#0ea5e9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.08" />
          </linearGradient>

          {/* Dark frame gradient */}
          <linearGradient id={`frameGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={forLight ? '#1e3a5f' : '#0f172a'} />
            <stop offset="50%" stopColor={forLight ? '#0f2942' : '#020617'} />
            <stop offset="100%" stopColor={forLight ? '#1e3a5f' : '#0f172a'} />
          </linearGradient>

          {/* Frame highlight */}
          <linearGradient id={`frameHighlight${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#c9a227" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.6" />
          </linearGradient>

          <filter id={`frameShadow${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </>
      );
    } else if (variant === 'gold') {
      return (
        <>
          <linearGradient id={`primaryGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#92702a" />
            <stop offset="50%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id={`blueGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#92702a" />
            <stop offset="50%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id={`goldGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a16207" />
            <stop offset="25%" stopColor="#c9a227" />
            <stop offset="50%" stopColor="#fde047" />
            <stop offset="75%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
          <linearGradient id={`mirrorSurface${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#fde047" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#fef9c3" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id={`mirrorShimmer${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c9a227" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#fef9c3" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id={`reflectionGrad${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c9a227" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#92702a" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id={`frameGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id={`frameHighlight${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0.5" />
          </linearGradient>
          <filter id={`frameShadow${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </>
      );
    } else {
      // Monochrome
      const color = forLight ? '#1e293b' : '#e2e8f0';
      const colorMid = forLight ? '#334155' : '#cbd5e1';
      const colorLight = forLight ? '#475569' : '#f1f5f9';
      return (
        <>
          <linearGradient id={`primaryGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={colorMid} />
          </linearGradient>
          <linearGradient id={`blueGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <linearGradient id={`goldGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorMid} />
            <stop offset="100%" stopColor={colorMid} />
          </linearGradient>
          <linearGradient id={`mirrorSurface${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colorLight} stopOpacity="0.5" />
            <stop offset="50%" stopColor={colorMid} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colorLight} stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id={`mirrorShimmer${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="50%" stopColor={colorLight} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id={`reflectionGrad${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id={`frameGrad${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <linearGradient id={`frameHighlight${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorLight} stopOpacity="0.5" />
            <stop offset="100%" stopColor={colorLight} stopOpacity="0.5" />
          </linearGradient>
          <filter id={`frameShadow${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </>
      );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>{getGradients()}</defs>

      {/* Outer frame with shadow */}
      <polygon
        points="50,2 84,18 98,50 84,82 50,98 16,82 2,50 16,18"
        fill={`url(#frameGrad${id})`}
        filter={`url(#frameShadow${id})`}
      />

      {/* Outer frame edge highlight */}
      <polygon
        points="50,2 84,18 98,50 84,82 50,98 16,82 2,50 16,18"
        fill="none"
        stroke={`url(#frameHighlight${id})`}
        strokeWidth="1.5"
      />

      {/* Inner mirror surface */}
      <polygon
        points="50,10 76,22 88,50 76,78 50,90 24,78 12,50 24,22"
        fill={`url(#mirrorSurface${id})`}
      />

      {/* Inner frame border */}
      <polygon
        points="50,10 76,22 88,50 76,78 50,90 24,78 12,50 24,22"
        fill="none"
        stroke={`url(#blueGrad${id})`}
        strokeWidth="2"
      />

      {/* The W - main, bold */}
      <path
        d="M24,28 L34,50 L50,32 L66,50 L76,28"
        fill="none"
        stroke={`url(#primaryGrad${id})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Mirror surface line - the glass edge */}
      <line
        x1="16"
        y1="50"
        x2="84"
        y2="50"
        stroke={`url(#mirrorShimmer${id})`}
        strokeWidth="2.5"
      />

      {/* Reflected W - perfect mirror, fading */}
      <path
        d="M24,72 L34,50 L50,68 L66,50 L76,72"
        fill="none"
        stroke={`url(#reflectionGrad${id})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Corner accents - art deco gold */}
      <line x1="50" y1="2" x2="50" y2="10" stroke={`url(#goldGrad${id})`} strokeWidth="2" />
      <line x1="50" y1="90" x2="50" y2="98" stroke={`url(#goldGrad${id})`} strokeWidth="2" />
      <line x1="2" y1="50" x2="12" y2="50" stroke={`url(#goldGrad${id})`} strokeWidth="2" />
      <line x1="88" y1="50" x2="98" y2="50" stroke={`url(#goldGrad${id})`} strokeWidth="2" />
    </svg>
  );
}
