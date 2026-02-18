// File: backend/src/features/organization/organization.repository.ts
/**
 * @file organization.repository.ts
 * @description Async persistence helpers for organization, member, and invite data.
 */

import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';
import type { OrganizationSettings } from './organization.settings.js';

export type OrganizationRole = 'admin' | 'builder' | 'viewer';
export type OrganizationMemberStatus = 'active' | 'invited' | 'suspended';
export type OrganizationInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

interface OrganizationRow {
  id: string;
  name: string;
  slug: string | null;
  owner_user_id: string;
  seat_limit: number;
  plan_id: string;
  settings_json?: string | null;
  created_at: number;
  updated_at: number;
}

interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  seat_units: number | null;
  daily_usage_cap_usd: number | null;
  created_at: number;
  updated_at: number;
  user_email?: string | null;
}

interface OrganizationInviteRow {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at: number | null;
  inviter_user_id: string | null;
  created_at: number;
  accepted_at: number | null;
  revoked_at: number | null;
}

type OrganizationWithMemberRow = OrganizationRow &
  OrganizationMemberRow & {
    member_id: string;
    member_role: string;
    member_status: string;
    member_seat_units: number | null;
    member_daily_usage_cap_usd: number | null;
    member_created_at: number;
    member_updated_at: number;
  };

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string | null;
  ownerUserId: string;
  seatLimit: number;
  planId: string;
  createdAt: number;
  updatedAt: number;
}

interface OrganizationSettingsRow {
  settings_json: string | null;
}

export interface OrganizationMemberRecord {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: OrganizationMemberStatus;
  seatUnits: number;
  dailyUsageCapUsd: number | null;
  createdAt: number;
  updatedAt: number;
  userEmail?: string | null;
}

export interface OrganizationInviteRecord {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  status: OrganizationInviteStatus;
  token: string;
  expiresAt: number | null;
  inviterUserId: string | null;
  createdAt: number;
  acceptedAt: number | null;
  revokedAt: number | null;
}

const mapOrganization = (row: OrganizationRow): OrganizationRecord => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  ownerUserId: row.owner_user_id,
  seatLimit: row.seat_limit,
  planId: row.plan_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMember = (row: OrganizationMemberRow): OrganizationMemberRecord => ({
  id: row.id,
  organizationId: row.organization_id,
  userId: row.user_id,
  role: (row.role as OrganizationRole) ?? 'builder',
  status: (row.status as OrganizationMemberStatus) ?? 'active',
  seatUnits: row.seat_units ?? 1,
  dailyUsageCapUsd: row.daily_usage_cap_usd ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  userEmail: row.user_email ?? null,
});

const mapInvite = (row: OrganizationInviteRow): OrganizationInviteRecord => ({
  id: row.id,
  organizationId: row.organization_id,
  email: row.email,
  role: (row.role as OrganizationRole) ?? 'builder',
  status: (row.status as OrganizationInviteStatus) ?? 'pending',
  token: row.token,
  expiresAt: row.expires_at ?? null,
  inviterUserId: row.inviter_user_id ?? null,
  createdAt: row.created_at,
  acceptedAt: row.accepted_at ?? null,
  revokedAt: row.revoked_at ?? null,
});

export interface OrganizationWithMembershipRecord extends OrganizationRecord {
  membership: OrganizationMemberRecord;
}

/**
 * Retrieves an organization by identifier.
 */
export const findOrganizationById = async (
  organizationId: string
): Promise<OrganizationRecord | null> => {
  const db = getAppDatabase();
  const row = await db.get<OrganizationRow>(
    `
      SELECT * FROM organizations
      WHERE id = ?
      LIMIT 1
    `,
    [organizationId]
  );
  return row ? mapOrganization(row) : null;
};

/**
 * Persists a new organization record.
 */
export const createOrganization = async (data: {
  name: string;
  ownerUserId: string;
  planId?: string;
  seatLimit?: number;
  slug?: string | null;
}): Promise<OrganizationRecord> => {
  const db = getAppDatabase();
  const id = generateId();
  const now = Date.now();
  await db.run(
    `
    INSERT INTO organizations (id, name, slug, owner_user_id, seat_limit, plan_id, created_at, updated_at)
    VALUES (@id, @name, @slug, @owner_user_id, @seat_limit, @plan_id, @created_at, @updated_at)
  `,
    {
      id,
      name: data.name,
      slug: data.slug ?? null,
      owner_user_id: data.ownerUserId,
      seat_limit: data.seatLimit ?? 5,
      plan_id: data.planId ?? 'organization',
      created_at: now,
      updated_at: now,
    }
  );

  return (await findOrganizationById(id)) as OrganizationRecord;
};

