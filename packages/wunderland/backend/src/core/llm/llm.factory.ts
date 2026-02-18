// File: backend/src/core/llm/llm.factory.ts
/**
 * @file LLM Service Factory and Unified Call Function
 * @description Provides a factory to get LLM service instances and a unified `callLlm`
 * function to interact with them. This abstracts the specific LLM provider details.
 * @version 1.2.0 - Propagated tool parameters to LLM services in callLlm.
 */

import { LlmConfigService, LlmProviderId, NoLlmProviderConfiguredError } from './llm.config.service.js';
import { OpenAiLlmService } from './openai.llm.service.js';
import { OpenRouterLlmService } from './openrouter.llm.service.js';
// Import other LLM services (Anthropic, Ollama) as they are implemented
// import { AnthropicLlmService } from './anthropic.llm.service.js';
// import { OllamaLlmService } from './ollama.llm.service.js';
import {
  IChatMessage,
  ILlmResponse,
  ILlmService,
  IChatCompletionParams,
  ILlmTool,
} from './llm.interfaces.js';
import { CostService } from '../cost/cost.service.js';
import { getModelPrice } from '../../../config/models.config.js';

let llmConfigService: LlmConfigService;
const serviceCache: Map<LlmProviderId | string, ILlmService> = new Map();

/**
 * Initializes the LLM configuration service. Must be called once at application startup.
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If initialization fails.
 */
