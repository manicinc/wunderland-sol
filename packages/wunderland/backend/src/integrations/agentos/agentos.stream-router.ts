import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AgentOSInput, AgentOSResponse } from '@framers/agentos';
import { agentosChatAdapterEnabled, processAgentOSChatRequest } from './agentos.chat-adapter.js';
import { resolveSessionUserId } from '../../utils/session.utils.js';
import { applyLongTermMemoryDefaults } from './agentos.memory-defaults.js';
import {
  OrganizationAuthzError,
  requireActiveOrganizationMember,
  requireOrganizationRole,
} from '../../features/organization/organization.authz.js';
import { getOrganizationSettings } from '../../features/organization/organization.repository.js';
import { resolveOrganizationMemorySettings } from '../../features/organization/organization.settings.js';

type StreamHandler = (
  input: AgentOSInput,
  onChunk: (chunk: AgentOSResponse) => Promise<void> | void
) => Promise<void>;

interface AgentOSStreamIntegration {
  processThroughAgentOSStream: StreamHandler;
}

export const createAgentOSStreamRouter = (integration: AgentOSStreamIntegration): Router => {
  const router = Router();

  const handleStreamRequest = async (req: Request, res: Response): Promise<void> => {
    if (!agentosChatAdapterEnabled()) {
      res.status(503).json({ message: 'AgentOS streaming disabled', error: 'AGENTOS_DISABLED' });
      return;
    }

    const source = req.method === 'POST' ? (req.body ?? {}) : (req.query ?? {});
    const requestedUserId = typeof source.userId === 'string' ? source.userId : null;
    const effectiveUserId = resolveSessionUserId(req, requestedUserId);
    const userContext = (req as any)?.user;
    const isAuthenticated = Boolean(userContext?.authenticated);

    const organizationId =
      typeof source.organizationId === 'string' ? source.organizationId : undefined;
    const orgId =
      typeof organizationId === 'string' && organizationId.trim().length > 0
        ? organizationId.trim()
        : undefined;
    const conversationId = typeof source.conversationId === 'string' ? source.conversationId : '';
    const mode = typeof source.mode === 'string' ? source.mode : '';
    const model = typeof source.model === 'string' ? source.model : undefined;

    let messages: Array<{ role: string; content: string }> = [];
    if (Array.isArray(source.messages)) {
      messages = source.messages as Array<{ role: string; content: string }>;
    } else if (typeof source.messages === 'string') {
      try {
        messages = JSON.parse(source.messages);
      } catch {
        res.status(400).json({ message: 'Invalid messages payload.' });
        return;
      }
    }

    let workflowRequest: unknown = source.workflowRequest;
    if (typeof workflowRequest === 'string') {
      try {
        workflowRequest = JSON.parse(workflowRequest);
      } catch {
        res.status(400).json({ message: 'Invalid workflowRequest payload.' });
        return;
      }
    }

    let agencyRequest: unknown = source.agencyRequest;
    if (typeof agencyRequest === 'string') {
      try {
        agencyRequest = JSON.parse(agencyRequest);
      } catch {
        res.status(400).json({ message: 'Invalid agencyRequest payload.' });
        return;
      }
    }

    let memoryControl: unknown = source.memoryControl;
    if (typeof memoryControl === 'string') {
      try {
        memoryControl = JSON.parse(memoryControl);
      } catch {
        res.status(400).json({ message: 'Invalid memoryControl payload.' });
        return;
      }
    }

    let userApiKeys: Record<string, string> | undefined;
    if (typeof source.apiKeys === 'string') {
      try {
        const parsed = JSON.parse(source.apiKeys);
        if (parsed && typeof parsed === 'object') {
          userApiKeys = parsed as Record<string, string>;
        }
      } catch {
        res.status(400).json({ message: 'Invalid apiKeys payload.' });
        return;
      }
    } else if (source.apiKeys && typeof source.apiKeys === 'object') {
      userApiKeys = source.apiKeys as Record<string, string>;
    }

    const longTermMemory = (memoryControl as any)?.longTermMemory ?? null;
    const scopes = longTermMemory?.scopes ?? {};
    const wantsUserScope = Boolean((scopes as any)?.user);
    const wantsPersonaScope = Boolean((scopes as any)?.persona);
    const wantsOrgRead = Boolean((scopes as any)?.organization);
    const wantsOrgWrite = Boolean(longTermMemory?.shareWithOrganization);
    const wantsOrgScope = wantsOrgRead || wantsOrgWrite;
    const wantsAnyPrivilegedScope = wantsUserScope || wantsPersonaScope || wantsOrgScope;

    if ((orgId || wantsAnyPrivilegedScope) && !isAuthenticated) {
      res.status(401).json({
        message: 'Authentication required for organization/user/persona scoped memory.',
        error: 'AUTH_REQUIRED',
      });
      return;
    }

    if (wantsOrgScope && !orgId) {
      res.status(400).json({
        message: 'organizationId is required when enabling organization-scoped memory.',
        error: 'ORGANIZATION_ID_REQUIRED',
      });
      return;
    }

    if (orgId) {
      try {
        await requireActiveOrganizationMember(orgId, effectiveUserId);
        if (wantsOrgWrite) {
          await requireOrganizationRole(orgId, effectiveUserId, 'admin');
        }
      } catch (error: any) {
        if (error instanceof OrganizationAuthzError) {
          res.status(error.status).json({ message: error.message, error: error.code });
          return;
        }
        throw error;
      }
    }

    const orgMemorySettings = orgId
      ? resolveOrganizationMemorySettings(await getOrganizationSettings(orgId))
      : null;

    if (orgId && orgMemorySettings && !orgMemorySettings.enabled && wantsOrgScope) {
      res.status(403).json({
        message: 'Organization-scoped memory is disabled for this organization.',
        error: 'ORG_MEMORY_DISABLED',
      });
      return;
    }

    if (orgId && orgMemorySettings && wantsOrgWrite && !orgMemorySettings.allowWrites) {
      res.status(403).json({
        message: 'Organization-scoped memory publishing is disabled for this organization.',
        error: 'ORG_MEMORY_WRITES_DISABLED',
      });
      return;
    }

    if (!conversationId || !mode) {
      res.status(400).json({ message: 'Missing agentOS streaming payload fields.' });
      return;
    }

    const explicitTextInput =
      typeof source.textInput === 'string' && source.textInput.trim().length > 0
        ? source.textInput
        : null;
    const lastUserMessage =
      explicitTextInput ??
      [...messages].reverse().find((msg) => msg.role === 'user')?.content ??
      null;

    const agentosInput: AgentOSInput = {
      userId: effectiveUserId,
      organizationId:
        typeof organizationId === 'string' && organizationId.trim().length > 0
          ? organizationId.trim()
          : undefined,
      sessionId: conversationId,
      conversationId,
      selectedPersonaId: mode,
      textInput: lastUserMessage ?? null,
      memoryControl: applyLongTermMemoryDefaults({
        memoryControl,
        organizationId: orgId ?? null,
        defaultOrganizationScope: Boolean(
          orgId && orgMemorySettings?.enabled && orgMemorySettings?.defaultRetrievalEnabled
        ),
        defaultUserScope: isAuthenticated,
        defaultPersonaScope: isAuthenticated,
      }),
      options: {
        streamUICommands: true,
      },
    };
    if (userApiKeys) {
      agentosInput.userApiKeys = userApiKeys;
    }

    if (workflowRequest && typeof workflowRequest === 'object') {
      (agentosInput as any).workflowRequest = workflowRequest;
    }

    if (agencyRequest && typeof agencyRequest === 'object') {
      (agentosInput as any).agencyRequest = agencyRequest;
    }

    if (typeof model === 'string' && model.trim().length > 0) {
      (agentosInput as any).options = {
        ...((agentosInput as any).options || {}),
        overrideModelId: model,
      };
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    let emittedText = false;

    try {
      await integration.processThroughAgentOSStream(agentosInput, async (chunk: any) => {
        if (
          chunk?.type === 'text_delta' &&
          typeof chunk.textDelta === 'string' &&
          chunk.textDelta.trim().length > 0
        ) {
          emittedText = true;
        } else if (chunk?.type === 'final_response') {
          const text =
            (typeof chunk.finalResponseText === 'string' ? chunk.finalResponseText : '') ||
            (typeof chunk.content === 'string' ? chunk.content : '');
          if (text.trim().length > 0) emittedText = true;
        }
        res.write('data: ' + JSON.stringify(chunk) + '\n\n');
        const flush = (res as any).flush;
        if (typeof flush === 'function') {
          flush.call(res);
        }
      });

      if (!emittedText) {
        // Fallback to a single-shot chat response (real LLM if configured)
        try {
          const result = await processAgentOSChatRequest({
            userId: effectiveUserId,
            organizationId,
            conversationId,
            mode,
            messages,
            memoryControl: applyLongTermMemoryDefaults({
              memoryControl,
              organizationId: orgId ?? null,
              defaultOrganizationScope: Boolean(
                orgId && orgMemorySettings?.enabled && orgMemorySettings?.defaultRetrievalEnabled
              ),
              defaultUserScope: isAuthenticated,
              defaultPersonaScope: isAuthenticated,
            }),
          });
          const fallbackChunk: any = {
            type: 'final_response',
            streamId: conversationId,
            gmiInstanceId: mode,
            personaId: mode,
            isFinal: true,
            timestamp: new Date().toISOString(),
            finalResponseText: result.content || '',
            finalResponseTextPlain: result.contentPlain || '',
            usage: result.usage
              ? {
                  promptTokens: (result.usage as any).prompt_tokens ?? 0,
                  completionTokens: (result.usage as any).completion_tokens ?? 0,
                  totalTokens: (result.usage as any).total_tokens ?? 0,
                }
              : undefined,
            metadata: { modelId: result.model },
          };
          res.write('data: ' + JSON.stringify(fallbackChunk) + '\n\n');
        } catch (fallbackError: any) {
          // Log the actual error
          console.warn(
            '[AgentOS Stream] Fallback chat request failed:',
            fallbackError.message || fallbackError
          );
          // Send error response with helpful message
          const errorChunk = {
            type: 'final_response',
            streamId: conversationId,
            gmiInstanceId: mode,
            personaId: mode,
            isFinal: true,
            timestamp: new Date().toISOString(),
            finalResponseText: `⚠️ AgentOS processing completed but no response was generated.\n\n**Possible causes:**\n- No LLM provider configured (check OPENAI_API_KEY or ANTHROPIC_API_KEY in backend .env)\n- Agency requests require workflow start endpoint (not yet wired - only first seat GMI responds)\n- Backend error: ${fallbackError.message || 'Unknown error'}\n\n**Next steps:**\n1. Check backend logs for errors\n2. Verify LLM provider keys are set\n3. For agency mode: use /workflows/start endpoint (not yet wired to this UI)`,
          } as any;
          res.write('data: ' + JSON.stringify(errorChunk) + '\n\n');
        }
      }

      res.write('event: done\ndata: {}\n\n');
      res.end();
    } catch (error: any) {
      res.write(
        'event: error\ndata: ' +
          JSON.stringify({ message: error?.message ?? 'AgentOS error' }) +
          '\n\n'
      );
      res.end();
    }
  };

  router.get('/stream', handleStreamRequest);
  router.post('/stream', handleStreamRequest);

  return router;
};
