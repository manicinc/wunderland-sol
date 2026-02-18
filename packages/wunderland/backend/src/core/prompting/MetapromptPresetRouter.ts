import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IContextBundle } from '../context/IContextAggregatorService.js';

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.resolve(path.dirname(__filename), '../../../../');

export interface MetapromptPresetDefinition {
  id: string;
  label?: string;
  description?: string;
  basePromptKey: string;
  addonPromptKeys?: string[];
}

export interface MetapromptPresetRule {
  id: string;
  priority: number;
  presetId: string;
  modes?: string[];
  anyKeywords?: string[];
  allKeywords?: string[];
  minMessageChars?: number;
  maxMessageChars?: number;
  derivedIntentIncludes?: string[];
  requiredOutputFormatIncludes?: string[];
}

export interface MetapromptPresetConfig {
  version: string;
  routing: {
    reviewEveryNTurns: number;
    forceReviewOnCompaction: boolean;
    defaultPresetId: string;
    defaultPresetByMode?: Record<string, string>;
  };
  presets: MetapromptPresetDefinition[];
  rules: MetapromptPresetRule[];
}

export interface MetapromptSelectionInput {
  conversationId?: string;
  mode: string;
  userMessage: string;
  contextBundle?: IContextBundle;
  didCompact?: boolean;
  forceReview?: boolean;
}

export interface MetapromptSelectionResult {
  presetId: string;
  label?: string;
  basePromptKey: string;
  addonPromptKeys: string[];
  wasReviewed: boolean;
  reason: string;
}

interface ConversationPresetState {
  presetId: string;
  turnsSinceReview: number;
  lastReviewedAt: number;
}

function normalize(s: string): string {
  return (s || '').trim().toLowerCase();
}

function matchesMode(ruleModes: string[] | undefined, mode: string): boolean {
  if (!ruleModes || ruleModes.length === 0) return true;
  const modeNorm = normalize(mode);
  return ruleModes.some((rm) => {
    const ruleModeNorm = normalize(rm);
    return (
      modeNorm === ruleModeNorm ||
      modeNorm.startsWith(ruleModeNorm) ||
      modeNorm.includes(ruleModeNorm)
    );
  });
}

function containsAny(haystack: string, needles: string[] | undefined): boolean {
  if (!needles || needles.length === 0) return true;
  const text = normalize(haystack);
  return needles.some((needle) => text.includes(normalize(needle)));
}

function containsAll(haystack: string, needles: string[] | undefined): boolean {
  if (!needles || needles.length === 0) return true;
  const text = normalize(haystack);
  return needles.every((needle) => text.includes(normalize(needle)));
}

function getDerivedIntent(bundle?: IContextBundle): string {
  return normalize(bundle?.primaryTask?.derivedIntent || '');
}

function getRequiredOutputFormat(bundle?: IContextBundle): string {
  return normalize(bundle?.primaryTask?.requiredOutputFormat || '');
}

class MetapromptPresetRouterImpl {
  private config: MetapromptPresetConfig | null = null;
  private configMtimeMs: number | null = null;
  private readonly stateByConversation: Map<string, ConversationPresetState> = new Map();

  private getConfigPath(): string {
    const override = process.env.METAPROMPT_PRESETS_PATH;
    if (override && override.trim()) {
      return path.resolve(override);
    }
    return path.join(__projectRoot, 'config', 'metaprompt-presets.json');
  }

  private loadConfigIfNeeded(): MetapromptPresetConfig {
    const configPath = this.getConfigPath();
    try {
      const stat = fs.statSync(configPath);
      if (this.config && this.configMtimeMs === stat.mtimeMs) {
        return this.config;
      }

      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as MetapromptPresetConfig;

      if (
        !parsed?.routing?.defaultPresetId ||
        !Array.isArray(parsed?.presets) ||
        !Array.isArray(parsed?.rules)
      ) {
        throw new Error('Invalid metaprompt preset config shape.');
      }

      this.config = parsed;
      this.configMtimeMs = stat.mtimeMs;
      return parsed;
    } catch (error) {
      console.error(
        '[MetapromptPresetRouter] Failed to load config. Using minimal defaults.',
        error
      );
      const fallback: MetapromptPresetConfig = {
        version: 'fallback',
        routing: {
          reviewEveryNTurns: 1,
          forceReviewOnCompaction: true,
          defaultPresetId: 'general_concise',
          defaultPresetByMode: { general: 'general_concise' },
        },
        presets: [
          {
            id: 'general_concise',
            label: 'General (Concise)',
            basePromptKey: 'general_chat',
            addonPromptKeys: ['_meta/concise'],
          },
        ],
        rules: [],
      };
      this.config = fallback;
      this.configMtimeMs = null;
      return fallback;
    }
  }

