'use client';

import { useId, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

/**
 * HeroAnimatedLogo - An exact recreation of the header AgentOSWordmark logo
 * but with enhanced gradient coloring, pulsing node animations, and brand styling
 * for use in the hero section.
 */
interface HeroAnimatedLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

export function HeroAnimatedLogo({ 
  size = 200, 
  className = '',
  showWordmark = false
}: HeroAnimatedLogoProps) {
  const gradientId = useId().replace(/:/g, '-');
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  // Brand colors - matching header but more vibrant for hero
  const colors = {
    primary: '#6366F1',      // Indigo
    secondary: '#8B5CF6',    // Violet  
    tertiary: '#EC4899',     // Pink
    accent: '#06B6D4',       // Cyan
    glow: isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.25)'
  };

  // ViewBox is 60x60
  const viewBoxSize = 60;
  const cx = 30; // Center X
  const cy = 30; // Center Y

  // Node positions (same as AgentOSWordmark but centered in a 60x60 viewBox)
  const nodes = [
    { x: 30, y: 30, r: 6, color: 'gradient', delay: 0 },     // Center
    { x: 15, y: 15, r: 4, color: colors.primary, delay: 0.1 },   // Top-left
    { x: 45, y: 15, r: 4, color: colors.secondary, delay: 0.2 }, // Top-right
    { x: 50, y: 35, r: 4, color: colors.tertiary, delay: 0.3 },  // Right
    { x: 30, y: 48, r: 4, color: colors.accent, delay: 0.4 },    // Bottom
    { x: 10, y: 35, r: 4, color: colors.primary, delay: 0.5 },   // Left
  ];

  // Connections from center to outer nodes
  const connections = [
    { from: nodes[0], to: nodes[1] },
    { from: nodes[0], to: nodes[2] },
    { from: nodes[0], to: nodes[3] },
    { from: nodes[0], to: nodes[4] },
    { from: nodes[0], to: nodes[5] },
  ];

  // Outer ring connections
  const outerConnections = [
    { from: nodes[1], to: nodes[2] },
    { from: nodes[5], to: nodes[3] },
  ];

  if (!mounted) {
    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20" />
      </div>
    );
  }

  return (
    <div 
      className={`relative ${className}`} 
      style={{ width: size, height: showWordmark ? size * 0.6 : size }}
    >
      {/* Glow effect behind the logo */}
      <motion.div 
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: colors.glow }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        width={size}
        height={size}
        className="relative z-10"
      >
        <defs>
          {/* Main gradient */}
          <linearGradient id={`hero-gradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary}>
              <animate
                attributeName="stop-color"
                values={`${colors.primary};${colors.secondary};${colors.tertiary};${colors.primary}`}
                dur="6s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor={colors.secondary}>
              <animate
                attributeName="stop-color"
                values={`${colors.secondary};${colors.tertiary};${colors.primary};${colors.secondary}`}
                dur="6s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor={colors.tertiary}>
              <animate
                attributeName="stop-color"
                values={`${colors.tertiary};${colors.primary};${colors.secondary};${colors.tertiary}`}
                dur="6s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>

          {/* Glow filter */}
          <filter id={`glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer orbital rings */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={18}
          fill="none"
          stroke={`url(#hero-gradient-${gradientId})`}
          strokeWidth="0.5"
          opacity={0.3}
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
        <motion.circle
          cx={cx}
          cy={cy}
          r={24}
          fill="none"
          stroke={`url(#hero-gradient-${gradientId})`}
          strokeWidth="0.3"
          opacity={0.2}
          initial={{ rotate: 0 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Primary connections from center */}
        {connections.map((conn, i) => (
          <motion.line
            key={`conn-${i}`}
            x1={conn.from.x}
            y1={conn.from.y}
            x2={conn.to.x}
            y2={conn.to.y}
            stroke={`url(#hero-gradient-${gradientId})`}
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: 1, 
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{ 
              pathLength: { duration: 0.8, delay: i * 0.1 },
              opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            }}
          />
        ))}

        {/* Outer connections */}
        {outerConnections.map((conn, i) => (
          <motion.line
            key={`outer-${i}`}
            x1={conn.from.x}
            y1={conn.from.y}
            x2={conn.to.x}
            y2={conn.to.y}
            stroke={colors.secondary}
            strokeWidth="1"
            opacity={0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
          />
        ))}

        {/* Nodes */}
        {nodes.map((node, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill={node.color === 'gradient' ? `url(#hero-gradient-${gradientId})` : node.color}
            filter={i === 0 ? `url(#glow-${gradientId})` : undefined}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [1, i === 0 ? 1.15 : 1.2, 1],
              opacity: i === 0 ? 1 : 0.85
            }}
            transition={{
              scale: { 
                duration: 2.5, 
                repeat: Infinity, 
                ease: 'easeInOut',
                delay: node.delay 
              },
              opacity: { duration: 0.5, delay: node.delay }
            }}
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          />
        ))}

        {/* Data pulse particles traveling along connections */}
        {connections.map((conn, i) => (
          <motion.circle
            key={`pulse-${i}`}
            r={1.5}
            fill={colors.accent}
            opacity={0.8}
            initial={{ 
              cx: conn.from.x, 
              cy: conn.from.y,
              opacity: 0 
            }}
            animate={{
              cx: [conn.from.x, conn.to.x, conn.from.x],
              cy: [conn.from.y, conn.to.y, conn.from.y],
              opacity: [0, 0.9, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.6,
              ease: 'easeInOut'
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default HeroAnimatedLogo;

