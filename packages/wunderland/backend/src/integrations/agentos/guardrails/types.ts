/**
 * Guardrail interfaces and decision types used to inspect and influence
 * AgentOS streaming output in real time.
 */

export type GuardrailAction =
  | { kind: 'allow' }
  | { kind: 'inject_progress'; message: string; percent?: number }
  | {
      kind: 'abort_and_replace';
      /** Final text to emit immediately as the assistant's final_response */
      finalText: string;
      /** Optional usage to surface (tokens, etc.) */
      usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
      /** Optional reason for logs/telemetry */
      reason?: string;
    };

/**
 * Per-stream guardrail context that can accumulate state across chunks.
 */
export interface GuardrailContext {
  /** Unique stream/session id */
  streamId: string;
  /** Persona id currently active */
  personaId: string;
  /** Total characters seen in TEXT_DELTA so far */
  accumulatedChars: number;
  /** Arbitrary state bag */
  state: Record<string, unknown>;
}

/**
 * Implementations inspect stream lifecycle and return decisions.
 */
export interface IGuardrail {
  /** Stable id */
  getId(): string;
  /** Short description */
  getDescription(): string;
  /** Called when a stream is created */
  onStart?(ctx: GuardrailContext): Promise<void> | void;
  /** Called for each SSE chunk (TEXT_DELTA, FINAL_RESPONSE, etc.)*/
  onChunk?(chunk: any, ctx: GuardrailContext): Promise<GuardrailAction | void> | GuardrailAction | void;
  /** Called once when stream finishes (success or error) */
  onComplete?(ctx: GuardrailContext): Promise<void> | void;
}
