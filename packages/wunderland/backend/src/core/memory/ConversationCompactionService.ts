import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLlm } from '../llm/llm.factory.js';
import type { IChatMessage } from '../llm/llm.interfaces.js';
import { MODEL_PREFERENCES } from '../../../config/models.config.js';
import { sqliteMemoryAdapter } from './SqliteMemoryAdapter.js';
import type { IStoredConversationTurn } from './IMemoryAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.resolve(path.dirname(__filename), '../../../../');

export interface ConversationCompactionConfig {
  enabled: boolean;
  promptKey: string;
  modelId: string;
  cooldownMs: number;
  tailTurnsToKeep: number;
  minTurnsToSummarize: number;
  maxTurnsToSummarizePerPass: number;
  maxSummaryTokens: number;
}

export interface ConversationCompactionResult {
  enabled: boolean;
  didCompact: boolean;
  summary: string | null;
  summaryUptoTimestamp: number | null;
  summaryUpdatedAt: number | null;
  compactedTurnCount?: number;
  reason?: string;
}

interface MemoryCompactionProfileConfig {
  enabled?: boolean;
  promptKey?: string;
  modelId?: string;
  cooldownMs?: number;
  tailTurnsToKeep?: number;
  minTurnsToSummarize?: number;
  maxTurnsToSummarizePerPass?: number;
  maxSummaryTokens?: number;
}

interface MemoryCompactionConfigSection {
  profiles?: Record<string, MemoryCompactionProfileConfig>;
  defaultProfile?: string;
  defaultProfileByMode?: Record<string, string>;
}

interface MetapromptPresetConfigFileMaybe {
  memoryCompaction?: MemoryCompactionConfigSection;
}

function hasNonEmptyEnv(name: string): boolean {
  const raw = process.env[name];
  return typeof raw === 'string' && raw.trim().length > 0;
}

