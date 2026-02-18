import { Router } from 'express';
import { agentosChatAdapterEnabled, processAgentOSChatRequest } from './agentos.chat-adapter.js';
import type { Request, Response, NextFunction } from 'express';
import { createAgentOSHITLRouter, createAgentOSRagRouter } from '@framers/agentos-ext-http-api';
import { agentosService } from './agentos.integration.js';
import { agencyUsageService } from '../../features/agents/agencyUsage.service.js';
import extensionRoutes from './agentos.extensions.routes.js';
import guardrailRoutes from './agentos.guardrails.routes.js';
import provenanceRoutes from './agentos.provenance.routes.js';
import { createAgencyStreamRouter } from './agentos.agency-stream-router.js';
import planningRoutes from './agentos.planning.routes.js';
import { LlmConfigService, LlmProviderId } from '../../core/llm/llm.config.service.js';
import { MODEL_PRICING } from '../../../config/models.config.js';
import { resolveSessionUserId } from '../../utils/session.utils.js';
import {
  OrganizationAuthzError,
  requireActiveOrganizationMember,
  requireOrganizationRole,
} from '../../features/organization/organization.authz.js';
import { applyLongTermMemoryDefaults } from './agentos.memory-defaults.js';
import { getOrganizationSettings } from '../../features/organization/organization.repository.js';
import { resolveOrganizationMemorySettings } from '../../features/organization/organization.settings.js';
import {
  getAgencyExecution,
  listAgencyExecutions,
  listAgencySeats,
} from './agencyPersistence.service.js';
import { ragService } from './agentos.rag.service.js';
import { getHitlManager, hitlAuthRequired } from './agentos.hitl.service.js';

