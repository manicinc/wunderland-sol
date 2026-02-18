/**
 * @fileoverview IVoiceCallProvider implementation for Telnyx Call Control v2.
 *
 * Normalizes Telnyx-specific webhook events and call control operations
 * into the AgentOS voice provider contract consumed by {@link CallManager}.
 *
 * @module @framers/agentos-ext-voice-telnyx/TelnyxVoiceProvider
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
  WebhookContext,
  WebhookParseResult,
  WebhookVerificationResult,
} from '@framers/agentos';
import { TelnyxVoiceService, type TelnyxServiceConfig } from './TelnyxVoiceService';

// ============================================================================
// Telnyx Webhook Event Types
// ============================================================================

/** Subset of Telnyx Call Control v2 webhook event types we handle. */
type TelnyxEventType =
  | 'call.initiated'
  | 'call.answered'
  | 'call.hangup'
  | 'call.machine.detection.ended'
  | 'call.speak.started'
  | 'call.speak.ended'
  | 'streaming.started'
  | 'streaming.stopped'
  | 'call.bridged'
  | 'call.recording.saved';

/** Shape of a Telnyx webhook payload (subset of fields we use). */
interface TelnyxWebhookPayload {
  data: {
    id: string;
    event_type: TelnyxEventType;
    occurred_at: string;
    payload: {
      call_control_id: string;
      call_leg_id?: string;
      call_session_id?: string;
      connection_id?: string;
      from?: string;
      to?: string;
      direction?: 'incoming' | 'outgoing';
      state?: string;
      hangup_cause?: string;
      hangup_source?: string;
      sip_hangup_cause?: string;
      client_state?: string;
      /** AMD result fields */
      result?: string;
      /** Streaming fields */
      stream_url?: string;
    };
  };
  meta?: {
    attempt?: number;
    delivered_to?: string;
  };
}

/** Telnyx hangup cause codes that map to specific terminal states. */
const HANGUP_CAUSE_MAP: Record<string, NormalizedCallEvent['kind']> = {
  'normal_clearing': 'call-completed',
  'originator_cancel': 'call-hangup-user',
  'normal': 'call-completed',
  'busy': 'call-busy',
  'no_answer': 'call-no-answer',
  'timeout': 'call-no-answer',
  'call_rejected': 'call-failed',
  'user_busy': 'call-busy',
  'unallocated_number': 'call-failed',
  'normal_temporary_failure': 'call-error',
  'recovery_on_timer_expire': 'call-no-answer',
};

// ============================================================================
// Provider Implementation
// ============================================================================

export class TelnyxVoiceProvider implements IVoiceCallProvider {
  readonly name = 'telnyx' as const;
  private readonly service: TelnyxVoiceService;
  private readonly config: TelnyxServiceConfig;

  constructor(service: TelnyxVoiceService, config: TelnyxServiceConfig) {
    this.service = service;
    this.config = config;
  }

  // ── Webhook Processing ──

  /**
   * Verify a Telnyx webhook using Ed25519 signature.
   *
   * Telnyx sends two headers for verification:
   * - `telnyx-signature-v2`: Base64-encoded Ed25519 signature
   * - `telnyx-signature-timestamp`: Unix timestamp string
   *
   * The signed content is: `${timestamp}|${rawBody}`
   */
  verifyWebhook(ctx: WebhookContext): WebhookVerificationResult {
    const publicKey = this.config.publicKey;

    // If no public key configured, skip verification (development mode)
    if (!publicKey) {
      return { valid: true };
    }

    const signature = this.getHeader(ctx.headers, 'telnyx-signature-v2');
    const timestamp = this.getHeader(ctx.headers, 'telnyx-signature-timestamp');

    if (!signature || !timestamp) {
      return {
        valid: false,
        error: 'Missing telnyx-signature-v2 or telnyx-signature-timestamp header',
      };
    }

    const body = typeof ctx.body === 'string' ? ctx.body : ctx.body.toString('utf-8');
    const isValid = this.service.verifyWebhook(body, signature, timestamp, publicKey);

    if (!isValid) {
      return { valid: false, error: 'Ed25519 signature verification failed' };
    }

    // Check timestamp freshness (reject webhooks older than 5 minutes)
    const timestampMs = parseInt(timestamp, 10) * 1000;
    const now = Date.now();
    const MAX_AGE_MS = 5 * 60 * 1000;
    if (Math.abs(now - timestampMs) > MAX_AGE_MS) {
      return { valid: false, error: 'Webhook timestamp is stale (>5 minutes)' };
    }

    return { valid: true };
  }