  private getPresetById(
    config: MetapromptPresetConfig,
    presetId: string
  ): MetapromptPresetDefinition | null {
    return config.presets.find((preset) => preset.id === presetId) ?? null;
  }

  private pickPresetIdByRules(
    config: MetapromptPresetConfig,
    input: MetapromptSelectionInput
  ): { presetId: string; reason: string } {
    const msgLen = input.userMessage?.length ?? 0;
    const derivedIntent = getDerivedIntent(input.contextBundle);
    const requiredFormat = getRequiredOutputFormat(input.contextBundle);

    const sortedRules = [...(config.rules || [])].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );
    for (const rule of sortedRules) {
      if (!matchesMode(rule.modes, input.mode)) continue;
      if (typeof rule.minMessageChars === 'number' && msgLen < rule.minMessageChars) continue;
      if (typeof rule.maxMessageChars === 'number' && msgLen > rule.maxMessageChars) continue;
      if (!containsAny(input.userMessage, rule.anyKeywords)) continue;
      if (!containsAll(input.userMessage, rule.allKeywords)) continue;
      if (
        rule.derivedIntentIncludes &&
        rule.derivedIntentIncludes.length > 0 &&
        !containsAny(derivedIntent, rule.derivedIntentIncludes)
      )
        continue;
      if (
        rule.requiredOutputFormatIncludes &&
        rule.requiredOutputFormatIncludes.length > 0 &&
        !containsAny(requiredFormat, rule.requiredOutputFormatIncludes)
      )
        continue;

      return { presetId: rule.presetId, reason: `rule:${rule.id}` };
    }

    const modeNorm = normalize(input.mode);
    const defaultByMode = config.routing.defaultPresetByMode || {};
    const exact = defaultByMode[modeNorm];
    if (exact) {
      return { presetId: exact, reason: `defaultByModeExact:${modeNorm}` };
    }

    // Pattern fallback: pick the longest key that matches the mode.
    const patternMatch = Object.entries(defaultByMode)
      .map(([key, presetId]) => ({ key: normalize(key), presetId }))
      .filter(
        ({ key }) => key && (modeNorm === key || modeNorm.startsWith(key) || modeNorm.includes(key))
      )
      .sort((a, b) => b.key.length - a.key.length)[0];
    if (patternMatch?.presetId) {
      return {
        presetId: patternMatch.presetId,
        reason: `defaultByModePattern:${patternMatch.key}`,
      };
    }

    return { presetId: config.routing.defaultPresetId, reason: 'default' };
  }

  public selectPreset(input: MetapromptSelectionInput): MetapromptSelectionResult {
    const config = this.loadConfigIfNeeded();
    const reviewEvery = Math.max(1, config.routing.reviewEveryNTurns || 1);
    const conversationId = input.conversationId?.trim() || undefined;

    const shouldForceReview =
      Boolean(input.forceReview) ||
      (Boolean(input.didCompact) && config.routing.forceReviewOnCompaction);
    if (conversationId) {
      const state = this.stateByConversation.get(conversationId);
      if (state && !shouldForceReview && state.turnsSinceReview < reviewEvery) {
        state.turnsSinceReview += 1;
        const preset =
          this.getPresetById(config, state.presetId) ??
          this.getPresetById(config, config.routing.defaultPresetId);
        return {
          presetId: preset?.id ?? config.routing.defaultPresetId,
          label: preset?.label,
          basePromptKey: preset?.basePromptKey ?? 'general_chat',
          addonPromptKeys: preset?.addonPromptKeys ?? [],
          wasReviewed: false,
          reason: 'cached',
        };
      }
    }

    const picked = this.pickPresetIdByRules(config, input);
    const preset =
      this.getPresetById(config, picked.presetId) ??
      this.getPresetById(config, config.routing.defaultPresetId);
    const resolvedPresetId = preset?.id ?? config.routing.defaultPresetId;

    if (conversationId) {
      this.stateByConversation.set(conversationId, {
        presetId: resolvedPresetId,
        turnsSinceReview: 0,
        lastReviewedAt: Date.now(),
      });
    }

    return {
      presetId: resolvedPresetId,
      label: preset?.label,
      basePromptKey: preset?.basePromptKey ?? 'general_chat',
      addonPromptKeys: preset?.addonPromptKeys ?? [],
      wasReviewed: true,
      reason: picked.reason,
    };
  }
}

export const metapromptPresetRouter = new MetapromptPresetRouterImpl();