/**
 * Updates basic organization properties.
 */
export const updateOrganization = async (
  organizationId: string,
  updates: { name?: string; slug?: string | null; seatLimit?: number; planId?: string | null }
): Promise<OrganizationRecord | null> => {
  const db = getAppDatabase();
  const now = Date.now();
  await db.run(
    `
    UPDATE organizations
       SET name = COALESCE(@name, name),
           slug = COALESCE(@slug, slug),
           seat_limit = COALESCE(@seat_limit, seat_limit),
           plan_id = COALESCE(@plan_id, plan_id),
           updated_at = @updated_at
     WHERE id = @id
  `,
    {
      id: organizationId,
      name: updates.name ?? null,
      slug: updates.slug ?? null,
      seat_limit: updates.seatLimit ?? null,
      plan_id: updates.planId ?? null,
      updated_at: now,
    }
  );

  return await findOrganizationById(organizationId);
};

function parseSettings(value: string | null): OrganizationSettings | null {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as OrganizationSettings) : null;
  } catch {
    return null;
  }
}

/**
 * Returns the stored organization settings payload (or null if unset).
 */
export const getOrganizationSettings = async (
  organizationId: string
): Promise<OrganizationSettings | null> => {
  const db = getAppDatabase();
  const row = await db.get<OrganizationSettingsRow>(
    `
      SELECT settings_json
      FROM organizations
      WHERE id = ?
      LIMIT 1
    `,
    [organizationId]
  );
  return row ? parseSettings(row.settings_json) : null;
};

/**
 * Upserts organization settings JSON on the organizations row.
 */
export const updateOrganizationSettings = async (
  organizationId: string,
  settings: OrganizationSettings
): Promise<void> => {
  const db = getAppDatabase();
  const now = Date.now();
  await db.run(
    `
      UPDATE organizations
         SET settings_json = @settings_json,
             updated_at = @updated_at
       WHERE id = @id
    `,
    {
      id: organizationId,
      settings_json: JSON.stringify(settings ?? {}),
      updated_at: now,
    }
  );
};

/**
 * Lists organizations the user belongs to, including membership metadata.
 */
export const listOrganizationsForUser = async (
  userId: string
): Promise<OrganizationWithMembershipRecord[]> => {
  const db = getAppDatabase();
  const rows =
    (await db.all<OrganizationWithMemberRow>(
      `
      SELECT
        o.*,
        m.id as member_id,
        m.role as member_role,
        m.status as member_status,
        m.seat_units as member_seat_units,
        m.daily_usage_cap_usd as member_daily_usage_cap_usd,
        m.created_at as member_created_at,
        m.updated_at as member_updated_at
      FROM organizations o
      INNER JOIN organization_members m ON m.organization_id = o.id
      WHERE m.user_id = ?
      ORDER BY o.created_at DESC
    `,
      [userId]
    )) ?? [];

  return rows.map((row) => ({
    ...mapOrganization(row),
    membership: {
      id: row.member_id,
      organizationId: row.id,
      userId,
      role: (row.member_role as OrganizationRole) ?? 'builder',
      status: (row.member_status as OrganizationMemberStatus) ?? 'active',
      seatUnits: row.member_seat_units ?? 1,
      dailyUsageCapUsd: row.member_daily_usage_cap_usd ?? null,
      createdAt: row.member_created_at,
      updatedAt: row.member_updated_at,
    },
  }));
};

/**
 * Inserts a new organization member.
 */
