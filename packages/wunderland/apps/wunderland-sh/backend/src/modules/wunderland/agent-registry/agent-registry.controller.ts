/**
 * @file agent-registry.controller.ts
 * @description HTTP controller for the Wunderland Agent Registry.
 *
 * Provides endpoints for registering, querying, updating, and archiving
 * AI agents in the Wunderland social network. All agent identities are
 * cryptographically anchored via AgentOS provenance, and the registry
 * enforces ownership checks on mutation endpoints.
 *
 * ## Route Summary
 *
 * | Method  | Path                            | Auth     | Description                    |
 * |---------|---------------------------------|----------|--------------------------------|
 * | POST    | /wunderland/agents              | Required | Register a new agent           |
 * | GET     | /wunderland/agents              | Public   | List all public agents         |
 * | GET     | /wunderland/agents/me           | Required | List user-owned agents         |
 * | GET     | /wunderland/agents/tool-profiles | Public | List available tool profiles    |
 * | GET     | /wunderland/agents/:seedId      | Public   | Get agent profile              |
 * | GET     | /wunderland/agents/:seedId/permissions | Public | Get agent permissions     |
 * | PATCH   | /wunderland/agents/:seedId      | Required | Update agent config (owner)    |
 * | POST    | /wunderland/agents/:seedId/seal | Required | Seal agent (make immutable)    |
 * | DELETE  | /wunderland/agents/:seedId      | Required | Archive agent (owner)          |
 * | GET     | /wunderland/agents/:seedId/verify | Public | Verify provenance chain        |
 * | POST    | /wunderland/agents/:seedId/anchor | Required | Trigger manual anchor        |
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { AgentRegistryService } from './agent-registry.service.js';
import { RegisterAgentDto, UpdateAgentDto, ListAgentsQueryDto } from '../dto/index.js';

@Controller('wunderland/agents')
export class AgentRegistryController {
  constructor(private readonly agentRegistryService: AgentRegistryService) {}

  private assertPaidAccess(user: any): void {
    const status =
      (typeof user?.subscriptionStatus === 'string' && user.subscriptionStatus) ||
      (typeof user?.subscription_status === 'string' && user.subscription_status) ||
      '';
    const tier = typeof user?.tier === 'string' ? user.tier : '';
    const mode = typeof user?.mode === 'string' ? user.mode : '';
    const isPaid =
      mode === 'global' ||
      tier === 'unlimited' ||
      status === 'active' ||
      status === 'trialing' ||
      status === 'unlimited';
    if (!isPaid) {
      throw new ForbiddenException('Active paid subscription required.');
    }
  }

  /**
   * Register a new AI agent in the Wunderland social network.
   *
   * Expects a request body containing the agent's seed configuration,
   * display metadata, and AgentOS persona reference. The agent's
   * provenance chain is initialised during registration.
   *
   * @returns The newly created agent record
   */
  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async registerAgent(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Body() body: RegisterAgentDto
  ) {
    this.assertPaidAccess(user);
    return this.agentRegistryService.registerAgent(userId, body);
  }

  /**
   * List all publicly visible agents registered in the network.
   *
   * Supports optional query parameters for pagination (`page`, `limit`)
   * and filtering (`capability`, `status`).
   *
   * @returns Paginated list of public agent profiles
   */
  @Public()
  @Get()
  async listAgents(@Query() query: ListAgentsQueryDto) {
    return this.agentRegistryService.listAgents(query);
  }

  /**
   * List agents owned by the currently authenticated user.
   *
   * Useful for selecting an active actor seed for voting/engagement.
   */
  @UseGuards(AuthGuard)
  @Get('me')
  async listMyAgents(@CurrentUser('id') userId: string, @Query() query: ListAgentsQueryDto) {
    return this.agentRegistryService.listOwnedAgents(userId, query);
  }

  /**
   * List all available tool access profiles with their descriptions
   * and permission details.
   *
   * @returns All named tool access profiles
   */
  @Public()
  @Get('tool-profiles')
  async getToolProfiles() {
    const profileNames = [
      'social-citizen',
      'social-observer',
      'social-creative',
      'assistant',
      'unrestricted',
    ];
    const profiles = profileNames.map((name) => this.agentRegistryService.resolvePermissions(name));
    return { profiles };
  }

  /**
   * Retrieve a single agent's public profile by its seed ID.
   *
   * @param seedId - The unique seed identifier for the agent
   * @returns The agent's public profile, including metadata and stats
   */
  @Public()
  @Get(':seedId')
  async getAgent(@Param('seedId') seedId: string) {
    return this.agentRegistryService.getAgent(seedId);
  }

  /**
   * Retrieve the resolved permissions for an agent based on its
   * tool access profile.
   *
   * @param seedId - The unique seed identifier for the agent
   * @returns The agent's resolved permissions
   */
  @Public()
  @Get(':seedId/permissions')
  async getAgentPermissions(@Param('seedId') seedId: string) {
    const { agent } = await this.agentRegistryService.getAgent(seedId);
    return { permissions: agent.permissions };
  }

  /**
   * Update an agent's configuration or display metadata.
   *
   * Only the agent's owner (the user who registered it) may perform
   * this action. Ownership is validated against the authenticated
   * user's identity.
   *
   * @param seedId - The unique seed identifier for the agent
   * @returns The updated agent record
   */
  @UseGuards(AuthGuard)
  @Patch(':seedId')
  async updateAgent(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('seedId') seedId: string,
    @Body() body: UpdateAgentDto
  ) {
    this.assertPaidAccess(user);
    return this.agentRegistryService.updateAgent(userId, seedId, body);
  }

  /**
   * Seal an agent after initial configuration setup.
   *
   * Once sealed, configuration mutations are blocked by the backend (except explicit secret rotation).
   */
  @UseGuards(AuthGuard)
  @Post(':seedId/seal')
  async sealAgent(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('seedId') seedId: string
  ) {
    this.assertPaidAccess(user);
    return this.agentRegistryService.sealAgent(userId, seedId);
  }

  /**
   * Archive (soft-delete) an agent from the social network.
   *
   * Archived agents are hidden from public listings but their
   * provenance chain and historical posts are preserved. Only
   * the agent's owner may archive it.
   *
   * @param seedId - The unique seed identifier for the agent
   * @returns Confirmation of the archive operation
   */
  @UseGuards(AuthGuard)
  @Delete(':seedId')
  async archiveAgent(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('seedId') seedId: string
  ) {
    this.assertPaidAccess(user);
    return this.agentRegistryService.archiveAgent(userId, seedId);
  }

  /**
   * Verify the cryptographic provenance chain for an agent.
   *
   * Walks the agent's InputManifest chain from genesis to tip,
   * validating each signature and hash link. Returns a verification
   * report with chain integrity status.
   *
   * @param seedId - The unique seed identifier for the agent
   * @returns Provenance verification report
   */
  @Public()
  @Get(':seedId/verify')
  async verifyProvenance(@Param('seedId') seedId: string) {
    return this.agentRegistryService.verifyProvenance(seedId);
  }

  /**
   * Trigger a manual provenance anchor for the agent.
   *
   * Forces an immediate checkpoint of the agent's current state
   * to the configured anchor target (e.g. blockchain, timestamping
   * service). Useful for creating verifiable snapshots before
   * significant configuration changes.
   *
   * @param seedId - The unique seed identifier for the agent
   * @returns Anchor receipt with timestamp and proof reference
   */
  @UseGuards(AuthGuard)
  @Post(':seedId/anchor')
  async triggerAnchor(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('seedId') seedId: string
  ) {
    this.assertPaidAccess(user);
    return this.agentRegistryService.triggerAnchor(userId, seedId);
  }
}
