import {
  AgentOSResponse,
  AgentOSResponseChunkType,
  type AgentOSFinalResponseChunk,
  type AgentOSMetadataUpdateChunk,
  type AgentOSTextDeltaChunk,
  type AgentOSInput,
  type AgentOSMemoryControl,
} from '@framers/agentos';
import { isAgentOSEnabled, agentosService } from './agentos.integration.js';
import {
  resolveAgentOSPersona,
  type AgentOSPersonaDefinition,
} from './agentos.persona-registry.js';
import { resolveUserAccessLevel, assertPersonaAccess } from './agentos.access-control.js';

export interface AgentOSChatAdapterRequest {
  userId: string;
  organizationId?: string | null;
  conversationId: string;
  mode: string;
  messages: Array<{ role: string; content: string }>;
  memoryControl?: AgentOSMemoryControl | null;
}

export interface AgentOSChatAdapterResult {
  content: string;
  contentPlain?: string;
  model: string;
  usage?: Record<string, number>;
  conversationId: string;
  persona?: string | null;
  personaLabel?: string | null;
  metadata?: Record<string, any>;
}

export const agentosChatAdapterEnabled = (): boolean => isAgentOSEnabled();

const LEGACY_PERSONA_ID_MAP: Record<string, string> = {
  // Legacy personas that exist in the old prompt registry but not (yet) as first-class AgentOS personas.
  code_pilot: 'voice_assistant_persona',
  systems_architect: 'atlas_systems_architect',
  meeting_maestro: 'voice_assistant_persona',
  echo_diary: 'voice_assistant_persona',
  professor_astra: 'voice_assistant_persona',
  interview_coach: 'voice_assistant_persona',
  lc_audit: 'voice_assistant_persona',
};

function mapPersonaIdToAgentOS(persona: AgentOSPersonaDefinition): string {
  const mapped = LEGACY_PERSONA_ID_MAP[persona.personaId];
  return mapped || persona.personaId;
}

function summarizeAgentOSChunks(
  chunks: AgentOSResponse[],
  conversationId: string,
  fallbackPersonaId?: string,
  fallbackPersonaLabel?: string
): AgentOSChatAdapterResult {
  let responseText = '';
  let responseTextPlain: string | null = null;
  let modelName = 'agentos';
  let usage: Record<string, number> | undefined;
  let persona: string | null = null;
  let personaLabel: string | null = null;
  const metadata: Record<string, any> = {};

  for (const chunk of chunks) {
    switch (chunk.type) {
      case AgentOSResponseChunkType.TEXT_DELTA: {
        const delta = chunk as AgentOSTextDeltaChunk;
        responseText += delta.textDelta ?? '';
        break;
      }
      case AgentOSResponseChunkType.METADATA_UPDATE: {
        const metaChunk = chunk as AgentOSMetadataUpdateChunk;
        if (metaChunk.updates && typeof metaChunk.updates === 'object') {
          Object.assign(metadata, metaChunk.updates);
        }
        if (metaChunk.metadata?.modelId) {
          modelName = metaChunk.metadata.modelId;
        }
        break;
      }
      case AgentOSResponseChunkType.FINAL_RESPONSE: {
        const finalChunk = chunk as AgentOSFinalResponseChunk;
        if (typeof finalChunk.finalResponseText === 'string') {
          responseText = finalChunk.finalResponseText;
        }
        if (typeof (finalChunk as any).finalResponseTextPlain === 'string') {
          responseTextPlain = (finalChunk as any).finalResponseTextPlain;
        }
        modelName = finalChunk.metadata?.modelId ?? modelName;
        if (finalChunk.usage) {
          usage = {
            prompt_tokens: finalChunk.usage.promptTokens ?? 0,
            completion_tokens: finalChunk.usage.completionTokens ?? 0,
            total_tokens: finalChunk.usage.totalTokens ?? 0,
          };
        }
        persona = finalChunk.activePersonaDetails?.id ?? persona;
        personaLabel =
          finalChunk.activePersonaDetails?.label ??
          finalChunk.activePersonaDetails?.name ??
          personaLabel;
        break;
      }
      case AgentOSResponseChunkType.ERROR: {
        throw new Error(
          `AgentOS error: ${(chunk as any).code ?? 'unknown'} - ${(chunk as any).message ?? 'no message'}`
        );
      }
      default:
        break;
    }
  }

  return {
    content: responseText.trim(),
    contentPlain:
      responseTextPlain && responseTextPlain.trim().length > 0
        ? responseTextPlain.trim()
        : undefined,
    model: modelName,
    usage,
    conversationId,
    persona: persona ?? fallbackPersonaId ?? null,
    personaLabel: personaLabel ?? fallbackPersonaLabel ?? null,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

export async function processAgentOSChatRequest(
  payload: AgentOSChatAdapterRequest
): Promise<AgentOSChatAdapterResult> {
  if (!agentosChatAdapterEnabled()) {
    throw new Error('AgentOS integration not enabled. Set AGENTOS_ENABLED=true.');
  }

  const requestedPersona = resolveAgentOSPersona(payload.mode);
  const userAccessLevel = resolveUserAccessLevel(payload.userId);
  assertPersonaAccess(requestedPersona, userAccessLevel);

  const explicitText =
    payload.messages && Array.isArray(payload.messages)
      ? [...payload.messages].reverse().find((m) => m.role === 'user')?.content
      : undefined;
  const userMessage =
    typeof explicitText === 'string' && explicitText.trim().length > 0 ? explicitText : null;

  const selectedPersonaId = mapPersonaIdToAgentOS(requestedPersona);

  const agentosInput: AgentOSInput = {
    userId: payload.userId,
    organizationId: payload.organizationId ?? undefined,
    sessionId: payload.conversationId,
    conversationId: payload.conversationId,
    selectedPersonaId,
    textInput: userMessage,
    memoryControl: payload.memoryControl ?? undefined,
    options: {
      streamUICommands: true,
      customFlags: {
        mode: payload.mode,
        adapter: 'api_chat',
      },
    },
  };

  const chunks = await agentosService.processThroughAgentOS(agentosInput);
  return summarizeAgentOSChunks(
    chunks,
    payload.conversationId,
    selectedPersonaId,
    requestedPersona.label
  );
}
