import { Router, type Router as ExpressRouter } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ChainVerifier } from '@framers/agentos';
import { agentosChatAdapterEnabled } from './agentos.chat-adapter.js';
import { agentosService } from './agentos.integration.js';

const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.floor(value);
    return n > 0 ? n : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  const intVal = Math.floor(n);
  return intVal > 0 ? intVal : null;
};

const provenanceRoutes: ExpressRouter = Router();

/**
 * Get provenance configuration + current chain/anchor status.
 * This endpoint is safe to call even when provenance is disabled (it returns enabled=false).
 */
provenanceRoutes.get(
  '/status',
  async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!agentosChatAdapterEnabled()) {
        return res
          .status(503)
          .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
      }

      const runtime = await agentosService.getProvenanceRuntime();
      if (!runtime) {
        return res.status(200).json({
          enabled: false,
          message:
            'Provenance not enabled. Set AGENTOS_PROVENANCE_ENABLED=true (and persistence) to activate.',
        });
      }

      const { config, agentId, tablePrefix, result } = runtime;
      const ledgerState = result?.ledger.getChainState();
      const lastAnchor = result ? await result.anchorManager.getLastAnchor() : null;

      return res.status(200).json({
        enabled: true,
        agentId,
        tablePrefix,
        config: {
          storagePolicy: {
            mode: config.storagePolicy.mode,
            protectedTables: config.storagePolicy.protectedTables,
          },
          provenance: {
            enabled: Boolean(config.provenance.enabled),
            signatureMode: config.provenance.signatureMode,
            hashAlgorithm: config.provenance.hashAlgorithm,
            keySource: {
              type: config.provenance.keySource.type,
              keyStorePath: config.provenance.keySource.keyStorePath,
            },
            anchorTarget: config.provenance.anchorTarget
              ? {
                  type: config.provenance.anchorTarget.type,
                  hasEndpoint: Boolean(config.provenance.anchorTarget.endpoint),
                  hasOptions: Boolean(
                    config.provenance.anchorTarget.options &&
                      Object.keys(config.provenance.anchorTarget.options).length > 0
                  ),
                }
              : { type: 'none', hasEndpoint: false, hasOptions: false },
          },
          autonomy: config.autonomy,
          anchorIntervalMs: config.anchorIntervalMs,
          anchorBatchSize: config.anchorBatchSize,
        },
        key: result
          ? {
              publicKeyBase64: result.keyManager.getPublicKeyBase64(),
            }
          : null,
        ledger: ledgerState ?? null,
        anchorManager: result
          ? {
              active: result.anchorManager.isActive(),
              lastAnchor,
              provider: result.anchorManager.getProvider()
                ? {
                    id: result.anchorManager.getProvider()!.id,
                    name: result.anchorManager.getProvider()!.name,
                    proofLevel: result.anchorManager.getProvider()!.proofLevel,
                  }
                : null,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  }
);

provenanceRoutes.get(
  '/anchors',
  async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!agentosChatAdapterEnabled()) {
        return res
          .status(503)
          .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
      }

      const runtime = await agentosService.getProvenanceRuntime();
      if (!runtime?.result) {
        return res.status(400).json({
          message: 'Provenance not active for this deployment.',
          error: 'PROVENANCE_DISABLED',
        });
      }

      const anchors = await runtime.result.anchorManager.getAllAnchors();
      return res.status(200).json({ anchors });
    } catch (error) {
      next(error);
    }
  }
);

provenanceRoutes.post(
  '/anchors',
  async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!agentosChatAdapterEnabled()) {
        return res
          .status(503)
          .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
      }

      const runtime = await agentosService.getProvenanceRuntime();
      if (!runtime?.result) {
        return res.status(400).json({
          message: 'Provenance not active for this deployment.',
          error: 'PROVENANCE_DISABLED',
        });
      }

      const ledger = runtime.result.ledger;
      const anchorManager = runtime.result.anchorManager;
      const currentSequence = ledger.getChainState().sequence;

      const fromBody = parsePositiveInt((req.body as any)?.fromSequence);
      const toBody = parsePositiveInt((req.body as any)?.toSequence);

      let fromSequence: number;
      let toSequence: number;

      if (fromBody != null || toBody != null) {
        if (fromBody == null || toBody == null) {
          return res.status(400).json({
            message: 'Both fromSequence and toSequence must be provided.',
            error: 'INVALID_RANGE',
          });
        }
        if (toBody < fromBody) {
          return res
            .status(400)
            .json({ message: 'toSequence must be >= fromSequence.', error: 'INVALID_RANGE' });
        }
        if (fromBody > currentSequence) {
          return res.status(200).json({ created: false, message: 'No events in requested range.' });
        }
        fromSequence = fromBody;
        toSequence = Math.min(toBody, currentSequence);
      } else {
        const lastAnchor = await anchorManager.getLastAnchor();
        fromSequence = lastAnchor ? lastAnchor.sequenceTo + 1 : 1;
        toSequence = currentSequence;
      }

      if (toSequence < fromSequence) {
        return res
          .status(200)
          .json({ created: false, message: 'No new events since last anchor.' });
      }

      const anchor = await anchorManager.createAnchor(fromSequence, toSequence);
      return res.status(201).json({ created: true, anchor });
    } catch (error) {
      next(error);
    }
  }
);

provenanceRoutes.get(
  '/anchors/:anchorId/verify',
  async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!agentosChatAdapterEnabled()) {
        return res
          .status(503)
          .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
      }

      const runtime = await agentosService.getProvenanceRuntime();
      if (!runtime?.result) {
        return res.status(400).json({
          message: 'Provenance not active for this deployment.',
          error: 'PROVENANCE_DISABLED',
        });
      }

      const { anchorId } = req.params;
      const report = await runtime.result.anchorManager.verifyAnchor(anchorId);
      return res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }
);

provenanceRoutes.get(
  '/verify',
  async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!agentosChatAdapterEnabled()) {
        return res
          .status(503)
          .json({ message: 'AgentOS integration disabled', error: 'AGENTOS_DISABLED' });
      }

      const runtime = await agentosService.getProvenanceRuntime();
      if (!runtime?.result) {
        return res.status(400).json({
          message: 'Provenance not active for this deployment.',
          error: 'PROVENANCE_DISABLED',
        });
      }

      const limit = parsePositiveInt(req.query.limit);
      const ledger = runtime.result.ledger;
      const { sequence } = ledger.getChainState();

      const events =
        limit != null
          ? await ledger.getEventsByRange(Math.max(1, sequence - limit + 1), sequence)
          : await ledger.getAllEvents();

      const verification = await ChainVerifier.verify(
        events,
        runtime.result.keyManager.getPublicKeyBase64()
      );

      return res.status(200).json({ verification });
    } catch (error) {
      next(error);
    }
  }
);

export default provenanceRoutes;
