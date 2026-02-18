'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  Globe
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { 
  ShieldIcon, 
  LockIcon, 
  CertificateIcon, 
  GraphIcon, 
  SkylineIcon, 
  DocumentCheckIcon 
} from '../icons/brand-icons'

interface BuildingFeature {
  id: string
  height: number // 1-10 scale
  position: number // 0-100 percentage
  icon: React.ElementType
  status: 'foundation' | 'building' | 'complete'
  glow: string
}

const skylineFeatures: BuildingFeature[] = [
  {
    id: 'security',
    height: 3,
    position: 10,
    icon: ShieldIcon,
    status: 'complete',
    glow: '#22c55e'
  },
  {
    id: 'compliance',
    height: 5,
    position: 25,
    icon: DocumentCheckIcon,
    status: 'complete',
    glow: '#06b6d4'
  },
  {
    id: 'auth',
    height: 4,
    position: 40,
    icon: LockIcon,
    status: 'complete',
    glow: '#a855f7'
  },
  {
    id: 'audit',
    height: 6,
    position: 55,
    icon: GraphIcon,
    status: 'complete',
    glow: '#eab308'
  },
  {
    id: 'soc2',
    height: 7,
    position: 70,
    icon: CertificateIcon,
    status: 'building',
    glow: '#f97316'
  },
  {
    id: 'scale',
    height: 9,
    position: 85,
    icon: SkylineIcon,
    status: 'complete',
    glow: '#8b5cf6'
  }
]

