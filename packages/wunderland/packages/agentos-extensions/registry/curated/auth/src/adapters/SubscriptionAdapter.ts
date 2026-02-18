/**
 * @file Subscription tier management adapter
 */

import type { ISubscriptionService, ISubscriptionTier, SubscriptionConfig } from '../types.js';

const DEFAULT_TIERS: ISubscriptionTier[] = [
  { name: 'free', level: 0, features: [], isActive: true },
  { name: 'basic', level: 1, features: ['FEATURE_BASIC_TOOLS'], isActive: true },
  { name: 'pro', level: 2, features: ['FEATURE_BASIC_TOOLS', 'FEATURE_ADVANCED_SEARCH'], isActive: true },
  { name: 'enterprise', level: 3, features: ['FEATURE_BASIC_TOOLS', 'FEATURE_ADVANCED_SEARCH', 'FEATURE_CUSTOM_INTEGRATIONS'], isActive: true },
];

/**
 * Subscription tier management adapter for AgentOS
 */
export class SubscriptionAdapter implements ISubscriptionService {
  private tiers: Map<string, ISubscriptionTier>;
  private userTiers: Map<string, string>;
  private config: SubscriptionConfig;

  constructor(config: SubscriptionConfig = {}) {
    this.config = config;
    this.tiers = new Map();
    this.userTiers = new Map();
    
    const tiersToLoad = config.tiers ?? DEFAULT_TIERS;
    for (const tier of tiersToLoad) {
      this.tiers.set(tier.name, tier);
    }
  }

  async initialize(): Promise<void> {
    // Initialization complete
  }

  async getUserSubscription(userId: string): Promise<ISubscriptionTier | null> {
    if (!userId) return null;
    const tierName = this.userTiers.get(userId) ?? this.config.defaultTier ?? 'free';
    return this.tiers.get(tierName) ?? null;
  }

  async getUserSubscriptionTier(userId: string): Promise<ISubscriptionTier | null> {
    return this.getUserSubscription(userId);
  }

  async getTierByName(tierName: string): Promise<ISubscriptionTier | null> {
    return this.tiers.get(tierName) ?? null;
  }

  async listTiers(): Promise<ISubscriptionTier[]> {
    return Array.from(this.tiers.values()).sort((a, b) => a.level - b.level);
  }

  async validateAccess(userId: string, feature: string): Promise<boolean> {
    const tier = await this.getUserSubscription(userId);
    if (!tier) return false;
    return tier.features?.includes(feature) ?? false;
  }

  async validateTierAccess(userId: string, minimumTierName: string): Promise<boolean> {
    const userTier = await this.getUserSubscription(userId);
    const minimumTier = await this.getTierByName(minimumTierName);
    if (!userTier || !minimumTier) return false;
    return userTier.level >= minimumTier.level;
  }

  setUserTier(userId: string, tierName: string): void {
    if (!this.tiers.has(tierName)) {
      throw new Error(`Tier '${tierName}' does not exist`);
    }
    this.userTiers.set(userId, tierName);
  }

  addTier(tier: ISubscriptionTier): void {
    this.tiers.set(tier.name, tier);
  }
}

