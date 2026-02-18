/**
 * @fileoverview ITool implementation for Plivo voice calls.
 *
 * Provides the `plivoVoiceCall` tool that agents can invoke to make
 * outbound phone calls, speak text into active calls, hang up calls,
 * and query call status.
 *
 * Follows the same VoiceCallTool pattern used by Twilio/Telnyx extensions.
 *
 * @module @framers/agentos-ext-voice-plivo/tools/voiceCall
 */

import type {
  ITool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '@framers/agentos';
import type {
  CallMode,
  CallRecord,
} from '@framers/agentos';

// ============================================================================
// Handler Interface
// ============================================================================

/**
 * Abstraction over the CallManager's operations so the tool
 * does not depend directly on CallManager internals.
 */
export interface VoiceCallToolHandler {
  /** Initiate an outbound call. */
  initiateCall(
    toNumber: string,
    message?: string,
    mode?: CallMode,
  ): Promise<CallRecord>;
  /** Speak text into an active call. */
  speakText(callId: string, text: string): void;
  /** Hang up an active call. */
  hangupCall(callId: string): Promise<void>;
  /** Get the status of a call by ID. */
  getCallStatus(callId: string): CallRecord | undefined;
  /** Get all active (non-terminal) calls. */
  getActiveCalls(): CallRecord[];
}

// ============================================================================
// Tool Actions
// ============================================================================

type VoiceCallAction = 'call' | 'speak' | 'hangup' | 'status' | 'list';

interface VoiceCallArgs {
  /** Action to perform. */
  action: VoiceCallAction;
  /** E.164 phone number to call (for 'call' action). */
  toNumber?: string;
  /** Call ID (for 'speak', 'hangup', 'status' actions). */
  callId?: string;
  /** Text message to speak (for 'call' in notify mode, or 'speak' action). */
  message?: string;
  /** Call mode: 'notify' or 'conversation' (for 'call' action). */
  mode?: CallMode;
}

// ============================================================================
// Tool Implementation
// ============================================================================

export class PlivoVoiceCallTool implements ITool<VoiceCallArgs> {
  public readonly id = 'plivoVoiceCall';
  public readonly name = 'plivoVoiceCall';
  public readonly displayName = 'Plivo Voice Call';
  public readonly description =
    'Make and manage phone calls via Plivo. ' +
    'Actions: "call" (initiate outbound call), "speak" (play TTS into active call), ' +
    '"hangup" (terminate call), "status" (get call info), "list" (get all active calls).';
  public readonly category = 'telephony';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['action'] as const,
    properties: {
      action: {
        type: 'string',
        enum: ['call', 'speak', 'hangup', 'status', 'list'],
        description: 'The voice call action to perform.',
      },
      toNumber: {
        type: 'string',
        description: 'E.164 phone number to call (required for "call" action).',
      },
      callId: {
        type: 'string',
        description: 'Call ID (required for "speak", "hangup", "status" actions).',
      },
      message: {
        type: 'string',
        description:
          'Text to speak. For "call" in notify mode, this is the message. For "speak", this is played into the active call.',
      },
      mode: {
        type: 'string',
        enum: ['notify', 'conversation'],
        description: 'Call mode (default: "conversation"). "notify" speaks a message and hangs up.',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      callId: { type: 'string', description: 'The call ID' },
      state: { type: 'string', description: 'Current call state' },
      calls: {
        type: 'array',
        description: 'List of active calls (for "list" action)',
        items: { type: 'object' },
      },
    },
  };

  constructor(private readonly handler: VoiceCallToolHandler) {}

  async execute(
    args: VoiceCallArgs,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      switch (args.action) {
        case 'call':
          return await this.handleCall(args);
        case 'speak':
          return this.handleSpeak(args);
        case 'hangup':
          return await this.handleHangup(args);
        case 'status':
          return this.handleStatus(args);
        case 'list':
          return this.handleList();
        default:
          return {
            success: false,
            error: `Unknown action: "${args.action}". Valid actions: call, speak, hangup, status, list.`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!args.action) {
      errors.push('action is required');
    } else {
      const validActions: VoiceCallAction[] = ['call', 'speak', 'hangup', 'status', 'list'];
      if (!validActions.includes(args.action as VoiceCallAction)) {
        errors.push(`Invalid action "${args.action}". Must be one of: ${validActions.join(', ')}`);
      }

      if (args.action === 'call' && !args.toNumber) {
        errors.push('toNumber is required for "call" action');
      }
      if (['speak', 'hangup', 'status'].includes(args.action) && !args.callId) {
        errors.push(`callId is required for "${args.action}" action`);
      }
      if (args.action === 'speak' && !args.message) {
        errors.push('message is required for "speak" action');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // ── Action Handlers ──

  private async handleCall(args: VoiceCallArgs): Promise<ToolExecutionResult> {
    if (!args.toNumber) {
      return { success: false, error: 'toNumber is required for "call" action' };
    }

    const call = await this.handler.initiateCall(
      args.toNumber,
      args.message,
      args.mode ?? 'conversation',
    );

    return {
      success: true,
      output: {
        callId: call.callId,
        providerCallId: call.providerCallId,
        state: call.state,
        direction: call.direction,
        mode: call.mode,
        fromNumber: call.fromNumber,
        toNumber: call.toNumber,
      },
    };
  }

  private handleSpeak(args: VoiceCallArgs): ToolExecutionResult {
    if (!args.callId) {
      return { success: false, error: 'callId is required for "speak" action' };
    }
    if (!args.message) {
      return { success: false, error: 'message is required for "speak" action' };
    }

    this.handler.speakText(args.callId, args.message);

    return {
      success: true,
      output: { callId: args.callId, action: 'speak', text: args.message },
    };
  }

  private async handleHangup(args: VoiceCallArgs): Promise<ToolExecutionResult> {
    if (!args.callId) {
      return { success: false, error: 'callId is required for "hangup" action' };
    }

    await this.handler.hangupCall(args.callId);

    return {
      success: true,
      output: { callId: args.callId, action: 'hangup' },
    };
  }

  private handleStatus(args: VoiceCallArgs): ToolExecutionResult {
    if (!args.callId) {
      return { success: false, error: 'callId is required for "status" action' };
    }

    const call = this.handler.getCallStatus(args.callId);
    if (!call) {
      return { success: false, error: `No call found with ID: ${args.callId}` };
    }

    return {
      success: true,
      output: {
        callId: call.callId,
        providerCallId: call.providerCallId,
        state: call.state,
        direction: call.direction,
        mode: call.mode,
        fromNumber: call.fromNumber,
        toNumber: call.toNumber,
        transcript: call.transcript,
        createdAt: call.createdAt,
        endedAt: call.endedAt,
        errorMessage: call.errorMessage,
      },
    };
  }

  private handleList(): ToolExecutionResult {
    const calls = this.handler.getActiveCalls();

    return {
      success: true,
      output: {
        count: calls.length,
        calls: calls.map((c) => ({
          callId: c.callId,
          state: c.state,
          direction: c.direction,
          mode: c.mode,
          fromNumber: c.fromNumber,
          toNumber: c.toNumber,
          createdAt: c.createdAt,
        })),
      },
    };
  }
}
