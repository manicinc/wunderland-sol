/**
 * @fileoverview ITool implementation for making and managing phone calls via Twilio.
 *
 * Provides agents with the ability to initiate calls, speak text, end calls,
 * and query call status through a unified tool interface.
 *
 * @module @framers/agentos-ext-voice-twilio/tools/voiceCall
 */

import type {
  ITool,
  ToolExecutionContext,
  ToolExecutionResult,
  CallMode,
  CallRecord,
} from '@framers/agentos';

// ============================================================================
// Handler Interface
// ============================================================================

/**
 * Abstraction over call management that the tool delegates to.
 * Typically backed by a {@link CallManager} instance, but can be mocked for testing.
 */
export interface VoiceCallToolHandler {
  /** Initiate an outbound call. */
  initiateCall(toNumber: string, message?: string, mode?: CallMode): Promise<CallRecord>;
  /** Speak text into an active call. */
  speakText(callId: string, text: string): void;
  /** Hang up an active call. */
  hangupCall(callId: string): Promise<void>;
  /** Get the current status of a call. */
  getCallStatus(callId: string): CallRecord | undefined;
  /** Get all active (non-terminal) calls. */
  getActiveCalls(): CallRecord[];
}

// ============================================================================
// Tool Input Types
// ============================================================================

interface VoiceCallToolInput {
  /** The action to perform. */
  action: 'initiate_call' | 'speak' | 'end_call' | 'get_status';
  /** E.164 phone number to call (required for initiate_call). */
  toNumber?: string;
  /** Message text to speak (used for initiate_call in notify mode and speak action). */
  message?: string;
  /** Call ID (required for speak, end_call, get_status). */
  callId?: string;
  /** Call mode: 'notify' for one-way TTS, 'conversation' for bidirectional. */
  mode?: CallMode;
}

// ============================================================================
// Tool
// ============================================================================

export class VoiceCallTool implements ITool<VoiceCallToolInput> {
  public readonly id = 'twilioVoiceCall';
  public readonly name = 'twilioVoiceCall';
  public readonly displayName = 'Twilio Voice Call';
  public readonly description =
    'Make or manage phone calls via Twilio. Supports initiating outbound calls ' +
    '(notify mode for one-way messages, conversation mode for bidirectional audio), ' +
    'speaking text into active calls, ending calls, and querying call status.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['action'] as const,
    properties: {
      action: {
        type: 'string',
        enum: ['initiate_call', 'speak', 'end_call', 'get_status'],
        description: 'The action to perform',
      },
      toNumber: {
        type: 'string',
        description: 'E.164 phone number to call (e.g., +15551234567). Required for initiate_call.',
      },
      message: {
        type: 'string',
        description: 'Text to speak. Used for initiate_call (notify mode) and speak action.',
      },
      callId: {
        type: 'string',
        description: 'Call ID. Required for speak, end_call, and get_status actions.',
      },
      mode: {
        type: 'string',
        enum: ['notify', 'conversation'],
        description: 'Call mode. "notify" speaks a message and hangs up; "conversation" enables bidirectional audio. Defaults to "conversation".',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      callId: { type: 'string', description: 'Internal call ID' },
      state: { type: 'string', description: 'Current call state' },
      provider: { type: 'string', description: 'Telephony provider name' },
      providerCallId: { type: 'string', description: 'Provider-assigned call ID (Twilio CallSid)' },
      direction: { type: 'string', description: 'Call direction (outbound/inbound)' },
      mode: { type: 'string', description: 'Call mode (notify/conversation)' },
      fromNumber: { type: 'string', description: 'Caller phone number' },
      toNumber: { type: 'string', description: 'Callee phone number' },
      activeCalls: {
        type: 'array',
        items: { type: 'object' },
        description: 'List of active calls (for get_status without callId)',
      },
    },
  };

  constructor(private readonly handler: VoiceCallToolHandler) {}

