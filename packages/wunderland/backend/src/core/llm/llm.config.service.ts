/**
 * @file Manages LLM provider configurations and agent-specific model/prompt/tool definitions.
 * @description This service loads, stores, and provides access to configurations
 * for LLM providers and maps agent modes to specific LLM models, prompt templates, and callable tools.
 * @version 1.4.1 - Added DiaryAgentTools.
 */

import { ILlmProviderConfig, ILlmTool } from './llm.interfaces.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MODEL_PREFERENCES } from '../../../config/models.config.js';

// Import other agent tool arrays as they are created
import { TutorAgentTools } from '../../tools/tutor.tools.js';
import { CodingAssistantAgentTools } from '../../tools/codingAssistant.tools.js';
import { DiaryAgentTools } from '../../tools/diary.tools.js';

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.resolve(path.dirname(__filename), '../../../..');
dotenv.config({ path: path.join(__projectRoot, '.env'), override: true });

/**
 * @enum {string} LlmProviderId
 * @description Enum for supported LLM provider identifiers.
 */
export enum LlmProviderId {
  OPENAI = 'openai',
  OPENROUTER = 'openrouter',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
}

export interface ProviderAvailability {
  available: boolean;
  reason?: string;
  hint?: string;
  envVar?: string;
}

export type ProviderAvailabilityMap = Record<LlmProviderId, ProviderAvailability>;

export class NoLlmProviderConfiguredError extends Error {
  public readonly availability: ProviderAvailabilityMap;

  constructor(message: string, availability: ProviderAvailabilityMap) {
    super(message);
    this.name = 'NoLlmProviderConfiguredError';
    this.availability = availability;
  }
}

/**
 * @interface AgentLLMDefinition
 * @description Defines the LLM model, prompt template, provider, and callable tools for a specific agent mode.
 */
export interface AgentLLMDefinition {
  modelId: string;
  promptTemplateKey: string;
  providerId: LlmProviderId;
  callableTools?: ILlmTool[];
}

/**
 * @class LlmConfigService
 * @classdesc Service class for managing LLM provider configurations and agent definitions.
 */
export class LlmConfigService {
  private static instance: LlmConfigService;
  private readonly providerConfigs: Map<LlmProviderId, ILlmProviderConfig>;
  private readonly agentToolDefinitions: Map<string, ILlmTool[]>;
  private readonly providerAvailability: Map<LlmProviderId, ProviderAvailability>;

  private constructor() {
    this.providerConfigs = new Map<LlmProviderId, ILlmProviderConfig>();
    this.agentToolDefinitions = new Map<string, ILlmTool[]>();
    this.providerAvailability = new Map<LlmProviderId, ProviderAvailability>();
    for (const provider of Object.values(LlmProviderId)) {
      this.providerAvailability.set(provider, {
        available: false,
        reason: 'Provider not configured.',
        envVar: this.resolveProviderEnvVar(provider),
      });
    }
    this.loadConfigurations();
    this.loadAgentToolDefinitions();
  }

  public static getInstance(): LlmConfigService {
    if (!LlmConfigService.instance) {
      LlmConfigService.instance = new LlmConfigService();
    }
    return LlmConfigService.instance;
  }

