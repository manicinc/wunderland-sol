import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import {
  AgentOS,
  type AgentOSConfig,
  type AgentOSResponse,
  type AgentOSInput,
  type AgentOSOrchestratorConfig,
  type GMIManagerConfig,
  profiles,
  type PromptEngineConfig,
  type ToolOrchestratorConfig,
  type ToolPermissionManagerConfig,
  type ConversationManagerConfig,
  type StreamingManagerConfig,
  type AIModelProviderManagerConfig,
  type WorkflowDefinition,
  type WorkflowInstance,
  WorkflowStatus,
  type ProvenanceSystemConfig,
} from '@framers/agentos';
import {
  createProvenancePack,
  type ProvenancePackResult,
} from '@framers/agentos/extensions/packs/provenance-pack';
import { createCuratedManifest } from '@framers/agentos-extensions-registry';
import type { FileSystemPersonaLoaderConfig } from '@framers/agentos/cognitive_substrate/personas/PersonaLoader';
import type {
  IAuthService as AgentOSAuthServiceInterface,
  ISubscriptionService,
} from '@framers/agentos/services/user_auth/types';
import { PrismaClient } from '@framers/agentos/stubs/prismaClient';
import { createAgentOSAuthAdapter } from './agentos.auth-service.js';
import { createAgentOSSubscriptionAdapter } from './agentos.subscription-service.js';
import { createAgentOSRouter } from './agentos.routes.js';
import { createAgentOSStreamRouter } from './agentos.stream-router.js';
import { createAgencyStreamRouter } from './agentos.agency-stream-router.js';
import { reloadDynamicPersonas } from './agentos.persona-registry.js';
import { createDefaultGuardrailStack } from './guardrails/index.js';
import { createRollingSummaryMemorySink } from './agentos.rolling-memory-sink.js';
import { createLongTermMemoryRetriever } from './agentos.long-term-memory-retriever.js';
import { getHitlManager } from './agentos.hitl.service.js';
import {
  MultiGMIAgencyExecutor,
  type AgencyExecutionInput,
  type AgencyExecutionResult,
} from './MultiGMIAgencyExecutor.js';
import { getAppDatabase } from '../../core/database/appDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.resolve(path.dirname(__filename), '../../../..');

const isWorkflowStatus = (value: string): value is WorkflowStatus =>
  (Object.values(WorkflowStatus) as string[]).includes(value);

type MetapromptPresetsConfigFile = {
  version?: string;
  routing?: any;
  presets?: any[];
  rules?: any[];
  addonPrompts?: Record<string, string>;
  memoryCompaction?: {
    profiles?: Record<string, any>;
    defaultProfile?: string;
    defaultProfileByMode?: Record<string, string>;
  };
};

