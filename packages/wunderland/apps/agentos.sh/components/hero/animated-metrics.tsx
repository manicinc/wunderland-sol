'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Cpu, Globe, Clock, Database } from 'lucide-react';

interface Metric {
  label: string;
  value: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  decimals?: number;
}

const metrics: Metric[] = [
  { label: 'Streaming Channels', value: 1000, unit: '+', icon: Activity },
  { label: 'Tool Integrations', value: 250, unit: '+', icon: Zap },
  { label: 'Built-in Personas', value: 75, unit: '+', icon: Cpu },
  { label: 'Languages Supported', value: 9, unit: '', icon: Globe },
  { label: 'Response Time', value: 0.3, unit: 's', icon: Clock, decimals: 1 },
  { label: 'Memory Contexts', value: 10000, unit: '+', icon: Database }
];

function AnimatedCounter({
  endValue,
  duration = 2000,
  decimals = 0
}: {
  endValue: number;
  duration?: number;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuad = progress * (2 - progress);
      setCount(endValue * easeOutQuad);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [endValue, duration]);

  return (
    <span className="font-mono tabular-nums">
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}
    </span>
  );
}

export function AnimatedMetrics() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: 'easeOut'
            }}
            className="group relative overflow-hidden rounded-xl border border-slate-200/50 bg-white/50 p-4 backdrop-blur-sm transition-all hover:border-brand/50 hover:bg-white/80 hover:shadow-lg dark:border-slate-700/50 dark:bg-slate-900/50 dark:hover:border-brand/50 dark:hover:bg-slate-900/80"
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent" />
            </div>

            {/* Icon */}
            <div className="relative mb-2 flex items-center justify-between">
              <Icon className="h-5 w-5 text-brand/60 transition-colors group-hover:text-brand" />
              <motion.div
                initial={{ scale: 0 }}
                animate={isVisible ? { scale: 1 } : {}}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1 + 0.3,
                  type: 'spring',
                  stiffness: 200
                }}
                className="h-2 w-2 rounded-full bg-green-500"
                title="Live metric"
              />
            </div>

            {/* Value */}
            <div className="relative">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {isVisible && (
                  <AnimatedCounter
                    endValue={metric.value}
                    duration={2000 + index * 200}
                    decimals={metric.decimals}
                  />
                )}
                <span className="ml-1 text-lg text-brand">
                  {metric.unit}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {metric.label}
              </div>
            </div>

            {/* Animated background pattern */}
            <motion.div
              className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-brand/5"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.3, 0.5]
              }}
              transition={{
                duration: 3,
                delay: index * 0.2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}