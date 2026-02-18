/**
 * @file marketplace.routes.ts
 * @description Public and authenticated routes for marketplace listings with org-aware RBAC.
 *
 * RBAC rules:
 * - Listing creation under an organization requires active membership.
 * - Publishing (status = 'published') or visibility = 'public' requires org 'admin'.
 * - User-owned listings can be managed by the owner user.
 *
 * Query params for GET /marketplace/agents:
 * - visibility: 'public' | 'invite' | 'unlisted' | 'org' (single or comma-separated)
 * - status: 'pending' | 'draft' | 'published' | 'retired' (single or comma-separated)
 * - ownerId: filter by owner user id
 * - organizationId: filter by owning organization id
 * - includeDrafts: boolean (default: false)
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { marketplaceService } from './marketplace.service.js';
import type { MarketplaceVisibility, MarketplaceStatus } from './marketplace.service.js';
import { findMemberByUser, type OrganizationRole } from '../organization/organization.repository.js';

const VISIBILITY_VALUES: readonly MarketplaceVisibility[] = ['public', 'invite', 'unlisted', 'org'];
const STATUS_VALUES: readonly MarketplaceStatus[] = ['pending', 'draft', 'published', 'retired'];

function parseListParam<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | T[] | undefined {
  if (!value) {
    return undefined;
  }

  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is T => (allowed as readonly string[]).includes(entry));

  if (entries.length === 0) {
    return undefined;
  }

  return entries.length === 1 ? entries[0] : entries;
}

export const marketplaceRouter: Router = Router();

marketplaceRouter.get('/agents', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const visibilityParam = req.query.visibility as string | undefined;
    const visibility = parseListParam<MarketplaceVisibility>(visibilityParam, VISIBILITY_VALUES);
    const statusParam = req.query.status as string | undefined;
    const status = parseListParam<MarketplaceStatus>(statusParam, STATUS_VALUES);
    const includeDrafts = String(req.query.includeDrafts ?? 'false').toLowerCase() === 'true';
    const ownerUserId = typeof req.query.ownerId === 'string' ? req.query.ownerId : undefined;
    const organizationId =
      typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;

    const agents = await marketplaceService.listAgents({
      visibility,
      status,
      includeDrafts,
      ownerUserId,
      organizationId,
    });
    res.json({ agents });
  } catch (error: unknown) {
    next(error);
  }
});

marketplaceRouter.get('/agents/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agent = await marketplaceService.getAgentById(req.params.id);
    if (!agent) {
      res.status(404).json({ message: 'Marketplace agent not found.' });
      return;
    }

    res.json({ agent });
  } catch (error: unknown) {
    next(error);
  }
});

marketplaceRouter.post('/agents', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId: string | undefined = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    const input = req.body ?? {};
    // RBAC: if creating under an organization, require membership; publishing requires admin
    const orgId: string | null = typeof input.organizationId === 'string' ? input.organizationId : null;
    if (orgId) {
      const membership = await findMemberByUser(orgId, userId);
      if (!membership || membership.status !== 'active') {
        res.status(403).json({ message: 'Not a member of the specified organization.' });
        return;
      }
      const isAdmin = membership.role === 'admin';
      const requestedStatus: MarketplaceStatus | undefined = input.status;
      const requestedVisibility: MarketplaceVisibility | undefined = input.visibility;
      if ((requestedStatus === 'published') || (requestedVisibility === 'public')) {
        if (!isAdmin) {
          res.status(403).json({ message: 'Admin role required to publish or set public visibility.' });
          return;
        }
      }
    }
    const agent = await marketplaceService.createAgent({
      id: input.id,
      personaId: input.personaId,
      label: input.label,
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      category: input.category ?? 'custom',
      accessLevel: input.accessLevel ?? 'public',
      pricingModel: input.pricingModel ?? 'free',
      priceCents: input.priceCents ?? null,
      currency: input.currency ?? 'USD',
      featured: Boolean(input.featured),
      visibility: input.visibility,
      status: input.status ?? 'pending',
      ownerUserId: input.ownerUserId ?? userId,
      organizationId: input.organizationId ?? null,
      inviteToken: input.inviteToken ?? null,
      artifactPath: input.artifactPath ?? null,
      stats: input.stats ?? null,
      metadata: input.metadata ?? null,
    });
    res.status(201).json({ agent });
  } catch (error: unknown) {
    next(error);
  }
});

marketplaceRouter.patch('/agents/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId: string | undefined = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    const existing = await marketplaceService.getAgentById(req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Marketplace agent not found.' });
      return;
    }
    if (existing.organizationId) {
      const membership = await findMemberByUser(existing.organizationId, userId);
      if (!membership || membership.status !== 'active') {
        res.status(403).json({ message: 'Not a member of the owning organization.' });
        return;
      }
      const isAdmin = membership.role === 'admin';
      const requestedStatus: MarketplaceStatus | undefined = req.body?.status;
      const requestedVisibility: MarketplaceVisibility | undefined = req.body?.visibility;
      if ((requestedStatus === 'published') || (requestedVisibility === 'public')) {
        if (!isAdmin) {
          res.status(403).json({ message: 'Admin role required to publish or set public visibility.' });
          return;
        }
      }
    } else {
      if (existing.ownerUserId && existing.ownerUserId !== userId) {
        res.status(403).json({ message: 'Only the owner can modify this listing.' });
        return;
      }
    }
    const agent = await marketplaceService.updateAgent(req.params.id, {
      label: req.body?.label,
      tagline: req.body?.tagline,
      description: req.body?.description,
      category: req.body?.category,
      accessLevel: req.body?.accessLevel,
      pricingModel: req.body?.pricingModel,
      priceCents: req.body?.priceCents,
      currency: req.body?.currency,
      featured: req.body?.featured,
      visibility: req.body?.visibility,
      status: req.body?.status,
      ownerUserId: req.body?.ownerUserId ?? userId,
      organizationId: req.body?.organizationId,
      inviteToken: req.body?.inviteToken,
      artifactPath: req.body?.artifactPath,
      stats: req.body?.stats,
      metadata: req.body?.metadata,
      reviewNotes: req.body?.reviewNotes,
    });
    if (!agent) {
      res.status(404).json({ message: 'Marketplace agent not found.' });
      return;
    }
    res.json({ agent });
  } catch (error: unknown) {
    next(error);
  }
});
