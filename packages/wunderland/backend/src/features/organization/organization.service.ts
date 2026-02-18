// File: backend/src/features/organization/organization.service.ts
/**
 * @file organization.service.ts
 * @description Business logic for organization creation, membership management, and invites.
 */

import {
  addMember,
  countActiveAdmins,
  countActiveSeatUnits,
  countPendingInvites,
  createInvite,
  createOrganization,
  findInviteById,
  findInviteByToken,
  findMemberById,
  findMemberByUser,
  findOrganizationById,
  findPendingInviteByEmail,
  getOrganizationSettings,
  listOrganizationInvites,
  listOrganizationMembers,
  listOrganizationsForUser,
  OrganizationInviteRecord,
  OrganizationInviteStatus,
  OrganizationMemberRecord,
  OrganizationMemberStatus,
  OrganizationRecord,
  OrganizationRole,
  OrganizationWithMembershipRecord,
  removeMember,
  updateInvite,
  updateMember,
  updateOrganization,
  updateOrganizationSettings,
} from './organization.repository.js';
import {
  mergeOrganizationSettings,
  resolveOrganizationMemorySettings,
  type OrganizationSettings,
  type ResolvedOrganizationMemorySettings,
} from './organization.settings.js';

export class OrganizationServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface OrganizationMemberSummary {
  id: string;
  userId: string;
  email: string | null;
  role: OrganizationRole;
  status: OrganizationMemberStatus;
  seatUnits: number;
  dailyUsageCapUsd: number | null;
  createdAt: number;
  updatedAt: number;
  isSelf: boolean;
}

export interface OrganizationInviteSummary {
  id: string;
  email: string;
  role: OrganizationRole;
  status: OrganizationInviteStatus;
  createdAt: number;
  expiresAt: number | null;
  inviterUserId: string | null;
  acceptedAt: number | null;
  revokedAt: number | null;
  token?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string | null;
  planId: string;
  ownerUserId: string;
  seatLimit: number;
  createdAt: number;
  updatedAt: number;
  stats: {
    activeSeats: number;
    pendingInvites: number;
    availableSeats: number;
  };
  membership: OrganizationMemberSummary | null;
  permissions: {
    canInvite: boolean;
    canManageSeats: boolean;
    canModifyMembers: boolean;
    canLeave: boolean;
  };
  members: OrganizationMemberSummary[];
  invites: OrganizationInviteSummary[];
}

