// File: backend/src/features/organization/organization.routes.ts
/**
 * @file organization.routes.ts
 * @description Express handlers for organization management endpoints.
 */

import type { Request, Response } from 'express';
import {
  acceptOrganizationInvite,
  createOrganizationForUser,
  getOrganizationsForUser,
  getOrganizationSettingsForUser,
  inviteUserToOrganization,
  OrganizationServiceError,
  patchOrganizationSettingsForUser,
  removeOrganizationMember,
  revokeOrganizationInvite,
  updateOrganizationDetails,
  updateOrganizationMember,
} from './organization.service.js';

const getSessionUserId = (req: Request): string | null => {
  const user = (req as any).user;
  return user?.id ?? null;
};

const handleServiceError = (res: Response, error: unknown): void => {
  if (error instanceof OrganizationServiceError) {
    res.status(error.status).json({ message: error.message, code: error.code });
  } else {
    console.error('[Organizations] Unexpected error:', error);
    res.status(500).json({ message: 'Unexpected error occurred.', code: 'INTERNAL_ERROR' });
  }
};

export const getOrganizations = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const organizations = await getOrganizationsForUser(userId);
    res.status(200).json({ organizations });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const postOrganization = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const summary = await createOrganizationForUser(userId, {
      name: (req.body?.name as string | undefined) ?? '',
      seatLimit: req.body?.seatLimit,
      planId: req.body?.planId,
      slug: req.body?.slug,
    });
    res.status(201).json({ organization: summary });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const patchOrganization = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const summary = await updateOrganizationDetails(req.params.organizationId, userId, {
      name: req.body?.name,
      seatLimit: req.body?.seatLimit,
    });
    res.status(200).json({ organization: summary });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const postInvite = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const result = await inviteUserToOrganization(req.params.organizationId, userId, {
      email: req.body?.email,
      role: req.body?.role,
      expiresAt: req.body?.expiresAt,
    });
    res.status(201).json(result);
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const deleteInvite = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const summary = await revokeOrganizationInvite(
      req.params.organizationId,
      req.params.inviteId,
      userId
    );
    res.status(200).json({ organization: summary });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const patchMember = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const summary = await updateOrganizationMember(
      req.params.organizationId,
      req.params.memberId,
      userId,
      {
        role: req.body?.role,
        dailyUsageCapUsd: req.body?.dailyUsageCapUsd,
        seatUnits: req.body?.seatUnits,
      }
    );
    res.status(200).json({ organization: summary });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const deleteMember = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const result = await removeOrganizationMember(
      req.params.organizationId,
      req.params.memberId,
      userId
    );
    res.status(200).json(result);
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const postAcceptInvite = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const result = await acceptOrganizationInvite(req.params.token, userId);
    res.status(200).json(result);
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const getOrganizationSettings = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const result = await getOrganizationSettingsForUser(req.params.organizationId, userId);
    res.status(200).json(result);
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const patchOrganizationSettings = async (req: Request, res: Response): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required.', code: 'NOT_AUTHENTICATED' });
    return;
  }
  try {
    const result = await patchOrganizationSettingsForUser(
      req.params.organizationId,
      userId,
      req.body
    );
    res.status(200).json(result);
  } catch (error) {
    handleServiceError(res, error);
  }
};
