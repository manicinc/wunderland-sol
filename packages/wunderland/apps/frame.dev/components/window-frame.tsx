'use client'

import { useState, useEffect } from 'react'
import type { ReactNode, ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Home, Shield, Briefcase, User, Bot, X, ExternalLink, Github, Package, Layers as LayersIcon } from 'lucide-react'
import Image from 'next/image'
import { WebOSIcon, HomeOSIcon, SafeOSIcon, WorkOSIcon, MyOSIcon } from './os-icons'

type OSIcon = ComponentType<{ className?: string }>

type OSDefinition = {
  title: string
  icon: OSIcon
  description: string
  longDescription?: string
  status: string
  statusColor: string
  placeholder?: boolean
  customSvg?: ReactNode
  logo?: string
  links?: {
    github?: string
    npm?: string
    website?: string
  }
  features?: string[]
}

type LightingPreset = {
  color: string
  intensity: number
  angle: string
  secondary: string
}

const LIGHT_MODE_LIGHTING: Record<'morning' | 'noon' | 'evening' | 'night', LightingPreset> = {
  morning: {
    color: 'rgba(255, 220, 100, 0.65)', // Stronger golden morning light
    intensity: 1.3,
    angle: '135deg',
    secondary: 'rgba(255, 200, 50, 0.35)'
  },
  noon: {
    color: 'rgba(255, 245, 150, 0.6)', // Brighter yellow sunlight
    intensity: 1.4,
    angle: '120deg',
    secondary: 'rgba(255, 235, 100, 0.32)'
  },
  evening: {
    color: 'rgba(255, 180, 60, 0.7)', // Stronger orange sunset
    intensity: 1.2,
    angle: '45deg',
    secondary: 'rgba(255, 150, 40, 0.38)'
  },
  night: {
    color: 'rgba(255, 235, 140, 0.35)', // Warmer indoor lighting
    intensity: 0.9,
    angle: '270deg',
    secondary: 'rgba(255, 220, 100, 0.18)'
  }
}

const DARK_MODE_LIGHTING: LightingPreset = {
  color: 'rgba(150, 180, 255, 0.45)', // Stronger cool blue moonlight
  intensity: 1.0,
  angle: '315deg',
  secondary: 'rgba(180, 200, 255, 0.25)' // More visible secondary moonlight
}

const DEFAULT_LIGHTING = LIGHT_MODE_LIGHTING.noon