export interface OrganizationSettingsSummary {
  organizationId: string;
  settings: OrganizationSettings;
  resolvedMemory: ResolvedOrganizationMemorySettings;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const getOrganizationOrThrow = async (organizationId: string): Promise<OrganizationRecord> => {
  const organization = await findOrganizationById(organizationId);
  if (!organization) {
    throw new OrganizationServiceError('ORGANIZATION_NOT_FOUND', 'Organization not found.', 404);
  }
  return organization;
};

const ensureMembership = async (
  organizationId: string,
  userId: string
): Promise<OrganizationMemberRecord> => {
  const member = await findMemberByUser(organizationId, userId);
  if (!member || member.status !== 'active') {
    throw new OrganizationServiceError(
      'NOT_MEMBER',
      'You are not a member of this organization.',
      403
    );
  }
  return member;
};

const ensureAdminAccess = async (
  organizationId: string,
  userId: string
): Promise<OrganizationMemberRecord> => {
  const membership = await ensureMembership(organizationId, userId);
  if (membership.role !== 'admin') {
    throw new OrganizationServiceError(
      'NOT_AUTHORIZED',
      'Admin privileges are required for this action.',
      403
    );
  }
  return membership;
};

const ensureSeatCapacity = async (
  organization: OrganizationRecord,
  seatsNeeded: number,
  options: { pendingAdjustment?: number } = {}
): Promise<{ activeSeats: number; pendingInvites: number }> => {
  const [activeSeats, pendingInvitesRaw] = await Promise.all([
    countActiveSeatUnits(organization.id),
    countPendingInvites(organization.id),
  ]);
  const adjustedPending = pendingInvitesRaw + (options.pendingAdjustment ?? 0);
  const projected = activeSeats + adjustedPending + seatsNeeded;
  if (projected > organization.seatLimit) {
    throw new OrganizationServiceError(
      'SEAT_LIMIT_EXCEEDED',
      `Seat cap of ${organization.seatLimit} would be exceeded (projected ${projected}).`,
      409
    );
  }
  return { activeSeats, pendingInvites: adjustedPending };
};

const toMemberSummary = (
  member: OrganizationMemberRecord,
  viewerId: string
): OrganizationMemberSummary => ({
  id: member.id,
  userId: member.userId,
  email: member.userEmail ?? null,
  role: member.role,
  status: member.status,
  seatUnits: member.seatUnits,
  dailyUsageCapUsd: member.dailyUsageCapUsd ?? null,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt,
  isSelf: member.userId === viewerId,
});

const buildOrganizationSummary = async (
  organization: OrganizationRecord,
  viewerUserId: string,
  membershipOverride?: OrganizationMemberRecord | null
): Promise<OrganizationSummary> => {
  const viewerMembership =
    membershipOverride ?? (await findMemberByUser(organization.id, viewerUserId)) ?? null;
  const viewerIsAdmin = viewerMembership?.role === 'admin';

  const [members, invites, activeSeats, pendingInvites] = await Promise.all([
    listOrganizationMembers(organization.id),
    viewerIsAdmin ? listOrganizationInvites(organization.id) : Promise.resolve([]),
    countActiveSeatUnits(organization.id),
    countPendingInvites(organization.id),
  ]);

  const availableSeats = Math.max(organization.seatLimit - (activeSeats + pendingInvites), 0);

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    planId: organization.planId,
    ownerUserId: organization.ownerUserId,
    seatLimit: organization.seatLimit,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    stats: {
      activeSeats,
      pendingInvites,
      availableSeats,
    },
    membership: viewerMembership ? toMemberSummary(viewerMembership, viewerUserId) : null,
    permissions: {
      canInvite: viewerIsAdmin,
      canManageSeats: viewerIsAdmin,
      canModifyMembers: viewerIsAdmin,
      canLeave: Boolean(viewerMembership),
    },
    members: members.map((member) => toMemberSummary(member, viewerUserId)),
    invites: invites.map<OrganizationInviteSummary>((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      inviterUserId: invite.inviterUserId,
      acceptedAt: invite.acceptedAt,
      revokedAt: invite.revokedAt,
      token: invite.token,
    })),
  };
};

/**
 * Lists organizations for the given user with membership-aware summaries.
 */
export const getOrganizationsForUser = async (userId: string): Promise<OrganizationSummary[]> => {
  const organizations = await listOrganizationsForUser(userId);
  return Promise.all(
    organizations.map(async (record: OrganizationWithMembershipRecord) => {
      const { membership, ...organization } = record;
      return buildOrganizationSummary(
        {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          ownerUserId: organization.ownerUserId,
          planId: organization.planId,
          seatLimit: organization.seatLimit,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
        },
        userId,
        membership
      );
    })
  );
};

/**
 * Creates a new organization for the given user and returns the hydrated summary.
 */
export const createOrganizationForUser = async (
  ownerUserId: string,
  input: { name: string; seatLimit?: number; planId?: string; slug?: string | null }
): Promise<OrganizationSummary> => {
  const normalizedName = input.name?.trim();
  if (!normalizedName) {
    throw new OrganizationServiceError('INVALID_NAME', 'Organization name is required.', 400);
  }

  const seatLimit =
    input.seatLimit === undefined || input.seatLimit === null ? undefined : Number(input.seatLimit);
  if (seatLimit !== undefined && (!Number.isFinite(seatLimit) || seatLimit < 1)) {
    throw new OrganizationServiceError('INVALID_SEAT_LIMIT', 'Seat limit must be at least 1.', 400);
  }

  const organization = await createOrganization({
    name: normalizedName,
    ownerUserId,
    seatLimit,
    planId: input.planId ?? 'organization',
    slug: input.slug ?? null,
  });

  const ownerMember = await addMember({
    organizationId: organization.id,
    userId: ownerUserId,
    role: 'admin',
    status: 'active',
  });

  return buildOrganizationSummary(organization, ownerUserId, ownerMember);
};

