/**
 * @fileoverview Keyword/Phrase Pattern Guardrail
 * @description Detects exact matches, partial matches, or regex patterns in user input
 * or agent output. Supports case-sensitive and case-insensitive matching, plus configurable
 * actions per pattern.
 * 
 * This is the simplest, most efficient guardrail for known prohibited terms or required
 * formatting. Use this instead of GenericLLMGuardrail when you have explicit keywords
 * to block/flag/sanitize.
 * 
 * @example
 * ```typescript
 * const guard = new KeywordGuardrail({
 *   patterns: [
 *     { text: 'password123', action: 'sanitize', replacement: '[REDACTED]', caseSensitive: true },
 *     { text: 'confidential', action: 'flag', caseSensitive: false },
 *     { regex: /\b\d{3}-\d{2}-\d{4}\b/, action: 'sanitize', replacement: '[SSN]' }, // SSN pattern
 *   ],
 *   evaluateInput: true,
 *   evaluateOutput: true,
 *   defaultAction: 'flag',
 * });
 * ```
 */

import {
  GuardrailAction,
  type GuardrailContext,
  type GuardrailEvaluationResult,
  type GuardrailInputPayload,
  type GuardrailOutputPayload,
  type IGuardrailService,
  type GuardrailConfig,
} from '@framers/agentos/core/guardrails/IGuardrailService';
import { AgentOSResponseChunkType } from '@framers/agentos/api/types/AgentOSResponse';

/**
 * Pattern definition for keyword/phrase matching.
 */
export interface KeywordPattern {
  /** Exact text or phrase to match */
  text?: string;
  /** Regex pattern (takes precedence over text if both provided) */
  regex?: RegExp | string;
  /** Case-sensitive matching (default: false) */
  caseSensitive?: boolean;
  /** Action when pattern is detected */
  action: 'allow' | 'flag' | 'sanitize' | 'block';
  /** Replacement text for sanitize action */
  replacement?: string;
  /** Optional reason code for logging */
  reasonCode?: string;
}

/**
 * Configuration for keyword-based guardrail.
 */
export interface KeywordGuardrailConfig {
  /** List of patterns to detect */
  patterns: KeywordPattern[];
  /** Whether to evaluate user input */
  evaluateInput: boolean;
  /** Whether to evaluate agent output */
  evaluateOutput: boolean;
  /** Default action if no specific action is configured */
  defaultAction?: 'allow' | 'flag' | 'sanitize' | 'block';
  /** Default replacement text for sanitize actions */
  defaultReplacement?: string;
}

interface MatchResult {
  matched: boolean;
  pattern?: KeywordPattern;
  matchedText?: string;
}

/**
 * Efficient keyword/phrase-based guardrail with exact match, partial match, and regex support.
 * 
 * **Performance characteristics:**
 * - Case-insensitive: O(n) where n = text length (single pass with toLowerCase)
 * - Case-sensitive: O(n) with direct string search
 * - Regex: depends on pattern complexity
 * 
 * **Matching modes:**
 * 1. **Exact text match**: `text: "forbidden"` → detects "forbidden" anywhere in input
 * 2. **Case-sensitive**: `text: "API_KEY", caseSensitive: true` → only matches exact case
 * 3. **Regex**: `regex: /\b(password|secret)\s*[:=]\s*\S+/i` → detects credential patterns
 * 
 * **Agent "changing its mind":**
 * - If the agent generates output containing a forbidden pattern, this guardrail intercepts it
 * - The pattern's `replacement` text is substituted before streaming to the user
 * - The original text is logged in `metadata.originalText` for audit
 * 
 * @example Case-insensitive keyword blocking
 * ```typescript
 * const guard = new KeywordGuardrail({
 *   patterns: [
 *     { text: 'admin password', action: 'block', caseSensitive: false }
 *   ],
 *   evaluateInput: true,
 *   evaluateOutput: true,
 * });
 * // Blocks: "What's the Admin Password?" (case-insensitive)
 * ```
 * 
 * @example PII sanitization with regex
 * ```typescript
 * const piiGuard = new KeywordGuardrail({
 *   patterns: [
 *     { regex: /\b\d{3}-\d{2}-\d{4}\b/, action: 'sanitize', replacement: '[SSN]' },
 *     { regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, action: 'sanitize', replacement: '[EMAIL]' },
 *   ],
 *   evaluateInput: false,
 *   evaluateOutput: true, // Sanitize agent output only
 * });
 * ```
 */
export class KeywordGuardrail implements IGuardrailService {
  private compiledPatterns: Array<{
    original: KeywordPattern;
    regex?: RegExp;
  }>;

  public readonly options: KeywordGuardrailConfig;
  public readonly config: GuardrailConfig;