const osData: Record<string, OSDefinition> = {
  WebOS: {
    title: 'WebOS',
    icon: Globe,
    description: 'Your OS interface for the web',
    longDescription:
      'A unified layer bridging Web 2.0 and Web 3.0 standards, authentication systems, and protocols. WebOS provides a consistent interface for all web interactions.',
    status: 'Coming Soon',
    statusColor: 'text-amber-600',
    placeholder: true,
    customSvg: <WebOSIcon className="w-12 h-12" />,
    features: ['Virtual File System', 'Process Management', 'WebAssembly Runtime', 'PWA Integration']
  },
  HomeOS: {
    title: 'HomeOS',
    icon: Home,
    description: 'All-in-one intelligent smart home',
    longDescription:
      'The complete smart home platform with AI integrations and assistants managing everything from security to comfort, energy to entertainment.',
    status: 'Coming Soon',
    statusColor: 'text-amber-600',
    placeholder: true,
    customSvg: <HomeOSIcon className="w-12 h-12" />,
    features: ['Matter Protocol Support', 'Voice Control', 'Energy Management', 'Security Integration']
  },
  AgentOS: {
    title: 'AgentOS',
    icon: Bot,
    description: 'Adaptive AI agency runtime & orchestration layer',
    longDescription:
      'AgentOS is the adaptive intelligence runtime that powers Framers agencies. It fuses policy-aware agent coordination, multi-provider cognition, and telemetry-backed governance into one deployable TypeScript stack. Designed for long-lived automation, it balances autonomous execution with human-in-the-loop checkpoints, live session streaming, and fine-grained safety guardrails.',
    status: 'Live',
    statusColor: 'text-green-600',
    logo: '/agentos-logo.png',
    links: {
      github: 'https://github.com/framersai/agentos',
      npm: 'https://npmjs.com/package/@framers/agentos',
      website: 'https://agentos.sh'
    },
    features: [
      'Adaptive multi-agent graph with programmable agencies & roles',
      'Real-time session bus, artifact registry, and audit timeline',
      'Provider abstraction for OpenAI, Anthropic, Google, local LLMs',
      'Guardrail framework with extension packs for PII, policy, and risk',
      'Observability hooks: live streams, structured logs, metric adapters'
    ]
  },
  SafeOS: {
    title: 'SafeOS',
    icon: Shield,
    description: 'Local AI care & security—free forever',
    longDescription:
      'Part of Frame\'s nonprofit initiative for superintelligence benefiting society. SafeOS provides free AI-powered monitoring for loved ones and home security. Runs entirely offline with local vision AI, privacy-first design, and intelligent alerting.',
    status: 'Live',
    statusColor: 'text-green-600',
    links: {
      website: 'https://safeos.sh'
    },
    features: [
      'Runs 100% locally & offline—your data never leaves',
      'Vision AI for pets, babies, elderly, and home security',
      'Smart alerting with multi-channel notifications',
      'Privacy-first: rolling buffer, no cloud storage',
      'Free forever—part of Frame\'s humanitarian mission'
    ]
  },
  WorkOS: {
    title: 'WorkOS',
    icon: Briefcase,
    description: 'CRM & work platform with AI agents',
    longDescription:
      'The complete work platform combining CRM, project management, and AI agents. Built on AgentOS and OpenStrand for seamless enterprise automation.',
    status: 'Coming Soon',
    statusColor: 'text-amber-600',
    placeholder: true,
    customSvg: <WorkOSIcon className="w-12 h-12" />,
    features: ['Smart Documents', 'Team Spaces', 'Process Automation', 'Analytics Dashboard']
  },
  MyOS: {
    title: 'MyOS',
    icon: User,
    description: 'Your personalized virtual assistant',
    longDescription:
      'The central dashboard and virtual assistant customized for you, managing all Frame OS integrations, data sharing, and syncing across your digital life.',
    status: 'Coming Soon',
    statusColor: 'text-blue-600',
    placeholder: true,
    customSvg: <MyOSIcon className="w-12 h-12" />,
    features: ['Health Tracking', 'Financial Assistant', 'Learning Companion', 'Memory Palace']
  }
}

type OSName = keyof typeof osData