/**
 * Returns organization-level settings (memory, access controls, etc.) for members.
 */
export const getOrganizationSettingsForUser = async (
  organizationId: string,
  actingUserId: string
): Promise<OrganizationSettingsSummary> => {
  await getOrganizationOrThrow(organizationId);
  await ensureMembership(organizationId, actingUserId);

  const settings = (await getOrganizationSettings(organizationId)) ?? {};
  return {
    organizationId,
    settings,
    resolvedMemory: resolveOrganizationMemorySettings(settings),
  };
};

/**
 * Updates organization-level settings. Admin-only.
 */
export const patchOrganizationSettingsForUser = async (
  organizationId: string,
  actingUserId: string,
  patch: unknown
): Promise<OrganizationSettingsSummary> => {
  await getOrganizationOrThrow(organizationId);
  await ensureAdminAccess(organizationId, actingUserId);

  const current = (await getOrganizationSettings(organizationId)) ?? {};
  const merged = mergeOrganizationSettings(current, patch);

  // Normalise / validate memory settings (drops unknown categories, etc.).
  const resolvedMemory = resolveOrganizationMemorySettings(merged);
  merged.memory ??= {};
  merged.memory.longTermMemory ??= {};
  if (resolvedMemory.allowedCategories === null) {
    delete merged.memory.longTermMemory.allowedCategories;
  } else {
    merged.memory.longTermMemory.allowedCategories = resolvedMemory.allowedCategories;
  }

  await updateOrganizationSettings(organizationId, merged);

  return {
    organizationId,
    settings: merged,
    resolvedMemory,
  };
};

/**
 * Updates organization attributes (name, seat limit) when performed by an admin.
 */
export const updateOrganizationDetails = async (
  organizationId: string,
  actingUserId: string,
  updates: { name?: string; seatLimit?: number }
): Promise<OrganizationSummary> => {
  const organization = await getOrganizationOrThrow(organizationId);
  const adminMembership = await ensureAdminAccess(organizationId, actingUserId);

  const seatLimit =
    updates.seatLimit === undefined || updates.seatLimit === null
      ? undefined
      : Number(updates.seatLimit);

  if (seatLimit !== undefined) {
    if (!Number.isFinite(seatLimit) || seatLimit < 1) {
      throw new OrganizationServiceError(
        'INVALID_SEAT_LIMIT',
        'Seat limit must be at least 1.',
        400
      );
    }
    const activeSeats = await countActiveSeatUnits(organizationId);
    if (seatLimit < activeSeats) {
      throw new OrganizationServiceError(
        'SEAT_LIMIT_TOO_LOW',
        `Seat limit cannot be lower than the ${activeSeats} active seats.`,
        409
      );
    }
  }

  const updated = await updateOrganization(organizationId, {
    name: updates.name,
    seatLimit,
  });

  if (!updated) {
    throw new OrganizationServiceError('ORGANIZATION_NOT_FOUND', 'Organization not found.', 404);
  }

  return buildOrganizationSummary(updated, actingUserId, adminMembership);
};

/**
 * Creates an invite for a new member and returns the updated organization summary.
 */
export const inviteUserToOrganization = async (
  organizationId: string,
  inviterUserId: string,
  input: { email: string; role?: OrganizationRole; expiresAt?: number | null }
): Promise<{ organization: OrganizationSummary; invite: OrganizationInviteRecord }> => {
  const organization = await getOrganizationOrThrow(organizationId);
  const adminMembership = await ensureAdminAccess(organizationId, inviterUserId);
  const normalizedEmail = normalizeEmail(input.email ?? '');

  if (!normalizedEmail) {
    throw new OrganizationServiceError('INVALID_EMAIL', 'Invite email address is required.', 400);
  }

  const existingPending = await findPendingInviteByEmail(organizationId, normalizedEmail);
  if (existingPending) {
    throw new OrganizationServiceError(
      'INVITE_ALREADY_EXISTS',
      'An invite for this email address is already pending.',
      409
    );
  }

  const members = await listOrganizationMembers(organizationId);
  const existingMember = members.find(
    (member) => member.userEmail?.toLowerCase() === normalizedEmail
  );
  if (existingMember) {
    throw new OrganizationServiceError(
      'ALREADY_MEMBER',
      'This user is already part of the organization.',
      409
    );
  }

  await ensureSeatCapacity(organization, 1);

  const invite = await createInvite({
    organizationId: organization.id,
    email: normalizedEmail,
    role: input.role ?? 'builder',
    inviterUserId,
    expiresAt: input.expiresAt ?? null,
  });

  const summary = await buildOrganizationSummary(organization, inviterUserId, adminMembership);

  return { organization: summary, invite };
};