  /**
   * Parse a Telnyx webhook payload into normalized call events.
   *
   * Maps Telnyx Call Control v2 event types to the AgentOS
   * NormalizedCallEvent discriminated union.
   */
  parseWebhookEvent(ctx: WebhookContext): WebhookParseResult {
    const body = typeof ctx.body === 'string' ? ctx.body : ctx.body.toString('utf-8');
    let payload: TelnyxWebhookPayload;

    try {
      payload = JSON.parse(body);
    } catch {
      return { events: [], rawData: { error: 'Invalid JSON body' } };
    }

    const { data } = payload;
    if (!data || !data.event_type || !data.payload) {
      return { events: [], rawData: payload };
    }

    const baseEvent = {
      eventId: data.id,
      providerCallId: data.payload.call_control_id,
      timestamp: data.occurred_at ? new Date(data.occurred_at).getTime() : Date.now(),
    };

    const events: NormalizedCallEvent[] = [];

    switch (data.event_type) {
      case 'call.initiated':
        events.push({ ...baseEvent, kind: 'call-ringing' });
        break;

      case 'call.answered':
        events.push({ ...baseEvent, kind: 'call-answered' });
        break;

      case 'call.hangup': {
        const cause = data.payload.hangup_cause ?? 'normal_clearing';
        const source = data.payload.hangup_source;

        // Determine terminal state from hangup cause and source
        let kind: NormalizedCallEvent['kind'];

        if (source === 'caller' || source === 'callee') {
          // If the remote party (the human) hung up
          kind = source === 'callee' && data.payload.direction === 'outgoing'
            ? 'call-hangup-user'
            : HANGUP_CAUSE_MAP[cause] ?? 'call-completed';
        } else {
          kind = HANGUP_CAUSE_MAP[cause] ?? 'call-completed';
        }

        if (kind === 'call-completed') {
          events.push({ ...baseEvent, kind: 'call-completed' });
        } else if (kind === 'call-hangup-user') {
          events.push({ ...baseEvent, kind: 'call-hangup-user' });
        } else if (kind === 'call-busy') {
          events.push({ ...baseEvent, kind: 'call-busy' });
        } else if (kind === 'call-no-answer') {
          events.push({ ...baseEvent, kind: 'call-no-answer' });
        } else if (kind === 'call-failed') {
          events.push({ ...baseEvent, kind: 'call-failed', reason: cause });
        } else if (kind === 'call-error') {
          events.push({ ...baseEvent, kind: 'call-error', error: cause });
        }
        break;
      }

      case 'call.machine.detection.ended': {
        const result = data.payload.result;
        if (result === 'machine' || result === 'fax') {
          events.push({ ...baseEvent, kind: 'call-voicemail' });
        }
        // If result is 'human', no event — call proceeds normally
        break;
      }

      case 'streaming.started': {
        events.push({
          ...baseEvent,
          kind: 'media-stream-connected',
          streamSid: data.payload.stream_url ?? data.id,
        });
        break;
      }

      // call.speak.started, call.speak.ended, streaming.stopped,
      // call.bridged, call.recording.saved — no normalized event needed
      default:
        break;
    }

    return { events, rawData: payload };
  }

  // ── Call Control ──

  /**
   * Initiate an outbound call via Telnyx Call Control v2.
   *
   * For 'notify' mode, the caller answers and the speak command is issued
   * via a subsequent webhook handler. For 'conversation' mode, a
   * bidirectional media stream is established.
   */
  async initiateCall(input: InitiateCallInput): Promise<InitiateCallResult> {
    try {
      const connectionId = this.config.connectionId;

      const result = await this.service.createCall(
        connectionId,
        input.fromNumber,
        input.toNumber,
        input.webhookUrl,
        {
          answeringMachineDetection: input.mode === 'notify',
          streamUrl: input.mode === 'conversation' ? input.mediaStreamUrl : undefined,
          streamTrack: 'inbound_track',
          clientState: JSON.stringify({
            callId: input.callId,
            mode: input.mode,
            message: input.message,
            notifyVoice: input.notifyVoice,
          }),
        },
      );

      return {
        providerCallId: result.callControlId,
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
   * Hang up an active call via Telnyx Call Control v2.
   */
  async hangupCall(input: HangupCallInput): Promise<void> {
    await this.service.hangupCall(input.providerCallId);
  }

  /**
   * Play TTS audio into an active call via the Telnyx speak command.
   */
  async playTts(input: PlayTtsInput): Promise<void> {
    await this.service.speakText(
      input.providerCallId,
      input.text,
      input.voice,
    );
  }

  // ── Private Helpers ──

  /**
   * Extract a single header value from the headers record.
   * Handles both string and string[] header values.
   */
  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