  private loadConfigurations(): void {
    // ... (provider loading logic remains the same as previously provided) ...
    console.log('[LlmConfigService] Loading LLM provider configurations...');

    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (openAIApiKey && openAIApiKey.trim() !== '' && !openAIApiKey.startsWith('YOUR_') && !openAIApiKey.endsWith('_HERE')) {
      this.providerConfigs.set(LlmProviderId.OPENAI, {
        providerId: LlmProviderId.OPENAI,
        apiKey: openAIApiKey,
        baseUrl: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
        defaultModel: process.env.MODEL_PREF_OPENAI_DEFAULT || 'gpt-4o-mini',
      });
      this.providerAvailability.set(LlmProviderId.OPENAI, {
        available: true,
        reason: `Configured (default model: ${process.env.MODEL_PREF_OPENAI_DEFAULT || 'gpt-4o-mini'}).`,
        hint: 'OpenAI routes ready.',
        envVar: 'OPENAI_API_KEY',
      });
      console.log('[LlmConfigService] OpenAI configuration LOADED.');
    } else {
      const openAiReason = !openAIApiKey || openAIApiKey.trim() === ''
        ? 'OPENAI_API_KEY is not set.'
        : 'OPENAI_API_KEY uses a placeholder value.';
      this.providerAvailability.set(LlmProviderId.OPENAI, {
        available: false,
        reason: openAiReason,
        hint: 'Set OPENAI_API_KEY to a valid OpenAI key to enable direct OpenAI routing.',
        envVar: 'OPENAI_API_KEY',
      });
      console.warn('[LlmConfigService] OpenAI API key (OPENAI_API_KEY) missing or invalid. OpenAI provider UNAVAILABLE for direct calls.');
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (openRouterApiKey && openRouterApiKey.trim() !== '' && !openRouterApiKey.startsWith('YOUR_') && !openRouterApiKey.endsWith('_HERE')) {
      this.providerConfigs.set(LlmProviderId.OPENROUTER, {
        providerId: LlmProviderId.OPENROUTER,
        apiKey: openRouterApiKey,
        baseUrl: process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai/api/v1',
        defaultModel: process.env.MODEL_PREF_OPENROUTER_DEFAULT || 'openai/gpt-4o-mini',
        additionalHeaders: {
          "HTTP-Referer": process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`,
          "X-Title": process.env.APP_NAME || "Voice Coding Assistant",
        },
      });
      this.providerAvailability.set(LlmProviderId.OPENROUTER, {
        available: true,
        reason: `Configured (default model: ${process.env.MODEL_PREF_OPENROUTER_DEFAULT || 'openai/gpt-4o-mini'}).`,
        hint: 'OpenRouter routing enabled.',
        envVar: 'OPENROUTER_API_KEY',
      });
      console.log('[LlmConfigService] OpenRouter configuration LOADED.');
    } else {
      const openRouterReason = !openRouterApiKey || openRouterApiKey.trim() === ''
        ? 'OPENROUTER_API_KEY is not set.'
        : 'OPENROUTER_API_KEY uses a placeholder value.';
      this.providerAvailability.set(LlmProviderId.OPENROUTER, {
        available: false,
        reason: openRouterReason,
        hint: 'Set OPENROUTER_API_KEY to enable provider fallback and multi-model routing.',
        envVar: 'OPENROUTER_API_KEY',
      });
      console.warn('[LlmConfigService] OpenRouter API key (OPENROUTER_API_KEY) missing or invalid. OpenRouter provider UNAVAILABLE.');
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicApiKey && anthropicApiKey.trim() !== '' && !anthropicApiKey.startsWith('YOUR_') && !anthropicApiKey.endsWith('_HERE')) {
      this.providerConfigs.set(LlmProviderId.ANTHROPIC, {
        providerId: LlmProviderId.ANTHROPIC,
        apiKey: anthropicApiKey,
        baseUrl: process.env.ANTHROPIC_API_BASE_URL || 'https://api.anthropic.com/v1',
        defaultModel: process.env.MODEL_PREF_ANTHROPIC_DEFAULT || 'claude-3-haiku-20240307',
        additionalHeaders: { "anthropic-version": "2023-06-01" }
      });
      this.providerAvailability.set(LlmProviderId.ANTHROPIC, {
        available: true,
        reason: `Configured (default model: ${process.env.MODEL_PREF_ANTHROPIC_DEFAULT || 'claude-3-haiku-20240307'}).`,
        hint: 'Claude models available.',
        envVar: 'ANTHROPIC_API_KEY',
      });
      console.log('[LlmConfigService] Anthropic configuration LOADED.');
    } else {
      const anthropicReason = !anthropicApiKey || anthropicApiKey.trim() === ''
        ? 'ANTHROPIC_API_KEY is not set.'
        : 'ANTHROPIC_API_KEY uses a placeholder value.';
      this.providerAvailability.set(LlmProviderId.ANTHROPIC, {
        available: false,
        reason: anthropicReason,
        hint: 'Provide ANTHROPIC_API_KEY to enable Claude models.',
        envVar: 'ANTHROPIC_API_KEY',
      });
      console.info('[LlmConfigService] Anthropic API key (ANTHROPIC_API_KEY) not provided. Anthropic provider UNAVAILABLE.');
    }

    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
    if (ollamaBaseUrl && ollamaBaseUrl.trim() !== '') {
        this.providerConfigs.set(LlmProviderId.OLLAMA, {
            providerId: LlmProviderId.OLLAMA,
            apiKey: undefined,
            baseUrl: ollamaBaseUrl,
            defaultModel: process.env.MODEL_PREF_OLLAMA_DEFAULT || 'llama3:latest',
        });
        console.log(`[LlmConfigService] Ollama configuration LOADED. Base URL: ${ollamaBaseUrl}`);
        this.providerAvailability.set(LlmProviderId.OLLAMA, {
          available: true,
          reason: `Configured (base URL: ${ollamaBaseUrl}).`,
          hint: 'Ensure the Ollama host is reachable from the server.',
          envVar: 'OLLAMA_BASE_URL',
        });
    } else {
        this.providerAvailability.set(LlmProviderId.OLLAMA, {
          available: false,
          reason: 'OLLAMA_BASE_URL is not set. Local Ollama inference disabled.',
          hint: 'Set OLLAMA_BASE_URL if you want to route requests to a local Ollama instance.',
          envVar: 'OLLAMA_BASE_URL',
        });
        console.info('[LlmConfigService] OLLAMA_BASE_URL not provided. Ollama provider UNAVAILABLE.');
    }
    console.log(`[LlmConfigService] Provider configuration loading complete. Configured: ${Array.from(this.providerConfigs.keys()).join(', ') || 'None'}`);
  }

  private loadAgentToolDefinitions(): void {
    console.log('[LlmConfigService] Loading agent tool definitions...');
    this.agentToolDefinitions.set('tutor', TutorAgentTools);
    console.log(`[LlmConfigService] Loaded ${TutorAgentTools.length} tools for agent 'tutor'.`);

    this.agentToolDefinitions.set('coding', CodingAssistantAgentTools); // Assuming 'coding' is the promptTemplateKey for CodingAssistant
    console.log(`[LlmConfigService] Loaded ${CodingAssistantAgentTools.length} tools for agent 'coding'.`);

    this.agentToolDefinitions.set('diary', DiaryAgentTools); // New: For Diary agent
    console.log(`[LlmConfigService] Loaded ${DiaryAgentTools.length} tools for agent 'diary'.`);
    // Add other agents' tools here as they are defined
    // e.g., this.agentToolDefinitions.set('coding_interviewer', CodingInterviewerAgentTools);
  }

  public getProviderConfig(providerId: LlmProviderId): ILlmProviderConfig | undefined {
    return this.providerConfigs.get(providerId);
  }
  
  public isProviderAvailable(providerId: LlmProviderId): boolean {
    const config = this.providerConfigs.get(providerId);
    if (!config) return false;
    return (providerId === LlmProviderId.OLLAMA) ? !!config.baseUrl : !!config.apiKey;
  }

  public getAvailableProviders(): LlmProviderId[] {
    return Array.from(this.providerConfigs.keys()).filter(providerId => this.isProviderAvailable(providerId));
  }

  public getDefaultProviderAndModel(): { providerId: LlmProviderId; modelId: string } {
    // ... (logic remains the same as previously provided) ...
    const envRoutingProviderId = process.env.ROUTING_LLM_PROVIDER_ID?.toLowerCase() as LlmProviderId | undefined;
    const envRoutingModelId = process.env.ROUTING_LLM_MODEL_ID;

    if (envRoutingProviderId && this.isProviderAvailable(envRoutingProviderId)) {
      const providerConfig = this.providerConfigs.get(envRoutingProviderId)!;
      const modelIdToUse = envRoutingModelId || providerConfig.defaultModel;
      if (modelIdToUse) {
        return { providerId: envRoutingProviderId, modelId: modelIdToUse };
      }
    }
    const preferredOrder: LlmProviderId[] = [ LlmProviderId.OPENROUTER, LlmProviderId.OPENAI, LlmProviderId.ANTHROPIC, LlmProviderId.OLLAMA ];
    for (const providerId of preferredOrder) {
      if (this.isProviderAvailable(providerId)) {
        const config = this.providerConfigs.get(providerId)!;
        if (config.defaultModel) {
          return { providerId, modelId: config.defaultModel };
        }
      }
    }
    throw new NoLlmProviderConfiguredError(
      'LlmConfigService: No usable LLM provider configuration found.',
      this.getProviderAvailabilitySnapshot(),
    );
  }

  public getFallbackProviderId(): LlmProviderId | undefined {
    // ... (logic remains the same as previously provided) ...
    const fallbackId = process.env.FALLBACK_LLM_PROVIDER_ID?.toLowerCase() as LlmProviderId | undefined;
    if (fallbackId && this.isProviderAvailable(fallbackId)) return fallbackId;
    return undefined;
  }

  public getDefaultOpenAIModel(): string {
    return this.providerConfigs.get(LlmProviderId.OPENAI)?.defaultModel || process.env.MODEL_PREF_OPENAI_DEFAULT || 'gpt-4o-mini';
  }
  public getDefaultOpenRouterModel(): string {
    return this.providerConfigs.get(LlmProviderId.OPENROUTER)?.defaultModel || process.env.MODEL_PREF_OPENROUTER_DEFAULT || 'openai/gpt-4o-mini';
  }
  public getDefaultAnthropicModel(): string {
    return this.providerConfigs.get(LlmProviderId.ANTHROPIC)?.defaultModel || process.env.MODEL_PREF_ANTHROPIC_DEFAULT || 'claude-3-haiku-20240307';
  }
  public getDefaultOllamaModel(): string {
    return this.providerConfigs.get(LlmProviderId.OLLAMA)?.defaultModel || process.env.MODEL_PREF_OLLAMA_DEFAULT || 'llama3:latest';
  }

  public getProviderAvailabilitySnapshot(): ProviderAvailabilityMap {
    const snapshot: ProviderAvailabilityMap = {} as ProviderAvailabilityMap;
    for (const provider of Object.values(LlmProviderId)) {
      const availability = this.providerAvailability.get(provider);
      snapshot[provider] = availability ? { ...availability } : {
        available: false,
        reason: 'Provider not configured.',
        envVar: this.resolveProviderEnvVar(provider),
      };
    }
    return snapshot;
  }

  private resolveProviderEnvVar(provider: LlmProviderId): string | undefined {
    switch (provider) {
      case LlmProviderId.OPENAI:
        return 'OPENAI_API_KEY';
      case LlmProviderId.OPENROUTER:
        return 'OPENROUTER_API_KEY';
      case LlmProviderId.ANTHROPIC:
        return 'ANTHROPIC_API_KEY';
      case LlmProviderId.OLLAMA:
        return 'OLLAMA_BASE_URL';
      default:
        return undefined;
    }
  }

  public getAgentDefinitionFromMode(
    mode: string,
    isInterviewSubMode: boolean = false,
    isTutorSubMode: boolean = false
  ): AgentLLMDefinition {
    const modeKey = mode.toLowerCase();
    let effectiveModelId: string;
    let effectivePromptKey: string = modeKey;
    const systemDefaultChoice = this.getDefaultProviderAndModel();
    effectiveModelId = systemDefaultChoice.modelId;
    let providerId = systemDefaultChoice.providerId;
    let callableTools: ILlmTool[] | undefined = undefined;

    // Determine prompt key and specific model preferences
    if (modeKey === 'coding') {
      if (isInterviewSubMode) {
        effectiveModelId = MODEL_PREFERENCES.interview_tutor || MODEL_PREFERENCES.coding_tutor || MODEL_PREFERENCES.coding || systemDefaultChoice.modelId;
        effectivePromptKey = 'coding_interviewer';
      } else if (isTutorSubMode) {
        effectiveModelId = MODEL_PREFERENCES.coding_tutor || MODEL_PREFERENCES.coding || systemDefaultChoice.modelId;
        effectivePromptKey = 'coding_tutor';
      } else {
        effectiveModelId = MODEL_PREFERENCES.coding || systemDefaultChoice.modelId;
        effectivePromptKey = 'coding';
      }
    } else if (MODEL_PREFERENCES[modeKey as keyof typeof MODEL_PREFERENCES]) {
      effectiveModelId = MODEL_PREFERENCES[modeKey as keyof typeof MODEL_PREFERENCES];
      effectivePromptKey = modeKey;
    } else {
      console.warn(`[LlmConfigService] No specific model preference for mode '${modeKey}'. Using system default: ${systemDefaultChoice.modelId}.`);
      effectiveModelId = systemDefaultChoice.modelId;
      effectivePromptKey = (modeKey === 'general' || modeKey === 'general_chat' || !modeKey) ? 'general_chat' : modeKey;
    }
    
    // Assign tools based on the determined effectivePromptKey (which usually matches the agent's primary identifier)
    callableTools = this.agentToolDefinitions.get(effectivePromptKey) || undefined;
    
    const modelProviderPrefixMatch = effectiveModelId.match(/^([a-zA-Z0-9_-]+)\//);
    if (modelProviderPrefixMatch && modelProviderPrefixMatch[1]) {
      const potentialProviderFromModel = modelProviderPrefixMatch[1].toLowerCase() as LlmProviderId;
      if (Object.values(LlmProviderId).includes(potentialProviderFromModel) && this.isProviderAvailable(potentialProviderFromModel)) {
        providerId = potentialProviderFromModel;
      } else {
        console.warn(`[LlmConfigService] Model ID "${effectiveModelId}" contains a prefix "${potentialProviderFromModel}" for an unavailable provider. System default provider "${providerId}" will be used.`);
      }
    }

    console.log(`[LlmConfigService] Resolved for mode '${mode}' (interview: ${isInterviewSubMode}, tutor: ${isTutorSubMode}): Model='${effectiveModelId}', PromptKey='${effectivePromptKey}', Provider='${providerId}', Tools: ${callableTools?.length || 0}`);
    return { modelId: effectiveModelId, promptTemplateKey: effectivePromptKey, providerId, callableTools };
  }
}
