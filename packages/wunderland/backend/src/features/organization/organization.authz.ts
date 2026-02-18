/**
 * @file organization.authz.ts
 * @description Small authorization helpers for organization-scoped operations.
 *
 * This is intentionally lightweight (no NestJS dependencies) so it can be used
 * from both Nest controllers and Express routers/middleware.
 */

import {
  findMemberByUser,
  type OrganizationMemberRecord,
  type OrganizationRole,
} from './organization.repository.js';

export class OrganizationAuthzError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 403) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const requireActiveOrganizationMember = async (
  organizationId: string,
  userId: string
): Promise<OrganizationMemberRecord> => {
  const member = await findMemberByUser(organizationId, userId);
  if (!member || member.status !== 'active') {
    throw new OrganizationAuthzError(
      'NOT_MEMBER',
      'You are not a member of this organization.',
      403
    );
  }
  return member;
};

export const requireOrganizationRole = async (
  organizationId: string,
  userId: string,
  role: OrganizationRole
): Promise<OrganizationMemberRecord> => {
  const member = await requireActiveOrganizationMember(organizationId, userId);
  if (member.role !== role) {
    throw new OrganizationAuthzError(
      'NOT_AUTHORIZED',
      `${role} privileges are required for this action.`,
      403
    );
  }
  return member;
};
