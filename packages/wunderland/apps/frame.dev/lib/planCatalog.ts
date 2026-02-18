/**
 * Quarry Plan Catalog
 *
 * Three tiers:
 * - Free: Open source, no sync/AI
 * - Pro Monthly: $9/mo BYOK, includes sync (grandfathered from $18)
 * - Lifetime: $199 (beta: $99, early bird: $49, student: $69)
 */

export type PlanId = 'quarry-free' | 'quarry-pro-monthly' | 'quarry-lifetime'
export type PriceType = 'free' | 'one-time' | 'subscription'

export interface PlanCatalogEntry {
  id: PlanId
  displayName: string
  headline: string
  priceUsd: number
  launchPriceUsd?: number
  futurePriceUsd?: number
  priceType: PriceType
  billingPeriod?: 'monthly' | 'annual'
  bullets: string[]
  limitations?: string[]
  targetAudience: string
  isBeta?: boolean
  isGrandfathered?: boolean
  cloudSyncAddon?: { priceUsd: number; discountedPriceUsd: number }
}

export interface PromoCode {
  code: string
  discount: number
  finalPrice: number
  limit: number | null
  description: string
}

/**
 * Promotional codes for Quarry Pro
 */
export const QUARRY_PROMO_CODES: Record<string, PromoCode> = {
  EARLYBIRD: {
    code: 'EARLYBIRD',
    discount: 150,
    finalPrice: 49,
    limit: 499,
    description: 'First 499 customers - 75% off',
  },
  LAUNCH50: {
    code: 'LAUNCH50',
    discount: 100,
    finalPrice: 99,
    limit: null,
    description: 'Beta launch price - 50% off',
  },
  STUDENT: {
    code: 'STUDENT',
    discount: 30,
    finalPrice: 69,
    limit: null,
    description: '$30 off - email team@frame.dev with .edu',
  },
}

/**
 * Get all Quarry plan definitions
 */
export const getQuarryPlans = (): PlanCatalogEntry[] => [
  {
    id: 'quarry-free',
    displayName: 'Free',
    headline: 'Open Source MIT License',
    priceUsd: 0,
    priceType: 'free',
    targetAudience: 'Developers and learners who want full control and self-hosting.',
    bullets: [
      'Full semantic search & knowledge graph',
      'Markdown-native with OpenStrand protocol',
      'Auto-tagging & categorization',
      'Local-first with IndexedDB storage',
      'All 6 themes included',
      'Desktop & web apps',
      'ZIP export/import',
      'Self-host option (repo code included)',
      'MIT licensed - yours forever',
    ],
    limitations: [
      'No cloud sync',
      'No AI features',
    ],
  },
  {
    id: 'quarry-pro-monthly',
    displayName: 'Pro Monthly',
    headline: 'BYOK Subscription',
    priceUsd: 9,
    futurePriceUsd: 18,
    priceType: 'subscription',
    billingPeriod: 'monthly',
    isGrandfathered: true,
    targetAudience: 'Users who prefer monthly billing over lifetime purchase.',
    bullets: [
      'Everything in Free',
      'Cloud sync included',
      'Bidirectional Google Calendar sync',
      'Bring Your Own Keys (BYOK) for AI',
      'Windows, Mac, Linux apps',
      'iOS & Android apps',
      'Web access',
      'Priority support',
    ],
    limitations: [
      'BYOK required for AI features',
    ],
  },
  {
    id: 'quarry-lifetime',
    displayName: 'Lifetime',
    headline: 'Pay Once, Yours Forever',
    priceUsd: 199,
    launchPriceUsd: 99,
    priceType: 'one-time',
    isBeta: true,
    targetAudience: 'Power users who want lifetime access and all features.',
    cloudSyncAddon: { priceUsd: 9, discountedPriceUsd: 3 },
    bullets: [
      'Everything in Free',
      'All updates free forever',
      'Windows, Mac, Linux apps',
      'iOS, Android, Web access',
      'Bidirectional Google Calendar sync',
      'Team collaborative features (coming free)',
      'Cloud sync: $3/mo (discounted from $9)',
      'Self-host sync service option',
      'Learning Studio',
      'AI Q&A with citations',
      'FSRS flashcards',
      'Quiz generation',
      'Priority support',
    ],
  },
]

// Legacy aliases for backwards compatibility
export const getCodexPlans = getQuarryPlans
