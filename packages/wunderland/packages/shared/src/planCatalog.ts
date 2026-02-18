/**
 * Shared plan catalog and helper utilities.
 *
 * The numbers documented here balance revenue against model usage cost.
 * - GPT-4o blended cost per 1K tokens is approximately $0.011 (40% input @ $0.005 + 60% output @ $0.015).
 * - GPT-4o mini blended cost per 1K tokens is approximately $0.00039 (40% input @ $0.00015 + 60% output @ $0.00060).
 *
 * Each paid tier allocates 35-45% of the monthly price to variable AI usage. The rest covers
 * infrastructure, human ops, and profit. Daily allowance = (monthly price * allocation %) / 30.
 */
export type PlanId =
  | 'global-pass'
  | 'free'
  | 'basic'
  | 'creator'
  | 'organization'
  | 'codex-free'
  | 'codex-pro'
  | 'rh-pro-monthly'
  | 'rh-pro-annual'
  | 'rh-lifetime'
  | 'rh-assistant-addon';
export type PlanTier = 'metered' | 'unlimited';

export type ByoApiKeyPolicy = 'disallowed' | 'optional' | 'required';

export interface PlanUsageProfile {
  /** USD budget available per day from the platform allowance. */
  dailyUsdAllowance: number;
  /**
   * Approximate GPT-4o tokens per day derived from the allowance.
   * These numbers assume a blended $0.011 / 1K token rate.
   */
  approxGpt4oTokensPerDay: number;
  /** Approximate GPT-4o mini tokens per day using $0.00039 / 1K tokens. */
  approxGpt4oMiniTokensPerDay: number;
  /** How bring-your-own API keys are handled on this plan. */
  byoApiKeys: ByoApiKeyPolicy;
  /** Additional notes displayed in plan tooltips. */
  notes?: string;
}

export interface PlanCheckoutDescriptor {
  provider: 'lemonsqueezy' | 'stripe';
  /** Environment variable that should contain the product/catalog identifier. */
  productEnvVar: string;
  /** Environment variable that should contain the plan/variant identifier. */
  variantEnvVar?: string;
  /** Environment variable that should contain the Stripe price ID (if applicable). */
  priceEnvVar?: string;
}

export interface PlanCatalogEntry {
  id: PlanId;
  slug: string;
  displayName: string;
  headline: string;
  monthlyPriceUsd: number;
  /** Allocation percentage from revenue to usage (documentary only). */
  usageAllocationPct: number;
  usage: PlanUsageProfile;
  bullets: string[];
  targetAudience: string;
  /** Checkout metadata for each supported billing provider. */
  checkout: PlanCheckoutDescriptor[];
  /** Whether the plan is publicly marketable. */
  public: boolean;
  /** Additional metadata flags for UI. */
  metadata?: {
    featured?: boolean;
    requiresContact?: boolean;
    hiddenOnMarketing?: boolean;
    tier?: PlanTier;
    agentLimits?: {
      maxActiveAgents: number;
      monthlyCreationAllowance: number;
      knowledgeDocumentsPerAgent: number;
      agencySeats?: number;
      agencyLaunchesPerWeek?: number;
    };
  };
}

export const GPT4O_COST_PER_KTOKENS = 0.011;
export const GPT4O_MINI_COST_PER_KTOKENS = 0.00039;

const toNearestToken = (usd: number, costPerKTokens: number): number => {
  if (usd <= 0) return 0;
  return Math.floor((usd / costPerKTokens) * 1000);
};

const buildUsageProfile = (
  dailyUsdAllowance: number,
  byoApiKeys: ByoApiKeyPolicy,
  notes?: string
): PlanUsageProfile => ({
  dailyUsdAllowance,
  approxGpt4oTokensPerDay: toNearestToken(dailyUsdAllowance, GPT4O_COST_PER_KTOKENS),
  approxGpt4oMiniTokensPerDay: toNearestToken(dailyUsdAllowance, GPT4O_MINI_COST_PER_KTOKENS),
  byoApiKeys,
  notes,
});

