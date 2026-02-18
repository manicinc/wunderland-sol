/**
 * @fileoverview Telnyx Voice Call Extension for AgentOS.
 *
 * Provides an IVoiceCallProvider backed by Telnyx Call Control v2,
 * plus an ITool descriptor for programmatic voice call management.
 *
 * @module @framers/agentos-ext-voice-telnyx
 */

import type { ExtensionContext, ExtensionPack, CallRecord, CallMode } from '@framers/agentos';
import { CallManager } from '@framers/agentos';
import { TelnyxVoiceService, type TelnyxServiceConfig } from './TelnyxVoiceService';
import { TelnyxVoiceProvider } from './TelnyxVoiceProvider';
import { TelnyxVoiceCallTool, type VoiceCallToolHandler } from './tools/voiceCall';

// ============================================================================
// Options
// ============================================================================

export interface TelnyxVoiceOptions {
  /** Telnyx API v2 key (overrides secrets/env). */
  apiKey?: string;
  /** Telnyx Call Control Application connection ID (overrides secrets/env). */
  connectionId?: string;
  /** Ed25519 public key for webhook signature verification. */
  publicKey?: string;
  /** Default E.164 "from" number for outbound calls. */
  fromNumber?: string;
  /** Webhook base URL (e.g., https://yourdomain.com). */
  webhookBaseUrl?: string;
  /** Priority for extension descriptor ordering. */
  priority?: number;
}

// ============================================================================
// Secret / Env Resolution
// ============================================================================

function resolveApiKey(
  options: TelnyxVoiceOptions,
  secrets?: Record<string, string>,
): string {
  if (options.apiKey) return options.apiKey;
  if (secrets?.['telnyx.apiKey']) return secrets['telnyx.apiKey'];

  for (const envName of ['TELNYX_API_KEY', 'TELNYX_API_V2_KEY']) {
    if (process.env[envName]) return process.env[envName]!;
  }

  throw new Error(
    'Telnyx API key not found. Provide via options.apiKey, secrets["telnyx.apiKey"], or TELNYX_API_KEY env var.',
  );
}

function resolveConnectionId(
  options: TelnyxVoiceOptions,
  secrets?: Record<string, string>,
): string {
  if (options.connectionId) return options.connectionId;
  if (secrets?.['telnyx.connectionId']) return secrets['telnyx.connectionId'];

  for (const envName of ['TELNYX_CONNECTION_ID', 'TELNYX_APP_ID']) {
    if (process.env[envName]) return process.env[envName]!;
  }

  throw new Error(
    'Telnyx connection ID not found. Provide via options.connectionId, secrets["telnyx.connectionId"], or TELNYX_CONNECTION_ID env var.',
  );
}

function resolvePublicKey(
  options: TelnyxVoiceOptions,
  secrets?: Record<string, string>,
): string | undefined {
  if (options.publicKey) return options.publicKey;
  if (secrets?.['telnyx.publicKey']) return secrets['telnyx.publicKey'];
  return process.env['TELNYX_PUBLIC_KEY'] ?? undefined;
}

function resolveFromNumber(options: TelnyxVoiceOptions): string | undefined {
  return options.fromNumber ?? process.env['TELNYX_FROM_NUMBER'] ?? undefined;
}

// ============================================================================
// Factory
// ============================================================================

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as TelnyxVoiceOptions & {
    secrets?: Record<string, string>;
  };

  const apiKey = resolveApiKey(options, options.secrets);
  const connectionId = resolveConnectionId(options, options.secrets);
  const publicKey = resolvePublicKey(options, options.secrets);
  const fromNumber = resolveFromNumber(options);

  const config: TelnyxServiceConfig = {
    apiKey,
    connectionId,
    publicKey,
    fromNumber,
  };

  // Create service and provider
  const service = new TelnyxVoiceService(config);
  const provider = new TelnyxVoiceProvider(service, config);

  // Create a CallManager to back the tool handler
  const callManager = new CallManager({
    provider: { provider: 'telnyx', config: { apiKey, connectionId, fromNumber: fromNumber ?? '' } },
    webhookBaseUrl: options.webhookBaseUrl,
    defaultMode: 'conversation',
  });
  callManager.registerProvider(provider);

  // Wire tool handler to CallManager
  const toolHandler: VoiceCallToolHandler = {
    async initiateCall(toNumber: string, message?: string, mode?: CallMode): Promise<CallRecord> {
      return callManager.initiateCall({ toNumber, message, mode });
    },
    speakText(callId: string, text: string): void {
      callManager.speakText(callId, text);
    },
    async hangupCall(callId: string): Promise<void> {
      await callManager.hangupCall(callId);
    },
    getCallStatus(callId: string): CallRecord | undefined {
      return callManager.getCall(callId);
    },
    getActiveCalls(): CallRecord[] {
      return callManager.getActiveCalls();
    },
  };

  const voiceCallTool = new TelnyxVoiceCallTool(toolHandler);
  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-voice-telnyx',
    version: '0.1.0',
    descriptors: [
      { id: 'telnyxVoiceCall', kind: 'tool', priority, payload: voiceCallTool },
      { id: 'telnyxVoiceProvider', kind: 'voice-provider', priority, payload: provider },
    ],
    onActivate: async () => {
      await service.initialize();
      context.logger?.info('[TelnyxVoice] Extension activated');
    },
    onDeactivate: async () => {
      callManager.dispose();
      await service.shutdown();
      context.logger?.info('[TelnyxVoice] Extension deactivated');
    },
  };
}

// ── Re-exports ──

export { TelnyxVoiceService, type TelnyxServiceConfig } from './TelnyxVoiceService';
export { TelnyxVoiceProvider } from './TelnyxVoiceProvider';
export { TelnyxVoiceCallTool, type VoiceCallToolHandler } from './tools/voiceCall';
export default createExtensionPack;
