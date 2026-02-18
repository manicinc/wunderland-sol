'use client';

import { useMemo, useState, useEffect } from 'react';

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

const COLORS = [
  'rgba(0, 245, 255, 0.25)',   // cyan
  'rgba(139, 92, 246, 0.2)',   // violet
  'rgba(255, 0, 245, 0.15)',   // magenta
  'rgba(16, 255, 176, 0.2)',   // emerald
  'rgba(255, 215, 0, 0.15)',   // gold
];

export default function FloatingParticles({ count = 24, className = '' }: FloatingParticlesProps) {
  // Reduce particles on mobile to avoid GPU/CPU saturation during scroll
  const [effectiveCount, setEffectiveCount] = useState(count);
  useEffect(() => {
    const isMobile = window.innerWidth < 768 || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEffectiveCount(isMobile ? Math.min(count, 8) : count);
  }, [count]);

  const particles = useMemo(() => {
    return Array.from({ length: effectiveCount }, (_, i) => {
      const size = 2 + (i % 5);
      const left = ((i * 37 + 13) % 100);
      const delay = (i * 1.7) % 12;
      const duration = 14 + (i % 8) * 2;
      const drift = ((i % 3) - 1) * 30;
      const color = COLORS[i % COLORS.length];
      const opacity = 0.1 + (i % 4) * 0.08;

      return { size, left, delay, duration, drift, color, opacity };
    });
  }, [effectiveCount]);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            opacity: p.opacity,
            left: `${p.left}%`,
            bottom: '-5%',
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            willChange: 'transform, opacity',
            animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatParticle {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-110vh) translateX(var(--drift, 0px));
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes floatParticle {
            0%, 100% { transform: none; opacity: 0.3; }
          }
        }
      `}</style>
    </div>
  );
}