/**
 * Revokes a pending invite and returns the refreshed organization summary.
 */
export const revokeOrganizationInvite = async (
  organizationId: string,
  inviteId: string,
  actingUserId: string
): Promise<OrganizationSummary> => {
  const organization = await getOrganizationOrThrow(organizationId);
  const adminMembership = await ensureAdminAccess(organizationId, actingUserId);
  const invite = await findInviteById(inviteId);
  if (!invite || invite.organizationId !== organizationId) {
    throw new OrganizationServiceError('INVITE_NOT_FOUND', 'Invite not found.', 404);
  }

  if (invite.status !== 'pending') {
    throw new OrganizationServiceError(
      'INVITE_NOT_PENDING',
      'Only pending invites can be revoked.',
      409
    );
  }

  await updateInvite(inviteId, { status: 'revoked', revokedAt: Date.now() });

  const refreshedOrg = await getOrganizationOrThrow(organizationId);
  return buildOrganizationSummary(refreshedOrg, actingUserId, adminMembership);
};

/**
 * Updates member role/seat allocation/usage cap and returns the updated organization summary.
 */
export const updateOrganizationMember = async (
  organizationId: string,
  memberId: string,
  actingUserId: string,
  updates: { role?: OrganizationRole; dailyUsageCapUsd?: number | null; seatUnits?: number }
): Promise<OrganizationSummary> => {
  const organization = await getOrganizationOrThrow(organizationId);
  const actingMembership = await ensureMembership(organizationId, actingUserId);
  const targetMember = await findMemberById(memberId);

  if (!targetMember || targetMember.organizationId !== organizationId) {
    throw new OrganizationServiceError('MEMBER_NOT_FOUND', 'Member not found.', 404);
  }

  const isSelf = targetMember.userId === actingUserId;
  const actingIsAdmin = actingMembership.role === 'admin';

  if (!actingIsAdmin && !isSelf) {
    throw new OrganizationServiceError(
      'NOT_AUTHORIZED',
      'You are not permitted to modify this member.',
      403
    );
  }

  if (updates.role && !actingIsAdmin) {
    throw new OrganizationServiceError(
      'NOT_AUTHORIZED',
      'Only admins can change member roles.',
      403
    );
  }

  if (updates.role && targetMember.role === 'admin' && updates.role !== 'admin') {
    const adminCount = await countActiveAdmins(organizationId);
    if (adminCount <= 1) {
      throw new OrganizationServiceError(
        'LAST_ADMIN',
        'At least one active admin must remain.',
        409
      );
    }
  }

  const seatUnits =
    updates.seatUnits === undefined || updates.seatUnits === null
      ? undefined
      : Number(updates.seatUnits);

  if (seatUnits !== undefined) {
    if (!Number.isFinite(seatUnits) || seatUnits < 1) {
      throw new OrganizationServiceError(
        'INVALID_SEAT_UNITS',
        'Seat allocation must be at least 1.',
        400
      );
    }
    if (targetMember.status === 'active') {
      const activeSeats = await countActiveSeatUnits(organizationId);
      const projected = activeSeats - targetMember.seatUnits + seatUnits;
      if (projected > organization.seatLimit) {
        throw new OrganizationServiceError(
          'SEAT_LIMIT_EXCEEDED',
          `Increasing seats would exceed the organization cap of ${organization.seatLimit}.`,
          409
        );
      }
    }
  }

  const dailyCapInput =
    updates.dailyUsageCapUsd === undefined
      ? undefined
      : updates.dailyUsageCapUsd === null
        ? null
        : Number(updates.dailyUsageCapUsd);

  if (dailyCapInput !== undefined && dailyCapInput !== null && !Number.isFinite(dailyCapInput)) {
    throw new OrganizationServiceError(
      'INVALID_USAGE_CAP',
      'dailyUsageCapUsd must be a numeric value or null.',
      400
    );
  }

  const sanitizedDailyCap =
    dailyCapInput === undefined
      ? undefined
      : dailyCapInput === null
        ? null
        : Math.max(0, dailyCapInput);

  const updatedMember =
    (await updateMember(memberId, {
      role: updates.role,
      dailyUsageCapUsd: sanitizedDailyCap,
      seatUnits,
    })) ?? targetMember;

  const refreshedOrg = await getOrganizationOrThrow(organizationId);
  return buildOrganizationSummary(
    refreshedOrg,
    actingUserId,
    actingIsAdmin ? actingMembership : (updatedMember ?? actingMembership)
  );
};

