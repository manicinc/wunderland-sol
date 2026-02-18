import { getCodexPlans, type PlanCatalogEntry, type PlanId } from '@/lib/planCatalog'
import { GUMROAD_PRODUCT_URL } from '@/lib/config/gumroad'
import clsx from 'clsx'
import { Check, Sparkles, X, Github } from 'lucide-react'
import Link from 'next/link'

type CodexPlanId = Extract<PlanId, 'codex-community' | 'codex-premium'>

const CTA_COPY: Record<
  CodexPlanId,
  {
    label: string
    sublabel: string
    href: string
    external?: boolean
  }
> = {
  'codex-community': {
    label: 'Download Free',
    sublabel: 'Open source, self-hosted',
    href: 'https://github.com/framersai/codex',
    external: true,
  },
  'codex-premium': {
    label: 'Get Premium',
    sublabel: 'Full offline power, all AI features',
    href: GUMROAD_PRODUCT_URL,
    external: true,
  },
}

const PLAN_BADGES: Partial<Record<CodexPlanId, string>> = {
  'codex-premium': 'Full Power',
  'codex-community': 'Open Source',
}

function formatPrice(plan: PlanCatalogEntry) {
  if (plan.priceUsd === 0) return 'Free'
  return `$${plan.priceUsd}`
}

function buildCtaHref(planId: CodexPlanId) {
  return CTA_COPY[planId].href
}

export function CodexPricingSection() {
  const plans = getCodexPlans()

  return (
    <section className="border-b border-ink-100/40 bg-gradient-to-b from-paper-50 via-white to-paper-100/40 dark:border-ink-800 dark:from-ink-900 dark:via-ink-900 dark:to-ink-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 md:py-20">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-200/60 px-4 py-2 text-xs uppercase tracking-[0.4em] text-ink-500 dark:border-ink-800 dark:text-ink-300">
            <Sparkles className="h-3.5 w-3.5 text-frame-green" />
            Choose Your Edition
          </div>
          <div className="mx-auto max-w-3xl space-y-3">
            <h2 className="font-display text-responsive-4xl text-ink-900 dark:text-white">Your Knowledge, Your Way</h2>
            <p className="text-lg text-ink-600 dark:text-ink-200">
              Start free with our open-source Community Edition. Upgrade to Premium for full offline power, AI Q&A, quizzes, and more.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => {
            const codexPlanId = plan.id as CodexPlanId
            const cta = CTA_COPY[codexPlanId]
            const badge = PLAN_BADGES[codexPlanId]
            const isPremium = codexPlanId === 'codex-premium'

            return (
              <article
                key={plan.id}
                className={clsx(
                  'group relative flex flex-col rounded-3xl border bg-white/90 p-6 shadow-paper transition hover:-translate-y-1 hover:shadow-paper-hover dark:bg-ink-900/70 dark:text-white',
                  isPremium
                    ? 'border-frame-green/60 shadow-frame-glow ring-1 ring-frame-green/40'
                    : 'border-ink-100/70 dark:border-ink-800/80',
                )}
              >
                {badge ? (
                  <span className={clsx(
                    'absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    isPremium ? 'bg-frame-green/10 text-frame-green' : 'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300'
                  )}>
                    {badge}
                  </span>
                ) : null}

                {/* Launch price badge for Premium */}
                {isPremium && plan.launchPriceUsd && (
                  <span className="absolute left-5 top-5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    $49 launch price coming soon
                  </span>
                )}

                <div className="space-y-2 pb-4 pt-2">
                  <div className="text-sm uppercase tracking-[0.3em] text-ink-500 dark:text-ink-300">{plan.displayName}</div>
                  <h3 className="text-2xl font-semibold text-ink-900 dark:text-white">{plan.headline}</h3>
                  <p className="text-sm text-ink-500 dark:text-ink-200">{plan.targetAudience}</p>
                </div>

                <div className="flex items-end gap-2 pb-6">
                  <span className="text-4xl font-bold text-ink-900 dark:text-white">{formatPrice(plan)}</span>
                  <span className="text-sm text-ink-500 dark:text-ink-300">
                    {plan.priceType === 'free' ? 'forever' : 'one-time'}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-3 pb-4 text-sm text-ink-600 dark:text-ink-100">
                  {plan.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-full border border-frame-green/40 bg-frame-green/10 p-1 text-frame-green">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {/* Limitations (for Community) */}
                {plan.limitations && plan.limitations.length > 0 && (
                  <ul className="space-y-2 border-t border-ink-100 dark:border-ink-800 pt-4 pb-6 text-sm text-ink-400 dark:text-ink-500">
                    {plan.limitations.map((limitation) => (
                      <li key={limitation} className="flex items-start gap-3">
                        <span className="mt-0.5">
                          <X className="h-4 w-4" />
                        </span>
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto space-y-2">
                  <Link
                    href={buildCtaHref(codexPlanId)}
                    prefetch={false}
                    target={cta.external ? '_blank' : undefined}
                    rel={cta.external ? 'noopener noreferrer' : undefined}
                    className={clsx(
                      'flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                      isPremium
                        ? 'bg-frame-green text-ink-900 shadow-frame-glow hover:bg-frame-green/90'
                        : 'border border-ink-200/70 text-ink-700 hover:border-frame-green hover:text-ink-900 dark:border-ink-700 dark:text-white',
                    )}
                  >
                    {!isPremium && <Github className="h-4 w-4" />}
                    {cta.label}
                  </Link>
                  <p className="text-center text-xs text-ink-500 dark:text-ink-300">{cta.sublabel}</p>
                </div>
              </article>
            )
          })}
        </div>

        {/* Enterprise note */}
        <p className="text-center text-sm text-ink-500 dark:text-ink-400">
          Need team features or enterprise deployment?{' '}
          <Link href="mailto:enterprise@frame.dev" className="text-frame-green hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </section>
  )
}

