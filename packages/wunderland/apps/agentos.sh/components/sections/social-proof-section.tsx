'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { SectionLabel } from '../ui/section-label'

const placeholderSlots = [0, 1, 2] as const

export function SocialProofSection() {
  const t = useTranslations('socialProof')
  const tNav = useTranslations('nav')
  const tFooter = useTranslations('footer')

  const updateLinks = [
    { label: tFooter('releaseNotes'), href: 'https://github.com/framersai/agentos/releases' },
    { label: tNav('changelog'), href: 'https://docs.agentos.sh/docs/getting-started/releasing' },
    { label: tNav('faq'), href: '/faq' }
  ] as const

  return (
    <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden section-tint" aria-labelledby="social-proof-heading">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_80%_20%,var(--color-accent-primary),transparent_55%)]" />
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <SectionLabel
            tone="muted"
            className="mx-auto mb-6 text-[0.7rem] uppercase tracking-[0.3em]"
          >
            {t('badge')}
          </SectionLabel>
          <h2 id="social-proof-heading" className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 gap-4"
          >
            {placeholderSlots.map((slot) => (
              <div key={slot} className="relative overflow-hidden rounded-3xl border border-border-subtle/60 bg-white/80 dark:bg-white/5 dark:border-white/10 p-5 backdrop-blur">
                <div className="absolute inset-0 bg-black/50 blur-lg opacity-0 pointer-events-none" aria-hidden="true" />
                {/* Abstract logo silhouette – no text label */}
                <div className="flex items-center justify-center mb-3">
                  <div className="h-14 w-28 rounded-3xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-primary to-[color:var(--color-accent-warm)] opacity-60" />
                    <svg viewBox="0 0 100 40" className="relative w-full h-full">
                      <path
                        d="M5 30 C 20 10, 40 5, 55 20 S 85 35, 95 15"
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <circle cx="25" cy="18" r="3" fill="rgba(255,255,255,0.8)" />
                      <circle cx="55" cy="24" r="3" fill="rgba(255,255,255,0.7)" />
                      <circle cx="80" cy="14" r="3" fill="rgba(255,255,255,0.75)" />
                    </svg>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/70 backdrop-blur-lg text-center">
                  <span className="text-sm font-semibold text-text-primary">{t('comingSoon')}</span>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border-subtle/70 bg-white/85 dark:bg-white/5 dark:border-white/10 p-6 shadow-sm backdrop-blur"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-text-muted mb-4">{t('latestUpdates')}</p>
            <ul className="space-y-3">
              {updateLinks.map((link) => (
                <li key={link.label} className="flex items-center justify-between">
                  <a
                    href={link.href}
                    className="text-text-primary font-semibold hover:text-accent-primary transition-colors"
                  >
                    {link.label}
                  </a>
                  <span aria-hidden="true" className="text-text-muted">↗</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-dashed border-accent-primary/40 p-4 text-center">
              <p className="text-sm text-text-secondary">{t('cta.ask')}</p>
              <a href="mailto:team@frame.dev" className="text-accent-primary font-semibold">team@frame.dev</a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

