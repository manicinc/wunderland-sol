'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Download, TrendingUp, DollarSign, Users, ArrowRight } from 'lucide-react';

interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  pricing: {
    type: 'free' | 'paid' | 'freemium';
    price?: number;
    currency?: string;
    label?: string;
  };
  author: string;
  rating?: number;
  downloads?: number;
  revenue?: string;
  personaId?: string;
}

const FALLBACK_AGENTS: MarketplaceAgent[] = [
  {
    id: 'atlas-architect',
    name: 'Atlas Systems Architect',
    description: 'Enterprise-grade system design and code review with deep technical expertise',
    category: 'Developer Tools',
    pricing: { type: 'paid', price: 49, currency: 'USD' },
    author: 'Frame.dev',
    rating: 4.9,
    downloads: 1250,
    revenue: '$2,450/mo'
  },
  {
    id: 'creative-muse',
    name: 'Creative Muse',
    description: 'AI-powered creative writing and ideation assistant for content creators',
    category: 'Creative',
    pricing: { type: 'freemium' },
    author: 'Community',
    rating: 4.7,
    downloads: 3400
  },
  {
    id: 'data-analyst-pro',
    name: 'Data Analyst Pro',
    description: 'Advanced data analysis, visualization, and insights generation',
    category: 'Analytics',
    pricing: { type: 'paid', price: 99, currency: 'USD' },
    author: 'DataCraft',
    rating: 4.8,
    downloads: 890,
    revenue: '$8,900/mo'
  },
  {
    id: 'language-tutor',
    name: 'Polyglot Language Tutor',
    description: 'Adaptive language learning with conversation practice in 20+ languages',
    category: 'Education',
    pricing: { type: 'freemium' },
    author: 'EduTech Labs',
    rating: 4.9,
    downloads: 5600,
    revenue: '$4,200/mo'
  },
  {
    id: 'sales-assistant',
    name: 'Sales Accelerator',
    description: 'CRM integration, lead qualification, and automated follow-ups',
    category: 'Business',
    pricing: { type: 'paid', price: 79, currency: 'USD' },
    author: 'SalesForce AI',
    rating: 4.6,
    downloads: 2100,
    revenue: '$12,400/mo'
  },
  {
    id: 'wellness-coach',
    name: 'Wellness Coach AI',
    description: 'Personalized health, fitness, and mental wellness guidance',
    category: 'Health',
    pricing: { type: 'free' },
    author: 'HealthTech',
    rating: 4.8,
    downloads: 8900
  }
];

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

interface MarketplaceAgentSummaryResponse {
  id: string;
  personaId: string;
  label: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  pricing: {
    model: 'free' | 'paid' | 'freemium' | null;
    priceCents: number | null;
    currency: string | null;
  };
  metrics?: {
    downloads?: number;
    rating?: number;
    revenueMonthlyUsd?: number;
    customers?: number;
  };
}

// (SEO) This marketplace is the curated AgentOS marketplace

const avatarGradients = [
  'from-rose-500/20 via-rose-400/10 to-purple-500/20 text-rose-600',
  'from-sky-500/20 via-sky-400/10 to-cyan-500/20 text-sky-600',
  'from-amber-500/20 via-orange-400/10 to-amber-500/20 text-amber-600',
  'from-emerald-500/20 via-teal-400/10 to-emerald-500/20 text-emerald-600',
  'from-purple-500/20 via-violet-400/10 to-purple-500/20 text-purple-600',
  'from-slate-500/20 via-slate-400/10 to-slate-500/20 text-slate-600'
];

function mapMarketplaceAgent(agent: MarketplaceAgentSummaryResponse): MarketplaceAgent {
  const pricingModel = (agent.pricing?.model ?? 'freemium') as 'free' | 'paid' | 'freemium';
  const price =
    typeof agent.pricing?.priceCents === 'number' ? agent.pricing.priceCents / 100 : undefined;
  const pricingLabel =
    pricingModel === 'paid' && typeof price === 'number'
      ? new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: agent.pricing?.currency ?? 'USD',
          minimumFractionDigits: 0,
        }).format(price) + '/mo'
      : undefined;

  const metrics = agent.metrics ?? {};

  return {
    id: agent.id,
    personaId: agent.personaId,
    name: agent.label,
    description: agent.tagline ?? agent.description ?? agent.label,
    category: agent.category ?? 'General',
    pricing: {
      type: pricingModel,
      price,
      currency: agent.pricing?.currency ?? 'USD',
      label: pricingLabel,
    },
    author: 'Frame.dev',
    rating: typeof metrics.rating === 'number' ? metrics.rating : undefined,
    downloads: typeof metrics.downloads === 'number' ? metrics.downloads : undefined,
    revenue:
      typeof metrics.revenueMonthlyUsd === 'number'
        ? `$${metrics.revenueMonthlyUsd.toLocaleString()}/mo`
        : undefined,
  };
}

