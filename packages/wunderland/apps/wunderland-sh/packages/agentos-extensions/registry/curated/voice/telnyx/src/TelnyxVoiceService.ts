/**
 * @fileoverview Telnyx Call Control v2 SDK wrapper.
 *
 * Handles Telnyx client lifecycle, outbound call creation, hangup,
 * in-call TTS via the speak command, and Ed25519 webhook verification.
 *
 * @module @framers/agentos-ext-voice-telnyx/TelnyxVoiceService
 */

import { createVerify } from 'node:crypto';

// ============================================================================
// Configuration
// ============================================================================

export interface TelnyxServiceConfig {
  /** Telnyx API v2 key. */
  apiKey: string;
  /** Telnyx Call Control Application connection ID. */
  connectionId: string;
  /** Ed25519 public key for webhook signature verification (base64-encoded). */
  publicKey?: string;
  /** Default E.164 "from" number for outbound calls. */
  fromNumber?: string;
}

// ============================================================================
// Telnyx SDK Typings (minimal subset to avoid full SDK type dependency)
// ============================================================================

interface TelnyxCallCreateParams {
  connection_id: string;
  to: string;
  from: string;
  webhook_url?: string;
  webhook_url_method?: string;
  answering_machine_detection?: string;
  stream_url?: string;
  stream_track?: string;
  client_state?: string;
}

interface TelnyxCallCreateResult {
  data: {
    call_control_id: string;
    call_leg_id: string;
    call_session_id: string;
    is_alive: boolean;
    record_type: string;
  };
}

interface TelnyxCallSpeakParams {
  payload: string;
  voice?: string;
  language?: string;
  payload_type?: 'text' | 'ssml';
  client_state?: string;
}

interface TelnyxClient {
  calls: {
    create(params: TelnyxCallCreateParams): Promise<TelnyxCallCreateResult>;
    hangup(callControlId: string): Promise<unknown>;
    speak(callControlId: string, params: TelnyxCallSpeakParams): Promise<unknown>;
  };
}

// ============================================================================
// Service
// ============================================================================

export class TelnyxVoiceService {
  private client: TelnyxClient | null = null;
  private running = false;
  private readonly config: TelnyxServiceConfig;

  constructor(config: TelnyxServiceConfig) {
    this.config = config;
  }

  // ── Lifecycle ──

  /**
   * Initialize the Telnyx SDK client via dynamic import.
   * Uses dynamic import to avoid bundling issues with the telnyx package
   * and to allow lazy-loading.
   */
  async initialize(): Promise<void> {
    if (this.running) return;

    try {
      // Dynamic import — the telnyx package exports a factory function
      const telnyxModule = await import('telnyx');
      const TelnyxFactory = telnyxModule.default ?? telnyxModule;
      this.client = TelnyxFactory(this.config.apiKey) as unknown as TelnyxClient;
      this.running = true;
    } catch (err) {
      throw new Error(
        `[TelnyxVoiceService] Failed to initialize Telnyx client: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Shut down the service and release the client reference.
   */
  async shutdown(): Promise<void> {
    this.client = null;
    this.running = false;
  }

  get isRunning(): boolean {
    return this.running;
  }

  // ── Call Control ──

  /**
   * Create an outbound call via Telnyx Call Control v2.
   *
   * @param connectionId - Telnyx connection ID (overrides config default).
   * @param from - E.164 "from" number.
   * @param to - E.164 "to" number.
   * @param webhookUrl - URL for Telnyx to send call events to.
   * @param options - Additional options for call creation.
   * @returns The call_control_id assigned by Telnyx.
   */
  async createCall(
    connectionId: string,
    from: string,
    to: string,
    webhookUrl: string,
    options?: {
      answeringMachineDetection?: boolean;
      streamUrl?: string;
      streamTrack?: 'inbound_track' | 'outbound_track' | 'both_tracks';
      clientState?: string;
    },
  ): Promise<{ callControlId: string; callSessionId: string }> {
    this.ensureInitialized();

    const params: TelnyxCallCreateParams = {
      connection_id: connectionId,
      to,
      from,
      webhook_url: webhookUrl,
      webhook_url_method: 'POST',
    };

    if (options?.answeringMachineDetection) {
      params.answering_machine_detection = 'detect';
    }

    if (options?.streamUrl) {
      params.stream_url = options.streamUrl;
      params.stream_track = options.streamTrack ?? 'inbound_track';
    }

    if (options?.clientState) {
      params.client_state = Buffer.from(options.clientState).toString('base64');
    }

    const result = await this.client!.calls.create(params);
    return {
      callControlId: result.data.call_control_id,
      callSessionId: result.data.call_session_id,
    };
  }

  /**
   * Hang up a call by its call_control_id.
   */
  async hangupCall(callControlId: string): Promise<void> {
    this.ensureInitialized();
    await this.client!.calls.hangup(callControlId);
  }

  /**
   * Speak text into an active call via the Telnyx speak command.
   *
   * @param callControlId - The call_control_id.
   * @param text - Text to speak (plain text or SSML).
   * @param voice - Telnyx voice name (default: 'female' / 'en-US').
   * @param payloadType - 'text' or 'ssml' (default: 'text').
   */
  async speakText(
    callControlId: string,
    text: string,
    voice?: string,
    payloadType?: 'text' | 'ssml',
  ): Promise<void> {
    this.ensureInitialized();

    await this.client!.calls.speak(callControlId, {
      payload: text,
      voice: voice ?? 'female',
      language: 'en-US',
      payload_type: payloadType ?? 'text',
    });
  }

  // ── Webhook Verification ──

  /**
   * Verify a Telnyx webhook using Ed25519 signature verification.
   *
   * Telnyx signs webhooks with Ed25519. The signature is in the
   * `telnyx-signature-v2` header and the timestamp in
   * `telnyx-signature-timestamp`. The signed content is:
   * `${timestamp}|${body}`
   *
   * @param body - Raw request body as string.
   * @param signature - Base64-encoded Ed25519 signature from header.
   * @param timestamp - Timestamp string from header.
   * @param publicKey - Base64-encoded Ed25519 public key.
   * @returns Whether the signature is valid.
   */
  verifyWebhook(
    body: string,
    signature: string,
    timestamp: string,
    publicKey: string,
  ): boolean {
    try {
      const signedPayload = `${timestamp}|${body}`;

      // Construct the DER-encoded Ed25519 public key
      // Ed25519 public keys are 32 bytes; DER prefix for Ed25519 is fixed
      const ED25519_DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
      const rawKey = Buffer.from(publicKey, 'base64');
      const derKey = Buffer.concat([ED25519_DER_PREFIX, rawKey]);

      const verifier = createVerify('Ed25519');
      // Node.js createVerify with Ed25519 doesn't use a separate digest
      // but we need to use the verify API with the key object
      verifier.update(signedPayload);
      verifier.end();

      const keyObject = require('node:crypto').createPublicKey({
        key: derKey,
        format: 'der',
        type: 'spki',
      });

      return verifier.verify(keyObject, Buffer.from(signature, 'base64'));
    } catch {
      return false;
    }
  }

  // ── Private ──

  private ensureInitialized(): void {
    if (!this.client) {
      throw new Error('[TelnyxVoiceService] Not initialized — call initialize() first');
    }
  }
}
