/**
 * @fileoverview ITool for initiating and managing voice calls via Telnyx.
 *
 * Follows the same VoiceCallToolHandler pattern used by other telephony
 * providers (Twilio, Plivo) to provide a consistent tool interface for
 * the AgentOS tool orchestrator.
 *
 * @module @framers/agentos-ext-voice-telnyx/tools/voiceCall
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { CallMode, CallRecord } from '@framers/agentos';

// ============================================================================
// Voice Call Tool Handler Interface
// ============================================================================

/**
 * Abstraction over voice call operations. The extension's index.ts wires
 * a concrete handler backed by CallManager + TelnyxVoiceProvider.
 */
export interface VoiceCallToolHandler {
  /** Initiate a new outbound call. */
  initiateCall(toNumber: string, message?: string, mode?: CallMode): Promise<CallRecord>;
  /** Speak text into an active call. */
  speakText(callId: string, text: string): void;
  /** Hang up an active call. */
  hangupCall(callId: string): Promise<void>;
  /** Get the current status of a call. */
  getCallStatus(callId: string): CallRecord | undefined;
  /** List all active (non-terminal) calls. */
  getActiveCalls(): CallRecord[];
}

// ============================================================================
// Tool Implementation
// ============================================================================

export class TelnyxVoiceCallTool implements ITool {
  public readonly id = 'telnyxVoiceCall';
  public readonly name = 'telnyxVoiceCall';
  public readonly displayName = 'Telnyx Voice Call';
  public readonly description =
    'Make and manage phone calls via Telnyx. Supports outbound calling, in-call TTS, hangup, and status queries.';
  public readonly category = 'voice';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['action'] as const,
    properties: {
      action: {
        type: 'string',
        enum: ['call', 'speak', 'hangup', 'status', 'list'],
        description: 'The voice call action to perform',
      },
      toNumber: {
        type: 'string',
        description: 'E.164 phone number to call (required for "call" action)',
      },
      message: {
        type: 'string',
        description: 'Message to speak (for "call" in notify mode, or "speak" action)',
      },
      mode: {
        type: 'string',
        enum: ['notify', 'conversation'],
        description: 'Call interaction mode (default: "conversation")',
      },
      callId: {
        type: 'string',
        description: 'Call ID (required for "speak", "hangup", and "status" actions)',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      callId: { type: 'string', description: 'Internal call identifier' },
      state: { type: 'string', description: 'Current call state' },
      provider: { type: 'string', description: 'Telephony provider name' },
      calls: {
        type: 'array',
        description: 'List of active calls (for "list" action)',
        items: {
          type: 'object',
          properties: {
            callId: { type: 'string' },
            state: { type: 'string' },
            toNumber: { type: 'string' },
            fromNumber: { type: 'string' },
          },
        },
      },
    },
  };

  constructor(private readonly handler: VoiceCallToolHandler) {}

  async execute(
    args: {
      action: 'call' | 'speak' | 'hangup' | 'status' | 'list';
      toNumber?: string;
      message?: string;
      mode?: CallMode;
      callId?: string;
    },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      switch (args.action) {
        case 'call': {
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
              state: call.state,
              provider: call.provider,
              toNumber: call.toNumber,
              fromNumber: call.fromNumber,
            },
          };
        }

        case 'speak': {
          if (!args.callId || !args.message) {
            return { success: false, error: 'callId and message are required for "speak" action' };
          }
          this.handler.speakText(args.callId, args.message);
          return { success: true, output: { callId: args.callId, action: 'speak' } };
        }

        case 'hangup': {
          if (!args.callId) {
            return { success: false, error: 'callId is required for "hangup" action' };
          }
          await this.handler.hangupCall(args.callId);
          return { success: true, output: { callId: args.callId, action: 'hangup' } };
        }

        case 'status': {
          if (!args.callId) {
            return { success: false, error: 'callId is required for "status" action' };
          }
          const call = this.handler.getCallStatus(args.callId);
          if (!call) {
            return { success: false, error: `Call not found: ${args.callId}` };
          }
          return {
            success: true,
            output: {
              callId: call.callId,
              state: call.state,
              provider: call.provider,
              direction: call.direction,
              mode: call.mode,
              toNumber: call.toNumber,
              fromNumber: call.fromNumber,
              transcriptLength: call.transcript.length,
              createdAt: call.createdAt,
              endedAt: call.endedAt,
            },
          };
        }

        case 'list': {
          const calls = this.handler.getActiveCalls();
          return {
            success: true,
            output: {
              calls: calls.map((c) => ({
                callId: c.callId,
                state: c.state,
                toNumber: c.toNumber,
                fromNumber: c.fromNumber,
                direction: c.direction,
                mode: c.mode,
                createdAt: c.createdAt,
              })),
              count: calls.length,
            },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${args.action}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!args.action) {
      errors.push('action is required');
    } else if (!['call', 'speak', 'hangup', 'status', 'list'].includes(args.action)) {
      errors.push('action must be one of: call, speak, hangup, status, list');
    }

    if (args.action === 'call' && !args.toNumber) {
      errors.push('toNumber is required for "call" action');
    }

    if (args.action === 'speak') {
      if (!args.callId) errors.push('callId is required for "speak" action');
      if (!args.message) errors.push('message is required for "speak" action');
    }

    if (args.action === 'hangup' && !args.callId) {
      errors.push('callId is required for "hangup" action');
    }

    if (args.action === 'status' && !args.callId) {
      errors.push('callId is required for "status" action');
    }

    if (args.mode && !['notify', 'conversation'].includes(args.mode)) {
      errors.push('mode must be "notify" or "conversation"');
    }

    return { isValid: errors.length === 0, errors };
  }
}
