/**
 * @fileoverview Twilio Voice Call Extension for AgentOS.
 *
 * Provides an IVoiceCallProvider implementation for Twilio, plus an ITool
 * descriptor that lets agents make and manage phone calls programmatically.
 *
 * Follows the same extension-pack pattern as the Telegram channel extension.
 *
 * @module @framers/agentos-ext-voice-twilio
 */

import type { ExtensionContext, ExtensionPack, CallMode, CallRecord } from '@framers/agentos';
import { TwilioVoiceService, type TwilioServiceConfig } from './TwilioVoiceService';
import { TwilioVoiceProvider } from './TwilioVoiceProvider';
import { VoiceCallTool, type VoiceCallToolHandler } from './tools/voiceCall';

// ============================================================================
// Options
// ============================================================================

export interface TwilioVoiceOptions {
  /** Twilio Account SID. */
  accountSid?: string;
  /** Twilio Auth Token. */
  authToken?: string;
  /** Default E.164 "from" phone number. */
  fromNumber?: string;
  /** Base URL for webhook callbacks (e.g., https://yourdomain.com). */
  webhookBaseUrl?: string;
  /** Env var name for account SID (default: TWILIO_ACCOUNT_SID). */
  accountSidEnv?: string;
  /** Env var name for auth token (default: TWILIO_AUTH_TOKEN). */
  authTokenEnv?: string;
  /** Env var name for from number (default: TWILIO_FROM_NUMBER). */
  fromNumberEnv?: string;
  /** Extension descriptor priority (default: 50). */
  priority?: number;
  /** Secrets map passed from registry. */
  secrets?: Record<string, string>;
}

// ============================================================================
// Secret Resolution
// ============================================================================

function resolveSecret(
  optionValue: string | undefined,
  secrets: Record<string, string> | undefined,
  secretKey: string,
  envVarOverride: string | undefined,
  defaultEnvVar: string,
  ...fallbackEnvVars: string[]
): string {
  // 1. Direct option value
  if (optionValue) return optionValue;

  // 2. Secrets map from registry
  if (secrets?.[secretKey]) return secrets[secretKey];

  // 3. Custom env var
  const envName = envVarOverride ?? defaultEnvVar;
  if (process.env[envName]) return process.env[envName]!;

  // 4. Fallback env vars
  for (const v of fallbackEnvVars) {
    if (process.env[v]) return process.env[v]!;
  }

  return '';
}

// ============================================================================
// Factory
// ============================================================================

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as TwilioVoiceOptions;

  const accountSid = resolveSecret(
    options.accountSid,
    options.secrets,
    'twilio.accountSid',
    options.accountSidEnv,
    'TWILIO_ACCOUNT_SID',
  );

  const authToken = resolveSecret(
    options.authToken,
    options.secrets,
    'twilio.authToken',
    options.authTokenEnv,
    'TWILIO_AUTH_TOKEN',
  );

  const fromNumber = resolveSecret(
    options.fromNumber,
    options.secrets,
    'twilio.fromNumber',
    options.fromNumberEnv,
    'TWILIO_FROM_NUMBER',
    'TWILIO_PHONE_NUMBER',
  );

  if (!accountSid || !authToken) {
    throw new Error(
      'Twilio credentials not found. Provide via options.accountSid/authToken, ' +
      'secrets["twilio.accountSid"/"twilio.authToken"], or ' +
      'TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN env vars.',
    );
  }

  const config: TwilioServiceConfig = {
    accountSid,
    authToken,
    fromNumber,
    webhookBaseUrl: options.webhookBaseUrl ?? process.env['TWILIO_WEBHOOK_BASE_URL'],
  };

  // ── Instantiate components ──

  const service = new TwilioVoiceService(config);
  const provider = new TwilioVoiceProvider(service);

  // The tool handler delegates to a CallManager, but since the CallManager
  // is owned by the host application (not this extension), we provide a
  // no-op placeholder handler that can be replaced at runtime via the
  // exported `setToolHandler()`.
  let activeHandler: VoiceCallToolHandler = createPlaceholderHandler();

  const voiceCallTool = new VoiceCallTool(
    // Proxy handler so it always uses the latest activeHandler reference
    {
      initiateCall: (...args) => activeHandler.initiateCall(...args),
      speakText: (...args) => activeHandler.speakText(...args),
      hangupCall: (...args) => activeHandler.hangupCall(...args),
      getCallStatus: (...args) => activeHandler.getCallStatus(...args),
      getActiveCalls: () => activeHandler.getActiveCalls(),
    },
  );

  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-voice-twilio',
    version: '0.1.0',
    descriptors: [
      { id: 'twilioVoiceCall', kind: 'tool', priority, payload: voiceCallTool },
      { id: 'twilioVoiceProvider', kind: 'voice-provider', priority, payload: provider },
    ],
    onActivate: async () => {
      await service.initialize();
      context.logger?.info('[TwilioVoice] Extension activated');
    },
    onDeactivate: async () => {
      await service.shutdown();
      context.logger?.info('[TwilioVoice] Extension deactivated');
    },
  };
}

// ============================================================================
// Placeholder Handler
// ============================================================================

/**
 * Creates a placeholder VoiceCallToolHandler that returns sensible errors.
 * The host application should replace this with a real handler backed by
 * a CallManager instance via `setToolHandler()`.
 */
function createPlaceholderHandler(): VoiceCallToolHandler {
  return {
    async initiateCall(_toNumber: string, _message?: string, _mode?: CallMode): Promise<CallRecord> {
      throw new Error(
        'VoiceCallToolHandler not configured. The host application must provide a handler ' +
        'backed by a CallManager instance.',
      );
    },
    speakText(_callId: string, _text: string): void {
      throw new Error('VoiceCallToolHandler not configured.');
    },
    async hangupCall(_callId: string): Promise<void> {
      throw new Error('VoiceCallToolHandler not configured.');
    },
    getCallStatus(_callId: string): CallRecord | undefined {
      return undefined;
    },
    getActiveCalls(): CallRecord[] {
      return [];
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export { TwilioVoiceService, TwilioVoiceProvider, VoiceCallTool };
export type { TwilioServiceConfig } from './TwilioVoiceService';
export type { VoiceCallToolHandler } from './tools/voiceCall';
export default createExtensionPack;