export default function WindowFrame() {
  const [selectedOS, setSelectedOS] = useState<OSName | null>(null)
  const [hoveredPane, setHoveredPane] = useState<OSName | null>(null)
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'noon' | 'evening' | 'night'>('noon')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 10) setTimeOfDay('morning')
    else if (hour >= 10 && hour < 16) setTimeOfDay('noon')
    else if (hour >= 16 && hour < 20) setTimeOfDay('evening')
    else setTimeOfDay('night')
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedOS(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const getSunlightEffect = (): LightingPreset => {
    const baseLighting = LIGHT_MODE_LIGHTING[timeOfDay] ?? DEFAULT_LIGHTING

    if (typeof document === 'undefined') {
      return baseLighting
    }

    const isDark = document.documentElement.classList.contains('dark')
    return isDark ? DARK_MODE_LIGHTING : baseLighting
  }

  const sunlight = getSunlightEffect()

  return (
    <>
      <div className="relative w-full max-w-full sm:max-w-5xl mx-0 sm:mx-auto px-0 sm:px-4">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl opacity-30">
            <div className="absolute inset-0 bg-gradient-to-br from-frame-green/20 via-transparent to-frame-green/10" />
          </div>

          <div className="relative rounded-[32px] bg-gradient-to-br from-frame-green/30 via-frame-green/15 to-frame-green/10 dark:from-frame-green/25 dark:via-frame-green/12 dark:to-frame-green/8 p-[6px] sm:p-[8px] shadow-[0_40px_100px_-30px_rgba(34,139,34,0.4)] dark:shadow-[0_40px_100px_-30px_rgba(34,139,34,0.3)]">
            <div className="relative rounded-[26px] bg-gradient-to-br from-white/95 via-paper-50/90 to-paper-100/95 dark:from-ink-900/95 dark:via-ink-950/90 dark:to-black/95 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.15)] overflow-hidden backdrop-blur-xl">
              <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-7 sm:w-8 bg-gradient-to-r from-amber-900/15 via-amber-800/10 to-transparent dark:from-amber-900/20 dark:via-amber-800/15 dark:to-transparent">
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/10" />
                <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-amber-200/20 via-amber-200/10 to-amber-200/20" />
              </div>
              <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-7 sm:w-8 bg-gradient-to-l from-amber-900/15 via-amber-800/10 to-transparent dark:from-amber-900/20 dark:via-amber-800/15 dark:to-transparent">
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/10" />
                <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-amber-200/20 via-amber-200/10 to-amber-200/20" />
              </div>

              <div
                className="pointer-events-none absolute inset-0 z-[5]"
                style={{
                  background: `linear-gradient(${sunlight.angle}, ${sunlight.color} 0%, transparent 50%), linear-gradient(${parseInt(sunlight.angle, 10) + 90}deg, ${sunlight.secondary} 0%, transparent 40%)`,
                  opacity: sunlight.intensity,
                  mixBlendMode: 'soft-light'
                }}
              />

              <div
                className="pointer-events-none absolute inset-0 z-[4]"
                style={{
                  background: `radial-gradient(circle at 15% 15%, ${sunlight.color} 0%, transparent 35%)`,
                  opacity: sunlight.intensity * 0.6,
                  mixBlendMode: 'screen'
                }}
              />

              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-0 bottom-0 left-1/2 md:left-[33.333%] w-[4px] sm:w-[6px] -translate-x-1/2">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-900/80 via-amber-800/90 to-amber-900/80 dark:from-amber-950/90 dark:via-amber-900/95 dark:to-amber-950/90" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-amber-600/20 via-amber-500/10 to-amber-600/20" />
                  <div className="absolute right-0 top-0 bottom-0 w-px bg-black/20" />
                </div>
                <div className="hidden md:block absolute top-0 bottom-0 left-[66.666%] w-[4px] sm:w-[6px] -translate-x-1/2">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-900/80 via-amber-800/90 to-amber-900/80 dark:from-amber-950/90 dark:via-amber-900/95 dark:to-amber-950/90" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-amber-600/20 via-amber-500/10 to-amber-600/20" />
                  <div className="absolute right-0 top-0 bottom-0 w-px bg-black/20" />
                </div>
                <div className="absolute left-0 right-0 top-[33.333%] md:top-1/2 h-[4px] sm:h-[6px] -translate-y-1/2">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-900/80 via-amber-800/90 to-amber-900/80 dark:from-amber-950/90 dark:via-amber-900/95 dark:to-amber-950/90" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-700/30 to-transparent" />
                  <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-amber-600/20" />
                  <div className="absolute left-0 right-0 bottom-0 h-px bg-black/20" />
                </div>
                <div className="absolute left-0 right-0 top-[66.666%] md:hidden h-[4px] sm:h-[6px] -translate-y-1/2">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-900/80 via-amber-800/90 to-amber-900/80 dark:from-amber-950/90 dark:via-amber-900/95 dark:to-amber-950/90" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-700/30 to-transparent" />
                  <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-amber-600/20" />
                  <div className="absolute left-0 right-0 bottom-0 h-px bg-black/20" />
                </div>
              </div>

              <div className="relative z-10 px-0 py-0 grid grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2 gap-0">
                {Object.entries(osData).map(([os, data], idx) => {
                  const isAgentOS = os === 'AgentOS'
                  const isHovered = hoveredPane === os
                  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
                  const columns = isMobile ? 2 : 3
                  const row = Math.floor(idx / columns)
                  const col = idx % columns
                  const refractionIntensity = 1 - (row * 0.3 + col * 0.2)

                  return (
                    <div key={os} className="relative">
                      <button
                        type="button"
                        className="group relative w-full h-full min-h-[320px] flex flex-col items-center justify-between p-4 sm:p-5 transition-all duration-300 focus:outline-none cursor-pointer overflow-hidden border-t border-l border-ink-200/80 dark:border-white/15 shadow-[inset_1px_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]"
                        onClick={() => setSelectedOS(os as OSName)}
                        onMouseEnter={() => setHoveredPane(os as OSName)}
                        onMouseLeave={() => setHoveredPane(null)}
                      >
                        <motion.div
                          className="absolute inset-0"
                          initial={false}
                          animate={{
                            background: isHovered
                              ? 'linear-gradient(145deg, rgba(255,254,250,0.998) 0%, rgba(255,252,248,0.995) 30%, rgba(253,251,247,0.998) 60%, rgba(252,250,245,0.995) 100%)'
                              : 'linear-gradient(145deg, rgba(255,254,250,0.985) 0%, rgba(255,252,248,0.975) 30%, rgba(253,251,247,0.985) 60%, rgba(252,250,245,0.975) 100%)'
                          }}
                          transition={{ duration: 0.3 }}
                          style={{
                            boxShadow: isHovered
                              ? '0 20px 40px -15px rgba(0,0,0,0.15), inset 0 3px 12px rgba(255,255,255,0.95), inset 0 -2px 8px rgba(0,0,0,0.02)'
                              : '0 12px 24px -12px rgba(0,0,0,0.1), inset 0 2px 6px rgba(255,255,255,0.8), inset 0 -1px 4px rgba(0,0,0,0.01)',
                            backdropFilter: 'blur(12px)'
                          }}
                        />

                        <div
                          className="absolute inset-0 hidden dark:block"
                          style={{
                            background: isHovered
                              ? 'linear-gradient(145deg, rgba(18,25,42,0.985) 0%, rgba(20,28,48,0.97) 30%, rgba(16,22,38,0.985) 60%, rgba(14,20,35,0.98) 100%)'
                              : 'linear-gradient(145deg, rgba(18,25,42,0.97) 0%, rgba(20,28,48,0.95) 30%, rgba(16,22,38,0.97) 60%, rgba(14,20,35,0.96) 100%)',
                            boxShadow: isHovered
                              ? '0 16px 32px -10px rgba(0,0,0,0.5), inset 0 3px 10px rgba(150,180,255,0.18), inset 0 -2px 6px rgba(0,0,0,0.3)'
                              : '0 10px 20px -8px rgba(0,0,0,0.35), inset 0 2px 5px rgba(150,180,255,0.1), inset 0 -1px 3px rgba(0,0,0,0.2)',
                            backdropFilter: 'blur(12px)',
                            borderTop: isHovered ? '1px solid rgba(150,180,255,0.15)' : '1px solid rgba(150,180,255,0.08)',
                            borderLeft: isHovered ? '1px solid rgba(150,180,255,0.12)' : '1px solid rgba(150,180,255,0.06)'
                          }}
                        />

                        {data.status !== 'Live' && (
                          <motion.div
                            className="absolute inset-0 pointer-events-none z-[20]"
                            initial={{ opacity: 1 }}
                            animate={{
                              opacity: isHovered ? 0 : 1
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/15 to-white/10 dark:from-ink-900/30 dark:via-ink-900/20 dark:to-ink-900/15" />
                          </motion.div>
                        )}

                        <AnimatePresence>
                          {isHovered && (
                            <>
                              {/* Primary shimmer - brighter and smoother */}
                              <motion.div
                                className="absolute inset-0 pointer-events-none z-20"
                                initial={{ x: '-100%', opacity: 0 }}
                                animate={{ x: '100%', opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: 0.5,
                                  ease: [0.16, 1, 0.3, 1],
                                  delay: 0
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/20 skew-x-12 blur-sm" />
                              </motion.div>
                              {/* Secondary shimmer - more prominent green tint */}
                              <motion.div
                                className="absolute inset-0 pointer-events-none z-19"
                                initial={{ x: '-120%', opacity: 0 }}
                                animate={{ x: '120%', opacity: 0.8 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: 0.7,
                                  ease: [0.16, 1, 0.3, 1],
                                  delay: 0.15
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-frame-green/15 to-transparent skew-x-6 blur-md" />
                              </motion.div>
                              {/* Third shimmer - subtle sparkle effect */}
                              <motion.div
                                className="absolute inset-0 pointer-events-none z-18"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.6, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: 1.2,
                                  repeat: Infinity,
                                  repeatType: 'loop',
                                  ease: 'easeInOut'
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>

                        <div
                          className="absolute inset-0 pointer-events-none z-[3]"
                          style={{
                            background: `radial-gradient(circle at 20% 20%, ${sunlight.color} 0%, transparent 50%)`,
                            opacity: sunlight.intensity * refractionIntensity * 0.5
                          }}
                        />

                        <div className="absolute top-3 right-3 z-30">
                          <div className="relative">
                            <motion.div
                              className={`w-3 h-3 rounded-full ${
                                data.status === 'Live'
                                  ? 'bg-green-500/90'
                                  : data.status === 'Coming Soon'
                                  ? 'bg-amber-500/90'
                                  : 'bg-blue-500/90'
                              }`}
                              initial={{ scale: 1, opacity: 0.9 }}
                              animate={
                                data.status === 'Live'
                                  ? { scale: [1, 1.03, 1], opacity: [0.9, 0.96, 0.9] }
                                  : { scale: 1, opacity: 0.75 }
                              }
                              transition={{
                                duration: 4.6,
                                repeat: data.status === 'Live' ? Infinity : 0,
                                repeatType: 'mirror',
                                ease: 'easeInOut'
                              }}
                              style={{ willChange: 'transform, opacity' }}
                            />
                            {data.status === 'Live' && (
                              <motion.div
                                className="absolute inset-0 w-3 h-3 rounded-full bg-green-500/70"
                                initial={{ scale: 1, opacity: 0 }}
                                animate={{ scale: [1, 1.2, 1], opacity: [0, 0.2, 0] }}
                                transition={{
                                  duration: 5.2,
                                  repeat: Infinity,
                                  ease: 'easeOut',
                                  repeatDelay: 1.2
                                }}
                                style={{ willChange: 'transform, opacity' }}
                              />
                            )}
                          </div>
                        </div>

                        <div className="relative z-10 flex flex-col items-center justify-center h-full">
                          {os === 'AgentOS' ? (
                            <motion.div
                              className="mb-4 flex flex-col items-center"
                              whileHover={{ y: -5 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              <Image src="/agentos-icon.svg" alt="AgentOS" width={48} height={48} className="object-contain mb-2 drop-shadow-lg" />
                              <h3 className="text-lg sm:text-xl font-bold text-ink-900 dark:text-paper-50 tracking-tight">
                                Agent
                                <span
                                  className="ml-0.5"
                                  style={{
                                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                  }}
                                >
                                  OS
                                </span>
                              </h3>
                            </motion.div>
                          ) : os === 'OpenStrand' ? (
                            <motion.div
                              className="mb-4 flex flex-col items-center"
                              whileHover={{ y: -5 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              <img src="/openstrand-logo.svg" alt="OpenStrand" className="h-12 w-auto mb-2 drop-shadow-lg dark:hidden" />
                              <img src="/openstrand-logo-gradient.svg" alt="OpenStrand" className="hidden h-12 w-auto mb-2 drop-shadow-lg dark:block" />
                              <h3 className="text-lg sm:text-xl font-bold text-ink-900 dark:text-paper-50 tracking-tight">
                                <span
                                  style={{
                                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                  }}
                                >O</span>pen<span
                                  className="ml-0.5"
                                  style={{
                                    background: 'linear-gradient(135deg, #10B981, #22C55E, #A7F3D0)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                  }}
                                >S</span>trand
                              </h3>
                            </motion.div>
                          ) : data.placeholder ? (
                            <div className="mb-4 flex flex-col items-center relative">
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-ink-300 dark:text-ink-700 opacity-10 scale-150">{data.customSvg}</div>
                              <div className="mb-2 text-ink-400 dark:text-ink-600 opacity-40 relative z-10">{data.customSvg}</div>
                              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-ink-900 dark:text-paper-100 opacity-60 relative z-10">
                                {data.title}
                              </h3>
                            </div>
                          ) : (
                            <motion.div
                              className="mb-4 flex flex-col items-center"
                              whileHover={{ y: -5 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              <data.icon className="w-12 h-12 sm:w-14 sm:h-14 text-frame-green mb-2 drop-shadow-[0_4px_12px_rgba(34,139,34,0.4)]" />
                              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-ink-900 dark:text-paper-100">{data.title}</h3>
                            </motion.div>
                          )}

                          <p
                            className={`text-xs sm:text-sm text-center px-2 mb-4 leading-relaxed ${
                              data.status === 'Live' ? 'text-ink-700 dark:text-paper-300' : 'text-ink-600 dark:text-paper-400 opacity-60'
                            }`}
                          >
                            {data.description}
                          </p>

                          <motion.div className="mt-auto" whileHover={{ scale: 1.05 }}>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                                data.status === 'Live'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 shadow-[0_0_20px_rgba(34,139,34,0.2)]'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                              } backdrop-blur-sm`}
                            >
                              <span className={`${data.status === 'Live' ? 'bg-green-500/90' : 'bg-amber-500/90'} h-2 w-2 rounded-full`} />
                              {data.status}
                            </span>
                          </motion.div>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedOS && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-md z-[1000]"
              onClick={() => setSelectedOS(null)}
            />

            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.85, rotateY: -15, z: -100 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0, z: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  y: 10,
                  filter: 'blur(6px)',
                  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] }
                }}
                transition={{
                  type: 'spring',
                  duration: 0.6,
                  bounce: 0.15,
                  opacity: { duration: 0.3 }
                }}
                style={{
                  transformPerspective: 1200,
                  transformStyle: 'preserve-3d'
                }}
                className="pointer-events-auto w-full max-w-3xl h-[80vh] sm:h-[75vh] overflow-hidden"
              >
                <div className="relative h-full rounded-[30px] bg-paper-50 dark:bg-ink-950 shadow-[0_40px_110px_-32px_rgba(34,139,34,0.45)] border border-ink-200/40 dark:border-ink-900 overflow-hidden flex flex-col">
                  <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-8 bg-gradient-to-r from-amber-900/20 via-amber-800/12 to-transparent dark:from-amber-900/25 dark:via-amber-800/15 dark:to-transparent">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/12" />
                    <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-amber-200/18 via-amber-200/12 to-amber-200/18" />
                  </div>
                  <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-8 bg-gradient-to-l from-amber-900/20 via-amber-800/12 to-transparent dark:from-amber-900/25 dark:via-amber-800/15 dark:to-transparent">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/12" />
                    <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-amber-200/18 via-amber-200/12 to-amber-200/18" />
                  </div>

                  <div className="relative px-10 sm:px-14 py-8 border-b border-ink-200/30 dark:border-white/8 bg-paper-100/92 dark:bg-ink-900/90 backdrop-blur-sm">
                    <div className="relative flex items-start justify-between gap-6">
                      <div>
                        {selectedOS === 'AgentOS' ? (
                          <div className="flex items-center gap-4">
                            <Image src="/agentos-icon.svg" alt="AgentOS" width={40} height={40} className="object-contain drop-shadow-md" />
                            <span className="text-3xl font-bold text-ink-900 dark:text-paper-50 tracking-tight">
                              Agent
                              <span
                                className="ml-0.5"
                                style={{
                                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)',
                                  WebkitBackgroundClip: 'text',
                                  backgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent'
                                }}
                              >
                                OS
                              </span>
                            </span>
                          </div>
                        ) : selectedOS === 'OpenStrand' ? (
                          <div className="flex items-center gap-4">
                            <img src="/openstrand-logo.svg" alt="OpenStrand" className="h-10 w-auto drop-shadow-md dark:hidden" />
                            <img src="/openstrand-logo-gradient.svg" alt="OpenStrand" className="hidden h-10 w-auto drop-shadow-md dark:block" />
                            <span className="text-3xl font-bold text-ink-900 dark:text-paper-50 tracking-tight">
                              <span
                                style={{
                                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)',
                                  WebkitBackgroundClip: 'text',
                                  backgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent'
                                }}
                              >O</span>pen<span
                                className="ml-0.5"
                                style={{
                                  background: 'linear-gradient(135deg, #10B981, #22C55E, #A7F3D0)',
                                  WebkitBackgroundClip: 'text',
                                  backgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent'
                                }}
                              >S</span>trand
                            </span>
                          </div>
                        ) : (
                          <h2 className="text-3xl font-bold text-ink-900 dark:text-paper-50 tracking-tight">{osData[selectedOS].title}</h2>
                        )}
                        <p className="mt-3 text-base text-ink-700 dark:text-paper-300 leading-relaxed max-w-2xl">
                          {osData[selectedOS].description}
                        </p>
                      </div>

                      <motion.button
                        onClick={() => setSelectedOS(null)}
                        className="p-2.5 rounded-full bg-paper-100/90 dark:bg-ink-800/90 border border-ink-100/60 dark:border-white/10 text-ink-700 dark:text-paper-100 shadow-sm hover:bg-paper-100 dark:hover:bg-ink-700 hover:shadow-md transition-all"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-10 sm:px-14 py-10 space-y-8 bg-paper-50/95 dark:bg-ink-950/95">
                    {osData[selectedOS].longDescription && (
                      <p className="text-base leading-relaxed text-ink-800 dark:text-paper-200 tracking-tight">
                        {osData[selectedOS].longDescription}
                      </p>
                    )}

                    {osData[selectedOS].features && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4 text-ink-900 dark:text-paper-50 tracking-tight">Key Features</h3>
                        <ul className="space-y-3 text-ink-700 dark:text-paper-300">
                          {osData[selectedOS].features!.map((feature, i) => (
                            <li key={feature} className="flex items-start gap-3">
                              <span className="text-frame-green mt-0.5 text-base leading-none">✦</span>
                              <span className="text-sm leading-relaxed">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {osData[selectedOS].links && (
                      <div className="flex flex-wrap gap-3 pt-6">
                        {osData[selectedOS].links!.github && (
                          <a
                            href={osData[selectedOS].links!.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ink-900 text-white hover:bg-ink-800 transition-colors shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-700"
                          >
                            <Github className="w-4 h-4" />
                            GitHub
                          </a>
                        )}
                        {osData[selectedOS].links!.website && (
                          <a
                            href={osData[selectedOS].links!.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-frame-green text-white hover:bg-frame-green/90 transition-colors shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frame-green"
                          >
                            Visit Website
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {osData[selectedOS].links!.npm && (
                          <a
                            href={osData[selectedOS].links!.npm}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-paper-200 dark:bg-ink-800 text-ink-900 dark:text-paper-50 hover:bg-paper-300 dark:hover:bg-ink-700 transition-colors shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frame-green"
                          >
                            <Package className="w-4 h-4" />
                            NPM
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}