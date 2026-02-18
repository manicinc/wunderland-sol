/**
 * @fileoverview Plivo Voice Provider Extension for AgentOS.
 *
 * Provides an IVoiceCallProvider implementation backed by the Plivo Voice API,
 * plus an ITool descriptor for programmatic voice call management.
 *
 * @module @framers/agentos-ext-voice-plivo
 */

import type { ExtensionContext, ExtensionPack, CallManager } from '@framers/agentos';
import { PlivoVoiceService, type PlivoServiceConfig } from './PlivoVoiceService';
import { createPlivoVoiceProvider, PlivoVoiceProvider } from './PlivoVoiceProvider';
import { PlivoVoiceCallTool, type VoiceCallToolHandler } from './tools/voiceCall';

// ============================================================================
// Extension Options
// ============================================================================

export interface PlivoVoiceOptions {
  /** Plivo Auth ID (overrides secrets/env). */
  authId?: string;
  /** Plivo Auth Token (overrides secrets/env). */
  authToken?: string;
  /** E.164 outbound caller ID (overrides secrets/env). */
  fromNumber?: string;
  /** Environment variable name for Auth ID (default: PLIVO_AUTH_ID). */
  authIdEnv?: string;
  /** Environment variable name for Auth Token (default: PLIVO_AUTH_TOKEN). */
  authTokenEnv?: string;
  /** Environment variable name for From Number (default: PLIVO_FROM_NUMBER). */
  fromNumberEnv?: string;
  /** Optional CallManager instance for the tool handler. */
  callManager?: CallManager;
  /** Extension priority (default: 50). */
  priority?: number;
}

// ============================================================================
// Secret/Env Resolution
// ============================================================================

function resolveSecret(
  key: string,
  optionsValue: string | undefined,
  secrets: Record<string, string> | undefined,
  secretKey: string,
  envName: string,
  ...envFallbacks: string[]
): string {
  // 1. Direct option
  if (optionsValue) return optionsValue;

  // 2. Secrets map
  if (secrets?.[secretKey]) return secrets[secretKey];

  // 3. Primary environment variable
  if (process.env[envName]) return process.env[envName]!;

  // 4. Fallback env vars
  for (const fallback of envFallbacks) {
    if (process.env[fallback]) return process.env[fallback]!;
  }

  throw new Error(
    `Plivo ${key} not found. Provide via options.${key}, secrets["${secretKey}"], or ${envName} env var.`,
  );
}

// ============================================================================
// CallManager Tool Handler Adapter
// ============================================================================

/**
 * Adapts a CallManager instance into the VoiceCallToolHandler interface
 * expected by the PlivoVoiceCallTool.
 */
function createCallManagerHandler(callManager: CallManager): VoiceCallToolHandler {
  return {
    async initiateCall(toNumber, message, mode) {
      return callManager.initiateCall({ toNumber, message, mode });
    },
    speakText(callId, text) {
      callManager.speakText(callId, text);
    },
    async hangupCall(callId) {
      await callManager.hangupCall(callId);
    },
    getCallStatus(callId) {
      return callManager.getCall(callId);
    },
    getActiveCalls() {
      return callManager.getActiveCalls();
    },
  };
}

/**
 * Stub handler used when no CallManager is provided.
 * The tool will return errors explaining that a CallManager is required.
 */
function createStubHandler(): VoiceCallToolHandler {
  const err = () => {
    throw new Error(
      'No CallManager configured. Provide options.callManager to enable voice call operations.',
    );
  };
  return {
    initiateCall: err,
    speakText: err,
    hangupCall: err,
    getCallStatus: () => undefined,
    getActiveCalls: () => [],
  };
}

// ============================================================================
// Extension Pack Factory
// ============================================================================

/**
 * Create the Plivo Voice Provider extension pack.
 *
 * Resolves credentials from options, secrets map, or environment variables,
 * then creates the PlivoVoiceService, PlivoVoiceProvider, and PlivoVoiceCallTool.
 *
 * @param context - Extension context with options, logger, and secrets.
 * @returns An ExtensionPack with tool and voice-provider descriptors.
 *
 * @example
 * ```typescript
 * import { createExtensionPack } from '@framers/agentos-ext-voice-plivo';
 *
 * const pack = createExtensionPack({
 *   options: {
 *     authId: 'MAXXXXXXXXXX',
 *     authToken: 'your-auth-token',
 *     fromNumber: '+15551234567',
 *     callManager: myCallManager,
 *   },
 * });
 * ```
 */
export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as PlivoVoiceOptions & {
    secrets?: Record<string, string>;
  };

  // Resolve credentials
  const authId = resolveSecret(
    'authId',
    options.authId,
    options.secrets,
    'plivo.authId',
    options.authIdEnv ?? 'PLIVO_AUTH_ID',
    'PLIVO_AUTH_ID',
  );

  const authToken = resolveSecret(
    'authToken',
    options.authToken,
    options.secrets,
    'plivo.authToken',
    options.authTokenEnv ?? 'PLIVO_AUTH_TOKEN',
    'PLIVO_AUTH_TOKEN',
  );

  const fromNumber = resolveSecret(
    'fromNumber',
    options.fromNumber,
    options.secrets,
    'plivo.fromNumber',
    options.fromNumberEnv ?? 'PLIVO_FROM_NUMBER',
    'PLIVO_FROM_NUMBER',
    'PLIVO_PHONE_NUMBER',
  );

  // Create service and provider
  const serviceConfig: PlivoServiceConfig = { authId, authToken, fromNumber };
  const service = new PlivoVoiceService(serviceConfig);
  const provider = createPlivoVoiceProvider(service, authToken);

  // Create tool with CallManager handler or stub
  const handler = options.callManager
    ? createCallManagerHandler(options.callManager)
    : createStubHandler();
  const voiceCallTool = new PlivoVoiceCallTool(handler);

  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-voice-plivo',
    version: '0.1.0',
    descriptors: [
      { id: 'plivoVoiceCall', kind: 'tool', priority, payload: voiceCallTool },
      { id: 'plivoVoiceProvider', kind: 'voice-provider', priority, payload: provider },
    ],
    onActivate: async () => {
      await service.initialize();

      // If a CallManager was provided, register the provider
      if (options.callManager) {
        options.callManager.registerProvider(provider);
      }

      context.logger?.info('[PlivoVoice] Extension activated');
    },
    onDeactivate: async () => {
      await service.shutdown();
      context.logger?.info('[PlivoVoice] Extension deactivated');
    },
  };
}

// Re-export public API
export { PlivoVoiceService, type PlivoServiceConfig } from './PlivoVoiceService';
export { PlivoVoiceProvider, createPlivoVoiceProvider } from './PlivoVoiceProvider';
export { PlivoVoiceCallTool, type VoiceCallToolHandler } from './tools/voiceCall';
export default createExtensionPack;
