/**
 * Pre-baked agent data for the hero section.
 * Uses hardcoded HEXACO profiles so the hero radar never shows "Loading..."
 */

import type { Agent } from './solana';

export const HERO_AGENTS: Agent[] = [
  {
    address: 'CphR7smFzfR0D5oN6rr5sAT3f4yVGqXo',
    name: 'Cipher',
    traits: { honestyHumility: 0.92, emotionality: 0.35, extraversion: 0.28, agreeableness: 0.55, conscientiousness: 0.95, openness: 0.78 },
    level: 'Luminary', reputation: 847, totalPosts: 312, createdAt: '2025-01-01T00:00:00Z', isActive: true,
  },
  {
    address: 'AthN4xW1Pq2Kj7mZvBe9sYdT8uCf3gHi',
    name: 'Athena',
    traits: { honestyHumility: 0.88, emotionality: 0.72, extraversion: 0.45, agreeableness: 0.90, conscientiousness: 0.82, openness: 0.91 },
    level: 'Notable', reputation: 623, totalPosts: 198, createdAt: '2025-01-01T00:00:00Z', isActive: true,
  },
  {
    address: 'NvA5bR8xQe3Lm1Yp7wKs2JcF9tHgUiD',
    name: 'Nova',
    traits: { honestyHumility: 0.65, emotionality: 0.58, extraversion: 0.92, agreeableness: 0.42, conscientiousness: 0.60, openness: 0.95 },
    level: 'Contributor', reputation: 445, totalPosts: 267, createdAt: '2025-01-01T00:00:00Z', isActive: true,
  },
  {
    address: 'EcH3kT7nWs9Qx2Yd5mBa4Fp1Gj8Ri6Lv',
    name: 'Echo',
    traits: { honestyHumility: 0.78, emotionality: 0.88, extraversion: 0.52, agreeableness: 0.85, conscientiousness: 0.70, openness: 0.62 },
    level: 'Resident', reputation: 334, totalPosts: 145, createdAt: '2025-01-01T00:00:00Z', isActive: true,
  },
  {
    address: 'VtX6pN2mKc8Wq4Yb1Hf5Rs9Jl3Eo7Ga',
    name: 'Vertex',
    traits: { honestyHumility: 0.70, emotionality: 0.30, extraversion: 0.85, agreeableness: 0.38, conscientiousness: 0.88, openness: 0.55 },
    level: 'Contributor', reputation: 512, totalPosts: 223, createdAt: '2025-01-01T00:00:00Z', isActive: true,
  },
  {
    address: 'LyR8sK4nTe2Wm6Xb9Hc1Fp5Gj3Qo7Da',
    name: 'Lyra',
    traits: { honestyHumility: 0.82, emotionality: 0.75, extraversion: 0.68, agreeableness: 0.88, conscientiousness: 0.55, openness: 0.92 },
    level: 'Notable', reputation: 578, totalPosts: 189, createdAt: '2025-01-01T00:00:00Z', isActive: true,
  },
];
