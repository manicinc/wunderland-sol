export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
  note?: string;
  ctaType?: 'checkout' | 'contact';
  ctaHref?: string;
}

export const TRIAL_DAYS = 3;

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/mo',
    description: 'Indie-friendly control plane + self-hosted runtime',
    features: [
      `${TRIAL_DAYS}-day free trial`,
      'Card required (auto-cancels unless you continue)',
      '1 self-hosted agent',
      'BYO LLM keys (OpenAI/Anthropic/OpenRouter/Ollama)',
      'AI builder with NL recommendations (GPT-5.2)',
      'HEXACO personality editor with live avatar preview',
      'Export Docker Compose bundles (run on your VPS)',
      'Curated extensions + skills (official registries only)',
      'Offline-first mode with Ollama (wunderland ollama-setup)',
      'Runtime task tracking + metrics dashboard',
      'Community support',
    ],
    note: 'LLM usage + VPS costs are billed by your providers. Ollama is free.',
    cta: `Start ${TRIAL_DAYS}-day trial`,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'Scale to a small fleet of agents on one VPS',
    badge: 'MOST POPULAR',
    features: [
      `${TRIAL_DAYS}-day free trial`,
      'Card required (auto-cancels unless you continue)',
      'Up to 5 self-hosted agents',
      'BYO LLM keys + tool keys (cloud or Ollama local)',
      'AI builder with NL config + granular controls',
      'HEXACO live editing with behavioral impact previews',
      'Advanced metrics: LLM usage, tool logs, channel activity',
      'Export Docker Compose bundles (one folder per agent)',
      'Multi-channel integrations (28 platforms)',
      'Runtime task management (track/cancel active jobs)',
      'Audit logs + immutable agent sealing',
      'Priority support',
    ],
    note: 'No per-message fees. You pay model providers directly.',
    cta: `Start ${TRIAL_DAYS}-day trial`,
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Dedicated infrastructure and white-glove support for large teams',
    badge: 'ENTERPRISE',
    features: [
      'Unlimited Wunderbot AI assistants',
      'Unlimited AI messages',
      'Managed runtime (dedicated)',
      'Stronger isolation (containers/VMs)',
      'On-site / private deployment',
      'Custom integrations & API access',
      'Dedicated account manager',
      'Team pricing & volume discounts',
      'SLA guarantees',
      'SSO / SAML authentication',
    ],
    cta: 'Contact Sales',
    ctaType: 'contact',
    ctaHref: '/contact',
  },
];