  async execute(
    args: VoiceCallToolInput,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      switch (args.action) {
        case 'initiate_call':
          return await this.handleInitiateCall(args);

        case 'speak':
          return this.handleSpeak(args);

        case 'end_call':
          return await this.handleEndCall(args);

        case 'get_status':
          return this.handleGetStatus(args);

        default:
          return {
            success: false,
            error: `Unknown action: ${(args as any).action}. Supported actions: initiate_call, speak, end_call, get_status`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || String(error),
      };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!args.action) {
      errors.push('action is required');
    } else if (!['initiate_call', 'speak', 'end_call', 'get_status'].includes(args.action)) {
      errors.push('action must be one of: initiate_call, speak, end_call, get_status');
    }

    if (args.action === 'initiate_call') {
      if (!args.toNumber) {
        errors.push('toNumber is required for initiate_call');
      } else if (typeof args.toNumber !== 'string' || !args.toNumber.startsWith('+')) {
        errors.push('toNumber must be an E.164 formatted phone number (e.g., +15551234567)');
      }
    }

    if (args.action === 'speak') {
      if (!args.callId) errors.push('callId is required for speak');
      if (!args.message) errors.push('message is required for speak');
    }

    if (args.action === 'end_call' && !args.callId) {
      errors.push('callId is required for end_call');
    }

    if (args.mode && !['notify', 'conversation'].includes(args.mode)) {
      errors.push('mode must be "notify" or "conversation"');
    }

    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  // ── Action Handlers ──

  private async handleInitiateCall(args: VoiceCallToolInput): Promise<ToolExecutionResult> {
    if (!args.toNumber) {
      return { success: false, error: 'toNumber is required for initiate_call' };
    }

    const call = await this.handler.initiateCall(
      args.toNumber,
      args.message,
      args.mode,
    );

    return {
      success: true,
      output: {
        callId: call.callId,
        state: call.state,
        provider: call.provider,
        providerCallId: call.providerCallId,
        direction: call.direction,
        mode: call.mode,
        fromNumber: call.fromNumber,
        toNumber: call.toNumber,
      },
    };
  }

  private handleSpeak(args: VoiceCallToolInput): ToolExecutionResult {
    if (!args.callId) {
      return { success: false, error: 'callId is required for speak' };
    }
    if (!args.message) {
      return { success: false, error: 'message is required for speak' };
    }

    this.handler.speakText(args.callId, args.message);

    const call = this.handler.getCallStatus(args.callId);
    return {
      success: true,
      output: {
        callId: args.callId,
        state: call?.state ?? 'unknown',
        message: 'Text queued for speech',
      },
    };
  }

  private async handleEndCall(args: VoiceCallToolInput): Promise<ToolExecutionResult> {
    if (!args.callId) {
      return { success: false, error: 'callId is required for end_call' };
    }

    await this.handler.hangupCall(args.callId);

    const call = this.handler.getCallStatus(args.callId);
    return {
      success: true,
      output: {
        callId: args.callId,
        state: call?.state ?? 'hangup-bot',
        message: 'Call ended',
      },
    };
  }

  private handleGetStatus(args: VoiceCallToolInput): ToolExecutionResult {
    if (args.callId) {
      const call = this.handler.getCallStatus(args.callId);
      if (!call) {
        return { success: false, error: `No call found with ID: ${args.callId}` };
      }

      return {
        success: true,
        output: {
          callId: call.callId,
          state: call.state,
          provider: call.provider,
          providerCallId: call.providerCallId,
          direction: call.direction,
          mode: call.mode,
          fromNumber: call.fromNumber,
          toNumber: call.toNumber,
          transcriptLength: call.transcript.length,
          createdAt: call.createdAt,
          endedAt: call.endedAt,
        },
      };
    }

    // No callId — return all active calls
    const activeCalls = this.handler.getActiveCalls().map((c) => ({
      callId: c.callId,
      state: c.state,
      direction: c.direction,
      mode: c.mode,
      fromNumber: c.fromNumber,
      toNumber: c.toNumber,
    }));

    return {
      success: true,
      output: { activeCalls, count: activeCalls.length },
    };
  }
}