export const addMember = async (data: {
  organizationId: string;
  userId: string;
  role?: OrganizationRole;
  status?: OrganizationMemberStatus;
  seatUnits?: number;
  dailyUsageCapUsd?: number | null;
}): Promise<OrganizationMemberRecord> => {
  const db = getAppDatabase();
  const id = generateId();
  const now = Date.now();
  await db.run(
    `
    INSERT INTO organization_members (
      id, organization_id, user_id, role, status, seat_units, daily_usage_cap_usd, created_at, updated_at
    )
    VALUES (@id, @organization_id, @user_id, @role, @status, @seat_units, @daily_usage_cap_usd, @created_at, @updated_at)
  `,
    {
      id,
      organization_id: data.organizationId,
      user_id: data.userId,
      role: data.role ?? 'builder',
      status: data.status ?? 'active',
      seat_units: data.seatUnits ?? 1,
      daily_usage_cap_usd: data.dailyUsageCapUsd ?? null,
      created_at: now,
      updated_at: now,
    }
  );

  return (await findMemberById(id)) as OrganizationMemberRecord;
};

/**
 * Retrieves a member by primary key.
 */
export const findMemberById = async (
  memberId: string
): Promise<OrganizationMemberRecord | null> => {
  const db = getAppDatabase();
  const row = await db.get<OrganizationMemberRow>(
    `
      SELECT m.*, u.email as user_email
      FROM organization_members m
      LEFT JOIN app_users u ON u.id = m.user_id
      WHERE m.id = ?
      LIMIT 1
    `,
    [memberId]
  );
  return row ? mapMember(row) : null;
};

/**
 * Finds a membership record by organization and user pair.
 */
export const findMemberByUser = async (
  organizationId: string,
  userId: string
): Promise<OrganizationMemberRecord | null> => {
  const db = getAppDatabase();
  const row = await db.get<OrganizationMemberRow>(
    `
      SELECT m.*, u.email as user_email
      FROM organization_members m
      LEFT JOIN app_users u ON u.id = m.user_id
      WHERE m.organization_id = ? AND m.user_id = ?
      LIMIT 1
    `,
    [organizationId, userId]
  );
  return row ? mapMember(row) : null;
};

/**
 * Lists all members for a given organization.
 */
export const listOrganizationMembers = async (
  organizationId: string
): Promise<OrganizationMemberRecord[]> => {
  const db = getAppDatabase();
  const rows =
    (await db.all<OrganizationMemberRow>(
      `
      SELECT m.*, u.email as user_email
      FROM organization_members m
      LEFT JOIN app_users u ON u.id = m.user_id
      WHERE m.organization_id = ?
      ORDER BY m.created_at ASC
    `,
      [organizationId]
    )) ?? [];
  return rows.map(mapMember);
};

/**
 * Removes a member record permanently.
 */
export const removeMember = async (memberId: string): Promise<void> => {
  const db = getAppDatabase();
  await db.run(`DELETE FROM organization_members WHERE id = ?`, [memberId]);
};

/**
 * Updates membership details (role, status, seats, usage cap).
 */
export const updateMember = async (
  memberId: string,
  updates: {
    role?: OrganizationRole;
    status?: OrganizationMemberStatus;
    seatUnits?: number;
    dailyUsageCapUsd?: number | null;
  }
): Promise<OrganizationMemberRecord | null> => {
  const db = getAppDatabase();
  const now = Date.now();
  await db.run(
    `
    UPDATE organization_members
       SET role = COALESCE(@role, role),
           status = COALESCE(@status, status),
           seat_units = COALESCE(@seat_units, seat_units),
           daily_usage_cap_usd = COALESCE(@daily_usage_cap_usd, daily_usage_cap_usd),
           updated_at = @updated_at
     WHERE id = @id
  `,
    {
      id: memberId,
      role: updates.role ?? null,
      status: updates.status ?? null,
      seat_units: updates.seatUnits ?? null,
      daily_usage_cap_usd: updates.dailyUsageCapUsd ?? null,
      updated_at: now,
    }
  );

  return await findMemberById(memberId);
};

/**
 * Counts active seat units for an organization.
 */
export const countActiveSeatUnits = async (organizationId: string): Promise<number> => {
  const db = getAppDatabase();
  const row = await db.get<{ total: number | null }>(
    `
      SELECT SUM(COALESCE(seat_units, 1)) as total
      FROM organization_members
      WHERE organization_id = ? AND status = 'active'
    `,
    [organizationId]
  );
  return row?.total ?? 0;
};

/**
 * Counts how many active admins exist for an organization.
 */
export const countActiveAdmins = async (organizationId: string): Promise<number> => {
  const db = getAppDatabase();
  const row = await db.get<{ total: number | null }>(
    `
      SELECT COUNT(1) as total
      FROM organization_members
      WHERE organization_id = ? AND status = 'active' AND role = 'admin'
    `,
    [organizationId]
  );
  return row?.total ?? 0;
};

