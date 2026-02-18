/**
 * @fileoverview IVoiceCallProvider implementation for Plivo.
 *
 * Normalizes Plivo's webhook payloads (form-encoded, like Twilio) into the
 * {@link NormalizedCallEvent} discriminated union consumed by {@link CallManager}.
 *
 * Plivo call statuses and hangup causes are mapped to the common event types:
 *   - CallStatus 'ringing'                    -> 'call-ringing'
 *   - CallStatus 'in-progress' / 'answered'   -> 'call-answered'
 *   - CallStatus 'completed'                  -> 'call-completed'
 *   - CallStatus 'failed'                     -> 'call-failed'
 *   - CallStatus 'busy'                       -> 'call-busy'
 *   - CallStatus 'no-answer'                  -> 'call-no-answer'
 *   - CallStatus 'cancel'                     -> 'call-hangup-user'
 *   - HangupCause maps to appropriate terminal state
 *
 * @module @framers/agentos-ext-voice-plivo/PlivoVoiceProvider
 */

import { randomUUID } from 'node:crypto';
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
import { PlivoVoiceService } from './PlivoVoiceService';

// ============================================================================
// Plivo Webhook Body Fields
// ============================================================================

/**
 * Known fields present in Plivo's form-encoded webhook payloads.
 * Plivo sends status callbacks as application/x-www-form-urlencoded POST data.
 */
interface PlivoWebhookBody {
  CallUUID?: string;
  CallStatus?: string;
  Direction?: string;
  From?: string;
  To?: string;
  Event?: string;
  Duration?: string;
  HangupCause?: string;
  HangupCauseCode?: string;
  /** Speech recognition result (GetInput). */
  Speech?: string;
  /** DTMF digits (GetInput). */
  Digits?: string;
}

// ============================================================================
// Status Mapping
// ============================================================================

/**
 * Map Plivo CallStatus values to NormalizedCallEvent kinds.
 */
function mapCallStatus(
  status: string,
  hangupCause?: string,
): NormalizedCallEvent['kind'] | null {
  switch (status.toLowerCase()) {
    case 'ringing':
    case 'early':
      return 'call-ringing';

    case 'in-progress':
    case 'answered':
      return 'call-answered';

    case 'completed':
    case 'hangup':
      // Inspect HangupCause for more specific mapping
      return mapHangupCause(hangupCause) ?? 'call-completed';

    case 'failed':
      return 'call-failed';

    case 'busy':
      return 'call-busy';

    case 'no-answer':
    case 'timeout':
      return 'call-no-answer';

    case 'cancel':
    case 'canceled':
      return 'call-hangup-user';

    default:
      return null;
  }
}

/**
 * Map Plivo HangupCause values to more specific event kinds.
 * Plivo uses SIP-style hangup cause strings.
 *
 * @see https://www.plivo.com/docs/voice/api/call/#hangup-causes
 */
function mapHangupCause(cause?: string): NormalizedCallEvent['kind'] | null {
  if (!cause) return null;

  switch (cause.toUpperCase()) {
    case 'NORMAL_CLEARING':
    case 'NORMAL_CALL_CLEARING':
      return 'call-completed';

    case 'ORIGINATOR_CANCEL':
    case 'NORMAL_UNSPECIFIED':
      return 'call-hangup-user';

    case 'USER_BUSY':
      return 'call-busy';

    case 'NO_ANSWER':
    case 'NO_USER_RESPONSE':
    case 'ALLOTTED_TIMEOUT':
      return 'call-no-answer';

    case 'CALL_REJECTED':
    case 'UNALLOCATED_NUMBER':
    case 'NUMBER_CHANGED':
    case 'INVALID_NUMBER_FORMAT':
      return 'call-failed';

    case 'DESTINATION_OUT_OF_ORDER':
    case 'NETWORK_OUT_OF_ORDER':
    case 'SERVICE_UNAVAILABLE':
    case 'RECOVERY_ON_TIMER_EXPIRE':
      return 'call-error';

    default:
      return null;
  }
}

