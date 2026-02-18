/**
 * @fileoverview IVoiceCallProvider implementation for Twilio.
 *
 * Normalizes Twilio's REST API, TwiML, and webhook system into the
 * common voice provider contract consumed by the {@link CallManager}.
 *
 * @module @framers/agentos-ext-voice-twilio/TwilioVoiceProvider
 */

import type {
  IVoiceCallProvider,
  InitiateCallInput,
  InitiateCallResult,
  HangupCallInput,
  PlayTtsInput,
} from '@framers/agentos';
import type {
  NormalizedCallEvent,
  VoiceProviderName,
  WebhookContext,
  WebhookParseResult,
  WebhookVerificationResult,
} from '@framers/agentos';

import { TwilioVoiceService } from './TwilioVoiceService';

// ============================================================================
// Twilio CallStatus → NormalizedCallEvent kind mapping
// ============================================================================

/**
 * Map from Twilio's `CallStatus` values to our normalized event kinds.
 * @see https://www.twilio.com/docs/voice/api/call-resource#call-status-values
 */
const TWILIO_STATUS_MAP: Record<string, NormalizedCallEvent['kind']> = {
  'initiated':   'call-ringing',
  'ringing':     'call-ringing',
  'in-progress': 'call-answered',
  'answered':    'call-answered',
  'completed':   'call-completed',
  'failed':      'call-failed',
  'busy':        'call-busy',
  'no-answer':   'call-no-answer',
  'canceled':    'call-hangup-user',
};

// ============================================================================
// Provider
// ============================================================================

export class TwilioVoiceProvider implements IVoiceCallProvider {
  readonly name: VoiceProviderName = 'twilio';

  constructor(private readonly service: TwilioVoiceService) {}

  // ── Webhook Processing ──

  /**
   * Verify the authenticity of an incoming Twilio webhook.
   *
   * Twilio signs each request with an HMAC-SHA1 signature sent in the
   * `X-Twilio-Signature` header. We reconstruct the expected signature
   * using the full request URL, sorted POST body parameters, and the
   * account auth token.
   */
  verifyWebhook(ctx: WebhookContext): WebhookVerificationResult {
    const signature = this.getHeader(ctx.headers, 'x-twilio-signature');
    if (!signature) {
      return { valid: false, error: 'Missing X-Twilio-Signature header' };
    }

    const params = ctx.parsedBody ?? this.parseFormBody(ctx.body);
    const authToken = (this.service as any).config?.authToken;

    if (!authToken) {
      return { valid: false, error: 'Auth token not available for verification' };
    }

    const isValid = this.service.verifySignature(ctx.url, params, signature, authToken);
    return isValid
      ? { valid: true }
      : { valid: false, error: 'Invalid Twilio webhook signature' };
  }

  /**
   * Parse a Twilio webhook payload into normalized call events.
   *
   * Twilio sends call status updates as form-encoded POST bodies with
   * fields like `CallSid`, `CallStatus`, `From`, `To`, `Duration`, etc.
   */
  parseWebhookEvent(ctx: WebhookContext): WebhookParseResult {
    const params = ctx.parsedBody ?? this.parseFormBody(ctx.body);

    const callSid = params['CallSid'] || params['callSid'] || '';
    const callStatus = (params['CallStatus'] || params['callStatus'] || '').toLowerCase();
    const timestamp = Date.now();

    // Generate a deterministic event ID for idempotency
    const eventId = `twilio-${callSid}-${callStatus}-${params['Timestamp'] || timestamp}`;

    const kind = TWILIO_STATUS_MAP[callStatus];
    if (!kind) {
      // Unknown status — return empty events; caller can inspect rawData
      return { events: [], rawData: params };
    }

    const baseEvent = {
      eventId,
      providerCallId: callSid,
      timestamp,
    };

    const event = this.buildNormalizedEvent(kind, baseEvent, params);

    return {
      events: event ? [event] : [],
      rawData: params,
    };
  }

  // ── Call Control ──