/**
 * Creates an invite for a prospective member.
 */
export const createInvite = async (data: {
  organizationId: string;
  email: string;
  role?: OrganizationRole;
  inviterUserId: string;
  expiresAt?: number | null;
}): Promise<OrganizationInviteRecord> => {
  const db = getAppDatabase();
  const id = generateId();
  const now = Date.now();
  const token = generateId();
  await db.run(
    `
    INSERT INTO organization_invites (
      id, organization_id, email, role, status, token, expires_at, inviter_user_id, created_at
    )
    VALUES (@id, @organization_id, @email, @role, 'pending', @token, @expires_at, @inviter_user_id, @created_at)
  `,
    {
      id,
      organization_id: data.organizationId,
      email: data.email,
      role: data.role ?? 'builder',
      token,
      expires_at: data.expiresAt ?? null,
      inviter_user_id: data.inviterUserId,
      created_at: now,
    }
  );

  return (await findInviteById(id)) as OrganizationInviteRecord;
};

/**
 * Fetches an invite by its primary key.
 */
export const findInviteById = async (
  inviteId: string
): Promise<OrganizationInviteRecord | null> => {
  const db = getAppDatabase();
  const row = await db.get<OrganizationInviteRow>(
    `
      SELECT * FROM organization_invites
      WHERE id = ?
      LIMIT 1
    `,
    [inviteId]
  );
  return row ? mapInvite(row) : null;
};

/**
 * Retrieves an invite via its token.
 */
export const findInviteByToken = async (
  token: string
): Promise<OrganizationInviteRecord | null> => {
  const db = getAppDatabase();
  const row = await db.get<OrganizationInviteRow>(
    `
      SELECT * FROM organization_invites
      WHERE token = ?
      LIMIT 1
    `,
    [token]
  );
  return row ? mapInvite(row) : null;
};

/**
 * Gets a pending invite for a user email.
 */
export const findPendingInviteByEmail = async (
  organizationId: string,
  email: string
): Promise<OrganizationInviteRecord | null> => {
  const db = getAppDatabase();
  const row = await db.get<OrganizationInviteRow>(
    `
      SELECT * FROM organization_invites
      WHERE organization_id = ? AND lower(email) = lower(?) AND status = 'pending'
      LIMIT 1
    `,
    [organizationId, email]
  );
  return row ? mapInvite(row) : null;
};

/**
 * Lists invites for an organization.
 */
export const listOrganizationInvites = async (
  organizationId: string
): Promise<OrganizationInviteRecord[]> => {
  const db = getAppDatabase();
  const rows =
    (await db.all<OrganizationInviteRow>(
      `
      SELECT * FROM organization_invites
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `,
      [organizationId]
    )) ?? [];
  return rows.map(mapInvite);
};

/**
 * Updates invite status or timestamp metadata.
 */
export const updateInvite = async (
  inviteId: string,
  updates: {
    status?: OrganizationInviteStatus;
    expiresAt?: number | null;
    acceptedAt?: number | null;
    revokedAt?: number | null;
  }
): Promise<OrganizationInviteRecord | null> => {
  const db = getAppDatabase();
  await db.run(
    `
    UPDATE organization_invites
       SET status = COALESCE(@status, status),
           expires_at = COALESCE(@expires_at, expires_at),
           accepted_at = COALESCE(@accepted_at, accepted_at),
           revoked_at = COALESCE(@revoked_at, revoked_at)
     WHERE id = @id
  `,
    {
      id: inviteId,
      status: updates.status ?? null,
      expires_at: updates.expiresAt ?? null,
      accepted_at: updates.acceptedAt ?? null,
      revoked_at: updates.revokedAt ?? null,
    }
  );

  return await findInviteById(inviteId);
};

/**
 * Counts pending invites for the organization.
 */
export const countPendingInvites = async (organizationId: string): Promise<number> => {
  const db = getAppDatabase();
  const row = await db.get<{ total: number | null }>(
    `
      SELECT COUNT(1) as total
      FROM organization_invites
      WHERE organization_id = ? AND status = 'pending'
    `,
    [organizationId]
  );
  return row?.total ?? 0;
};