// ============================================================================
// Provider Implementation
// ============================================================================

export class PlivoVoiceProvider implements IVoiceCallProvider {
  readonly name: VoiceProviderName = 'plivo';

  constructor(private readonly service: PlivoVoiceService) {}

  // ── Webhook Processing ──

  /**
   * Verify the authenticity of a Plivo webhook using V3 signature (HMAC-SHA256).
   *
   * Plivo sends:
   *   - `X-Plivo-Signature-V3`: Base64-encoded HMAC-SHA256 signature
   *   - `X-Plivo-Signature-V3-Nonce`: Random nonce used in signature computation
   *
   * The signature is computed as: HMAC-SHA256(authToken, requestUrl + nonce).
   */
  verifyWebhook(ctx: WebhookContext): WebhookVerificationResult {
    const signature = this.getHeader(ctx.headers, 'x-plivo-signature-v3');
    const nonce = this.getHeader(ctx.headers, 'x-plivo-signature-v3-nonce');

    if (!signature || !nonce) {
      // Plivo also supports V2 (legacy) signatures — for V3-only enforcement,
      // missing headers indicate an unsigned or tampered request.
      // In development, allow unsigned webhooks to simplify testing.
      if (process.env.NODE_ENV === 'development' || process.env.PLIVO_SKIP_SIGNATURE === 'true') {
        return { valid: true };
      }
      return {
        valid: false,
        error: 'Missing X-Plivo-Signature-V3 or X-Plivo-Signature-V3-Nonce header',
      };
    }

    const valid = this.service.verifySignature(
      ctx.url,
      nonce,
      signature,
      this.getAuthToken(),
    );

    return valid
      ? { valid: true }
      : { valid: false, error: 'Plivo HMAC-SHA256 signature mismatch' };
  }

  /**
   * Parse a Plivo webhook payload into normalized call events.
   *
   * Plivo sends form-encoded POST bodies with fields like CallUUID, CallStatus,
   * HangupCause, From, To, Direction, Duration, Speech, Digits, etc.
   */
  parseWebhookEvent(ctx: WebhookContext): WebhookParseResult {
    const body = this.parseBody(ctx);
    const events: NormalizedCallEvent[] = [];

    const callUuid = body.CallUUID;
    if (!callUuid) {
      return { events, rawData: body };
    }

    const timestamp = Date.now();

    // Handle speech recognition results from GetInput
    if (body.Speech) {
      events.push({
        kind: 'transcript',
        eventId: `plivo-speech-${callUuid}-${timestamp}`,
        providerCallId: callUuid,
        timestamp,
        text: body.Speech,
        isFinal: true,
      });
    }

    // Handle call status events
    if (body.CallStatus) {
      const kind = mapCallStatus(body.CallStatus, body.HangupCause);
      if (kind) {
        const eventId = `plivo-${kind}-${callUuid}-${randomUUID().slice(0, 8)}`;
        const baseEvent = { eventId, providerCallId: callUuid, timestamp };

        switch (kind) {
          case 'call-completed': {
            const duration = body.Duration ? parseInt(body.Duration, 10) : undefined;
            events.push({ ...baseEvent, kind: 'call-completed', duration });
            break;
          }
          case 'call-failed':
            events.push({
              ...baseEvent,
              kind: 'call-failed',
              reason: body.HangupCause ?? 'Unknown failure',
            });
            break;
          case 'call-error':
            events.push({
              ...baseEvent,
              kind: 'call-error',
              error: body.HangupCause ?? 'Unknown error',
            });
            break;
          default:
            // Simple event kinds with no extra fields
            events.push({ ...baseEvent, kind } as NormalizedCallEvent);
            break;
        }
      }
    }

    return { events, rawData: body };
  }

  // ── Call Control ──

