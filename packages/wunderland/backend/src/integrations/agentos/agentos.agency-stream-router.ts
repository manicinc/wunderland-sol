/**
 * Streaming router for multi-seat agencies powered by the MultiGMIAgencyExecutor.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { agentosService } from './agentos.integration.js';
import { agentosChatAdapterEnabled } from './agentos.chat-adapter.js';
import type {
  AgentOSResponse,
  AgentOSAgencyUpdateChunk,
  AgentOSFinalResponseChunk,
  AgentOSErrorChunk,
} from '@framers/agentos';
import type { AgentRoleConfig, AgencyExecutionInput } from './MultiGMIAgencyExecutor.js';

export const createAgencyStreamRouter = (): Router => {
  const router = Router();

  router.get('/stream', async (req: Request, res: Response) => {
    if (!agentosChatAdapterEnabled()) {
      res.status(503).json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
      return;
    }

    const { userId, conversationId, goal, outputFormat, workflowDefinitionId, enableEmergent, coordinationStrategy } = req.query as Record<string, string>;

    let roles: AgentRoleConfig[] = [];
    if (typeof req.query.roles === 'string') {
      try {
        roles = JSON.parse(req.query.roles);
      } catch {
        res.status(400).json({ message: 'Invalid roles payload - must be JSON array' });
        return;
      }
    }

    if (!userId || !conversationId || !goal || !Array.isArray(roles) || roles.length === 0) {
      res.status(400).json({ message: 'Missing required fields: userId, conversationId, goal, roles[]' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const agencyId = `agency_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const flushIfAvailable = () => {
      const flush = (res as any).flush;
      if (typeof flush === 'function') {
        flush.call(res);
      }
    };

    const writeChunk = (chunk: AgentOSResponse) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      flushIfAvailable();
    };

    const initialSeats = roles.map((role) => ({
      roleId: role.roleId,
      personaId: role.personaId,
      gmiInstanceId: 'pending',
      metadata: { instruction: role.instruction, priority: role.priority },
    }));

    const initialAgencyUpdate: AgentOSAgencyUpdateChunk = {
      type: 'agency_update',
      streamId: conversationId,
      gmiInstanceId: `agency:${agencyId}`,
      personaId: `agency:${agencyId}`,
      isFinal: false,
      timestamp: new Date().toISOString(),
      agency: {
        agencyId,
        workflowId: workflowDefinitionId,
        conversationId,
        seats: initialSeats,
        metadata: { goal, status: 'initializing' },
      },
    } as any;

    writeChunk(initialAgencyUpdate);

    try {
      const executionInput: AgencyExecutionInput = {
        goal,
        roles,
        userId,
        conversationId,
        workflowDefinitionId,
        outputFormat: (outputFormat as AgencyExecutionInput['outputFormat']) ?? 'markdown',
        metadata: { initiatedFrom: 'agency-stream-router' },
        // Support both new coordinationStrategy and legacy enableEmergent
        coordinationStrategy: (coordinationStrategy as 'emergent' | 'static') ?? 
                             (enableEmergent === 'false' ? 'static' : 'emergent'),
      };

      const result = await agentosService.executeAgencyWorkflow(executionInput, async (chunk) => {
        writeChunk(chunk);
      });

      const finalResponse: AgentOSFinalResponseChunk = {
        type: 'final_response',
        streamId: conversationId,
        gmiInstanceId: `agency:${agencyId}`,
        personaId: `agency:${agencyId}`,
        isFinal: true,
        timestamp: new Date().toISOString(),
        finalResponseText: result.formattedOutput?.content ?? result.consolidatedOutput,
        usage: {
          promptTokens: result.totalUsage.promptTokens,
          completionTokens: result.totalUsage.completionTokens,
          totalTokens: result.totalUsage.totalTokens,
          totalCostUSD: result.totalUsage.totalCostUSD,
        },
        metadata: {
          agencyId,
          roleCount: roles.length,
          outputFormat: result.formattedOutput?.format ?? executionInput.outputFormat ?? 'markdown',
          emergentBehavior: result.emergentMetadata ? {
            tasksDecomposed: result.emergentMetadata.tasksDecomposed.length,
            rolesSpawned: result.emergentMetadata.rolesSpawned.length,
            coordinationEvents: result.emergentMetadata.coordinationLog.length,
          } : undefined,
        },
      } as any;

      writeChunk(finalResponse);
      res.write('event: done\ndata: {}\n\n');
      res.end();
    } catch (error: any) {
      const errorChunk: AgentOSErrorChunk = {
        type: 'error',
        streamId: conversationId,
        gmiInstanceId: `agency:${agencyId}`,
        personaId: `agency:${agencyId}`,
        isFinal: true,
        timestamp: new Date().toISOString(),
        error: {
          message: error?.message || 'Agency execution failed',
          code: 'AGENCY_EXECUTION_ERROR',
        },
      } as any;

      writeChunk(errorChunk);
      res.write('event: error\ndata: {}\n\n');
      res.end();
    }
  });

  return router;
};

