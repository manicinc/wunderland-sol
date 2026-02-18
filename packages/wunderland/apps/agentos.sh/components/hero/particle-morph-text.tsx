'use client';

import { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';

interface ParticleMorphTextProps {
  words: [string, string];
  className?: string;
  interval?: number;
  fontSize?: number;
  gradientFrom?: string;
  gradientTo?: string;
  startIndex?: number;
}

/**
 * ParticleMorphText - Smooth exponential decay morphing with randomized timing
 */
export const ParticleMorphText = memo(function ParticleMorphText({
  words,
  className = '',
  interval = 2500,
  fontSize = 48,
  gradientFrom = '#8b5cf6',
  gradientTo = '#06b6d4',
  startIndex = 0,
}: ParticleMorphTextProps) {
  const [wordA, wordB] = words;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef({ 
    wordIdx: startIndex, 
    morphT: 0, 
    lastSwitch: 0, 
    isMorphing: false,
    nextInterval: interval + (Math.random() - 0.5) * 800 // randomize timing
  });
  const particlesARef = useRef<{ x: number; y: number; r: number; c: string; seed: number }[]>([]);
  const particlesBRef = useRef<{ x: number; y: number; r: number; c: string; seed: number }[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(startIndex);

  const height = useMemo(() => Math.ceil(fontSize * 1.05), [fontSize]);
  const [wordWidths, setWordWidths] = useState<[number, number]>(() => {
    const estimate = (text: string) => Math.ceil(text.length * fontSize * 0.62);
    return [estimate(wordA), estimate(wordB)];
  });
  const width = useMemo(() => Math.max(wordWidths[0], wordWidths[1]), [wordWidths]);
  const wrapperWidth = wordWidths[activeWordIndex] ?? width;

  const hexToRgb = useCallback((hex: string) => {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }, []);

  const lerp = useCallback((a: number[], b: number[], t: number) => 
    `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`, []);

  // Exponential decay easing for smooth organic motion
  const easeOutExpo = useCallback((t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t), []);
  const easeInOutExpo = useCallback((t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  }, []);

  const sampleText = useCallback((text: string) => {
    const off = document.createElement('canvas');
    const ctx = off.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    
    off.width = width;
    off.height = height;
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, 0, height / 2);
    
    const data = ctx.getImageData(0, 0, width, height).data;
    const step = Math.max(2, Math.floor(fontSize / 20));
    const c1 = hexToRgb(gradientFrom), c2 = hexToRgb(gradientTo);
    const particles: { x: number; y: number; r: number; c: string; seed: number }[] = [];
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 80) {
          particles.push({
            x, y,
            r: 1.3,
            c: lerp(c1, c2, x / width),
            seed: Math.random() * 1000, // per-particle randomness
          });
        }
      }
    }
    return particles;
  }, [width, height, fontSize, gradientFrom, gradientTo, hexToRgb, lerp]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    stateRef.current.wordIdx = startIndex;
    setActiveWordIndex(startIndex);
  }, [mounted, startIndex]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const measure = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
      const paddingX = Math.ceil(fontSize * 0.18);

      const next: [number, number] = [
        Math.ceil(ctx.measureText(wordA).width) + paddingX,
        Math.ceil(ctx.measureText(wordB).width) + paddingX,
      ];

      if (cancelled) return;
      setWordWidths((prev) => (prev[0] === next[0] && prev[1] === next[1] ? prev : next));
    };

    const fontReady = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    if (fontReady && typeof fontReady.then === 'function') {
      fontReady.then(measure).catch(measure);
    } else {
      measure();
    }

    return () => {
      cancelled = true;
    };
  }, [mounted, fontSize, wordA, wordB]);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    particlesARef.current = sampleText(wordA);
    particlesBRef.current = sampleText(wordB);
    stateRef.current.lastSwitch = performance.now();

    const draw = (t: number) => {
      const s = stateRef.current;
      const elapsed = t - s.lastSwitch;

      ctx.clearRect(0, 0, width, height);

      // Trigger morph with randomized interval
      if (!s.isMorphing && elapsed > s.nextInterval) {
        s.isMorphing = true;
        s.morphT = 0;
      }

      // Slower morph speed with exponential decay
      if (s.isMorphing) {
        s.morphT += 0.018; // slower morph
        if (s.morphT >= 1) {
          s.morphT = 0;
          s.isMorphing = false;
          s.wordIdx = 1 - s.wordIdx;
          setActiveWordIndex(s.wordIdx);
          s.lastSwitch = t;
          s.nextInterval = interval + (Math.random() - 0.5) * 1000; // randomize next
        }
      }

      const fromParticles = s.wordIdx === 0 ? particlesARef.current : particlesBRef.current;
      const toParticles = s.wordIdx === 0 ? particlesBRef.current : particlesARef.current;
      
      // Use exponential easing for smooth organic motion
      const easeT = s.isMorphing ? easeInOutExpo(s.morphT) : 0;
      const maxLen = Math.max(fromParticles.length, toParticles.length);
      
      for (let i = 0; i < maxLen; i++) {
        const fromP = fromParticles[i % fromParticles.length];
        const toP = toParticles[i % toParticles.length];
        
        // Per-particle stagger based on seed for organic feel
        const stagger = (fromP.seed % 100) / 100 * 0.15;
        const particleT = Math.max(0, Math.min(1, (easeT - stagger) / (1 - stagger)));
        const smoothT = easeOutExpo(particleT);
        
        // Add slight organic wobble during morph
        const wobble = s.isMorphing ? Math.sin(t * 0.003 + fromP.seed) * 2 * (1 - Math.abs(smoothT - 0.5) * 2) : 0;
        
        const x = fromP.x + (toP.x - fromP.x) * smoothT + wobble;
        const y = fromP.y + (toP.y - fromP.y) * smoothT;
        
        const fromRgb = fromP.c.match(/\d+/g)!.map(Number);
        const toRgb = toP.c.match(/\d+/g)!.map(Number);
        const r = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * smoothT);
        const g = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * smoothT);
        const b = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * smoothT);
        
        // Smoother alpha transition
        const alpha = s.isMorphing ? 0.85 + 0.15 * Math.cos(s.morphT * Math.PI * 2) : 1;
        
        // Soft radial glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, fromP.r * 2.5);
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.5})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(x - fromP.r * 2.5, y - fromP.r * 2.5, fromP.r * 5, fromP.r * 5);
      }

      animRef.current = requestAnimationFrame(draw);
    };
    
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [mounted, width, height, wordA, wordB, interval, sampleText, easeOutExpo, easeInOutExpo]);

  // Inline-block for proper text flow alignment
  return (
    <span 
      className={`inline-block ${className}`} 
      style={{ 
        width: wrapperWidth,
        height,
        overflow: 'hidden',
        verticalAlign: 'middle',
        marginTop: 5, // shift down 5px
        transition: 'width 520ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'width',
      }}
    >
      <span className="sr-only">{wordA} / {wordB}</span>
      {mounted ? (
        <canvas ref={canvasRef} style={{ width, height, display: 'block' }} aria-hidden="true" />
      ) : (
        <span 
          style={{
            background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize, fontWeight: 700,
          }}
        >
          {words[startIndex]}
        </span>
      )}
    </span>
  );
});

export default ParticleMorphText;