  constructor(options: KeywordGuardrailConfig, runtimeConfig?: GuardrailConfig) {
    this.options = options;
    this.config = runtimeConfig ?? {};
    // Pre-compile regex patterns for efficiency
    this.compiledPatterns = options.patterns.map((pattern) => {
      if (pattern.regex) {
        const regex = typeof pattern.regex === 'string' ? new RegExp(pattern.regex) : pattern.regex;
        return { original: pattern, regex };
      }
      return { original: pattern };
    });
  }

  /**
   * Evaluate user input for keyword/phrase matches.
   * @param payload Input payload with user text
   * @returns Guardrail decision or null if no matches
   */
  async evaluateInput(payload: GuardrailInputPayload): Promise<GuardrailEvaluationResult | null> {
    if (!this.options.evaluateInput) {
      return null;
    }

    const text = payload.input.textInput ?? '';
    if (!text.trim()) {
      return null;
    }

    const match = this.findFirstMatch(text);
    if (!match.matched || !match.pattern) {
      return null;
    }

    return this.buildEvaluationResult(match, text, 'INPUT');
  }

  /**
   * Evaluate agent output for keyword/phrase matches.
   * Agent "changes its mind" if a pattern is detected and replacement is configured.
   * @param payload Output chunk and context
   * @returns Guardrail decision or null
   */
  async evaluateOutput(payload: GuardrailOutputPayload): Promise<GuardrailEvaluationResult | null> {
    if (!this.options.evaluateOutput) {
      return null;
    }

    if (payload.chunk.type !== AgentOSResponseChunkType.FINAL_RESPONSE) {
      return null;
    }

    const finalChunk = payload.chunk as any;
    const text = finalChunk.finalResponseText ?? '';

    if (!text.trim()) {
      return null;
    }

    const match = this.findFirstMatch(text);
    if (!match.matched || !match.pattern) {
      return null;
    }

    return this.buildEvaluationResult(match, text, 'OUTPUT');
  }

  /**
   * Scans text for the first matching pattern.
   * @param text Text to scan
   * @returns Match result with pattern and matched text
   */
  private findFirstMatch(text: string): MatchResult {
    for (const compiled of this.compiledPatterns) {
      const pattern = compiled.original;

      if (compiled.regex) {
        const regexMatch = text.match(compiled.regex);
        if (regexMatch) {
          return {
            matched: true,
            pattern,
            matchedText: regexMatch[0],
          };
        }
      } else if (pattern.text) {
        const caseSensitive = pattern.caseSensitive ?? false;
        const haystack = caseSensitive ? text : text.toLowerCase();
        const needle = caseSensitive ? pattern.text : pattern.text.toLowerCase();

        if (haystack.includes(needle)) {
          return {
            matched: true,
            pattern,
            matchedText: pattern.text,
          };
        }
      }
    }

    return { matched: false };
  }

  /**
   * Builds a guardrail evaluation result from a match.
   * @param match Match result
   * @param originalText Full original text
   * @param stage 'INPUT' or 'OUTPUT'
   * @returns Evaluation result with action and metadata
   */
  private buildEvaluationResult(
    match: MatchResult,
    originalText: string,
    stage: 'INPUT' | 'OUTPUT',
  ): GuardrailEvaluationResult {
    const pattern = match.pattern!;
    const action = this.mapAction(pattern.action);
    const reasonCode = pattern.reasonCode ?? `KEYWORD_${stage}_${action.toUpperCase()}`;
    const reason = `Pattern detected: "${match.matchedText}" (action: ${action})`;

    const result: GuardrailEvaluationResult = {
      action,
      reason,
      reasonCode,
      metadata: {
        matchedText: match.matchedText,
        patternType: pattern.regex ? 'regex' : 'text',
        caseSensitive: pattern.caseSensitive ?? false,
      },
    };

    if (action === GuardrailAction.SANITIZE) {
      const replacement = pattern.replacement ?? this.options.defaultReplacement ?? '[REDACTED]';
      if (pattern.regex) {
        // Replace all regex matches
        const regex = typeof pattern.regex === 'string' ? new RegExp(pattern.regex, 'g') : new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g');
        result.modifiedText = originalText.replace(regex, replacement);
      } else {
        // Replace all text matches (case-sensitive or not)
        const caseSensitive = pattern.caseSensitive ?? false;
        if (caseSensitive) {
          result.modifiedText = originalText.split(pattern.text!).join(replacement);
        } else {
          const regex = new RegExp(this.escapeRegex(pattern.text!), 'gi');
          result.modifiedText = originalText.replace(regex, replacement);
        }
      }
      result.metadata!.originalText = originalText.substring(0, 200); // Audit trail
    }

    return result;
  }

  /**
   * Maps string action to GuardrailAction enum.
   */
  private mapAction(action: string): GuardrailAction {
    switch (action) {
      case 'block':
        return GuardrailAction.BLOCK;
      case 'sanitize':
        return GuardrailAction.SANITIZE;
      case 'flag':
        return GuardrailAction.FLAG;
      default:
        return GuardrailAction.ALLOW;
    }
  }

  /**
   * Escapes special regex characters in a string for literal matching.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}