  /**
   * Initiate an outbound call via Twilio.
   *
   * For **notify** mode, we generate inline TwiML with `<Say>` + `<Hangup/>`
   * so the message is spoken immediately and the call ends.
   *
   * For **conversation** mode, we generate TwiML with `<Connect><Stream>`
   * to establish a bidirectional media stream for real-time audio processing.
   */
  async initiateCall(input: InitiateCallInput): Promise<InitiateCallResult> {
    try {
      let twiml: string | undefined;

      if (input.mode === 'notify' && input.message) {
        twiml = this.service.generateNotifyTwiml(
          input.message,
          input.notifyVoice || 'Polly.Joanna',
        );
      } else if (input.mode === 'conversation' && input.mediaStreamUrl) {
        twiml = this.service.generateConversationTwiml(
          input.mediaStreamUrl,
          input.mediaStreamToken,
        );
      }

      const call = await this.service.createCall(
        input.toNumber,
        input.fromNumber,
        input.webhookUrl,
        input.statusCallbackUrl,
        twiml,
      );

      return {
        providerCallId: call.sid,
        success: true,
      };
    } catch (error: any) {
      return {
        providerCallId: '',
        success: false,
        error: error.message || String(error),
      };
    }
  }

  /**
   * Hang up an active call by updating its status to 'completed'.
   */
  async hangupCall(input: HangupCallInput): Promise<void> {
    await this.service.updateCall(input.providerCallId, { status: 'completed' });
  }

  /**
   * Play TTS audio into an active call by updating it with inline TwiML.
   * This redirects the call to new TwiML instructions containing a `<Say>` verb.
   */
  async playTts(input: PlayTtsInput): Promise<void> {
    const twiml = this.service.generateNotifyTwiml(
      input.text,
      input.voice || 'Polly.Joanna',
    );
    await this.service.updateCall(input.providerCallId, { twiml });
  }

  // ── Private Helpers ──

  /**
   * Build a fully typed NormalizedCallEvent from a kind and base fields.
   */
  private buildNormalizedEvent(
    kind: NormalizedCallEvent['kind'],
    base: { eventId: string; providerCallId: string; timestamp: number },
    params: Record<string, string>,
  ): NormalizedCallEvent | null {
    switch (kind) {
      case 'call-ringing':
        return { ...base, kind: 'call-ringing' };

      case 'call-answered':
        return { ...base, kind: 'call-answered' };

      case 'call-completed': {
        const duration = params['CallDuration'] || params['Duration'];
        return {
          ...base,
          kind: 'call-completed',
          duration: duration ? parseInt(duration, 10) : undefined,
        };
      }

      case 'call-failed':
        return {
          ...base,
          kind: 'call-failed',
          reason: params['SipResponseCode']
            ? `SIP ${params['SipResponseCode']}: ${params['ErrorMessage'] || 'Call failed'}`
            : params['ErrorMessage'] || 'Call failed',
        };

      case 'call-busy':
        return { ...base, kind: 'call-busy' };

      case 'call-no-answer':
        return { ...base, kind: 'call-no-answer' };

      case 'call-hangup-user':
        return { ...base, kind: 'call-hangup-user' };

      default:
        return null;
    }
  }

  /**
   * Parse a form-encoded body string into a key-value record.
   */
  private parseFormBody(body: string | Buffer): Record<string, string> {
    const str = typeof body === 'string' ? body : body.toString('utf-8');
    const params: Record<string, string> = {};

    if (!str) return params;

    for (const pair of str.split('&')) {
      const [key, ...rest] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(rest.join('=') || '');
      }
    }

    return params;
  }

  /**
   * Get a header value case-insensitively.
   */
  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    // Try exact match first
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (value) return Array.isArray(value) ? value[0] : value;

    // Case-insensitive scan
    const lowerName = name.toLowerCase();
    for (const [key, val] of Object.entries(headers)) {
      if (key.toLowerCase() === lowerName) {
        return Array.isArray(val) ? val[0] : val;
      }
    }

    return undefined;
  }
}