function AgentAvatar({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const gradientClass = avatarGradients[index % avatarGradients.length];

  return (
    <div className={`marketplace-avatar ${gradientClass}`}>
      {initials || 'AI'}
    </div>
  );
}

function AgentCard({ agent, index }: { agent: MarketplaceAgent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative glass-panel flex flex-col transition-all transition-theme hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <AgentAvatar name={agent.name} index={index} />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{agent.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">by {agent.author}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {agent.category}
        </span>
      </div>

      {/* Description */}
      <p className="mt-4 flex-1 text-sm text-slate-600 dark:text-slate-300">{agent.description}</p>

      {/* Revenue chip */}
      {agent.revenue && (
        <div className="mt-3">
          <span className="marketplace-chip">
            <span className="marketplace-chip__value">{agent.revenue}</span>
            <span className="marketplace-chip__label">Creator earnings</span>
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 border-t border-slate-200/50 pt-4 text-xs dark:border-slate-700/50">
        {agent.rating !== undefined && (
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="font-medium">{agent.rating.toFixed(1)}</span>
          </div>
        )}
        {agent.downloads !== undefined && (
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Download className="h-3 w-3" />
            <span>{agent.downloads.toLocaleString()}</span>
          </div>
        )}
        <div className="ml-auto">
          {agent.pricing.type === 'free' && (
            <span className="marketplace-badge marketplace-badge--free">
              {agent.pricing.label ?? 'Free'}
            </span>
          )}
          {agent.pricing.type === 'paid' && (
            <span className="marketplace-badge marketplace-badge--paid">
              {agent.pricing.label ??
                (agent.pricing.price
                  ? new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: agent.pricing.currency ?? 'USD',
                      minimumFractionDigits: 0,
                    }).format(agent.pricing.price)
                  : 'Paid')}
            </span>
          )}
          {agent.pricing.type === 'freemium' && (
            <span className="marketplace-badge marketplace-badge--freemium">
              {agent.pricing.label ?? 'Freemium'}
            </span>
          )}
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-brand/5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <a
          href="https://vca.chat"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
        >
          View in marketplace
        </a>
      </div>
    </motion.div>
  );
}

const SKELETON_CARD_COUNT = 6;

export function MarketplacePreview() {
  const [agents, setAgents] = useState<MarketplaceAgent[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadAgents = async () => {
      // Only fetch live data if API is enabled
      if (!process.env.NEXT_PUBLIC_MARKETPLACE_API_ENABLED) {
        setAgents(FALLBACK_AGENTS);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/marketplace/agents`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Marketplace request failed with status ${response.status}`);
        }
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload?.agents)) {
          const mapped = payload.agents.map(mapMarketplaceAgent);
          setAgents(mapped.length ? mapped : FALLBACK_AGENTS);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[MarketplacePreview] Falling back to static marketplace data.', error);
          setAgents(FALLBACK_AGENTS);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAgents();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const showSkeleton = (agents === null && isLoading) || (!agents && isLoading);
  const displayAgents = agents ?? FALLBACK_AGENTS;

  return (
    <div className="space-y-12 transition-theme">
      {/* Curated AgentOS marketplace CTA */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 px-6 py-8 sm:px-10"
      >
        <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-fuchsia-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-gradient-to-tr from-violet-500/15 via-cyan-500/10 to-rose-500/15 blur-3xl" />

        <div className="relative z-10 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Curated AgentOS Marketplace (vca.chat)
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Publish AgentOS‑compatible agents and earn, or share them for free. CI/CD, security checks, packaging,
              distribution, and hosting are first‑class. Discover and share with the community on{' '}
              <a href="https://vca.chat" className="font-semibold text-accent-primary underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">vca.chat</a>.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-700 dark:text-slate-200">
              <span className="inline-flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent-primary" /> Sell or share free
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-accent-primary" /> Curated community
              </span>
              <span className="inline-flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent-primary" /> Built-in CI/CD & security
              </span>
            </div>
          </div>
          <div className="flex gap-3 sm:justify-end">
            <a
              href="https://app.vca.chat/marketplace"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Open marketplace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://vca.chat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-accent-primary/30 px-5 py-2.5 text-sm font-semibold text-accent-primary transition-all hover:bg-accent-primary/10"
            >
              Visit vca.chat
            </a>
          </div>
        </div>
      </motion.div>
      {/* Featured Agents Grid */}
      <div>
        <div className="marketplace-featured__intro text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Featured agents in the marketplace</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Discover pre-built agents ready to deploy, or create your own and start earning.
          </p>
        </div>

        <div role="status" aria-live="polite" aria-busy={showSkeleton}>
          {showSkeleton && <span className="sr-only">Loading featured agents…</span>}
          {showSkeleton ? (
            <div className="marketplace-card-grid marketplace-card-grid--skeleton" aria-hidden="true">
              {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
                <div key={`marketplace-skeleton-${index}`} className="marketplace-card-skeleton">
                  <div className="marketplace-card-skeleton__header">
                    <div className="marketplace-card-skeleton__avatar marketplace-shimmer" />
                    <div className="marketplace-card-skeleton__title">
                      <div className="marketplace-card-skeleton__line marketplace-card-skeleton__line--short marketplace-shimmer" />
                      <div className="marketplace-card-skeleton__line marketplace-card-skeleton__line--xs marketplace-shimmer" />
                    </div>
                  </div>
                  <div className="marketplace-card-skeleton__line marketplace-card-skeleton__line--full marketplace-shimmer" />
                  <div className="marketplace-card-skeleton__line marketplace-card-skeleton__line--medium marketplace-shimmer" />
                  <div className="marketplace-card-skeleton__chips">
                    <span className="marketplace-card-skeleton__chip marketplace-shimmer" />
                    <span className="marketplace-card-skeleton__chip marketplace-shimmer" />
                    <span className="marketplace-card-skeleton__chip marketplace-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayAgents.map((agent, index) => (
                <AgentCard key={agent.id} agent={agent} index={index} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <a
            href="https://vca.chat"
            target="_blank"
            rel="noopener noreferrer"
            className="marketplace-cta__button marketplace-cta__button--primary inline-flex items-center justify-center"
          >
            Browse all agents
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