function resolveMetapromptPresetsConfigPath(): string | null {
  const override = process.env.METAPROMPT_PRESETS_PATH;
  const candidates = [
    override && override.trim()
      ? path.isAbsolute(override)
        ? override
        : path.resolve(__projectRoot, override)
      : null,
    path.join(__projectRoot, 'config', 'metaprompt-presets.json'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function loadMetapromptPresetsConfig(): MetapromptPresetsConfigFile | null {
  const configPath = resolveMetapromptPresetsConfigPath();
  if (!configPath) return null;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as MetapromptPresetsConfigFile;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn(`[AgentOS] Failed to load metaprompt-presets config at ${configPath}.`, error);
    return null;
  }
}

function loadPromptFileIfExists(promptPath: string): string | null {
  try {
    if (!fs.existsSync(promptPath)) return null;
    const raw = fs.readFileSync(promptPath, 'utf-8');
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

function resolveAddonPromptContent(key: string): string | null {
  const normalized = String(key || '').trim();
  if (!normalized) return null;
  if (normalized.startsWith('_meta/')) {
    const name = normalized.slice('_meta/'.length);
    return loadPromptFileIfExists(path.join(__projectRoot, 'prompts', '_meta', `${name}.md`));
  }
  return loadPromptFileIfExists(path.join(__projectRoot, 'prompts', `${normalized}.md`));
}

function buildPromptProfileConfigFromMetapromptPresets(
  parsed: MetapromptPresetsConfigFile
): AgentOSOrchestratorConfig['promptProfileConfig'] | null {
  if (!parsed?.routing || !Array.isArray(parsed?.presets) || !Array.isArray(parsed?.rules)) {
    return null;
  }

  const routing = parsed.routing as any;
  if (!routing?.defaultPresetId || typeof routing.defaultPresetId !== 'string') {
    return null;
  }

  const presets = (parsed.presets as any[])
    .filter((p) => p && typeof p.id === 'string')
    .map((p) => ({
      id: String(p.id),
      label: typeof p.label === 'string' ? p.label : undefined,
      description: typeof p.description === 'string' ? p.description : undefined,
      addonPromptKeys: Array.isArray(p.addonPromptKeys) ? p.addonPromptKeys.map(String) : [],
    }));

  const rules = (parsed.rules as any[])
    .filter((r) => r && typeof r.id === 'string' && typeof r.presetId === 'string')
    .map((r) => ({
      id: String(r.id),
      priority: Number(r.priority ?? 0),
      presetId: String(r.presetId),
      modes: Array.isArray(r.modes) ? r.modes.map(String) : undefined,
      anyKeywords: Array.isArray(r.anyKeywords) ? r.anyKeywords.map(String) : undefined,
      allKeywords: Array.isArray(r.allKeywords) ? r.allKeywords.map(String) : undefined,
      minMessageChars: typeof r.minMessageChars === 'number' ? r.minMessageChars : undefined,
      maxMessageChars: typeof r.maxMessageChars === 'number' ? r.maxMessageChars : undefined,
    }));

  const addonKeys = new Set<string>();
  for (const preset of presets) {
    for (const key of preset.addonPromptKeys || []) {
      if (typeof key === 'string' && key.trim()) addonKeys.add(key.trim());
    }
  }

  const addonPrompts: Record<string, string> = { ...(parsed.addonPrompts || {}) };
  for (const key of addonKeys) {
    if (addonPrompts[key]) continue;
    const content = resolveAddonPromptContent(key);
    if (content) addonPrompts[key] = content;
  }

  return {
    version: typeof parsed.version === 'string' ? parsed.version : '1.0.0',
    routing: {
      reviewEveryNTurns: Number(routing.reviewEveryNTurns ?? 6),
      forceReviewOnCompaction: Boolean(routing.forceReviewOnCompaction ?? true),
      defaultPresetId: routing.defaultPresetId,
      defaultPresetByMode:
        routing.defaultPresetByMode && typeof routing.defaultPresetByMode === 'object'
          ? routing.defaultPresetByMode
          : undefined,
    },
    presets,
    rules,
    addonPrompts,
  } as any;
}

function buildRollingSummaryProfilesFromMetapromptPresets(
  parsed: MetapromptPresetsConfigFile
): AgentOSOrchestratorConfig['rollingSummaryCompactionProfilesConfig'] | null {
  const section = parsed?.memoryCompaction;
  const profilesRaw =
    section?.profiles && typeof section.profiles === 'object' ? section.profiles : null;
  if (!profilesRaw) return null;

  const openRouterAvailable = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const openAiAvailable = Boolean(process.env.OPENAI_API_KEY?.trim());

  const profiles: Record<string, any> = {};
  for (const [profileId, profile] of Object.entries(profilesRaw)) {
    if (!profile || typeof profile !== 'object') continue;
    const enabled = Boolean((profile as any).enabled);
    const rawModelId =
      typeof (profile as any).modelId === 'string'
        ? String((profile as any).modelId)
        : 'gpt-4o-mini';
    let modelId = rawModelId;
    let providerId: string | undefined;
    if (rawModelId.includes('/')) {
      if (openRouterAvailable) {
        providerId = 'openrouter';
      } else if (openAiAvailable) {
        providerId = 'openai';
        modelId = rawModelId.split('/').slice(-1)[0];
      }
    }
    const cooldownMs = Number((profile as any).cooldownMs ?? 60_000);
    const tail = Number((profile as any).tailTurnsToKeep ?? 12);
    const min = Number((profile as any).minTurnsToSummarize ?? 12);
    const max = Number((profile as any).maxTurnsToSummarizePerPass ?? 48);
    const maxTokens = Number((profile as any).maxSummaryTokens ?? 900);

    const promptKey =
      typeof (profile as any).promptKey === 'string' ? String((profile as any).promptKey) : null;
    const systemPrompt = promptKey
      ? (loadPromptFileIfExists(path.join(__projectRoot, 'prompts', `${promptKey}.md`)) ??
        undefined)
      : undefined;

    profiles[profileId] = {
      config: {
        enabled,
        providerId,
        modelId,
        cooldownMs: Math.max(0, cooldownMs),
        headMessagesToKeep: 2,
        tailMessagesToKeep: Math.max(0, tail),
        minMessagesToSummarize: Math.max(0, min),
        maxMessagesToSummarizePerPass: Math.max(1, max),
        maxOutputTokens: Math.max(64, maxTokens),
        temperature: 0.1,
      },
      systemPrompt,
    };
  }

  const defaultProfileId =
    typeof section?.defaultProfile === 'string' ? section.defaultProfile : 'off';

  return {
    defaultProfileId,
    defaultProfileByMode:
      section?.defaultProfileByMode && typeof section.defaultProfileByMode === 'object'
        ? section.defaultProfileByMode
        : undefined,
    profiles,
  } as any;
}

/**
 * AgentOS is still incubating inside the Voice Chat Assistant monorepo.
 * This integration layer keeps the heavy AgentOS runtime lazy-loaded and
 * ensures we only wire the routes + orchestrator when explicitly enabled.
 */
class AgentOSIntegration {
  private agentos?: AgentOS;
  private router?: Router;
  private initializing?: Promise<void>;
  private provenancePack?: ReturnType<typeof createProvenancePack>;
  private provenanceConfig?: ProvenanceSystemConfig;
  private provenanceAgentId?: string;
  private provenanceTablePrefix?: string;

  public isEnabled(): boolean {
    return process.env.AGENTOS_ENABLED === 'true';
  }

  public async getRouter(): Promise<Router> {
    if (!this.isEnabled()) {
      throw new Error(
        'AgentOS integration not enabled. Set AGENTOS_ENABLED=true to mount these routes.'
      );
    }
    if (this.router) {
      return this.router;
    }

    await this.getAgentOS();
    this.router = Router();
    this.router.use(createAgentOSRouter());
    this.router.use(createAgentOSStreamRouter(this));
    this.router.use('/agency', createAgencyStreamRouter());
    return this.router;
  }

  public async processThroughAgentOS(input: AgentOSInput): Promise<AgentOSResponse[]> {
    const agentosInstance = await this.getAgentOS();
    const chunks: AgentOSResponse[] = [];
    for await (const chunk of agentosInstance.processRequest(input)) {
      chunks.push(chunk);
    }
    return chunks;
  }

  public async processThroughAgentOSStream(
    input: AgentOSInput,
    onChunk: (chunk: AgentOSResponse) => Promise<void> | void
  ): Promise<void> {
    const agentosInstance = await this.getAgentOS();
    for await (const chunk of agentosInstance.processRequest(input)) {
      await onChunk(chunk);
    }
  }

  public async listWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
    const agentosInstance = await this.getAgentOS();
    return agentosInstance.listWorkflowDefinitions();
  }

  public async listAvailablePersonas(userId?: string) {
    const agentosInstance = await this.getAgentOS();
    return agentosInstance.listAvailablePersonas(userId);
  }

  public async listWorkflows(options?: {
    conversationId?: string;
    status?: string;
  }): Promise<WorkflowInstance[]> {
    const agentosInstance = await this.getAgentOS();
    const statuses =
      options?.status && isWorkflowStatus(options.status) ? [options.status] : undefined;
    return agentosInstance.listWorkflows({
      conversationId: options?.conversationId,
      statuses,
    });
  }

  public async startWorkflow(options: {
    definitionId: string;
    userId: string;
    conversationId?: string;
    workflowId?: string;
    context?: Record<string, unknown>;
    roleAssignments?: Record<string, string>;
    metadata?: Record<string, unknown>;
    agencyRequest?: Record<string, unknown>;
  }): Promise<WorkflowInstance> {
    const agentosInstance = await this.getAgentOS();

    const conversationId =
      options.conversationId && options.conversationId.trim().length > 0
        ? options.conversationId
        : `workflow-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const agentosInput: AgentOSInput = {
      userId: options.userId,
      sessionId: conversationId,
      conversationId,
      textInput: null,
      selectedPersonaId: options.definitionId,
      options: {
        streamUICommands: true,
      },
    };

    if (options.agencyRequest && typeof options.agencyRequest === 'object') {
      (agentosInput as any).agencyRequest = options.agencyRequest;
    }

    return agentosInstance.startWorkflow(options.definitionId, agentosInput, {
      workflowId: options.workflowId,
      conversationId,
      createdByUserId: options.userId,
      context: options.context,
      roleAssignments: options.roleAssignments,
      metadata: options.metadata,
    });
  }

  public async getWorkflow(workflowId: string): Promise<WorkflowInstance | null> {
    const agentosInstance = await this.getAgentOS();
    return agentosInstance.getWorkflow(workflowId);
  }

  public async cancelWorkflow(
    workflowId: string,
    reason?: string
  ): Promise<WorkflowInstance | null> {
    const agentosInstance = await this.getAgentOS();
    const updated = await agentosInstance.updateWorkflowStatus(
      workflowId,
      WorkflowStatus.CANCELLED
    );
    if (updated && reason) {
      console.info('[AgentOS][Workflow] Cancelled workflow', { workflowId, reason });
    }
    return updated;
  }

  public async executeAgencyWorkflow(
    input: AgencyExecutionInput,
    onChunk?: (chunk: AgentOSResponse) => Promise<void> | void
  ): Promise<AgencyExecutionResult> {
    const agentosInstance = await this.getAgentOS();
    const executor = new MultiGMIAgencyExecutor({ agentOS: agentosInstance, onChunk });
    return executor.executeAgency(input);
  }

  /**
   * Execute a single tool directly via the AgentOS ToolOrchestrator.
   * Intended for admin/bridge routes that need deterministic tool invocation without LLM mediation.
   */
  public async executeToolCall(params: {
    toolName: string;
    args: Record<string, unknown>;
    userId?: string;
    personaId?: string;
    personaCapabilities?: string[];
    correlationId?: string;
  }): Promise<any> {
    const agentosInstance = await this.getAgentOS();
    const orchestrator: any = (agentosInstance as any)?.toolOrchestrator;
    if (!orchestrator || typeof orchestrator.processToolCall !== 'function') {
      throw new Error('ToolOrchestrator not available on AgentOS instance.');
    }

    const requestDetails: any = {
      toolCallRequest: {
        id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: params.toolName,
        arguments: params.args ?? {},
      },
      gmiId: 'backend-direct',
      personaId:
        params.personaId ?? (agentosInstance as any)?.config?.defaultPersonaId ?? 'v_researcher',
      personaCapabilities: Array.isArray(params.personaCapabilities)
        ? params.personaCapabilities
        : [],
      userContext: { userId: params.userId ?? 'anonymous' },
      correlationId: params.correlationId,
    };

    return orchestrator.processToolCall(requestDetails);
  }

  /**
   * Get the active provenance runtime state, if configured.
   * This is used by the provenance HTTP routes to expose anchors and verification.
   */
  public async getProvenanceRuntime(): Promise<{
    agentId: string;
    tablePrefix: string;
    config: ProvenanceSystemConfig;
    result: ProvenancePackResult | null;
  } | null> {
    await this.getAgentOS();
    if (!this.provenancePack || !this.provenanceConfig || !this.provenanceAgentId) {
      return null;
    }

    return {
      agentId: this.provenanceAgentId,
      tablePrefix: this.provenanceTablePrefix ?? '',
      config: this.provenanceConfig,
      result: this.provenancePack.getResult(),
    };
  }

  private async getAgentOS(): Promise<AgentOS> {
    if (this.agentos) {
      return this.agentos;
    }
    if (!this.initializing) {
      this.initializing = this.initializeAgentOS();
    }
    await this.initializing;
    if (!this.agentos) {
      throw new Error('AgentOS initialization failed.');
    }
    return this.agentos;
  }

  private async initializeAgentOS(): Promise<void> {
    ensureAgentOSEnvDefaults();
    await reloadDynamicPersonas();
    const embedded = await buildEmbeddedAgentOSConfig();
    this.provenancePack = embedded.provenance?.pack;
    this.provenanceConfig = embedded.provenance?.config;
    this.provenanceAgentId = embedded.provenance?.agentId;
    this.provenanceTablePrefix = embedded.provenance?.tablePrefix;
    const agentos = new AgentOS();
    await agentos.initialize(embedded.config);
    this.agentos = agentos;
  }
}

const resolveDefaultPersonaDir = (): string => {
  const overridePath = process.env.AGENTOS_PERSONA_PATH;
  if (overridePath) {
    const resolved = path.resolve(process.cwd(), overridePath);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
    console.warn(`[AgentOS] Configured AGENTOS_PERSONA_PATH '${resolved}' does not exist.`);
  }

  const candidates = [
    path.resolve(process.cwd(), 'agentos', 'cognitive_substrate', 'personas', 'definitions'),
    path.resolve(
      process.cwd(),
      'packages',
      'agentos',
      'src',
      'cognitive_substrate',
      'personas',
      'definitions'
    ),
    path.resolve(
      process.cwd(),
      '..',
      'packages',
      'agentos',
      'src',
      'cognitive_substrate',
      'personas',
      'definitions'
    ),
    path.resolve(process.cwd(), '..', 'agentos', 'cognitive_substrate', 'personas', 'definitions'),
    path.resolve(
      process.cwd(),
      '..',
      'backend',
      'agentos',
      'cognitive_substrate',
      'personas',
      'definitions'
    ),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.warn(
    '[AgentOS] Persona definitions directory not found. Using default path with expectation that it will be created.'
  );
  return candidates[0];
};

const agentOSIntegration = new AgentOSIntegration();

export const isAgentOSEnabled = (): boolean => agentOSIntegration.isEnabled();

export const getAgentOSRouter = async (): Promise<Router> => agentOSIntegration.getRouter();

export const agentosService = agentOSIntegration;

type EmbeddedAgentOSConfigBuildResult = {
  config: AgentOSConfig;
  provenance?: {
    pack: ReturnType<typeof createProvenancePack>;
    config: ProvenanceSystemConfig;
    agentId: string;
    tablePrefix: string;
  };
};

/**
 * Builds an AgentOS configuration that stores conversation state via the shared
 * SQL storage adapter (through the AgentOS Prisma shim) and honours existing
 * environment variable configuration.
 */
async function buildEmbeddedAgentOSConfig(): Promise<EmbeddedAgentOSConfigBuildResult> {
  const desiredPersistence = process.env.AGENTOS_ENABLE_PERSISTENCE === 'true';
  let storageAdapter: ReturnType<typeof getAppDatabase> | undefined;
  if (desiredPersistence) {
    try {
      storageAdapter = getAppDatabase();
    } catch (error) {
      console.warn(
        '[AgentOS] Persistence requested but app database is not initialized; continuing without persistence.',
        error
      );
    }
  }
  const persistenceEnabled = desiredPersistence && Boolean(storageAdapter);

  const provenanceRequested = process.env.AGENTOS_PROVENANCE_ENABLED === 'true';
  const provenanceEnabled = provenanceRequested && Boolean(storageAdapter);
  if (provenanceRequested && !storageAdapter) {
    console.warn(
      '[AgentOS][Provenance] Enabled via env but no storage adapter is available. Set AGENTOS_ENABLE_PERSISTENCE=true and initialize the app database.'
    );
  }

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const defaultProviderId =
    process.env.AGENTOS_DEFAULT_PROVIDER_ID || (hasOpenRouter ? 'openrouter' : 'openai');
  const defaultModelId =
    process.env.AGENTOS_DEFAULT_MODEL_ID ||
    (defaultProviderId === 'openrouter'
      ? process.env.MODEL_PREF_OPENROUTER_DEFAULT || 'openai/gpt-4o-mini'
      : 'gpt-4o-mini');

  const gmiManagerConfig: GMIManagerConfig = {
    personaLoaderConfig: {
      loaderType: 'file_system',
      personaDefinitionPath: resolveDefaultPersonaDir(),
    } as FileSystemPersonaLoaderConfig,
    defaultGMIInactivityCleanupMinutes: Number(process.env.AGENTOS_GMI_INACTIVITY_MINUTES ?? 60),
    defaultWorkingMemoryType: 'in_memory',
    defaultGMIBaseConfigDefaults: {
      defaultLlmProviderId: defaultProviderId,
      defaultLlmModelId: defaultModelId,
    },
  };

  const orchestratorConfig: AgentOSOrchestratorConfig = {
    maxToolCallIterations: Number(process.env.AGENTOS_MAX_TOOL_CALL_ITERATIONS ?? 4),
    defaultAgentTurnTimeoutMs: Number(process.env.AGENTOS_TURN_TIMEOUT_MS ?? 120_000),
    enableConversationalPersistence: persistenceEnabled,
  };

  const metapromptPresets = loadMetapromptPresetsConfig();
  const promptProfileConfig = metapromptPresets
    ? buildPromptProfileConfigFromMetapromptPresets(metapromptPresets)
    : null;
  if (promptProfileConfig) {
    orchestratorConfig.promptProfileConfig = promptProfileConfig;
  }

  const rollingSummaryProfilesConfig = metapromptPresets
    ? buildRollingSummaryProfilesFromMetapromptPresets(metapromptPresets)
    : null;
  if (rollingSummaryProfilesConfig) {
    orchestratorConfig.rollingSummaryCompactionProfilesConfig = rollingSummaryProfilesConfig;
  }

  const promptEngineConfig: PromptEngineConfig = {
    defaultTemplateName: 'openai_chat',
    availableTemplates: {},
    tokenCounting: {
      strategy: 'estimated',
      estimationModel: 'gpt-3.5-turbo',
    },
    historyManagement: {
      defaultMaxMessages: Number(process.env.AGENTOS_MAX_MESSAGES ?? 40),
      maxTokensForHistory: Number(process.env.AGENTOS_MAX_CONTEXT_TOKENS ?? 8192),
      summarizationTriggerRatio: 0.8,
      preserveImportantMessages: true,
    },
    contextManagement: {
      maxRAGContextTokens: Number(process.env.AGENTOS_RAG_CONTEXT_TOKENS ?? 1500),
      summarizationQualityTier: 'balanced',
      preserveSourceAttributionInSummary: true,
    },
    contextualElementSelection: {
      maxElementsPerType: {},
      defaultMaxElementsPerType: 3,
      priorityResolutionStrategy: 'highest_first',
      conflictResolutionStrategy: 'skip_conflicting',
    },
    performance: {
      enableCaching: true,
      cacheTimeoutSeconds: 120,
    },
    debugging: process.env.NODE_ENV === 'development' ? { logConstructionSteps: false } : undefined,
  };

  const toolOrchestratorConfig: ToolOrchestratorConfig = {
    orchestratorId: 'embedded-tool-orchestrator',
    defaultToolCallTimeoutMs: Number(process.env.AGENTOS_TOOL_TIMEOUT_MS ?? 30_000),
    maxConcurrentToolCalls: Number(process.env.AGENTOS_MAX_CONCURRENT_TOOLS ?? 8),
    logToolCalls: process.env.NODE_ENV !== 'production',
    globalDisabledTools: [],
    toolRegistrySettings: {
      allowDynamicRegistration: true,
      persistRegistry: false,
    },
  };

  const toolPermissionManagerConfig: ToolPermissionManagerConfig = {
    strictCapabilityChecking: false,
    logToolCalls: process.env.NODE_ENV !== 'production',
    toolToSubscriptionFeatures: {},
  };

  const conversationManagerConfig: ConversationManagerConfig = {
    defaultConversationContextConfig: {
      maxHistoryLengthMessages: Number(process.env.AGENTOS_MAX_MESSAGES ?? 100),
      enableAutomaticSummarization: true,
      summarizationOptions: {
        desiredLength: 'medium',
        method: 'abstractive_llm',
      },
    },
    maxActiveConversationsInMemory: Number(process.env.AGENTOS_MAX_ACTIVE_CONVERSATIONS ?? 100),
    inactivityTimeoutMs: Number(process.env.AGENTOS_INACTIVITY_TIMEOUT_MS ?? 3_600_000),
    persistenceEnabled,
  };

  const streamingManagerConfig: StreamingManagerConfig = {
    maxConcurrentStreams: Number(process.env.AGENTOS_MAX_CONCURRENT_STREAMS ?? 100),
    defaultStreamInactivityTimeoutMs: Number(
      process.env.AGENTOS_STREAM_INACTIVITY_TIMEOUT_MS ?? 300_000
    ),
    maxClientsPerStream: Number(process.env.AGENTOS_MAX_CLIENTS_PER_STREAM ?? 5),
    onClientSendErrorBehavior: 'log_and_continue',
  };

  const openAiBaseUrl = process.env.AGENTOS_OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim();

  const providers: AIModelProviderManagerConfig['providers'] = [];

  if (openAiApiKey) {
    providers.push({
      providerId: 'openai',
      enabled: true,
      isDefault: true,
      config: {
        apiKey: openAiApiKey,
        baseURL: openAiBaseUrl,
        defaultModelId: process.env.AGENTOS_DEFAULT_MODEL_ID || 'gpt-4o-mini',
      },
    });
  }

  if (openRouterApiKey) {
    providers.push({
      providerId: 'openrouter',
      enabled: true,
      isDefault: !openAiApiKey,
      config: {
        apiKey: openRouterApiKey,
        baseURL: process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai/api/v1',
        defaultModelId: process.env.MODEL_PREF_OPENROUTER_DEFAULT || 'openai/gpt-4o-mini',
      },
    });
  }

  if (ollamaBaseUrl) {
    providers.push({
      providerId: 'ollama',
      enabled: true,
      isDefault: !openAiApiKey && !openRouterApiKey,
      config: {
        baseURL: ollamaBaseUrl,
        defaultModelId: process.env.MODEL_PREF_OLLAMA_DEFAULT || 'llama3.2',
      },
    });
  }

  if (providers.length > 0 && !providers.some((p) => Boolean(p.isDefault))) {
    providers[0].isDefault = true;
  }

  const modelProviderManagerConfig: AIModelProviderManagerConfig = { providers };

  const prismaClient = new PrismaClient();

  // Enable guardrails by default in non-dev environments (or via AGENTOS_ENABLE_GUARDRAILS=true)
  const guardrailService =
    process.env.AGENTOS_ENABLE_GUARDRAILS === 'true' || process.env.NODE_ENV === 'production'
      ? createDefaultGuardrailStack()
      : undefined;

  const parseJsonEnv = (name: string): Record<string, unknown> | undefined => {
    const raw = process.env[name];
    if (!raw || !raw.trim()) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
    } catch (error) {
      console.warn(`[AgentOS][Provenance] Failed to parse ${name} as JSON.`, error);
      return undefined;
    }
  };

  const buildProvenanceConfigFromEnv = () => {
    const keySource =
      process.env.AGENTOS_PROVENANCE_PRIVATE_KEY_BASE64 &&
      process.env.AGENTOS_PROVENANCE_PUBLIC_KEY_BASE64
        ? {
            type: 'import' as const,
            privateKeyBase64: process.env.AGENTOS_PROVENANCE_PRIVATE_KEY_BASE64,
            publicKeyBase64: process.env.AGENTOS_PROVENANCE_PUBLIC_KEY_BASE64,
          }
        : { type: 'generate' as const };

    const profileId = (process.env.AGENTOS_PROVENANCE_PROFILE || 'mutable-dev')
      .trim()
      .toLowerCase();

    const resolveBaseProfile = (): ProvenanceSystemConfig => {
      switch (profileId) {
        case 'mutable':
        case 'mutable-dev':
          return profiles.mutableDev();
        case 'revisioned':
        case 'revisioned-verified':
          return profiles.revisionedVerified();
        case 'sealed':
        case 'sealed-autonomous':
          return profiles.sealedAutonomous();
        case 'sealed-auditable':
        case 'auditable':
          return profiles.sealedAuditable(process.env.AGENTOS_PROVENANCE_ANCHOR_ENDPOINT);
        default:
          console.warn(
            `[AgentOS][Provenance] Unknown AGENTOS_PROVENANCE_PROFILE '${profileId}'. Falling back to 'mutable-dev'.`
          );
          return profiles.mutableDev();
      }
    };

    const baseProfile = resolveBaseProfile();

    const anchorType = (process.env.AGENTOS_PROVENANCE_ANCHOR_TYPE || '').trim();
    const anchorOptions = parseJsonEnv('AGENTOS_PROVENANCE_ANCHOR_OPTIONS_JSON');
    const anchorTarget =
      anchorType && anchorType !== 'none'
        ? {
            type: anchorType as any,
            endpoint: process.env.AGENTOS_PROVENANCE_ANCHOR_ENDPOINT,
            options:
              anchorOptions ??
              (process.env.AGENTOS_PROVENANCE_ANCHOR_ENDPOINT
                ? { endpoint: process.env.AGENTOS_PROVENANCE_ANCHOR_ENDPOINT }
                : undefined),
          }
        : baseProfile.provenance.anchorTarget;

    const anchorIntervalEnv = process.env.AGENTOS_PROVENANCE_ANCHOR_INTERVAL_MS;
    const anchorBatchSizeEnv = process.env.AGENTOS_PROVENANCE_ANCHOR_BATCH_SIZE;
    const anchorIntervalMs =
      anchorIntervalEnv != null ? Number(anchorIntervalEnv) : baseProfile.anchorIntervalMs;
    const anchorBatchSize =
      anchorBatchSizeEnv != null ? Number(anchorBatchSizeEnv) : baseProfile.anchorBatchSize;

    return profiles.custom(baseProfile, {
      provenance: {
        enabled: true,
        signatureMode: (process.env.AGENTOS_PROVENANCE_SIGNATURE_MODE as any) || 'every-event',
        hashAlgorithm: 'sha256',
        keySource,
        anchorTarget,
      },
      anchorIntervalMs: Number.isFinite(anchorIntervalMs) ? anchorIntervalMs : 0,
      anchorBatchSize: Number.isFinite(anchorBatchSize) ? anchorBatchSize : 50,
    });
  };

  let provenancePack: ReturnType<typeof createProvenancePack> | undefined;
  let provenanceConfig: ProvenanceSystemConfig | undefined;
  let provenanceAgentId: string | undefined;
  let provenanceTablePrefix: string | undefined;

  // Build provenance pack if enabled
  if (provenanceEnabled && storageAdapter) {
    provenanceConfig = buildProvenanceConfigFromEnv();
    provenanceAgentId = process.env.AGENTOS_PROVENANCE_AGENT_ID || 'voice-chat-assistant';
    provenanceTablePrefix = process.env.AGENTOS_PROVENANCE_TABLE_PREFIX || 'agentos_';
    provenancePack = createProvenancePack(
      provenanceConfig,
      storageAdapter,
      provenanceAgentId,
      provenanceTablePrefix
    );

    // Sealed provenance implies append-only conversation persistence.
    // Without this, ConversationManager will attempt UPDATE/UPSERT patterns which sealed mode forbids.
    if (provenanceConfig.storagePolicy.mode === 'sealed') {
      conversationManagerConfig.appendOnlyPersistence = true;
      toolOrchestratorConfig.toolRegistrySettings = {
        ...(toolOrchestratorConfig.toolRegistrySettings ?? {}),
        allowDynamicRegistration: false,
      };
    }
  }

  // Build curated manifest with channels + tools via registry bundle.
  // Missing optional dependencies are silently skipped by createCuratedManifest.
  const channelPlatforms = process.env.AGENTOS_CHANNEL_PLATFORMS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const curatedManifest = await createCuratedManifest({
    channels: channelPlatforms?.length ? channelPlatforms : 'none',
    tools: 'all',
    secrets: {}, // Secrets resolved at runtime from credentials vault
  });

  // Merge provenance pack at highest priority (position 0)
  if (provenancePack) {
    curatedManifest.packs.unshift({
      factory: () => provenancePack!,
      identifier: 'embedded:provenance-pack',
    });
  }

  const extensionManifest = curatedManifest.packs.length > 0 ? curatedManifest : undefined;

  const parseBooleanEnv = (value: string | undefined): boolean | undefined => {
    if (!value) return undefined;
    const raw = value.trim().toLowerCase();
    if (!raw) return undefined;
    if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
    if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
    return undefined;
  };

  const hitlEnabled = parseBooleanEnv(process.env.AGENTOS_HITL_ENABLED) ?? false;
  if (hitlEnabled) {
    const timeoutRaw = process.env.AGENTOS_HITL_APPROVAL_TIMEOUT_MS?.trim();
    const approvalTimeoutMs =
      timeoutRaw && Number.isFinite(Number(timeoutRaw))
        ? Math.max(1_000, Number(timeoutRaw))
        : undefined;
    const defaultSeverityRaw = String(process.env.AGENTOS_HITL_DEFAULT_SEVERITY || 'high')
      .trim()
      .toLowerCase();
    const defaultSeverity =
      defaultSeverityRaw === 'low' ||
      defaultSeverityRaw === 'medium' ||
      defaultSeverityRaw === 'high' ||
      defaultSeverityRaw === 'critical'
        ? (defaultSeverityRaw as any)
        : ('high' as any);

    toolOrchestratorConfig.hitl = {
      enabled: true,
      requireApprovalForSideEffects:
        parseBooleanEnv(process.env.AGENTOS_HITL_REQUIRE_APPROVAL_FOR_SIDE_EFFECTS) ?? true,
      defaultSideEffectsSeverity: defaultSeverity,
      approvalTimeoutMs,
      autoApproveWhenNoManager: false,
    } as any;
  }

  const observabilityEnabled = parseBooleanEnv(process.env.AGENTOS_OBSERVABILITY_ENABLED);
  const tracingEnabled = parseBooleanEnv(process.env.AGENTOS_TRACING_ENABLED);
  const includeTraceInResponses = parseBooleanEnv(process.env.AGENTOS_TRACE_IDS_IN_RESPONSES);
  const includeTraceIdsInLogs = parseBooleanEnv(process.env.AGENTOS_LOG_TRACE_IDS);
  const metricsEnabled = parseBooleanEnv(process.env.AGENTOS_METRICS_ENABLED);
  const exportOtelLogs = parseBooleanEnv(process.env.AGENTOS_OTEL_LOGS_ENABLED);
  const otelLoggerName =
    typeof process.env.AGENTOS_OTEL_LOGGER_NAME === 'string' &&
    process.env.AGENTOS_OTEL_LOGGER_NAME.trim()
      ? process.env.AGENTOS_OTEL_LOGGER_NAME.trim()
      : undefined;

  const observability =
    typeof observabilityEnabled === 'boolean' ||
    typeof tracingEnabled === 'boolean' ||
    typeof includeTraceInResponses === 'boolean' ||
    typeof includeTraceIdsInLogs === 'boolean' ||
    typeof metricsEnabled === 'boolean' ||
    typeof exportOtelLogs === 'boolean' ||
    typeof otelLoggerName === 'string'
      ? {
          enabled: observabilityEnabled,
          tracing: {
            enabled: tracingEnabled,
            includeTraceInResponses,
          },
          logging: {
            includeTraceIds: includeTraceIdsInLogs,
            exportToOtel: exportOtelLogs,
            otelLoggerName,
          },
          metrics: {
            enabled: metricsEnabled,
          },
        }
      : undefined;

  const config: AgentOSConfig = {
    gmiManagerConfig,
    orchestratorConfig,
    rollingSummaryMemorySink: createRollingSummaryMemorySink(),
    longTermMemoryRetriever: createLongTermMemoryRetriever(),
    promptEngineConfig,
    toolOrchestratorConfig,
    hitlManager: hitlEnabled ? getHitlManager() : undefined,
    toolPermissionManagerConfig,
    conversationManagerConfig,
    streamingManagerConfig,
    modelProviderManagerConfig,
    defaultPersonaId: process.env.AGENTOS_DEFAULT_PERSONA_ID || 'v_researcher',
    prisma: prismaClient,
    storageAdapter,
    extensionManifest,
    authService: createAgentOSAuthAdapter(),
    subscriptionService: createAgentOSSubscriptionAdapter(),
    utilityAIService: undefined,
    guardrailService,
    observability,
  };

  return {
    config,
    provenance:
      provenancePack && provenanceConfig && provenanceAgentId
        ? {
            pack: provenancePack,
            config: provenanceConfig,
            agentId: provenanceAgentId,
            tablePrefix: provenanceTablePrefix ?? '',
          }
        : undefined,
  };
}

function ensureAgentOSEnvDefaults(): void {
  process.env.JWT_SECRET ??= process.env.AUTH_JWT_SECRET ?? 'agentos-development-secret-change-me';
  process.env.API_KEY_ENCRYPTION_KEY_HEX ??=
    process.env.AGENTOS_API_KEY_ENCRYPTION_KEY_HEX ??
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env.AGENTOS_DATABASE_URL ??= 'file:./agentos-dev.db';
}
