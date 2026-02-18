/**
 * @fileoverview Twilio REST API wrapper for voice call operations.
 * Handles Twilio client lifecycle, call creation, TwiML generation,
 * and webhook signature verification.
 *
 * @module @framers/agentos-ext-voice-twilio/TwilioVoiceService
 */

import { escapeXml } from '@framers/agentos';

// ============================================================================
// Types
// ============================================================================

export interface TwilioServiceConfig {
  /** Twilio Account SID. */
  accountSid: string;
  /** Twilio Auth Token (used for REST API auth and webhook signature verification). */
  authToken: string;
  /** Default E.164 "from" phone number for outbound calls. */
  fromNumber: string;
  /** Base URL for webhook callbacks. */
  webhookBaseUrl?: string;
}

/** Twilio call creation parameters. */
interface TwilioCallCreateParams {
  to: string;
  from: string;
  url?: string;
  twiml?: string;
  statusCallback?: string;
  statusCallbackEvent?: string[];
  statusCallbackMethod?: string;
}

/** Twilio call update parameters. */
interface TwilioCallUpdateParams {
  status?: string;
  twiml?: string;
  url?: string;
}

/** Shape of the Twilio call resource returned by the SDK. */
interface TwilioCallResource {
  sid: string;
  status: string;
  direction: string;
  from: string;
  to: string;
  dateCreated: Date;
}

// ============================================================================
// Service
// ============================================================================

export class TwilioVoiceService {
  private client: any = null;
  private running = false;
  private readonly config: TwilioServiceConfig;

  constructor(config: TwilioServiceConfig) {
    this.config = config;
  }

  /**
   * Initialize the Twilio client.
   * Lazily imports the twilio SDK to avoid hard failures if it's not installed.
   */
  async initialize(): Promise<void> {
    if (this.running) return;

    try {
      // Dynamic import so the module fails gracefully if twilio isn't available
      const twilio = await import('twilio');
      const TwilioClient = twilio.default || twilio;
      this.client = (TwilioClient as any)(this.config.accountSid, this.config.authToken);
    } catch (err) {
      throw new Error(
        `Failed to initialize Twilio client. Ensure the 'twilio' package is installed. ${err}`,
      );
    }

    this.running = true;
  }

  /**
   * Shutdown and release the Twilio client.
   */
  async shutdown(): Promise<void> {
    if (!this.running) return;
    this.client = null;
    this.running = false;
  }

  get isRunning(): boolean {
    return this.running;
  }

  // ── Call Operations ──

  /**
   * Create an outbound call via the Twilio REST API.
   *
   * @param to - E.164 destination number.
   * @param from - E.164 caller ID number.
   * @param url - Webhook URL Twilio will request when the call connects.
   * @param statusCallback - URL for call status change notifications.
   * @param twiml - Optional inline TwiML (used instead of `url` if provided).
   * @returns The Twilio call resource.
   */
  async createCall(
    to: string,
    from: string,
    url: string,
    statusCallback?: string,
    twiml?: string,
  ): Promise<TwilioCallResource> {
    this.ensureClient();

    const params: TwilioCallCreateParams = {
      to,
      from,
      statusCallback,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    };

    // If inline TwiML is provided, use it directly; otherwise point to the webhook URL
    if (twiml) {
      params.twiml = twiml;
    } else {
      params.url = url;
    }

    const call = await this.client.calls.create(params);
    return call as TwilioCallResource;
  }

  /**
   * Update an in-progress call (e.g., to hang up or redirect).
   *
   * @param callSid - The Twilio Call SID to update.
   * @param updates - Fields to update on the call.
   */
  async updateCall(callSid: string, updates: TwilioCallUpdateParams): Promise<void> {
    this.ensureClient();
    await this.client.calls(callSid).update(updates);
  }

  // ── TwiML Generation ──

  /**
   * Generate TwiML for "notify" mode: speak a message and hang up.
   *
   * @param message - The text to speak.
   * @param voice - Twilio TTS voice name (default: 'Polly.Joanna').
   * @returns TwiML XML string.
   */
  generateNotifyTwiml(message: string, voice: string = 'Polly.Joanna'): string {
    const escapedMessage = escapeXml(message);
    const escapedVoice = escapeXml(voice);
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      `  <Say voice="${escapedVoice}">${escapedMessage}</Say>`,
      '  <Hangup/>',
      '</Response>',
    ].join('\n');
  }

  /**
   * Generate TwiML for "conversation" mode: connect a bidirectional media stream.
   *
   * @param mediaStreamUrl - WebSocket URL for the media stream.
   * @param token - Optional auth token appended as a query param.
   * @returns TwiML XML string.
   */
  generateConversationTwiml(mediaStreamUrl: string, token?: string): string {
    const url = token
      ? `${mediaStreamUrl}${mediaStreamUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      : mediaStreamUrl;
    const escapedUrl = escapeXml(url);

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Connect>',
      `    <Stream url="${escapedUrl}">`,
      '      <Parameter name="direction" value="both"/>',
      '    </Stream>',
      '  </Connect>',
      '</Response>',
    ].join('\n');
  }

  // ── Webhook Verification ──

  /**
   * Verify a Twilio webhook signature using HMAC-SHA1.
   *
   * Twilio signs requests by concatenating the URL with sorted POST body params,
   * then computing HMAC-SHA1 with the auth token. The signature is sent in the
   * `X-Twilio-Signature` header.
   *
   * @param url - The full URL Twilio made the request to.
   * @param params - The parsed POST body parameters.
   * @param signature - The value of the X-Twilio-Signature header.
   * @param authToken - The Twilio auth token (HMAC key).
   * @returns Whether the signature is valid.
   */
  verifySignature(
    url: string,
    params: Record<string, string>,
    signature: string,
    authToken: string,
  ): boolean {
    try {
      // Use twilio's built-in validator if available
      const twilio = require('twilio');
      const validateRequest = twilio.validateRequest || twilio.default?.validateRequest;
      if (typeof validateRequest === 'function') {
        return validateRequest(authToken, signature, url, params);
      }

      // Fallback: manual HMAC-SHA1 verification
      return this.manualVerifySignature(url, params, signature, authToken);
    } catch {
      // If twilio SDK isn't loadable synchronously, fall back to manual
      return this.manualVerifySignature(url, params, signature, authToken);
    }
  }

  /**
   * Manual HMAC-SHA1 signature verification following Twilio's algorithm:
   * 1. Take the full URL
   * 2. Sort POST params by key, append key+value to URL
   * 3. HMAC-SHA1 the result with auth token
   * 4. Base64 encode and compare to X-Twilio-Signature
   */
  private manualVerifySignature(
    url: string,
    params: Record<string, string>,
    signature: string,
    authToken: string,
  ): boolean {
    const crypto = require('node:crypto');

    // Build the data string: URL + sorted params concatenated as key+value
    let data = url;
    const sortedKeys = Object.keys(params).sort();
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    const computed = crypto
      .createHmac('sha1', authToken)
      .update(data, 'utf-8')
      .digest('base64');

    // Constant-time comparison
    try {
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch {
      // Lengths differ — not equal
      return false;
    }
  }

  // ── Private ──

  private ensureClient(): void {
    if (!this.client) {
      throw new Error('TwilioVoiceService not initialized. Call initialize() first.');
    }
  }
}