export async function initializeLlmServices(): Promise<void> {
  if (llmConfigService) {
    console.warn('[LLM Factory] LLM services already initialized.');
    return;
  }
  try {
    llmConfigService = LlmConfigService.getInstance(); // This loads .env internally
    console.log('[LLM Factory] LLMConfigService instance obtained.');
    // Pre-initialize default or commonly used providers if desired
    // For example, initialize the default provider:
    const defaultProvider = llmConfigService.getDefaultProviderAndModel();
    if (defaultProvider?.providerId) {
        getLlmService(defaultProvider.providerId); // This will cache it
        console.log(`[LLM Factory] Pre-initialized service for default provider: ${defaultProvider.providerId}`);
    }

  } catch (error) {
    console.error('[LLM Factory] CRITICAL: Failed to initialize LlmConfigService:', error);
    if (error instanceof NoLlmProviderConfiguredError) {
      throw error;
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to initialize LLM services: ${String(error)}`);
  }
}

/**
 * Retrieves an instance of an LLM service based on the provider ID.
 * Caches service instances for reuse.
 * @param {LlmProviderId | string} providerId - The identifier of the LLM provider.
 * @returns {ILlmService} An instance of the LLM service.
 * @throws {Error} If the provider is not configured, not supported, or initialization fails.
 */
export function getLlmService(providerId: LlmProviderId | string): ILlmService {
  if (!llmConfigService) {
    throw new Error('[LLM Factory] LlmConfigService not initialized. Call initializeLlmServices() first.');
  }

  if (serviceCache.has(providerId)) {
    return serviceCache.get(providerId)!;
  }

  const providerConfig = llmConfigService.getProviderConfig(providerId as LlmProviderId);
  if (!providerConfig) {
    throw new Error(`[LLM Factory] Configuration not found for LLM provider: ${providerId}`);
  }

  let service: ILlmService;
  switch (providerId) {
    case LlmProviderId.OPENAI:
      service = new OpenAiLlmService(providerConfig);
      break;
    case LlmProviderId.OPENROUTER:
      service = new OpenRouterLlmService(providerConfig);
      break;
    // case LlmProviderId.ANTHROPIC:
    //   service = new AnthropicLlmService(providerConfig);
    //   break;
    // case LlmProviderId.OLLAMA:
    //   service = new OllamaLlmService(providerConfig);
    //   break;
    default:
      throw new Error(`[LLM Factory] Unsupported LLM provider: ${providerId}`);
  }

  serviceCache.set(providerId, service);
  console.log(`[LLM Factory] Service for provider "${providerId}" initialized and cached.`);
  return service;
}

/**
 * Unified function to make a chat completion request to an LLM.
 * It selects the appropriate service based on providerId or default configuration.
 * Handles cost tracking for the LLM call.
 *
 * @param {IChatMessage[]} messages - Array of messages for the chat completion.
 * @param {string} [modelId] - Specific model ID to use. If not provided, uses default for the chosen provider.
 * @param {IChatCompletionParams} [params] - Optional parameters for the completion (temperature, max_tokens, tools, etc.).
 * @param {LlmProviderId | string} [providerId] - Specific provider to use. If not provided, uses default from config.
 * @param {string} [userIdForCostTracking='system_user_llm_factory'] - User ID for cost tracking.
 * @returns {Promise<ILlmResponse>} The LLM's response.
 * @throws {Error} If LLM call fails or configuration is missing.
 */
export async function callLlm(
  messages: IChatMessage[],
  modelId?: string,
  params?: IChatCompletionParams,
  providerId?: LlmProviderId | string,
  userIdForCostTracking: string = 'system_user_llm_factory'
): Promise<ILlmResponse> {
  if (!llmConfigService) {
    console.error("[LLM Factory] LlmConfigService not initialized. Call initializeLlmServices() first.");
    // Attempt to initialize it on the fly if called before explicit init (e.g. in tests or scripts)
    // This is a fallback, proper app startup should call initializeLlmServices.
    await initializeLlmServices();
    if (!llmConfigService) { // Check again after attempt
        throw new Error("[LLM Factory] Critical: LlmConfigService failed to initialize on demand.");
    }
    console.warn("[LLM Factory] LlmConfigService was initialized on-demand by callLlm. Ensure initializeLlmServices() is part of your application's startup sequence.");
  }

  let effectiveProviderId: LlmProviderId | string;
  let effectiveModelId: string;

  if (providerId) {
    effectiveProviderId = providerId;
    const serviceInstance = getLlmService(effectiveProviderId); // Ensures provider is valid
    effectiveModelId = modelId || llmConfigService.getProviderConfig(effectiveProviderId as LlmProviderId)?.defaultModel || '';
    if (!effectiveModelId) {
        throw new Error(`[LLM Factory] No model ID provided and no default model configured for provider: ${effectiveProviderId}`);
    }
    // If modelId is prefixed (e.g., "openai/gpt-4o") and providerId is OpenRouter, that's fine.
    // If modelId is prefixed and providerId is specific (e.g., OpenAI), the service should handle stripping the prefix.
  } else if (modelId && modelId.includes('/')) {
    // Model ID has a provider prefix, e.g., "openai/gpt-4o-mini" or "anthropic/claude-3-opus"
    const [inferredProvider, ...modelNameParts] = modelId.split('/');
    const inferredProviderId = inferredProvider.toLowerCase() as LlmProviderId;

    if (llmConfigService.isProviderAvailable(inferredProviderId)) {
      effectiveProviderId = inferredProviderId;
      effectiveModelId = modelNameParts.join('/'); // The actual model name for that provider
      // If the inferredProviderId is 'openrouter', then effectiveModelId should remain prefixed for OpenRouter service.
      // The specific services (OpenAiLlmService, etc.) will handle if they need to strip their own prefix.
      // For OpenRouterLlmService, it often expects the prefix.
      if (effectiveProviderId === LlmProviderId.OPENROUTER) {
        effectiveModelId = modelId; // Pass the full prefixed model to OpenRouter
      }

    } else {
      console.warn(`[LLM Factory] Provider inferred from modelId "${modelId}" (${inferredProviderId}) is not available. Falling back to default provider.`);
      const defaultChoice = llmConfigService.getDefaultProviderAndModel();
      effectiveProviderId = defaultChoice.providerId;
      effectiveModelId = modelId; // Pass original modelId, let default provider sort it out or fail
    }
  } else {
    // No providerId, and modelId has no prefix (or modelId is also undefined)
    const defaultChoice = llmConfigService.getDefaultProviderAndModel();
    effectiveProviderId = defaultChoice.providerId;
    effectiveModelId = modelId || defaultChoice.modelId;
  }

  if (!effectiveModelId) {
    throw new Error(`[LLM Factory] Could not resolve a model ID for provider ${effectiveProviderId}.`);
  }
  
  const service = getLlmService(effectiveProviderId);
  
  // If the service is NOT OpenRouter and the effectiveModelId STILL has a prefix matching this service's providerId,
  // the service's mapToProviderModelId method should handle it.
  // Example: service is OpenAiLlmService, effectiveModelId is "openai/gpt-4o". OpenAiLlmService.mapToProviderModelId will strip "openai/".
  // If service is OpenRouterLlmService, effectiveModelId is "openai/gpt-4o". OpenRouterLlmService.mapToProviderModelId expects this.

  console.log(`[LLM Factory] Calling LLM via provider: "${effectiveProviderId}", model: "${effectiveModelId}"`);

  try {
    // Propagate tool parameters if they exist in `params`
    const completionParams: IChatCompletionParams = {
      ...params,
      tools: params?.tools,
      tool_choice: params?.tool_choice,
    };

    const response = await service.generateChatCompletion(messages, effectiveModelId, completionParams);

    // Cost Tracking
    const modelPriceInfo = getModelPrice(response.model || effectiveModelId);
    if (response.usage && modelPriceInfo) {
      const cost = ( (response.usage.prompt_tokens || 0) / 1000) * modelPriceInfo.inputCostPer1K +
                   ( (response.usage.completion_tokens || 0) / 1000) * modelPriceInfo.outputCostPer1K;
      CostService.trackCost(
        userIdForCostTracking,
        'llm',
        cost,
        response.model || effectiveModelId,
        response.usage.prompt_tokens || 0, 'tokens',
        response.usage.completion_tokens || 0, 'tokens',
        { provider: effectiveProviderId, stopReason: response.stopReason, hasToolCalls: !!response.toolCalls?.length }
      );
    } else if (response.usage) {
        console.warn(`[LLM Factory] Usage reported by LLM for model ${response.model || effectiveModelId}, but no pricing info found. Cost not tracked for this call.`);
    }

    return response;
  } catch (error: any) {
    console.error(`[LLM Factory] Error during callLlm with provider ${effectiveProviderId}, model ${effectiveModelId}: ${error.message}`, error.stack);
    // Try fallback if configured and error is likely retryable (e.g., not auth error)
    // Basic check, can be more sophisticated:
    const isRetryableError = !(error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 400);

    if (isRetryableError) {
        const fallbackProviderId = llmConfigService.getFallbackProviderId();
        if (fallbackProviderId && fallbackProviderId !== effectiveProviderId) {
            console.warn(`[LLM Factory] Attempting fallback to provider: ${fallbackProviderId} due to error with ${effectiveProviderId}.`);
            try {
                // Important: Decide if you use the same modelId or a default for the fallback provider
                const fallbackService = getLlmService(fallbackProviderId);
                const fallbackModelId = modelId || llmConfigService.getProviderConfig(fallbackProviderId)?.defaultModel || effectiveModelId; // Re-evaluate model for fallback
                
                const fallbackResponse = await fallbackService.generateChatCompletion(messages, fallbackModelId, params);
                
                // Cost tracking for fallback call
                const fallbackModelPriceInfo = getModelPrice(fallbackResponse.model || fallbackModelId);
                if (fallbackResponse.usage && fallbackModelPriceInfo) {
                    const fallbackCost = ((fallbackResponse.usage.prompt_tokens || 0) / 1000) * fallbackModelPriceInfo.inputCostPer1K +
                                       ((fallbackResponse.usage.completion_tokens || 0) / 1000) * fallbackModelPriceInfo.outputCostPer1K;
                    CostService.trackCost(
                        userIdForCostTracking,
                        'llm_fallback', // Distinguish fallback cost
                        fallbackCost,
                        fallbackResponse.model || fallbackModelId,
                        fallbackResponse.usage.prompt_tokens || 0, 'tokens',
                        fallbackResponse.usage.completion_tokens || 0, 'tokens',
                        { originalProvider: effectiveProviderId, provider: fallbackProviderId, stopReason: fallbackResponse.stopReason, hasToolCalls: !!fallbackResponse.toolCalls?.length }
                    );
                }
                return fallbackResponse;
            } catch (fallbackError: any) {
                console.error(`[LLM Factory] Fallback LLM call also failed for provider ${fallbackProviderId}: ${fallbackError.message}`);
                // Throw original error or a combined error
                throw error; // Re-throw original error after fallback failure
            }
        }
    }
    throw error; // Re-throw error if not retryable or no fallback
  }
}
