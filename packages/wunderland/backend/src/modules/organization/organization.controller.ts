/**
 * @file organization.controller.ts
 * @description NestJS controller for organization management endpoints.
 * Delegates to the existing Express route handlers in
 * features/organization/organization.routes.ts for full API compatibility.
 *
 * All routes require authentication via AuthGuard.
 */

import { Controller, Get, Post, Patch, Delete, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import {
  getOrganizations,
  postOrganization,
  patchOrganization,
  postInvite,
  deleteInvite,
  patchMember,
  deleteMember,
  postAcceptInvite,
  getOrganizationSettings,
  patchOrganizationSettings,
} from '../../features/organization/organization.routes.js';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationController {
  /**
   * List all organizations the authenticated user belongs to.
   * GET /organizations
   */
  @Get()
  async list(@Req() req: Request, @Res() res: Response): Promise<void> {
    return getOrganizations(req, res);
  }

  /**
   * Create a new organization.
   * POST /organizations
   */
  @Post()
  async create(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postOrganization(req, res);
  }

  /**
   * Update an existing organization's details.
   * PATCH /organizations/:organizationId
   */
  @Patch(':organizationId')
  async update(@Req() req: Request, @Res() res: Response): Promise<void> {
    return patchOrganization(req, res);
  }

  /**
   * Invite a user to an organization.
   * POST /organizations/:organizationId/invites
   */
  @Post(':organizationId/invites')
  async createInvite(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postInvite(req, res);
  }

  /**
   * Revoke a pending invite.
   * DELETE /organizations/:organizationId/invites/:inviteId
   */
  @Delete(':organizationId/invites/:inviteId')
  async removeInvite(@Req() req: Request, @Res() res: Response): Promise<void> {
    return deleteInvite(req, res);
  }

  /**
   * Update an organization member's role or settings.
   * PATCH /organizations/:organizationId/members/:memberId
   */
  @Patch(':organizationId/members/:memberId')
  async updateMember(@Req() req: Request, @Res() res: Response): Promise<void> {
    return patchMember(req, res);
  }

  /**
   * Remove a member from an organization.
   * DELETE /organizations/:organizationId/members/:memberId
   */
  @Delete(':organizationId/members/:memberId')
  async removeMember(@Req() req: Request, @Res() res: Response): Promise<void> {
    return deleteMember(req, res);
  }

  /**
   * Accept an organization invite by token.
   * POST /organizations/invites/:token/accept
   */
  @Post('invites/:token/accept')
  async acceptInvite(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postAcceptInvite(req, res);
  }

  /**
   * Get organization-level settings (admin-managed, member-readable).
   * GET /organizations/:organizationId/settings
   */
  @Get(':organizationId/settings')
  async getSettings(@Req() req: Request, @Res() res: Response): Promise<void> {
    return getOrganizationSettings(req, res);
  }

  /**
   * Patch organization-level settings. Admin-only.
   * PATCH /organizations/:organizationId/settings
   */
  @Patch(':organizationId/settings')
  async patchSettings(@Req() req: Request, @Res() res: Response): Promise<void> {
    return patchOrganizationSettings(req, res);
  }
}