export const PLAN_CATALOG: Record<PlanId, PlanCatalogEntry> = {
  'global-pass': {
    id: 'global-pass',
    slug: 'global-pass',
    displayName: 'Global Lifetime Access',
    headline: 'Unlimited passphrase-login access for internal communities',
    monthlyPriceUsd: 0,
    usageAllocationPct: 0.0,
    usage: buildUsageProfile(
      0.35,
      'disallowed',
      'IP-scoped allowance resets nightly at 00:00 UTC.'
    ),
    bullets: [
      'Invite-only access controlled by rotating passphrases',
      'Shared usage tracked per IP with nightly reset',
      'Full model catalogue; limited by community allocation',
      'Best suited for ambassadors, hackathons, or beta cohorts',
    ],
    targetAudience:
      'Internal testers, community partners, or promo cohorts that do not require billing.',
    checkout: [],
    public: false,
    metadata: {
      hiddenOnMarketing: true,
      tier: 'unlimited',
    },
  },
  free: {
    id: 'free',
    slug: 'free',
    displayName: 'Free',
    headline: 'Try Voice Chat Assistant with GPT-4o mini',
    monthlyPriceUsd: 0,
    usageAllocationPct: 0,
    usage: buildUsageProfile(
      0.02,
      'disallowed',
      'Optimised for GPT-4o mini; roughly 45 prompts per day.'
    ),
    bullets: [
      'Access to GPT-4o mini (text + diagrams)',
      '~1,800 GPT-4o tokens / day (or ~51K GPT-4o mini tokens)',
      'Voice transcription via Whisper or Web Speech',
      'Public demo banner and anonymous rate limits',
    ],
    targetAudience: 'Curious visitors evaluating the assistant without payment details.',
    checkout: [],
    public: true,
    metadata: {
      tier: 'metered',
    },
  },
  basic: {
    id: 'basic',
    slug: 'basic',
    displayName: 'Basic',
    headline: 'Personal plan with premium models and smart rate limits',
    monthlyPriceUsd: 9,
    usageAllocationPct: 0.35,
    usage: buildUsageProfile(
      0.105,
      'disallowed',
      'Covers ~9,500 GPT-4o tokens / day (~285K GPT-4o mini).'
    ),
    bullets: [
      'GPT-4o mini + GPT-4o access with automatic model selection',
      'Daily platform allowance ~9,500 GPT-4o tokens',
      'Priority inference queue over free/global visitors',
      'Conversation memory, diagrams, and cost tracking',
    ],
    targetAudience: 'Individual developers with moderate daily usage requirements.',
    checkout: [
      {
        provider: 'lemonsqueezy',
        productEnvVar: 'LEMONSQUEEZY_BASIC_PRODUCT_ID',
        variantEnvVar: 'LEMONSQUEEZY_BASIC_VARIANT_ID',
      },
      {
        provider: 'stripe',
        productEnvVar: 'STRIPE_BASIC_PRODUCT_ID',
        priceEnvVar: 'STRIPE_BASIC_PRICE_ID',
      },
    ],
    public: true,
    metadata: {
      tier: 'metered',
    },
  },
  creator: {
    id: 'creator',
    slug: 'creator',
    displayName: 'Creator',
    headline: 'Advanced plan with BYO keys and feature previews',
    monthlyPriceUsd: 18,
    usageAllocationPct: 0.4,
    usage: buildUsageProfile(
      0.24,
      'optional',
      'House allowance covers ~21,800 GPT-4o tokens / day (~615K GPT-4o mini). BYO keys extend usage afterwards.'
    ),
    bullets: [
      'All Basic features plus GPT-4o Realtime + structured generation',
      'House allowance first, with seamless rollover to personal API keys',
      'Early access to experimental agents, custom personas, and tool chaining',
      'Per-request telemetry with cost split between platform vs BYO usage',
    ],
    targetAudience: 'Power users, independent consultants, and builders shipping AI products.',
    checkout: [
      {
        provider: 'lemonsqueezy',
        productEnvVar: 'LEMONSQUEEZY_CREATOR_PRODUCT_ID',
        variantEnvVar: 'LEMONSQUEEZY_CREATOR_VARIANT_ID',
      },
      {
        provider: 'stripe',
        productEnvVar: 'STRIPE_CREATOR_PRODUCT_ID',
        priceEnvVar: 'STRIPE_CREATOR_PRICE_ID',
      },
    ],
    public: true,
    metadata: {
      featured: true,
      tier: 'metered',
    },
  },
  organization: {
    id: 'organization',
    slug: 'organization',
    displayName: 'Organization',
    headline: 'Team workspace with seat management and pooled usage',
    monthlyPriceUsd: 99,
    usageAllocationPct: 0.45,
    usage: buildUsageProfile(
      1.485,
      'optional',
      'Shared pool �135K GPT-4o tokens / day (~3.8M GPT-4o mini). Admin allocates optional per-seat caps.'
    ),
    bullets: [
      'Everything in Creator for up to 5 seats (more seats via add-ons)',
      'Team dashboard with invite-based onboarding and seat controls',
      'Shared usage pool with optional per-member soft limits',
      'Role-based access (Admin, Builder, Viewer) and audit history',
    ],
    targetAudience: 'Startups and teams collaborating on calls, reviews, or customer delivery.',
    checkout: [
      {
        provider: 'lemonsqueezy',
        productEnvVar: 'LEMONSQUEEZY_ORG_PRODUCT_ID',
        variantEnvVar: 'LEMONSQUEEZY_ORG_VARIANT_ID',
      },
      {
        provider: 'stripe',
        productEnvVar: 'STRIPE_ORG_PRODUCT_ID',
        priceEnvVar: 'STRIPE_ORG_PRICE_ID',
      },
    ],
    public: true,
    metadata: {
      requiresContact: true,
      tier: 'metered',
    },
  },
  'codex-free': {
    id: 'codex-free',
    slug: 'codex-free',
    displayName: 'Codex Free',
    headline: 'Private doc ingestion with doc-level summaries',
    monthlyPriceUsd: 0,
    usageAllocationPct: 0.05,
    usage: buildUsageProfile(
      0.015,
      'disallowed',
      'Doc-level extractive summary, up to 500 MB hosted storage, and 20 hosted generations / month.'
    ),
    bullets: [
      'Ingest private strands with automatic doc-level summaries',
      'LLM-driven classification + tagging preview (per doc)',
      '500 MB encrypted storage for uploads and derived assets',
      '20 hosted generations (image/podcast) per month',
    ],
    targetAudience: 'Founders and researchers testing Codex workflows without advanced features.',
    checkout: [],
    public: true,
    metadata: {
      hiddenOnMarketing: true,
      tier: 'metered',
    },
  },
  'codex-pro': {
    id: 'codex-pro',
    slug: 'codex-pro',
    displayName: 'Codex Pro',
    headline: 'Block-level summarisation, Socratic notes, and hosted generations',
    monthlyPriceUsd: 9.99,
    usageAllocationPct: 0.35,
    usage: buildUsageProfile(
      0.12,
      'disallowed',
      'Block summaries + Socratic notes, 10 GB storage, 200 hosted generations / month.'
    ),
    bullets: [
      'Block-by-block summaries with highlight + reading time',
      'Socratic note suggestions and strand-to-strand linking',
      'Podcast + image generation with premium models',
      '10 GB encrypted storage and 200 hosted generations / month',
    ],
    targetAudience: 'Research teams and power users who need advanced Codex intelligence.',
    checkout: [
      {
        provider: 'lemonsqueezy',
        productEnvVar: 'LEMONSQUEEZY_CODEX_PRO_PRODUCT_ID',
        variantEnvVar: 'LEMONSQUEEZY_CODEX_PRO_VARIANT_ID',
      },
      {
        provider: 'stripe',
        productEnvVar: 'STRIPE_CODEX_PRO_PRODUCT_ID',
        priceEnvVar: 'STRIPE_CODEX_PRO_PRICE_ID',
      },
    ],
    public: true,
    metadata: {
      featured: true,
      tier: 'metered',
    },
  },

  'rh-pro-monthly': {
    id: 'rh-pro-monthly',
    slug: 'rh-pro-monthly',
    displayName: 'Pro Monthly',
    headline: 'Full platform access with human assistant hours',
    monthlyPriceUsd: 29.99,
    usageAllocationPct: 0,
    usage: buildUsageProfile(0, 'disallowed', 'Human assistant hours, not AI token-based.'),
    bullets: [
      'Full platform access',
      '3 hours/week human assistant',
      'Priority task routing',
      'All AI agent integrations',
      'PII protection included',
    ],
    targetAudience: 'Individual professionals needing AI-human collaboration.',
    checkout: [
      {
        provider: 'stripe',
        productEnvVar: 'STRIPE_RH_PRO_MONTHLY_PRODUCT_ID',
        priceEnvVar: 'STRIPE_RH_PRO_MONTHLY_PRICE_ID',
      },
    ],
    public: true,
    metadata: { featured: true },
  },
  'rh-pro-annual': {
    id: 'rh-pro-annual',
    slug: 'rh-pro-annual',
    displayName: 'Pro Annual',
    headline: 'Save 31% with annual billing — includes human assistant hours',
    monthlyPriceUsd: 20.75,
    usageAllocationPct: 0,
    usage: buildUsageProfile(0, 'disallowed', 'Human assistant hours, not AI token-based.'),
    bullets: [
      'Everything in Pro Monthly',
      '3 hours/week human assistant',
      'Save $110.88/year vs monthly',
      'Priority support',
    ],
    targetAudience: 'Committed users who want the best value.',
    checkout: [
      {
        provider: 'stripe',
        productEnvVar: 'STRIPE_RH_PRO_ANNUAL_PRODUCT_ID',
        priceEnvVar: 'STRIPE_RH_PRO_ANNUAL_PRICE_ID',
      },
    ],
    public: true,
  },
  'rh-lifetime': {
    id: 'rh-lifetime',
    slug: 'rh-lifetime',
    displayName: 'Lifetime',
    headline: 'One-time purchase for lifetime platform access',
    monthlyPriceUsd: 0,
    usageAllocationPct: 0,
    usage: buildUsageProfile(0, 'disallowed', 'Lifetime access, no recurring fees.'),
    bullets: [
      'Lifetime platform access',
      'All AI agent integrations',
      'PII protection & RBAC',
      'All future updates included',
    ],
    targetAudience: 'Early adopters who want permanent access.',
    checkout: [
      {
        provider: 'stripe',
        productEnvVar: 'STRIPE_RH_LIFETIME_PRODUCT_ID',
        priceEnvVar: 'STRIPE_RH_LIFETIME_PRICE_ID',
      },
    ],
    public: true,
  },
  'rh-assistant-addon': {
    id: 'rh-assistant-addon',
    slug: 'rh-assistant-addon',
    displayName: 'Human Assistant Add-on',
    headline: '3 hours/week of human assistant support for Lifetime members',
    monthlyPriceUsd: 12.5,
    usageAllocationPct: 0,
    usage: buildUsageProfile(0, 'disallowed', '$150/year billed annually.'),
    bullets: [
      '3 hours/week human assistant',
      'Priority task routing',
      'Available for Lifetime plan members',
    ],
    targetAudience: 'Lifetime members who want human assistant hours.',
    checkout: [
      {
        provider: 'stripe',
        productEnvVar: 'STRIPE_RH_ASSISTANT_ADDON_PRODUCT_ID',
        priceEnvVar: 'STRIPE_RH_ASSISTANT_ADDON_PRICE_ID',
      },
    ],
    public: true,
    metadata: { hiddenOnMarketing: true },
  },
};

