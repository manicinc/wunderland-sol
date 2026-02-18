'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, Maximize2, ExternalLink } from 'lucide-react';
import Image from 'next/image';

interface MediaItem {
  filename: string;
  type: 'video' | 'gif' | 'screenshot';
  title: string;
  description: string;
  feature?: string;
  ctaLink?: string;
  ctaText?: string;
}

const mediaItems: MediaItem[] = [
  {
    filename: 'hero-demo.mp4',
    type: 'video',
    title: 'AgentOS in Action',
    description: 'Experience real-time streaming with adaptive personas that understand context',
    feature: 'Live Streaming',
    ctaLink: 'https://app.vca.chat/en',
    ctaText: 'Try Live Demo'
  },
  {
    filename: 'tool-orchestration.gif',
    type: 'gif',
    title: 'Tool Chain Execution',
    description: 'Watch as multiple tools coordinate seamlessly to complete complex tasks',
    feature: 'Tool Orchestration'
  },
  {
    filename: 'persona-switching.mp4',
    type: 'video',
    title: 'Dynamic Persona Switching',
    description: 'Switch between AI personalities mid-conversation without losing context',
    feature: 'Adaptive AI'
  },
  {
    filename: 'voice-integration.gif',
    type: 'gif',
    title: 'Voice Chat Assistant',
    description: 'Natural voice interactions with real-time transcription and synthesis',
    feature: 'Voice First',
    ctaLink: 'https://app.vca.chat/en',
    ctaText: 'Try Voice Chat'
  },
  {
    filename: 'marketplace-preview.png',
    type: 'screenshot',
    title: 'Agent Marketplace',
    description: 'Browse, buy, and sell AI agents in our thriving marketplace',
    feature: 'Marketplace',
    ctaLink: 'https://vca.chat',
    ctaText: 'Visit Marketplace'
  },
  {
    filename: 'code-generation.mp4',
    type: 'video',
    title: 'AI That Codes',
    description: 'Watch AgentOS write, debug, and optimize code in real-time',
    feature: 'Code Generation'
  }
];

// Animated placeholder component for missing media
function AnimatedPlaceholder({ type, title }: { type: string; title: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-brand/5 to-brand/10">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-brand/20"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 2) * 20}%`
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.2
            }}
          />
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 text-center">
        <div className="mb-4 flex justify-center">
          {type === 'video' && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/20"
            >
              <Play className="h-8 w-8 text-brand" />
            </motion.div>
          )}
          {type === 'gif' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="h-16 w-16 rounded-lg bg-gradient-to-br from-brand to-brand/50"
            />
          )}
          {type === 'screenshot' && (
            <div className="h-20 w-32 rounded-lg border-2 border-dashed border-brand/30 bg-white/50 dark:bg-slate-900/50" />
          )}
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Media coming soon
        </p>
      </div>
    </div>
  );
}

// Media player component
function MediaPlayer({ item }: { item: MediaItem }) {
  const [mediaExists, setMediaExists] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Check if media file exists
    const checkMedia = async () => {
      try {
        const mediaPath = `/media/${item.type}s/${item.filename}`;
        const response = await fetch(mediaPath, { method: 'HEAD' });
        setMediaExists(response.ok);
      } catch {
        setMediaExists(false);
      }
    };

    checkMedia();
  }, [item]);

  if (!mediaExists) {
    return <AnimatedPlaceholder type={item.type} title={item.title} />;
  }

  const mediaPath = `/media/${item.type}s/${item.filename}`;

  if (item.type === 'video') {
    return (
      <div className="relative h-full w-full">
        <video
          src={mediaPath}
          className="h-full w-full rounded-lg object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute bottom-4 left-4 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  if (item.type === 'gif') {
    return (
      <Image
        src={mediaPath}
        alt={item.title}
        fill
        className="rounded-lg object-cover"
        unoptimized // For GIFs
      />
    );
  }

  // Screenshot
  return (
    <Image
      src={mediaPath}
      alt={item.title}
      fill
      className="rounded-lg object-cover"
    />
  );
}

export function MediaShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentItem = mediaItems[currentIndex];

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  return (
    <div className="relative">
      {/* Main showcase */}
      <div className="glass-panel overflow-hidden p-0">
        <div className="relative aspect-video">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <MediaPlayer item={currentItem} />
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur-sm transition hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900"
            aria-label="Previous media"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur-sm transition hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900"
            aria-label="Next media"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute right-4 top-4 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur-sm transition hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900"
            aria-label="View fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Info section */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              {currentItem.feature && (
                <span className="mb-2 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
                  {currentItem.feature}
                </span>
              )}
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                {currentItem.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {currentItem.description}
              </p>
            </div>
            {currentItem.ctaLink && (
              <a
                href={currentItem.ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {currentItem.ctaText || 'Learn More'}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Thumbnail navigation */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {mediaItems.map((item, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  index === currentIndex
                    ? 'border-brand shadow-lg'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-brand/10" />
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {item.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8"
            onClick={() => setIsFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MediaPlayer item={currentItem} />
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute -top-12 right-0 text-white hover:text-brand"
              >
                <span className="text-sm">Press ESC or click to close</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}