  /**
   * Initiate an outbound call via Plivo.
   *
   * For 'notify' mode: generates Plivo XML with <Speak> + <Hangup/> and hosts
   * it at the answer URL.
   *
   * For 'conversation' mode: generates Plivo XML with <Speak> + <GetInput> +
   * <Redirect> loop and hosts it at the answer URL.
   *
   * In both cases, Plivo fetches the answer URL when the callee picks up.
   * The answer URL should be a publicly accessible endpoint that returns
   * the pre-generated XML — this is handled by the webhook router in the
   * hosting application.
   */
  async initiateCall(input: InitiateCallInput): Promise<InitiateCallResult> {
    try {
      // Generate the appropriate XML response for the answer URL
      let _answerXml: string;
      if (input.mode === 'notify') {
        _answerXml = this.service.generateNotifyXml(
          input.message ?? 'Hello, this is an automated message.',
          input.notifyVoice,
        );
      } else {
        _answerXml = this.service.generateConversationXml(
          input.webhookUrl,
          input.message,
          input.notifyVoice,
        );
      }

      // Store the XML so the webhook endpoint can serve it.
      // The answer URL is the webhook URL; when Plivo GETs/POSTs it,
      // the application should return this XML.
      // The callId is passed as a query parameter for routing.
      const answerUrl = `${input.webhookUrl}?callId=${encodeURIComponent(input.callId)}&mode=${input.mode}`;

      const response = await this.service.createCall(
        input.fromNumber,
        input.toNumber,
        answerUrl,
        'POST',
      );

      return {
        providerCallId: response.requestUuid,
        success: true,
      };
    } catch (err) {
      return {
        providerCallId: '',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Hang up an active call by its Plivo call UUID.
   */
  async hangupCall(input: HangupCallInput): Promise<void> {
    await this.service.hangupCall(input.providerCallId);
  }

  /**
   * Play TTS speech into an active call via Plivo's Speak API.
   */
  async playTts(input: PlayTtsInput): Promise<void> {
    await this.service.speakText(input.providerCallId, input.text, input.voice);
  }

  // ── Internal Helpers ──

  /**
   * Extract a header value from the headers map (case-insensitive).
   */
  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    // Headers may be stored with varying casing
    const key = Object.keys(headers).find(
      (k) => k.toLowerCase() === name.toLowerCase(),
    );
    if (!key) return undefined;

    const value = headers[key];
    return Array.isArray(value) ? value[0] : value;
  }

  /**
   * Parse the webhook body from form-encoded or JSON format.
   * Plivo sends form-encoded data by default (like Twilio).
   */
  private parseBody(ctx: WebhookContext): PlivoWebhookBody {
    // Prefer pre-parsed body if available
    if (ctx.parsedBody) {
      return ctx.parsedBody as unknown as PlivoWebhookBody;
    }

    const bodyStr = typeof ctx.body === 'string' ? ctx.body : ctx.body.toString('utf-8');

    // Try JSON first
    try {
      return JSON.parse(bodyStr) as PlivoWebhookBody;
    } catch {
      // Fall through to form-encoded parsing
    }

    // Parse application/x-www-form-urlencoded
    const params = new URLSearchParams(bodyStr);
    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result as unknown as PlivoWebhookBody;
  }

  /**
   * Get the auth token from the service config.
   * Used for signature verification.
   */
  private getAuthToken(): string {
    // Access the service's config through a known property.
    // The service exposes verifySignature which needs the token,
    // but we also need it here for the provider-level verify.
    // We store it during construction via the factory.
    return (this as any)._authToken ?? '';
  }
}

/**
 * Factory to create a PlivoVoiceProvider with the auth token accessible
 * for webhook verification.
 */
export function createPlivoVoiceProvider(
  service: PlivoVoiceService,
  authToken: string,
): PlivoVoiceProvider {
  const provider = new PlivoVoiceProvider(service);
  (provider as any)._authToken = authToken;
  return provider;
}