export const PUBLIC_PLAN_ORDER: PlanId[] = ['free', 'basic', 'creator', 'organization'];

export const getPublicPlans = (): PlanCatalogEntry[] =>
  PUBLIC_PLAN_ORDER.map((id) => PLAN_CATALOG[id]).filter((plan) => plan.public);

export const CODEX_PLAN_ORDER: PlanId[] = ['codex-free', 'codex-pro'];

export const getCodexPlans = (): PlanCatalogEntry[] =>
  CODEX_PLAN_ORDER.map((id) => PLAN_CATALOG[id]);

export const findPlanById = (id: PlanId): PlanCatalogEntry => PLAN_CATALOG[id];

export const RH_PLAN_ORDER: PlanId[] = ['rh-pro-monthly', 'rh-pro-annual', 'rh-lifetime'];

export const getRhPlans = (): PlanCatalogEntry[] => RH_PLAN_ORDER.map((id) => PLAN_CATALOG[id]);

export interface PlanRolloverExplanation {
  planId: PlanId;
  description: string;
}

export const PLAN_ROLLOVER_RULES: PlanRolloverExplanation[] = [
  {
    planId: 'basic',
    description:
      'Usage stops when the daily platform allowance is exhausted. No BYO API keys allowed.',
  },
  {
    planId: 'creator',
    description:
      'Platform allowance is consumed first, then requests fall back to user-supplied API keys with clear UI badges.',
  },
  {
    planId: 'organization',
    description:
      'Shared workspace allowance is consumed first; admins can enforce seat-level soft caps before BYO keys engage.',
  },
  {
    planId: 'global-pass',
    description: 'Allowance is enforced per IP. Admins rotate passphrases manually when required.',
  },
  {
    planId: 'codex-free',
    description:
      'Doc-level summarisation only, 500 MB storage, and up to 20 hosted generations per month. Upgrade to unlock block insights.',
  },
  {
    planId: 'codex-pro',
    description:
      'Full Codex intelligence: block summaries, Socratic notes, 10 GB storage, and premium podcast/image generations.',
  },
];