/**
 * Removes a member (or self) from the organization and returns the resulting summary.
 */
export const removeOrganizationMember = async (
  organizationId: string,
  memberId: string,
  actingUserId: string
): Promise<{ organization: OrganizationSummary | null }> => {
  const organization = await getOrganizationOrThrow(organizationId);
  const actingMembership = await findMemberByUser(organizationId, actingUserId);
  const targetMember = await findMemberById(memberId);

  if (!targetMember || targetMember.organizationId !== organizationId) {
    throw new OrganizationServiceError('MEMBER_NOT_FOUND', 'Member not found.', 404);
  }

  const removingSelf = targetMember.userId === actingUserId;
  const actingIsAdmin = actingMembership?.role === 'admin';

  if (!removingSelf && !actingIsAdmin) {
    throw new OrganizationServiceError(
      'NOT_AUTHORIZED',
      'Only admins can remove other members.',
      403
    );
  }

  if (targetMember.role === 'admin') {
    const adminCount = await countActiveAdmins(organizationId);
    if (adminCount <= 1) {
      throw new OrganizationServiceError(
        'LAST_ADMIN',
        'Organization must retain at least one active admin.',
        409
      );
    }
  }

  await removeMember(memberId);

  if (removingSelf) {
    return { organization: null };
  }

  const refreshedOrg = await getOrganizationOrThrow(organizationId);
  return {
    organization: await buildOrganizationSummary(
      refreshedOrg,
      actingUserId,
      actingMembership ?? null
    ),
  };
};

/**
 * Accepts an invite and returns the updated organization summary along with the invite payload.
 */
export const acceptOrganizationInvite = async (
  token: string,
  userId: string
): Promise<{ organization: OrganizationSummary; invite: OrganizationInviteRecord }> => {
  const invite = await findInviteByToken(token);
  if (!invite) {
    throw new OrganizationServiceError('INVITE_NOT_FOUND', 'Invite not found.', 404);
  }

  if (invite.status !== 'pending') {
    throw new OrganizationServiceError('INVITE_NOT_PENDING', 'Invite is no longer pending.', 409);
  }

  if (invite.expiresAt && invite.expiresAt < Date.now()) {
    await updateInvite(invite.id, { status: 'expired' });
    throw new OrganizationServiceError('INVITE_EXPIRED', 'Invite has expired.', 410);
  }

  const organization = await getOrganizationOrThrow(invite.organizationId);
  const existingMember = await findMemberByUser(organization.id, userId);
  const seatsNeeded = existingMember && existingMember.status === 'active' ? 0 : 1;
  await ensureSeatCapacity(organization, seatsNeeded, { pendingAdjustment: -1 });

  let member = existingMember;
  if (!member) {
    member = await addMember({
      organizationId: organization.id,
      userId,
      role: invite.role,
      status: 'active',
    });
  } else {
    member =
      (await updateMember(member.id, {
        status: 'active',
        role: invite.role,
      })) ?? member;
  }

  const updatedInvite =
    (await updateInvite(invite.id, {
      status: 'accepted',
      acceptedAt: Date.now(),
    })) ?? invite;

  const refreshedOrg = await getOrganizationOrThrow(organization.id);
  return {
    organization: await buildOrganizationSummary(refreshedOrg, userId, member),
    invite: updatedInvite,
  };
};
