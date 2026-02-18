'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface LookingGlassCTAProps {
  className?: string;
}

export default function LookingGlassCTA({ className = '' }: LookingGlassCTAProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const containerRef = useRef<HTMLAnchorElement>(null);
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsClicked(true);

    // Add ripple effect
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
    }

    // Navigate after animation
    setTimeout(() => {
      router.push('/app/docs');
    }, 800);
  };

  return (
    <a
      ref={containerRef}
      href="/app/docs"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`looking-glass-cta ${isHovered ? 'looking-glass-cta--hovered' : ''} ${isClicked ? 'looking-glass-cta--clicked' : ''} ${className}`}
    >
      {/* Mirror frame */}
      <div className="looking-glass-cta__frame">
        {/* Ornate border decorations */}
        <div className="looking-glass-cta__corner looking-glass-cta__corner--tl" />
        <div className="looking-glass-cta__corner looking-glass-cta__corner--tr" />
        <div className="looking-glass-cta__corner looking-glass-cta__corner--bl" />
        <div className="looking-glass-cta__corner looking-glass-cta__corner--br" />

        {/* Mirror surface */}
        <div className="looking-glass-cta__mirror">
          {/* Reflection/distortion layer */}
          <div className="looking-glass-cta__reflection" />

          {/* Portal swirl effect */}
          <svg className="looking-glass-cta__swirl" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="portalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.8">
                  <animate
                    attributeName="stop-color"
                    values="#00f5ff;#8b5cf6;#ff00f5;#00f5ff"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6">
                  <animate
                    attributeName="stop-color"
                    values="#8b5cf6;#ff00f5;#00f5ff;#8b5cf6"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>
              <filter id="portalBlur">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>

            {/* Spiral rings */}
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse
                key={i}
                cx="100"
                cy="100"
                rx={80 - i * 15}
                ry={30 - i * 5}
                fill="none"
                stroke="url(#portalGradient)"
                strokeWidth={1.5 - i * 0.2}
                opacity={0.4 + i * 0.1}
                filter="url(#portalBlur)"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 100 100`}
                  to={`${i % 2 === 0 ? 360 : -360} 100 100`}
                  dur={`${4 - i * 0.5}s`}
                  repeatCount="indefinite"
                />
              </ellipse>
            ))}

            {/* Central void */}
            <ellipse cx="100" cy="100" rx="20" ry="8" fill="#000" opacity="0.8" />
          </svg>

          {/* Floating particles */}
          <div className="looking-glass-cta__particles">
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className="looking-glass-cta__particle"
                style={
                  {
                    '--delay': `${i * 0.2}s`,
                    '--angle': `${(i / 12) * 360}deg`,
                    '--distance': `${30 + (i % 3) * 15}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>

        {/* Click ripples */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="looking-glass-cta__ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
            onAnimationEnd={() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id))}
          />
        ))}
      </div>

      {/* Text content */}
      <div className="looking-glass-cta__content">
        <span className="looking-glass-cta__label">Enter</span>
        <span className="looking-glass-cta__title">Wunderland</span>
        <span className="looking-glass-cta__subtitle">Deploy Autonomous Agents</span>
      </div>

      {/* Arrow indicator */}
      <div className="looking-glass-cta__arrow">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
}
