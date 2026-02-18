'use client'

import { motion } from 'framer-motion'
import { Github, MessageCircle, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function CTASection() {
  const t = useTranslations('cta')
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_15%_10%,var(--color-accent-warm-soft),transparent_60%),radial-gradient(circle_at_85%_20%,hsla(260,90%,65%,0.25),transparent_70%)]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] bg-clip-text text-transparent">
              {t('title')}
            </span>
          </h2>

          <p className="text-base sm:text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            {t('description')}
          </p>
        </motion.div>

        {/* Main CTA Links */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto"
        >
          <div className="grid grid-cols-3 gap-3">
            <a
              href="https://vca.chat"
              className="group flex flex-col items-center gap-2 p-4 bg-[var(--color-background-card)] backdrop-blur-xl rounded-xl border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/5 transition-all duration-300"
            >
              <MessageCircle className="w-5 h-5 text-[var(--color-accent-primary)]" />
              <span className="text-xs font-medium">{t('tryVoiceChat')}</span>
            </a>

            <a
              href="https://github.com/framersai/agentos"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 p-4 bg-[var(--color-background-card)] backdrop-blur-xl rounded-xl border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/5 transition-all duration-300"
            >
              <Github className="w-5 h-5 text-[var(--color-accent-primary)]" />
              <span className="text-xs font-medium">{t('browseCode')}</span>
            </a>

            <a
              href="https://docs.agentos.sh"
              className="group flex flex-col items-center gap-2 p-4 bg-[var(--color-background-card)] backdrop-blur-xl rounded-xl border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/5 transition-all duration-300"
            >
              <Sparkles className="w-5 h-5 text-[var(--color-accent-primary)]" />
              <span className="text-xs font-medium">Docs</span>
            </a>
          </div>
        </motion.div>

        {/* We are the Framers - Typographic Effect */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 text-center"
        >
          <a 
            href="https://frame.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group inline-block"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-3 group-hover:text-[var(--color-text-secondary)] transition-colors">
              Built by
            </p>
            <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-[var(--color-accent-primary)] via-[var(--color-accent-secondary)] to-[var(--color-accent-warm)] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x group-hover:animate-none">
                WE ARE THE FRAMERS
              </span>
            </h3>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-[var(--color-text-muted)]">
              <span>frame.dev</span>
              <span className="w-1 h-1 rounded-full bg-[var(--color-accent-primary)]" />
              <span>@framersai</span>
            </div>
          </a>
        </motion.div>

        {/* Minimal Wave Divider */}
        <div className="mt-12 h-px bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </div>
    </section>
  )
}