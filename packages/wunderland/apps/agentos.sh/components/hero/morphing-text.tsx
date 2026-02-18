'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MorphingTextProps {
  words: string[];
  className?: string;
  interval?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

/**
 * MorphingText - Animated text that morphs between words with smooth transitions
 */
export function MorphingText({
  words,
  className = '',
  interval = 3500,
  gradientFrom = 'var(--color-accent-primary)',
  gradientTo = 'var(--color-accent-secondary)',
}: MorphingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [words.length, interval, mounted]);

  const currentWord = words[currentIndex];

  // Prevent hydration mismatch - show first word on server
  if (!mounted) {
    return (
      <span
        className={className}
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {words[0]}
      </span>
    );
  }

  return (
    <span className={`inline-block ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentWord}
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
          transition={{ 
            duration: 0.5, 
            ease: [0.4, 0, 0.2, 1] 
          }}
          style={{
            display: 'inline-block',
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {currentWord}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default MorphingText;
