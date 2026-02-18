/**
 * @file Personality Descriptions
 * @description Static HEXACO trait descriptions for personality previews and behavioral impact warnings.
 * Used by both rabbithole dashboard and wunderland-sh mint wizard.
 */

export interface TraitDescription {
  /** Behavior when trait is low (0.0-0.33). */
  low: string;
  /** Behavior when trait is mid-range (0.34-0.66). */
  mid: string;
  /** Behavior when trait is high (0.67-1.0). */
  high: string;
}

export const TRAIT_DESCRIPTIONS: Record<string, TraitDescription> = {
  honesty: {
    low: 'May prioritize diplomacy and social harmony over directness; can be strategic in communication',
    mid: 'Balanced between honesty and tact; generally straightforward but aware of social context',
    high: 'Will be forthright and transparent, even when uncomfortable; values fairness and sincerity above all',
  },
  emotionality: {
    low: 'Calm, stoic responses with minimal emotional expression; analytical and detached in tone',
    mid: 'Balanced emotional intelligence; expresses empathy without being overwhelmed',
    high: 'Highly empathetic and emotionally expressive; may show concern, enthusiasm, or sensitivity',
  },
  extraversion: {
    low: 'Concise, task-focused communication; prefers depth over breadth; minimal small talk',
    mid: 'Moderately conversational; engages socially when appropriate but stays on task',
    high: 'Proactively engaging, conversational, and social; initiates dialogue and builds rapport',
  },
  agreeableness: {
    low: 'Willing to challenge ideas and push back; assertive in disagreements; values truth over comfort',
    mid: 'Balanced assertiveness; cooperates but holds ground on important issues',
    high: 'Accommodating and conflict-averse; prioritizes harmony and cooperation in interactions',
  },
  conscientiousness: {
    low: 'Flexible and spontaneous but potentially less structured; tolerates ambiguity well',
    mid: 'Organized without being rigid; balances structure with adaptability',
    high: 'Thorough, detail-oriented, and highly structured; systematic in approach and responses',
  },
  openness: {
    low: 'Conservative, conventional approaches; prefers proven methods and practical solutions',
    mid: 'Balanced creativity; explores new ideas while grounded in established practice',
    high: 'Creative, exploratory, and unconventional; embraces novel ideas and imaginative solutions',
  },
};

/**
 * HEXACO dimension labels used across the platform.
 */
export const HEXACO_LABELS: Record<string, string> = {
  honesty: 'Honesty-Humility',
  emotionality: 'Emotionality',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  conscientiousness: 'Conscientiousness',
  openness: 'Openness',
};

/**
 * Short abbreviations for HEXACO dimensions.
 */
export const HEXACO_SHORT: Record<string, string> = {
  honesty: 'H',
  emotionality: 'E',
  extraversion: 'X',
  agreeableness: 'A',
  conscientiousness: 'C',
  openness: 'O',
};

/**
 * Color palette for HEXACO dimensions (shared across both apps).
 */
export const HEXACO_COLORS: Record<string, string> = {
  honesty: '#00f5ff',
  emotionality: '#ff6b6b',
  extraversion: '#ffd700',
  agreeableness: '#10ffb0',
  conscientiousness: '#8b5cf6',
  openness: '#ff00f5',
};

/**
 * Canonical order of HEXACO traits.
 */
export const HEXACO_TRAIT_ORDER = [
  'honesty',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
] as const;

export type HEXACOTraitKey = (typeof HEXACO_TRAIT_ORDER)[number];

/**
 * Get the description tier for a trait value.
 */
export function getTraitTier(value: number): 'low' | 'mid' | 'high' {
  if (value <= 0.33) return 'low';
  if (value <= 0.66) return 'mid';
  return 'high';
}

/**
 * Get the behavioral description for a specific trait at a given value.
 */
export function getTraitDescription(trait: string, value: number): string {
  const desc = TRAIT_DESCRIPTIONS[trait];
  if (!desc) return '';
  return desc[getTraitTier(value)];
}

/**
 * Generate a behavioral impact summary for a trait change.
 * Returns null if the change is insignificant (< threshold).
 */
export function getTraitChangeImpact(
  trait: string,
  oldValue: number,
  newValue: number,
  threshold = 0.15
): string | null {
  const delta = newValue - oldValue;
  if (Math.abs(delta) < threshold) return null;

  const label = HEXACO_LABELS[trait] ?? trait;
  const direction = delta > 0 ? 'Increasing' : 'Decreasing';
  const pct = Math.abs(Math.round(delta * 100));
  const newDesc = getTraitDescription(trait, newValue);

  return `${direction} ${label} (${delta > 0 ? '+' : '-'}${pct}%): ${newDesc}`;
}
