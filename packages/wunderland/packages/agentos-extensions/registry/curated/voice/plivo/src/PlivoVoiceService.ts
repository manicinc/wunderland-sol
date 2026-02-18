/**
 * @fileoverview Wrapper around the Plivo Voice API SDK.
 *
 * Handles Plivo client lifecycle, call control operations (create, hangup,
 * speak), Plivo XML generation for notify/conversation modes, and webhook
 * signature verification.
 *
 * @module @framers/agentos-ext-voice-plivo/PlivoVoiceService
 */

import { createHmac } from 'node:crypto';
import { escapeXml } from '@framers/agentos';

// ============================================================================
// Configuration
// ============================================================================

export interface PlivoServiceConfig {
  /** Plivo Auth ID. */
  authId: string;
  /** Plivo Auth Token. */
  authToken: string;
  /** Default outbound caller ID (E.164). */
  fromNumber: string;
}

/** Default Plivo TTS voice. */
const DEFAULT_VOICE = 'Polly.Joanna';

// ============================================================================
// Service
// ============================================================================

export class PlivoVoiceService {
  private client: any = null;
  private readonly config: PlivoServiceConfig;

  constructor(config: PlivoServiceConfig) {
    this.config = config;
  }

  // ── Lifecycle ──

  /**
   * Initialize the Plivo SDK client via dynamic import.
   * Plivo's Node SDK is CommonJS; dynamic import avoids bundling issues.
   */
  async initialize(): Promise<void> {
    if (this.client) return;

    try {
      const plivoModule = await import('plivo');
      const Plivo = plivoModule.default ?? plivoModule;
      this.client = new Plivo.Client(this.config.authId, this.config.authToken);
    } catch (err) {
      throw new Error(
        `Failed to initialize Plivo client. Ensure the "plivo" package is installed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Gracefully shut down the service and release resources.
   */
  async shutdown(): Promise<void> {
    this.client = null;
  }

  /** Whether the service has been initialized. */
  get isInitialized(): boolean {
    return this.client !== null;
  }

  // ── Call Control ──

  /**
   * Create an outbound call via the Plivo Calls API.
   *
   * @param from   - E.164 caller ID.
   * @param to     - E.164 destination number.
   * @param answerUrl    - URL Plivo fetches when the call is answered.
   * @param answerMethod - HTTP method for the answer URL (GET or POST).
   * @returns The Plivo API response containing `requestUuid` (call UUID).
   */
  async createCall(
    from: string,
    to: string,
    answerUrl: string,
    answerMethod: 'GET' | 'POST' = 'POST',
  ): Promise<{ requestUuid: string; apiId: string; message: string }> {
    this.ensureInitialized();

    const response = await this.client.calls.create(from, to, answerUrl, {
      answerMethod,
    });

    return {
      requestUuid: response.requestUuid ?? response.request_uuid,
      apiId: response.apiId ?? response.api_id,
      message: response.message ?? '',
    };
  }

  /**
   * Hang up an active call by its UUID.
   *
   * @param callUuid - The Plivo call UUID to terminate.
   */
  async hangupCall(callUuid: string): Promise<void> {
    this.ensureInitialized();
    await this.client.calls.hangup(callUuid);
  }

  /**
   * Play TTS speech into an active call via the Plivo Speak API.
   *
   * @param callUuid - The Plivo call UUID.
   * @param text     - Text to speak.
   * @param voice    - Plivo voice name (default: Polly.Joanna).
   */
  async speakText(callUuid: string, text: string, voice?: string): Promise<void> {
    this.ensureInitialized();
    await this.client.calls.speak(callUuid, text, {
      voice: voice ?? DEFAULT_VOICE,
    });
  }

  // ── Plivo XML Generation ──

  /**
   * Generate Plivo XML for "notify" mode: speak a message then hang up.
   *
   * @param message - The message text to speak.
   * @param voice   - Plivo TTS voice (default: Polly.Joanna).
   * @returns Plivo XML string.
   *
   * @example
   * ```xml
   * <?xml version="1.0" encoding="UTF-8"?>
   * <Response>
   *   <Speak voice="Polly.Joanna">Hello, your appointment is confirmed.</Speak>
   *   <Hangup/>
   * </Response>
   * ```
   */
  generateNotifyXml(message: string, voice?: string): string {
    const v = voice ?? DEFAULT_VOICE;
    const escaped = escapeXml(message);
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      `  <Speak voice="${v}">${escaped}</Speak>`,
      '  <Hangup/>',
      '</Response>',
    ].join('\n');
  }

  /**
   * Generate Plivo XML for "conversation" mode: speak a greeting,
   * gather DTMF/speech input, then redirect back to the webhook URL
   * for a multi-turn loop.
   *
   * @param webhookUrl - URL to redirect to after gathering input.
   * @param greeting   - Optional greeting to speak before gathering.
   * @param voice      - Plivo TTS voice (default: Polly.Joanna).
   * @returns Plivo XML string.
   *
   * @example
   * ```xml
   * <?xml version="1.0" encoding="UTF-8"?>
   * <Response>
   *   <Speak voice="Polly.Joanna">Hello, how can I help you?</Speak>
   *   <GetInput action="https://example.com/voice/webhook/plivo"
   *             method="POST" inputType="speech" executionTimeout="30">
   *     <Speak voice="Polly.Joanna">I am listening.</Speak>
   *   </GetInput>
   *   <Redirect method="POST">https://example.com/voice/webhook/plivo</Redirect>
   * </Response>
   * ```
   */
  generateConversationXml(
    webhookUrl: string,
    greeting?: string,
    voice?: string,
  ): string {
    const v = voice ?? DEFAULT_VOICE;
    const escapedUrl = escapeXml(webhookUrl);
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
    ];

    if (greeting) {
      lines.push(`  <Speak voice="${v}">${escapeXml(greeting)}</Speak>`);
    }

    lines.push(
      `  <GetInput action="${escapedUrl}" method="POST" inputType="speech" executionTimeout="30">`,
      `    <Speak voice="${v}">I am listening.</Speak>`,
      '  </GetInput>',
      `  <Redirect method="POST">${escapedUrl}</Redirect>`,
      '</Response>',
    );

    return lines.join('\n');
  }

  // ── Webhook Verification ──

  /**
   * Verify a Plivo webhook signature (V3 — HMAC-SHA256).
   *
   * Plivo V3 signatures are computed as:
   *   HMAC-SHA256(authToken, requestUrl + nonce)
   * and sent via the `X-Plivo-Signature-V3` header.
   *
   * @param url       - The full request URL (including query string).
   * @param nonce     - The nonce from `X-Plivo-Signature-V3-Nonce` header.
   * @param signature - The signature from `X-Plivo-Signature-V3` header.
   * @param authToken - The Plivo auth token used as the HMAC key.
   * @returns Whether the signature is valid.
   */
  verifySignature(
    url: string,
    nonce: string,
    signature: string,
    authToken: string,
  ): boolean {
    const expected = createHmac('sha256', authToken)
      .update(url + nonce)
      .digest('base64');

    // Constant-time comparison
    if (expected.length !== signature.length) return false;

    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  }

  // ── Internal ──

  private ensureInitialized(): void {
    if (!this.client) {
      throw new Error(
        'PlivoVoiceService is not initialized. Call initialize() first.',
      );
    }
  }
}