export function SkylineSection() {
  const t = useTranslations('enterprise')
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null)
  const [animatedWindows, setAnimatedWindows] = useState<Record<string, boolean[]>>({})
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Deterministic star field
  const stars = useMemo(() => {
    let seed = 1337 >>> 0
    const rand = () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
      return seed / 4294967296
    }
    return Array.from({ length: 40 }).map(() => ({
      width: rand() * 2 + 1,
      height: rand() * 2 + 1,
      left: rand() * 100,
      top: rand() * 40,
      opacity: rand() * 0.5 + 0.2,
      duration: 3 + rand() * 4
    }))
  }, [])

  // Animate building windows
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedWindows(prev => {
        const next = { ...prev }
        skylineFeatures.forEach(feature => {
          if (!next[feature.id]) {
            next[feature.id] = Array(feature.height * 3).fill(false).map(() => Math.random() > 0.3)
          } else {
            next[feature.id] = next[feature.id].map(state =>
              Math.random() > 0.95 ? !state : state
            )
          }
        })
        return next
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'linear-gradient(to bottom, hsl(250 30% 8%) 0%, hsl(260 25% 12%) 50%, hsl(250 30% 8%) 100%)'
              : 'linear-gradient(to bottom, hsl(250 30% 98%) 0%, hsl(260 25% 95%) 50%, hsl(250 30% 98%) 100%)'
          }}
        />
        {/* Stars in dark mode */}
        {isDark && (
          <div className="absolute inset-0">
            {stars.map((s, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${s.width}px`,
                  height: `${s.height}px`,
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                }}
                animate={{
                  opacity: [s.opacity * 0.5, s.opacity, s.opacity * 0.5],
                }}
                transition={{
                  duration: s.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, #a78bfa 0%, #67e8f9 50%, #f472b6 100%)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('title')}
          </h2>
          <p className={`text-lg max-w-3xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Skyline Visualization */}
        <div className="relative h-[400px] mb-16">
          {/* Ground line */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{
              background: isDark 
                ? 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.5) 50%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.3) 50%, transparent 100%)'
            }}
          />

          {/* Buildings */}
          {skylineFeatures.map((feature, index) => {
            const buildingHeight = (feature.height / 10) * 320
            const buildingWidth = 100
            const leftPosition = `${feature.position}%`

            return (
              <motion.div
                key={feature.id}
                initial={{ height: 0, opacity: 0 }}
                whileInView={{
                  height: buildingHeight,
                  opacity: 1
                }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 1,
                  delay: index * 0.15,
                  ease: [0.43, 0.13, 0.23, 0.96]
                }}
                className="absolute bottom-0"
                style={{
                  left: leftPosition,
                  width: buildingWidth,
                  transform: 'translateX(-50%)'
                }}
                onMouseEnter={() => setHoveredBuilding(feature.id)}
                onMouseLeave={() => setHoveredBuilding(null)}
              >
                {/* Building Structure */}
                <div
                  className="relative w-full h-full cursor-pointer rounded-t-md overflow-hidden transition-all duration-300"
                  style={{
                    background: isDark
                      ? `linear-gradient(to top, ${feature.glow}40 0%, ${feature.glow}20 100%)`
                      : `linear-gradient(to top, ${feature.glow}30 0%, ${feature.glow}15 100%)`,
                    border: `1px solid ${hoveredBuilding === feature.id ? feature.glow : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    boxShadow: hoveredBuilding === feature.id
                      ? `0 0 30px ${feature.glow}50, inset 0 0 20px ${feature.glow}20`
                      : 'none',
                  }}
                >
                  {/* Windows Grid */}
                  <div className="absolute inset-2 grid grid-cols-3 gap-1">
                    {animatedWindows[feature.id]?.map((lit, i) => (
                      <div
                        key={i}
                        className="rounded-sm transition-all duration-500"
                        style={{
                          background: lit
                            ? `${feature.glow}80`
                            : isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)',
                          boxShadow: lit ? `0 0 8px ${feature.glow}60` : 'none',
                        }}
                      />
                    ))}
                  </div>

                  {/* Status badge */}
                  {feature.status === 'building' && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-orange-500/90 text-white px-2 py-0.5 rounded text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      WIP
                    </div>
                  )}

                  {/* Antenna for tall buildings */}
                  {feature.height >= 7 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                      <div 
                        className="w-0.5 h-6"
                        style={{ background: `linear-gradient(to top, ${feature.glow}, transparent)` }}
                      />
                      <motion.div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                        style={{ background: feature.glow }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                  )}
                </div>

                {/* Label below building */}
                <motion.div 
                  className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 + 0.5 }}
                >
                  <div 
                    className="w-8 h-8 mx-auto mb-1 transition-transform duration-300"
                    style={{ transform: hoveredBuilding === feature.id ? 'scale(1.2)' : 'scale(1)' }}
                  >
                    <feature.icon id={feature.id} className="w-full h-full" />
                  </div>
                  <span 
                    className={`text-xs font-medium transition-colors duration-300 ${
                      hoveredBuilding === feature.id 
                        ? (isDark ? 'text-white' : 'text-slate-900')
                        : (isDark ? 'text-slate-400' : 'text-slate-600')
                    }`}
                  >
                    {t(`features.${feature.id}.title`)}
                  </span>
                </motion.div>

                {/* Hover tooltip */}
                <AnimatePresence>
                  {hoveredBuilding === feature.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-30"
                      style={{ minWidth: '220px' }}
                    >
                      <div 
                        className="p-4 rounded-lg shadow-xl"
                        style={{
                          background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <div className="w-5 h-5">
                            <feature.icon id={`${feature.id}-tooltip`} className="w-full h-full" />
                          </div>
                          {t(`features.${feature.id}.title`)}
                        </h4>
                        <ul className="space-y-1.5">
                          {(t.raw(`features.${feature.id}.items`) as string[]).map((item, i) => (
                            <li key={i} className={`text-xs flex items-start gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        {feature.status === 'building' && (
                          <div className={`mt-3 pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <p className="text-xs text-orange-500 font-medium">
                              🚧 {t('currentlyDevelopment')}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Legend Cards - Solid opaque backgrounds for readability */}
        <div className="relative z-20 grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-lg"
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.90) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
              border: `2px solid ${isDark ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.4)'}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/30 border border-green-500/40">
                <Database className="w-6 h-6 text-green-400" />
              </div>
              <h3 className={`font-bold text-lg ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                {t('legend.fullyImplemented.title')}
              </h3>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {t('legend.fullyImplemented.description')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-lg"
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.90) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
              border: `2px solid ${isDark ? 'rgba(249, 115, 22, 0.5)' : 'rgba(249, 115, 22, 0.4)'}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/30 border border-orange-500/40">
                <Cpu className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className={`font-bold text-lg ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                {t('legend.inProgress.title')}
              </h3>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {t('legend.inProgress.description')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-lg"
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.90) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
              border: `2px solid ${isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.4)'}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/30 border border-blue-500/40">
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className={`font-bold text-lg ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                {t('legend.enterpriseSupport.title')}
              </h3>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {t('legend.enterpriseSupport.description')}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
