'use client';

import { useEffect, useState, memo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParticleTextProps {
  text: string;
  className?: string;
  particleCount?: number;
  animationDuration?: number;
}

export const ParticleText = memo(function ParticleText({
  text,
  className = "",
  particleCount = 15,
  animationDuration = 0.8
}: ParticleTextProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
  }>>([]);
  
  // Create a unique ID for the SVG filter
  const filterId = useId().replace(/:/g, "-");

  useEffect(() => {
    // Generate particles for liquid morphing effect
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 40,
      size: Math.random() * 10 + 6,
      delay: Math.random() * 0.2
    }));
    setParticles(newParticles);
  }, [text, particleCount]);

  return (
    <span className="relative inline-block">
      {/* SVG Filter for Liquid Effect - OPTIMIZED */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id={`liquid-${filterId}`}>
            {/* Lower blur for performance */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            {/* Adjusted color matrix for visible liquid effect */}
            <feColorMatrix 
              in="blur" 
              mode="matrix" 
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" 
              result="gooey" 
            />
            <feBlend in="SourceGraphic" in2="gooey" mode="multiply" />
          </filter>
        </defs>
      </svg>

      <AnimatePresence mode="wait">
        <motion.span
          key={text}
          className="relative inline-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: animationDuration }}
        >
          {/* Liquid Morphing Particles Container */}
          <span 
            className="absolute inset-0 pointer-events-none"
            style={{ filter: `url(#liquid-${filterId})` }}
          >
            {particles.map((particle, i) => (
              <motion.span
                key={`${text}-${particle.id}`}
                className="absolute rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  background: i % 2 === 0 
                    ? 'var(--color-accent-primary)' 
                    : 'var(--color-accent-secondary)',
                  left: '50%',
                  top: '50%',
                  opacity: 0.8,
                }}
                initial={{
                  x: particle.x,
                  y: particle.y,
                  scale: 0
                }}
                animate={{
                  x: [particle.x, particle.x * 0.3, 0],
                  y: [particle.y, particle.y * 0.3, 0],
                  scale: [0, 1.2, 0],
                }}
                transition={{
                  duration: animationDuration,
                  delay: particle.delay,
                  ease: "easeInOut"
                }}
              />
            ))}
          </span>

          {/* Main text with dissolve effect */}
          <motion.span
            className={`relative inline-flex ${className}`}
            initial={{
              opacity: 0,
              filter: 'blur(10px)',
            }}
            animate={{
              opacity: 1,
              filter: 'blur(0px)',
            }}
            exit={{
              opacity: 0,
              filter: 'blur(10px)',
            }}
            transition={{
              duration: animationDuration,
              ease: [0.23, 1, 0.32, 1]
            }}
          >
            {/* Letter by letter morphing with dissolve */}
            {text.split('').map((letter, index) => (
              <motion.span
                key={`${text}-letter-${index}`}
                className="inline-block"
                style={{ transformOrigin: 'center bottom' }}
                initial={{
                  opacity: 0,
                  y: 20,
                  scale: 0,
                  rotateZ: (Math.random() - 0.5) * 45,
                  filter: 'blur(6px)'
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  rotateZ: 0,
                  filter: 'blur(0px)'
                }}
                exit={{
                  opacity: 0,
                  y: -20,
                  scale: 0,
                  rotateZ: (Math.random() - 0.5) * 45,
                  filter: 'blur(6px)'
                }}
                transition={{
                  duration: animationDuration * 0.7,
                  delay: index * 0.03,
                  ease: [0.43, 0.13, 0.23, 0.96],
                  type: "spring",
                  stiffness: 300,
                  damping: 24
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </motion.span>
            ))}
          </motion.span>

          {/* Dissolving particle trail */}
          <motion.span
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: animationDuration }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <motion.span
                key={`dissolve-${i}`}
                className="absolute rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  background: 'var(--color-accent-tertiary)',
                  left: `${10 + i * 10}%`,
                  top: '50%',
                  filter: 'blur(1px)',
                }}
                animate={{
                  y: [0, -30, -60],
                  opacity: [0, 0.6, 0],
                  scale: [1, 1.5, 0],
                }}
                transition={{
                  duration: animationDuration * 1.2,
                  delay: i * 0.05,
                  repeat: Infinity,
                  repeatDelay: 1.5,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
});