function loadOptionalEnvInt(name: string): number | undefined {
  if (!hasNonEmptyEnv(name)) return undefined;
  const parsed = Number.parseInt(String(process.env[name]), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function loadOptionalEnvBool(name: string): boolean | undefined {
  if (!hasNonEmptyEnv(name)) return undefined;
  const raw = String(process.env[name]).trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

function normalize(s: string): string {
  return (s || '').trim().toLowerCase();
}

function safeJsonParse(value: string): any | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonObject(text: string): any | null {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  const direct = safeJsonParse(trimmed);
  if (direct) return direct;

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    const fenced = safeJsonParse(fenceMatch[1].trim());
    if (fenced) return fenced;
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const sliced = safeJsonParse(trimmed.slice(first, last + 1));
    if (sliced) return sliced;
  }
  return null;
}

class ConversationCompactionServiceImpl {
  private systemPrompt: string | null = null;
  private systemPromptKeyLoaded: string | null = null;

  private memoryCompactionSectionCache: MemoryCompactionConfigSection | null = null;
  private memoryCompactionSectionMtimeMs: number | null = null;
  private memoryCompactionSectionPath: string | null = null;

  private getMetapromptConfigPath(): string {
    const override = process.env.METAPROMPT_PRESETS_PATH;
    if (override && override.trim()) {
      return path.resolve(override);
    }
    return path.join(__projectRoot, 'config', 'metaprompt-presets.json');
  }

  private loadMemoryCompactionSection(): MemoryCompactionConfigSection | null {
    const configPath = this.getMetapromptConfigPath();
    try {
      const stat = fs.statSync(configPath);
      if (
        this.memoryCompactionSectionPath === configPath &&
        this.memoryCompactionSectionMtimeMs === stat.mtimeMs
      ) {
        return this.memoryCompactionSectionCache;
      }

      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as MetapromptPresetConfigFileMaybe;
      const section =
        parsed?.memoryCompaction && typeof parsed.memoryCompaction === 'object'
          ? parsed.memoryCompaction
          : null;

      this.memoryCompactionSectionCache = section;
      this.memoryCompactionSectionMtimeMs = stat.mtimeMs;
      this.memoryCompactionSectionPath = configPath;
      return section;
    } catch {
      // Cache the failure for this path so we don't spam disk on every request.
      this.memoryCompactionSectionCache = null;
      this.memoryCompactionSectionMtimeMs = null;
      this.memoryCompactionSectionPath = configPath;
      return null;
    }
  }

  private pickProfileIdByMode(
    section: MemoryCompactionConfigSection,
    mode: string
  ): string | undefined {
    const modeNorm = normalize(mode);
    const byMode = section.defaultProfileByMode || {};

    const exact = byMode[modeNorm];
    if (exact) return exact;

    const patternMatch = Object.entries(byMode)
      .map(([key, profileId]) => ({ key: normalize(key), profileId }))
      .filter(
        ({ key }) => key && (modeNorm === key || modeNorm.startsWith(key) || modeNorm.includes(key))
      )
      .sort((a, b) => b.key.length - a.key.length)[0];
    return patternMatch?.profileId;
  }

  private applyProfile(
    config: ConversationCompactionConfig,
    profile: MemoryCompactionProfileConfig
  ): void {
    if (typeof profile.enabled === 'boolean') config.enabled = profile.enabled;
    if (typeof profile.promptKey === 'string' && profile.promptKey.trim())
      config.promptKey = profile.promptKey.trim();
    if (typeof profile.modelId === 'string' && profile.modelId.trim())
      config.modelId = profile.modelId.trim();
    if (typeof profile.cooldownMs === 'number' && Number.isFinite(profile.cooldownMs))
      config.cooldownMs = profile.cooldownMs;
    if (typeof profile.tailTurnsToKeep === 'number' && Number.isFinite(profile.tailTurnsToKeep))
      config.tailTurnsToKeep = profile.tailTurnsToKeep;
    if (
      typeof profile.minTurnsToSummarize === 'number' &&
      Number.isFinite(profile.minTurnsToSummarize)
    )
      config.minTurnsToSummarize = profile.minTurnsToSummarize;
    if (
      typeof profile.maxTurnsToSummarizePerPass === 'number' &&
      Number.isFinite(profile.maxTurnsToSummarizePerPass)
    )
      config.maxTurnsToSummarizePerPass = profile.maxTurnsToSummarizePerPass;
    if (typeof profile.maxSummaryTokens === 'number' && Number.isFinite(profile.maxSummaryTokens))
      config.maxSummaryTokens = profile.maxSummaryTokens;
  }

  public getConfig(agentId?: string): ConversationCompactionConfig {
    const base: ConversationCompactionConfig = {
      enabled: false,
      promptKey: 'memory_compactor_v1',
      modelId: MODEL_PREFERENCES.utility || 'openai/gpt-4o-mini',
      cooldownMs: 60_000,
      tailTurnsToKeep: 12,
      minTurnsToSummarize: 12,
      maxTurnsToSummarizePerPass: 48,
      maxSummaryTokens: 700,
    };

    const section = this.loadMemoryCompactionSection();
    if (section && agentId && agentId.trim()) {
      const profileId = this.pickProfileIdByMode(section, agentId) ?? section.defaultProfile;
      const profile = profileId ? section.profiles?.[profileId] : undefined;
      if (profile) {
        this.applyProfile(base, profile);
      }
    } else if (section?.defaultProfile) {
      const profile = section.profiles?.[section.defaultProfile];
      if (profile) {
        this.applyProfile(base, profile);
      }
    }

    // Environment variables override config (for deploy-time kill switches / tuning).
    const enabledEnv = loadOptionalEnvBool('MEMORY_COMPACTION_ENABLED');
    if (typeof enabledEnv === 'boolean') base.enabled = enabledEnv;

    if (hasNonEmptyEnv('MEMORY_COMPACTION_PROMPT_KEY'))
      base.promptKey = String(process.env.MEMORY_COMPACTION_PROMPT_KEY).trim();
    if (hasNonEmptyEnv('MEMORY_COMPACTION_MODEL_ID'))
      base.modelId = String(process.env.MEMORY_COMPACTION_MODEL_ID).trim();

    const cooldownMs = loadOptionalEnvInt('MEMORY_COMPACTION_COOLDOWN_MS');
    if (typeof cooldownMs === 'number') base.cooldownMs = cooldownMs;
    const tailTurns = loadOptionalEnvInt('MEMORY_COMPACTION_TAIL_TURNS');
    if (typeof tailTurns === 'number') base.tailTurnsToKeep = tailTurns;
    const minTurns = loadOptionalEnvInt('MEMORY_COMPACTION_MIN_TURNS');
    if (typeof minTurns === 'number') base.minTurnsToSummarize = minTurns;
    const maxTurns = loadOptionalEnvInt('MEMORY_COMPACTION_MAX_TURNS_PER_PASS');
    if (typeof maxTurns === 'number') base.maxTurnsToSummarizePerPass = maxTurns;
    const maxSummaryTokens = loadOptionalEnvInt('MEMORY_COMPACTION_MAX_SUMMARY_TOKENS');
    if (typeof maxSummaryTokens === 'number') base.maxSummaryTokens = maxSummaryTokens;

    // Clamp obviously bad values.
    base.cooldownMs = Math.max(0, base.cooldownMs);
    base.tailTurnsToKeep = Math.max(0, base.tailTurnsToKeep);
    base.minTurnsToSummarize = Math.max(0, base.minTurnsToSummarize);
    base.maxTurnsToSummarizePerPass = Math.max(1, base.maxTurnsToSummarizePerPass);
    base.maxSummaryTokens = Math.max(64, base.maxSummaryTokens);

    return base;
  }

  private loadSystemPrompt(promptKey: string): string {
    if (this.systemPrompt && this.systemPromptKeyLoaded === promptKey) {
      return this.systemPrompt;
    }

    const promptPath = path.join(__projectRoot, 'prompts', `${promptKey}.md`);
    try {
      this.systemPrompt = fs.readFileSync(promptPath, 'utf-8');
      this.systemPromptKeyLoaded = promptKey;
      return this.systemPrompt;
    } catch (error) {
      console.error(
        `[ConversationCompactionService] Failed to load compactor prompt at ${promptPath}:`,
        error
      );
      this.systemPrompt = `You are a conversation memory compactor. Update a rolling summary from prior summary + new turns. Output plain text only.`;
      this.systemPromptKeyLoaded = promptKey;
      return this.systemPrompt;
    }
  }

  public async maybeCompactConversation(input: {
    userId: string;
    conversationId: string;
    agentId: string;
  }): Promise<ConversationCompactionResult> {
    const config = this.getConfig(input.agentId);
    if (!config.enabled) {
      const state = await sqliteMemoryAdapter.getConversationSummaryState(
        input.userId,
        input.conversationId
      );
      return {
        enabled: false,
        didCompact: false,
        summary: state.summary,
        summaryUptoTimestamp: state.summaryUptoTimestamp,
        summaryUpdatedAt: state.summaryUpdatedAt,
        reason: 'disabled',
      };
    }

    const state = await sqliteMemoryAdapter.getConversationSummaryState(
      input.userId,
      input.conversationId
    );
    const now = Date.now();
    if (state.summaryUpdatedAt && now - state.summaryUpdatedAt < config.cooldownMs) {
      return {
        enabled: true,
        didCompact: false,
        summary: state.summary,
        summaryUptoTimestamp: state.summaryUptoTimestamp,
        summaryUpdatedAt: state.summaryUpdatedAt,
        reason: 'cooldown',
      };
    }

    const afterTimestamp =
      typeof state.summaryUptoTimestamp === 'number' ? state.summaryUptoTimestamp : undefined;
    const tailTurns = await sqliteMemoryAdapter.retrieveConversationTurns(
      input.userId,
      input.conversationId,
      {
        afterTimestamp,
        limit: config.tailTurnsToKeep,
        fetchMostRecent: true,
        preferSummariesForOlder: true,
      }
    );

    if (tailTurns.length === 0) {
      return {
        enabled: true,
        didCompact: false,
        summary: state.summary,
        summaryUptoTimestamp: state.summaryUptoTimestamp,
        summaryUpdatedAt: state.summaryUpdatedAt,
        reason: 'no_turns',
      };
    }

    const tailStartTimestamp = tailTurns[0].timestamp;
    const candidateTurns = await sqliteMemoryAdapter.retrieveConversationTurns(
      input.userId,
      input.conversationId,
      {
        afterTimestamp,
        beforeTimestamp: tailStartTimestamp,
        limit: config.maxTurnsToSummarizePerPass,
        fetchMostRecent: false,
        preferSummariesForOlder: true,
      }
    );

    if (candidateTurns.length < config.minTurnsToSummarize) {
      return {
        enabled: true,
        didCompact: false,
        summary: state.summary,
        summaryUptoTimestamp: state.summaryUptoTimestamp,
        summaryUpdatedAt: state.summaryUpdatedAt,
        reason: 'below_threshold',
      };
    }

    const systemPrompt = this.loadSystemPrompt(config.promptKey);
    const summarizerInput = {
      previous: {
        summary_markdown: state.summary,
        memory_json: null,
      },
      new_turns: candidateTurns
        .map((turn) => ({
          id: turn.storageId,
          role: turn.role,
          content: String(turn.content ?? ''),
        }))
        .filter((turn) => turn.content.trim().length > 0),
    };

    const messages: IChatMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Update rolling memory.\n\nINPUT_JSON:\n${JSON.stringify(summarizerInput, null, 2)}`,
      },
    ];

    try {
      const response = await callLlm(
        messages,
        config.modelId,
        {
          temperature: 0.1,
          max_tokens: config.maxSummaryTokens,
        },
        undefined,
        input.userId
      );

      const rawOutput = response.text?.trim() || '';
      const parsed = extractJsonObject(rawOutput) as any | null;
      const nextSummary =
        parsed && typeof parsed.summary_markdown === 'string'
          ? parsed.summary_markdown.trim()
          : rawOutput;

      if (!nextSummary) {
        return {
          enabled: true,
          didCompact: false,
          summary: state.summary,
          summaryUptoTimestamp: state.summaryUptoTimestamp,
          summaryUpdatedAt: state.summaryUpdatedAt,
          reason: 'empty_summary',
        };
      }

      const lastSummarizedTimestamp = candidateTurns[candidateTurns.length - 1].timestamp;
      await sqliteMemoryAdapter.setConversationSummaryState(
        input.userId,
        input.conversationId,
        input.agentId,
        {
          summary: nextSummary,
          summaryUptoTimestamp: lastSummarizedTimestamp,
          summaryUpdatedAt: now,
        },
        now
      );

      return {
        enabled: true,
        didCompact: true,
        summary: nextSummary,
        summaryUptoTimestamp: lastSummarizedTimestamp,
        summaryUpdatedAt: now,
        compactedTurnCount: candidateTurns.length,
      };
    } catch (error) {
      console.error('[ConversationCompactionService] Failed to compact conversation:', error);
      return {
        enabled: true,
        didCompact: false,
        summary: state.summary,
        summaryUptoTimestamp: state.summaryUptoTimestamp,
        summaryUpdatedAt: state.summaryUpdatedAt,
        reason: 'llm_error',
      };
    }
  }
}

export const conversationCompactionService = new ConversationCompactionServiceImpl();
