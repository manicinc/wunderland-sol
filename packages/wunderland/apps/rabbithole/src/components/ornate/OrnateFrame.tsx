'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import styles from './OrnateFrame.module.scss';

interface OrnateFrameProps {
  variant: 'divider' | 'header' | 'corner' | 'frame';
  width?: number | string;
  height?: number;
  color?: 'holographic' | 'gold' | 'cyan' | 'magenta';
  animate?: boolean;
  mirror?: boolean;
  className?: string;
}

export function OrnateFrame({
  variant,
  width = '100%',
  height,
  color,
  animate = false,
  mirror = false,
  className = '',
}: OrnateFrameProps) {
  const { theme } = useTheme();
  const ref = useRef<SVGSVGElement>(null);

  const isLight = theme === 'light';
  const resolvedColor = color ?? (isLight ? 'gold' : 'holographic');

  // Gradient colors based on theme and color prop
  const gradientStops = getGradientStops(resolvedColor, isLight);

  // Animate on scroll into view — trigger early so content is ready before user reaches it
  useEffect(() => {
    if (!animate || !ref.current) return;
    const svg = ref.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (variant === 'divider') {
              svg.classList.add(styles.expandIn);
            } else {
              const paths = svg.querySelectorAll(`.${styles.animatedPath}`);
              paths.forEach((p) => p.classList.add(styles.drawIn));
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '200px 0px' }
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, [animate, variant]);

  const mirrorStyle = mirror ? { transform: 'scaleX(-1)' } : undefined;

  switch (variant) {
    case 'divider':
      return (
        <DividerSVG
          ref={ref}
          width={width}
          height={height ?? 40}
          gradientStops={gradientStops}
          animate={animate}
          className={`${styles.ornateFrame} ${styles.divider} ${animate ? styles.expandReady : ''} ${className}`}
          style={mirrorStyle}
        />
      );
    case 'header':
      return (
        <HeaderSVG
          ref={ref}
          width={width}
          height={height ?? 20}
          gradientStops={gradientStops}
          animate={animate}
          className={`${styles.ornateFrame} ${styles.header} ${className}`}
          style={mirrorStyle}
        />
      );
    case 'corner':
      return (
        <CornerSVG
          ref={ref}
          width={typeof width === 'number' ? width : 100}
          height={height ?? 100}
          gradientStops={gradientStops}
          className={`${styles.ornateFrame} ${styles.corner} ${className}`}
          style={mirrorStyle}
        />
      );
    case 'frame':
      return (
        <FrameSVG
          ref={ref}
          width={width}
          height={height ?? 60}
          gradientStops={gradientStops}
          className={`${styles.ornateFrame} ${styles.frame} ${className}`}
          style={mirrorStyle}
        />
      );
    default:
      return null;
  }
}

// ── Gradient helpers ──

function getGradientStops(color: string, isLight: boolean) {
  if (isLight || color === 'gold') {
    return ['#8b6914', '#c9a227', '#e8d48a', '#c9a227', '#8b6914'];
  }
  if (color === 'cyan') {
    return ['#00f5ff', '#8b5cf6', '#00f5ff', '#40ffdd', '#00f5ff'];
  }
  if (color === 'magenta') {
    return ['#ff00f5', '#8b5cf6', '#ff00f5', '#ff6b6b', '#ff00f5'];
  }
  // holographic
  return ['#00f5ff', '#8b5cf6', '#ff00f5', '#8b5cf6', '#00f5ff'];
}

// ── SVG Variants ──

import { forwardRef, type SVGProps } from 'react';

interface VariantProps extends SVGProps<SVGSVGElement> {
  width: number | string;
  height: number;
  gradientStops: string[];
  animate?: boolean;
}

const DividerSVG = forwardRef<SVGSVGElement, VariantProps>(
  ({ width, height, gradientStops, animate, className, style }, ref) => {
    const uid = `ornate-div-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <svg
        ref={ref}
        viewBox="0 0 1200 40"
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={`${(i / (gradientStops.length - 1)) * 100}%`} stopColor={stop} />
            ))}
          </linearGradient>
          <linearGradient id={`${uid}-fade`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="15%" stopColor="white" stopOpacity="1" />
            <stop offset="85%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`${uid}-m`}>
            <rect width="1200" height="40" fill={`url(#${uid}-fade)`} />
          </mask>
        </defs>
        <g mask={`url(#${uid}-m)`} stroke={`url(#${uid}-g)`} fill="none" strokeWidth="1.5" opacity="0.5">
          {/* Central diamond medallion */}
          <path
            d="M600 8 L612 20 L600 32 L588 20 Z"
            className={animate ? styles.animatedPath : ''}
            strokeWidth="1.8"
          />
          {/* Inner diamond accent */}
          <path d="M600 13 L607 20 L600 27 L593 20 Z" strokeWidth="1" opacity="0.6" />

          {/* Left scrollwork arm */}
          <path
            d="M585 20 C570 20, 560 10, 540 15 C520 20, 500 8, 470 14 C440 20, 420 12, 380 16 C340 20, 300 14, 240 17 C180 20, 120 15, 60 18"
            className={animate ? styles.animatedPath : ''}
          />
          {/* Left lower echo */}
          <path
            d="M585 22 C570 24, 560 28, 540 24 C520 20, 500 28, 470 24 C440 20, 420 26, 380 23"
            opacity="0.3"
            className={animate ? styles.animatedPath : ''}
          />

          {/* Right scrollwork arm */}
          <path
            d="M615 20 C630 20, 640 10, 660 15 C680 20, 700 8, 730 14 C760 20, 780 12, 820 16 C860 20, 900 14, 960 17 C1020 20, 1080 15, 1140 18"
            className={animate ? styles.animatedPath : ''}
          />
          {/* Right lower echo */}
          <path
            d="M615 22 C630 24, 640 28, 660 24 C680 20, 700 28, 730 24 C760 20, 780 26, 820 23"
            opacity="0.3"
            className={animate ? styles.animatedPath : ''}
          />

          {/* Terminal flourishes — left */}
          <circle cx="50" cy="18" r="2" fill={`url(#${uid}-g)`} stroke="none" opacity="0.4" />
          <path d="M55 15 C48 10, 42 18, 48 22" strokeWidth="1" opacity="0.3" />

          {/* Terminal flourishes — right */}
          <circle cx="1150" cy="18" r="2" fill={`url(#${uid}-g)`} stroke="none" opacity="0.4" />
          <path d="M1145 15 C1152 10, 1158 18, 1152 22" strokeWidth="1" opacity="0.3" />

          {/* Tiny accent dots along the arms */}
          <circle cx="450" cy="16" r="1.5" fill={`url(#${uid}-g)`} stroke="none" opacity="0.3" />
          <circle cx="750" cy="16" r="1.5" fill={`url(#${uid}-g)`} stroke="none" opacity="0.3" />
          <circle cx="300" cy="17" r="1" fill={`url(#${uid}-g)`} stroke="none" opacity="0.2" />
          <circle cx="900" cy="17" r="1" fill={`url(#${uid}-g)`} stroke="none" opacity="0.2" />
        </g>
      </svg>
    );
  }
);
DividerSVG.displayName = 'DividerSVG';

const HeaderSVG = forwardRef<SVGSVGElement, VariantProps>(
  ({ width, height, gradientStops, animate, className, style }, ref) => {
    const uid = `ornate-hdr-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <svg
        ref={ref}
        viewBox="0 0 600 24"
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={`${(i / (gradientStops.length - 1)) * 100}%`} stopColor={stop} />
            ))}
          </linearGradient>
        </defs>
        <g stroke={`url(#${uid}-g)`} fill="none" strokeWidth="1.5" opacity="0.5">
          {/* Central lozenge */}
          <path
            d="M300 4 L310 12 L300 20 L290 12 Z"
            className={animate ? styles.animatedPath : ''}
            strokeWidth="1.5"
          />
          {/* Left tapered rule */}
          <line x1="286" y1="12" x2="80" y2="12" strokeWidth="1" opacity="0.6" />
          <line x1="80" y1="12" x2="20" y2="12" strokeWidth="0.5" opacity="0.3" />
          {/* Right tapered rule */}
          <line x1="314" y1="12" x2="520" y2="12" strokeWidth="1" opacity="0.6" />
          <line x1="520" y1="12" x2="580" y2="12" strokeWidth="0.5" opacity="0.3" />
          {/* Small accent dots */}
          <circle cx="150" cy="12" r="1.5" fill={`url(#${uid}-g)`} stroke="none" opacity="0.3" />
          <circle cx="450" cy="12" r="1.5" fill={`url(#${uid}-g)`} stroke="none" opacity="0.3" />
        </g>
      </svg>
    );
  }
);
HeaderSVG.displayName = 'HeaderSVG';

const CornerSVG = forwardRef<SVGSVGElement, VariantProps>(
  ({ width, height, gradientStops, className, style }, ref) => {
    const uid = `ornate-crn-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <svg
        ref={ref}
        viewBox="0 0 120 120"
        width={typeof width === 'number' ? width : 120}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={`${(i / (gradientStops.length - 1)) * 100}%`} stopColor={stop} />
            ))}
          </linearGradient>
        </defs>
        <g stroke={`url(#${uid}-g)`} fill="none" strokeWidth="1.5" opacity="0.35">
          {/* Corner bracket */}
          <path d="M8 60 L8 8 L60 8" strokeWidth="2" strokeLinecap="round" />
          {/* Fan/sunburst lines */}
          <line x1="8" y1="8" x2="28" y2="28" strokeWidth="1" opacity="0.5" />
          <line x1="8" y1="8" x2="36" y2="18" strokeWidth="1" opacity="0.4" />
          <line x1="8" y1="8" x2="18" y2="36" strokeWidth="1" opacity="0.4" />
          {/* Scrollwork curves */}
          <path d="M14 48 C14 32, 22 22, 36 18" strokeWidth="1" opacity="0.3" />
          <path d="M48 14 C32 14, 22 22, 18 36" strokeWidth="1" opacity="0.3" />
          {/* Apex dot accent */}
          <circle cx="8" cy="8" r="3" fill={`url(#${uid}-g)`} stroke="none" opacity="0.5" />
          <circle cx="8" cy="8" r="6" strokeWidth="0.8" opacity="0.2" />
          {/* Small decorative dots */}
          <circle cx="60" cy="8" r="1.5" fill={`url(#${uid}-g)`} stroke="none" opacity="0.3" />
          <circle cx="8" cy="60" r="1.5" fill={`url(#${uid}-g)`} stroke="none" opacity="0.3" />
        </g>
      </svg>
    );
  }
);
CornerSVG.displayName = 'CornerSVG';

const FrameSVG = forwardRef<SVGSVGElement, VariantProps>(
  ({ width, height, gradientStops, className, style }, ref) => {
    const uid = `ornate-frm-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <svg
        ref={ref}
        viewBox="0 0 400 60"
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={`${(i / (gradientStops.length - 1)) * 100}%`} stopColor={stop} />
            ))}
          </linearGradient>
        </defs>
        <g stroke={`url(#${uid}-g)`} fill="none" strokeWidth="1" opacity="0.4">
          {/* Top-left corner piece */}
          <path d="M6 20 L6 6 L20 6" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="6" x2="14" y2="14" strokeWidth="0.8" opacity="0.5" />
          <circle cx="6" cy="6" r="2" fill={`url(#${uid}-g)`} stroke="none" opacity="0.4" />

          {/* Top-right corner piece */}
          <path d="M394 20 L394 6 L380 6" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="394" y1="6" x2="386" y2="14" strokeWidth="0.8" opacity="0.5" />
          <circle cx="394" cy="6" r="2" fill={`url(#${uid}-g)`} stroke="none" opacity="0.4" />

          {/* Bottom-left corner piece */}
          <path d="M6 40 L6 54 L20 54" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="54" x2="14" y2="46" strokeWidth="0.8" opacity="0.5" />
          <circle cx="6" cy="54" r="2" fill={`url(#${uid}-g)`} stroke="none" opacity="0.4" />

          {/* Bottom-right corner piece */}
          <path d="M394 40 L394 54 L380 54" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="394" y1="54" x2="386" y2="46" strokeWidth="0.8" opacity="0.5" />
          <circle cx="394" cy="54" r="2" fill={`url(#${uid}-g)`} stroke="none" opacity="0.4" />

          {/* Connecting rules */}
          <line x1="24" y1="6" x2="376" y2="6" strokeWidth="0.5" opacity="0.2" />
          <line x1="24" y1="54" x2="376" y2="54" strokeWidth="0.5" opacity="0.2" />
          <line x1="6" y1="24" x2="6" y2="36" strokeWidth="0.5" opacity="0.2" />
          <line x1="394" y1="24" x2="394" y2="36" strokeWidth="0.5" opacity="0.2" />
        </g>
      </svg>
    );
  }
);
FrameSVG.displayName = 'FrameSVG';