export const createAgentOSRouter = (): Router => {
  const router = Router();

  // CORS for all AgentOS endpoints (dev convenience)
  router.use((req: Request, res: Response, next: NextFunction) => {
    const origin = (req.headers.origin as string) || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Preflight for SSE endpoint (dev convenience)
  router.options('/stream', (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.status(204).end();
  });

  // Get available models from all providers
  router.get(
    '/models',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!agentosChatAdapterEnabled()) {
          return res
            .status(503)
            .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
        }

        const llmConfig = LlmConfigService.getInstance();
        const availableProviders = llmConfig.getAvailableProviders();
        const models: Array<{
          id: string;
          displayName: string;
          provider: string;
          pricing?: {
            inputCostPer1K: number;
            outputCostPer1K: number;
          };
        }> = [];

        // Add models from MODEL_PRICING that match available providers
        for (const [modelId, config] of Object.entries(MODEL_PRICING)) {
          if (modelId === 'default') continue;

          // Check if this model's provider is available
          const modelProvider = config.provider;
          const isProviderAvailable =
            (modelProvider === LlmProviderId.OPENAI &&
              availableProviders.includes(LlmProviderId.OPENAI)) ||
            (modelProvider === LlmProviderId.OPENROUTER &&
              availableProviders.includes(LlmProviderId.OPENROUTER)) ||
            (modelProvider === LlmProviderId.ANTHROPIC &&
              availableProviders.includes(LlmProviderId.ANTHROPIC)) ||
            (modelProvider === LlmProviderId.OLLAMA &&
              availableProviders.includes(LlmProviderId.OLLAMA));

          if (isProviderAvailable) {
            models.push({
              id: modelId,
              displayName: config.displayName || modelId,
              provider: modelProvider || 'unknown',
              pricing: {
                inputCostPer1K: config.inputCostPer1K,
                outputCostPer1K: config.outputCostPer1K,
              },
            });
          }
        }

        // Add common OpenRouter models if available
        if (availableProviders.includes(LlmProviderId.OPENROUTER)) {
          const openRouterModels = [
            'meta-llama/llama-3.1-8b-instruct:free',
            'microsoft/wizardlm-2-8x22b',
            'google/gemini-flash-1.5',
            'mistralai/mixtral-8x7b-instruct',
            'anthropic/claude-3.5-sonnet',
            'openai/gpt-4o-2024-08-06',
            'openai/o1-preview',
            'openai/o1-mini',
          ];

          for (const modelId of openRouterModels) {
            if (!models.some((m) => m.id === modelId)) {
              models.push({
                id: modelId,
                displayName:
                  modelId
                    .split('/')
                    .pop()
                    ?.replace(/-/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase()) || modelId,
                provider: 'openrouter',
                pricing: MODEL_PRICING[modelId]
                  ? {
                      inputCostPer1K: MODEL_PRICING[modelId].inputCostPer1K,
                      outputCostPer1K: MODEL_PRICING[modelId].outputCostPer1K,
                    }
                  : undefined,
              });
            }
          }
        }

        return res.status(200).json({ models });
      } catch (error) {
        next(error);
      }
    }
  );

  // Streaming is handled by the dedicated AgentOS stream router. No mock endpoints here.

  router.post(
    '/chat',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!agentosChatAdapterEnabled()) {
          return res
            .status(503)
            .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
        }

        const { userId, organizationId, conversationId, mode, messages, memoryControl } =
          req.body ?? {};
        if (!conversationId || !mode || !Array.isArray(messages)) {
          return res.status(400).json({ message: 'Missing agentOS chat payload fields.' });
        }

        const effectiveUserId = resolveSessionUserId(
          req,
          typeof userId === 'string' ? userId : null
        );
        const userContext = (req as any)?.user;
        const isAuthenticated = Boolean(userContext?.authenticated);

        const orgId =
          typeof organizationId === 'string' && organizationId.trim().length > 0
            ? organizationId.trim()
            : undefined;

        const longTermMemory = (memoryControl as any)?.longTermMemory ?? null;
        const scopes = longTermMemory?.scopes ?? {};
        const wantsUserScope = Boolean((scopes as any)?.user);
        const wantsPersonaScope = Boolean((scopes as any)?.persona);
        const wantsOrgRead = Boolean((scopes as any)?.organization);
        const wantsOrgWrite = Boolean(longTermMemory?.shareWithOrganization);
        const wantsOrgScope = wantsOrgRead || wantsOrgWrite;
        const wantsAnyPrivilegedScope = wantsUserScope || wantsPersonaScope || wantsOrgScope;

        if ((orgId || wantsAnyPrivilegedScope) && !isAuthenticated) {
          return res.status(401).json({
            message: 'Authentication required for organization/user/persona scoped memory.',
            error: 'AUTH_REQUIRED',
          });
        }

        if (wantsOrgScope && !orgId) {
          return res.status(400).json({
            message: 'organizationId is required when enabling organization-scoped memory.',
            error: 'ORGANIZATION_ID_REQUIRED',
          });
        }

        if (orgId) {
          try {
            await requireActiveOrganizationMember(orgId, effectiveUserId);
            if (wantsOrgWrite) {
              await requireOrganizationRole(orgId, effectiveUserId, 'admin');
            }
          } catch (error: any) {
            if (error instanceof OrganizationAuthzError) {
              return res.status(error.status).json({ message: error.message, error: error.code });
            }
            throw error;
          }
        }

        const orgMemorySettings = orgId
          ? resolveOrganizationMemorySettings(await getOrganizationSettings(orgId))
          : null;

        if (orgId && orgMemorySettings && !orgMemorySettings.enabled && wantsOrgScope) {
          return res.status(403).json({
            message: 'Organization-scoped memory is disabled for this organization.',
            error: 'ORG_MEMORY_DISABLED',
          });
        }

        if (orgId && orgMemorySettings && wantsOrgWrite && !orgMemorySettings.allowWrites) {
          return res.status(403).json({
            message: 'Organization-scoped memory publishing is disabled for this organization.',
            error: 'ORG_MEMORY_WRITES_DISABLED',
          });
        }

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

        return res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/personas',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!agentosChatAdapterEnabled()) {
          return res
            .status(503)
            .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
        }

        const parseMultiParam = (value: unknown): string[] => {
          if (!value) return [];
          const rawValues = Array.isArray(value) ? value : String(value).split(',');
          return rawValues
            .map((entry) => entry?.toString().trim().toLowerCase())
            .filter((entry): entry is string => Boolean(entry && entry.length > 0));
        };

        const userIdParam = req.query.userId;
        const userContext = (req as any)?.user;
        const authenticatedUserId =
          userContext?.authenticated && typeof userContext?.id === 'string' ? userContext.id : null;
        const userId =
          authenticatedUserId ??
          (typeof userIdParam === 'string' && userIdParam.trim().length > 0
            ? userIdParam
            : undefined);
        const requestedCapabilities = parseMultiParam(req.query.capability);
        const requestedTiers = parseMultiParam(req.query.tier);
        const searchTerm =
          typeof req.query.search === 'string' && req.query.search.trim().length > 0
            ? req.query.search.trim().toLowerCase()
            : undefined;

        const personas = await agentosService.listAvailablePersonas(userId);

        const filtered = personas.filter((persona: any) => {
          const normalizedCapabilities = Array.isArray(persona.allowedCapabilities)
            ? persona.allowedCapabilities
                .filter((cap: unknown): cap is string => typeof cap === 'string')
                .map((cap: string) => cap.toLowerCase())
            : [];

          if (
            requestedCapabilities.length > 0 &&
            !requestedCapabilities.every((capability) =>
              normalizedCapabilities.includes(capability)
            )
          ) {
            return false;
          }

          if (requestedTiers.length > 0) {
            const tierCandidates = [
              persona?.metadata?.tier,
              persona?.metadata?.subscriptionTier,
              persona?.tier,
              persona?.minSubscriptionTier,
              persona?.metadata?.accessTier,
            ]
              .map((tier: unknown) =>
                typeof tier === 'string' ? tier.trim().toLowerCase() : undefined
              )
              .filter((tier): tier is string => Boolean(tier && tier.length > 0));

            if (
              tierCandidates.length === 0 ||
              !tierCandidates.some((tier) => requestedTiers.includes(tier))
            ) {
              return false;
            }
          }

          if (searchTerm) {
            const haystack: string[] = [];
            if (typeof persona.displayName === 'string') haystack.push(persona.displayName);
            if (typeof persona.name === 'string') haystack.push(persona.name);
            if (typeof persona.description === 'string') haystack.push(persona.description);
            if (Array.isArray(persona.tags)) haystack.push(...persona.tags.map(String));
            if (Array.isArray(persona.traits)) haystack.push(...persona.traits.map(String));
            if (Array.isArray(persona.activationKeywords))
              haystack.push(...persona.activationKeywords.map(String));

            const matchesSearch = haystack
              .map((entry) => entry.toLowerCase())
              .some((entry) => entry.includes(searchTerm));

            if (!matchesSearch) {
              return false;
            }
          }

          return true;
        });

        return res.status(200).json({ personas: filtered });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/workflows/definitions',
    async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!agentosChatAdapterEnabled()) {
          return res
            .status(503)
            .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
        }

        const definitions = await agentosService.listWorkflowDefinitions();
        return res.status(200).json({ definitions });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/workflows/start',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!agentosChatAdapterEnabled()) {
          return res
            .status(503)
            .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
        }

        const {
          definitionId,
          userId,
          conversationId,
          workflowId,
          context,
          roleAssignments,
          metadata,
        } = req.body ?? {};
        if (!definitionId || !userId) {
          return res.status(400).json({ message: 'definitionId and userId are required.' });
        }

        const normalizedAssignments =
          roleAssignments && typeof roleAssignments === 'object' ? roleAssignments : undefined;
        const seatCount =
          normalizedAssignments && Object.keys(normalizedAssignments).length > 0
            ? Object.keys(normalizedAssignments).length
            : 1;
        const reservation = await agencyUsageService.assertLaunchCapacity(userId, seatCount);

        const instance = await agentosService.startWorkflow({
          definitionId,
          userId,
          conversationId,
          workflowId,
          context,
          roleAssignments,
          metadata,
          agencyRequest: req.body?.agencyRequest,
        });
        await agencyUsageService.recordLaunch({
          userId,
          planId: reservation.planId,
          workflowDefinitionId: definitionId,
          agencyId: instance.agencyState?.agencyId ?? null,
          seats: seatCount,
          metadata: {
            workflowId: instance.workflowId,
            requestedConversationId: conversationId ?? null,
            agencyRequest: req.body?.agencyRequest ?? null,
          },
        });
        return res.status(201).json({ workflow: instance });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/workflows/cancel',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!agentosChatAdapterEnabled()) {
          return res
            .status(503)
            .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
        }
        const { workflowId, reason } = req.body ?? {};
        if (!workflowId) {
          return res.status(400).json({ message: 'workflowId is required.' });
        }
        const updated = await agentosService.cancelWorkflow(workflowId, reason);
        if (!updated) {
          return res.status(404).json({ message: 'Workflow not found.' });
        }
        return res.status(200).json({ workflow: updated });
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/agentos/agency/executions - List agency executions for a user
  router.get(
    '/agency/executions',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!agentosChatAdapterEnabled()) {
          return res
            .status(503)
            .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
        }
        const { userId, limit } = req.query;
        if (!userId || typeof userId !== 'string') {
          return res.status(400).json({ message: 'userId query parameter required' });
        }
        const limitNum = limit && typeof limit === 'string' ? parseInt(limit, 10) : 50;
        const executions = await listAgencyExecutions(userId, limitNum);
        return res.status(200).json({ executions });
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/agentos/agency/executions/:agencyId - Get specific agency execution
  router.get(
    '/agency/executions/:agencyId',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!agentosChatAdapterEnabled()) {
          return res
            .status(503)
            .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
        }
        const { agencyId } = req.params;
        const execution = await getAgencyExecution(agencyId);
        if (!execution) {
          return res.status(404).json({ message: 'Agency execution not found' });
        }
        const seats = await listAgencySeats(agencyId);
        return res.status(200).json({ execution, seats });
      } catch (error) {
        next(error);
      }
    }
  );

  // Add extension routes
  router.use(extensionRoutes);
  // Add guardrail routes
  router.use(guardrailRoutes);
  // Provenance / immutability routes
  router.use('/provenance', provenanceRoutes);
  // Add RAG routes
  router.use('/rag', createAgentOSRagRouter({ isEnabled: agentosChatAdapterEnabled, ragService }));
  // Agency streaming routes
  router.use('/agency', createAgencyStreamRouter());
  // Planning engine routes (v1.1.0)
  router.use('/planning', planningRoutes);
  // Human-in-the-Loop (HITL) routes (v1.1.0)
  router.use('/hitl', createAgentOSHITLRouter({ getHitlManager, hitlAuthRequired }));

  return router;
};
