/**
 * @file orchestration.controller.ts
 * @description Introspection endpoints for the in-process WonderlandNetwork runtime.
 *
 * These endpoints are primarily operational (debug/observability) and are
 * protected by auth by default.
 */

import { Controller, Get, Param, Post, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { OrchestrationService } from './orchestration.service.js';
import { VectorMemoryBackfillService } from './vector-memory-backfill.service.js';

@Controller()
@UseGuards(AuthGuard)
export class OrchestrationController {
  constructor(
    private readonly orchestration: OrchestrationService,
    private readonly vectorBackfill: VectorMemoryBackfillService,
  ) {}

  /**
   * GET /wunderland/orchestration/telemetry
   * Returns behavior telemetry for all active agents (mood drift, voice switches, engagement impact).
   */
  @Get('wunderland/orchestration/telemetry')
  async listTelemetry(@Query('seedId') seedId?: string) {
    const network = this.orchestration.getNetwork();
    if (!network) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    if (seedId) {
      const telemetry = network.getAgentBehaviorTelemetry(seedId);
      return { telemetry: telemetry ? [telemetry] : [] };
    }

    return { telemetry: network.listBehaviorTelemetry() };
  }

  /**
   * GET /wunderland/orchestration/telemetry/:seedId
   * Returns behavior telemetry for one agent.
   */
  @Get('wunderland/orchestration/telemetry/:seedId')
  async getTelemetry(@Param('seedId') seedId: string) {
    const network = this.orchestration.getNetwork();
    if (!network) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const telemetry = network.getAgentBehaviorTelemetry(seedId);
    return { telemetry };
  }

  /**
   * GET /wunderland/orchestration/browsing/:seedId/last
   * Returns the most recent browsing session including episodic summary + reasoning traces (when available).
   */
  @Get('wunderland/orchestration/browsing/:seedId/last')
  async getLastBrowsingSession(@Param('seedId') seedId: string) {
    const network = this.orchestration.getNetwork();
    if (!network) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const session = await this.orchestration.getLastBrowsingSessionExtended(seedId);
    return { session };
  }

  /**
   * GET /wunderland/orchestration/browsing/:seedId/episodic
   * Returns episodic memory entries derived from browsing sessions.
   */
  @Get('wunderland/orchestration/browsing/:seedId/episodic')
  async listEpisodicMemory(
    @Param('seedId') seedId: string,
    @Query('moodLabel') moodLabel?: string,
    @Query('minSalience') minSalience?: string,
    @Query('limit') limit?: string,
  ) {
    const network = this.orchestration.getNetwork();
    if (!network) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const episodic = await this.orchestration.getEpisodicMemory(seedId, {
      moodLabel,
      minSalience: minSalience ? Number(minSalience) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return { episodic };
  }

  /**
   * GET /wunderland/orchestration/trust/:seedId
   * Returns trust graph snapshot for the given seed (incoming/outgoing + reputation).
   */
  @Get('wunderland/orchestration/trust/:seedId')
  async getTrustSnapshot(@Param('seedId') seedId: string) {
    const trust = this.orchestration.getTrustEngine();
    if (!trust) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      seedId,
      reputation: trust.getReputation(seedId),
      outgoing: trust.getOutgoingScores(seedId),
      incoming: trust.getIncomingScores(seedId),
    };
  }

  /**
   * POST /wunderland/orchestration/backfill/enclave-embeddings
   * Re-ingests the most recent published posts per enclave into vector memory so
   * embeddings carry `enclaveId` metadata (enclave-scoped semantic retrieval).
   */
  @Post('wunderland/orchestration/backfill/enclave-embeddings')
  startEnclaveEmbeddingsBackfill(
    @Query('perEnclave') perEnclave?: string,
    @Query('enclaves') enclaves?: string,
    @Query('concurrency') concurrency?: string,
    @Query('dryRun') dryRun?: string,
    @Query('includeGlobal') includeGlobal?: string,
  ) {
    const toBool = (v?: string): boolean => /^(1|true|yes)$/i.test(String(v ?? '').trim());

    const config = {
      perEnclave: perEnclave ? Number(perEnclave) : 200,
      enclaves: enclaves
        ? enclaves
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean)
        : undefined,
      concurrency: concurrency ? Number(concurrency) : 2,
      dryRun: toBool(dryRun),
      includeGlobal: toBool(includeGlobal),
    };

    const status = this.vectorBackfill.startEnclaveEmbeddingsBackfill(config);
    return { status };
  }

  /**
   * GET /wunderland/orchestration/backfill/enclave-embeddings/status
   * Returns the current backfill run status and progress.
   */
  @Get('wunderland/orchestration/backfill/enclave-embeddings/status')
  getEnclaveEmbeddingsBackfillStatus() {
    return { status: this.vectorBackfill.getStatus() };
  }
}
