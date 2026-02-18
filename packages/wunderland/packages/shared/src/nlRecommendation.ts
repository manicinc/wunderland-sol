/**
 * @file NL Recommendation Types
 * @description Shared type definitions for natural language agent configuration recommendations.
 * Used by both rabbithole agent builder and wunderland-sh mint wizard.
 */

/**
 * A single recommendation from the NL extraction pipeline.
 */
export interface NLRecommendation {
  /** Unique identifier for this recommendation. */
  id: string;
  /** Category of the recommended item. */
  category: 'skill' | 'tool' | 'channel' | 'personality' | 'security';
  /** The exact catalog ID (skill name, tool name, or channel platform). */
  itemId: string;
  /** Human-readable display name. */
  displayName: string;
  /** 1-2 sentence explanation of why this item is recommended. */
  reasoning: string;
  /** Confidence score from the LLM (0.0-1.0). */
  confidence: number;
  /** Whether the user has accepted this recommendation. */
  accepted: boolean;
}

/**
 * HEXACO personality suggestion from NL extraction.
 */
export interface NLPersonalitySuggestion {
  traits: {
    honesty: number;
    emotionality: number;
    extraversion: number;
    agreeableness: number;
    conscientiousness: number;
    openness: number;
  };
  /** Reasoning for the personality profile. */
  reasoning: string;
}

/**
 * Security tier suggestion from NL extraction.
 */
export interface NLSecurityTierSuggestion {
  /** One of: dangerous, permissive, balanced, strict, paranoid. */
  tier: string;
  /** Reasoning for the security tier choice. */
  reasoning: string;
}

/**
 * Identity suggestions from NL extraction.
 */
export interface NLIdentitySuggestion {
  displayName: string | null;
  bio: string | null;
  systemPrompt: string | null;
}

/**
 * Full response from the NL recommendation API endpoint.
 */
export interface NLRecommendationResponse {
  recommendations: NLRecommendation[];
  suggestedPreset: string | null;
  suggestedPresetReasoning: string | null;
  personalitySuggestion: NLPersonalitySuggestion | null;
  securityTierSuggestion: NLSecurityTierSuggestion | null;
  identitySuggestion: NLIdentitySuggestion | null;
}

/**
 * Request body for the NL recommendation API.
 */
export interface NLRecommendationRequest {
  /** Natural language description of the desired agent. */
  description: string;
  /** Optional: current hosting mode context. */
  hostingMode?: 'managed' | 'self_hosted';
}
