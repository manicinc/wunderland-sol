'use client';

import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { useTheme } from 'next-themes';

interface NeuralConstellationProps {
  size?: number;
  className?: string;
}

/**
 * NeuralConstellation - High-performance radiant neural network
 * Uses CSS for ambient glow, canvas only for dynamic elements
 */
export const NeuralConstellation = memo(function NeuralConstellation({ 
  size = 500, 
  className = '' 
}: NeuralConstellationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);
  const isVisibleRef = useRef(true);
  const prefersReducedMotionRef = useRef(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === 'dark';

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = mediaQuery.matches;
    
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // IntersectionObserver to pause animation when not visible
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0, rootMargin: '50px' }
    );
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [mounted]);

  const palette = useMemo(() => ({
    core: isDark ? [196, 181, 253] : [167, 139, 250],
    inner: isDark ? [165, 180, 252] : [129, 140, 248],
    outer: isDark ? [103, 232, 249] : [34, 211, 238],
    accent: isDark ? [249, 168, 212] : [244, 114, 182],
    pulse: isDark ? [233, 213, 255] : [196, 181, 253],
  }), [isDark]);

  const nodes = useMemo(() => {
    const cx = size / 2, cy = size / 2, arr = [];
    arr.push({ x: cx, y: cy, r: 14, c: palette.core, l: 0 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      arr.push({ x: cx + Math.cos(a) * size * 0.2, y: cy + Math.sin(a) * size * 0.2, r: 8, c: palette.inner, l: 1 });
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      arr.push({ x: cx + Math.cos(a) * size * 0.38, y: cy + Math.sin(a) * size * 0.38, r: 5, c: i % 3 === 0 ? palette.accent : palette.outer, l: 2 });
    }
    return arr;
  }, [size, palette]);

  const conns = useMemo(() => {
    const c = [];
    for (let i = 1; i <= 6; i++) c.push([0, i]);
    for (let i = 1; i <= 6; i++) c.push([i, i === 6 ? 1 : i + 1]);
    for (let i = 1; i <= 6; i++) { c.push([i, 7 + (i - 1) * 2]); c.push([i, 7 + ((i - 1) * 2 + 1) % 12]); }
    return c;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const t = tRef.current;
    ctx.clearRect(0, 0, size, size);

    // Connections
    conns.forEach(([f, to], i) => {
      const n1 = nodes[f], n2 = nodes[to];
      const p = (Math.sin(t * 0.003 + i * 0.5) + 1) / 2;
      const a = 0.12 + p * 0.18;
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.strokeStyle = `rgba(${n1.c.join(',')},${a})`;
      ctx.lineWidth = 1.2 + p * 0.8;
      ctx.stroke();
    });

    // Pulses
    conns.forEach(([f, to], i) => {
      const n1 = nodes[f], n2 = nodes[to];
      const prog = ((t * 0.0008 + i * 0.25) % 1.5) / 1.5;
      if (prog < 1) {
        const px = n1.x + (n2.x - n1.x) * prog;
        const py = n1.y + (n2.y - n1.y) * prog;
        const pa = Math.sin(prog * Math.PI) * 0.7;
        const gr = ctx.createRadialGradient(px, py, 0, px, py, 5);
        gr.addColorStop(0, `rgba(${palette.pulse.join(',')},${pa})`);
        gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr;
        ctx.fillRect(px - 5, py - 5, 10, 10);
      }
    });

    // Nodes
    nodes.forEach((n, i) => {
      const pulse = 1 + Math.sin(t * 0.004 + i * 0.7) * 0.12;
      const r = n.r * pulse;
      
      // Glow
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.5);
      glow.addColorStop(0, `rgba(${n.c.join(',')},0.45)`);
      glow.addColorStop(0.35, `rgba(${n.c.join(',')},0.15)`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(n.x - r * 3.5, n.y - r * 3.5, r * 7, r * 7);
      
      // Core
      const core = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
      core.addColorStop(0, 'rgba(255,255,255,0.9)');
      core.addColorStop(0.35, `rgba(${n.c.join(',')},1)`);
      core.addColorStop(1, `rgba(${n.c.join(',')},0.6)`);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
    });

    tRef.current += 16;
  }, [size, nodes, conns, palette]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Skip animation entirely if user prefers reduced motion
    if (prefersReducedMotionRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const loop = () => {
      // Skip frame if not visible (performance optimization)
      if (isVisibleRef.current) {
        draw(ctx);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [mounted, size, draw]);

  // Ambient glow via CSS (GPU accelerated)
  const glowStyle = {
    position: 'absolute' as const,
    inset: '-25%',
    borderRadius: '50%',
    background: isDark
      ? 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(6,182,212,0.2) 35%, transparent 65%)'
      : 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, rgba(6,182,212,0.12) 35%, transparent 65%)',
    filter: 'blur(40px)',
    animation: 'pulse-glow 4s ease-in-out infinite',
    willChange: 'opacity, transform',
  };

  if (!mounted) {
    return (
      <div ref={containerRef} className={className} style={{ width: size, height: size }} role="img" aria-label="Neural network visualization">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={{ width: size, height: size, position: 'relative' }} role="img" aria-label="Neural network visualization">
      <style>{`@keyframes pulse-glow { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.03); } }`}</style>
      <div style={glowStyle} aria-hidden="true" />
      <canvas ref={canvasRef} className="relative z-10" style={{ width: size, height: size }} aria-hidden="true" />
    </div>
  );
});

/**
 * Responsive wrapper that scales a single NeuralConstellation instance
 * using CSS transforms instead of rendering multiple instances
 */
export function ResponsiveNeuralConstellation({ className = '' }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="w-[250px] h-[250px] sm:w-[450px] sm:h-[450px] lg:w-[600px] lg:h-[600px] xl:w-[750px] xl:h-[750px] rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 animate-pulse" />
      </div>
    );
  }

  // Render a single 500px canvas and scale with CSS transforms
  // This is much more performant than rendering 4 separate canvases
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      <div 
        className="transform scale-50 sm:scale-90 lg:scale-[1.2] xl:scale-[1.5] origin-center transition-transform duration-300"
        style={{ willChange: 'transform' }}
      >
        <NeuralConstellation size={500} />
      </div>
    </div>
  );
}

export default NeuralConstellation;
