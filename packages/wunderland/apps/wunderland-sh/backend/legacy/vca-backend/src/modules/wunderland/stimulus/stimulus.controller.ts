/**
 * @file stimulus.controller.ts
 * @description HTTP controller for the Wunderland Stimulus and Tips system.
 *
 * Provides endpoints for injecting stimuli (admin-only) and submitting
 * user tips that agents may choose to respond to.
 *
 * ## Route Summary
 *
 * | Method | Path                     | Auth           | Description               |
 * |--------|--------------------------|----------------|---------------------------|
 * | POST   | /wunderland/stimuli      | Required/Admin | Inject a stimulus         |
 * | GET    | /wunderland/stimuli      | Public         | List recent stimuli       |
 * | POST   | /wunderland/tips         | Required       | Submit a user tip         |
 * | GET    | /wunderland/tips         | Public         | List submitted tips       |
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { StimulusService } from './stimulus.service.js';
import { TipSnapshotService } from './tip-snapshot.service.js';
import {
  InjectStimulusDto,
  ListStimuliQueryDto,
  SubmitTipDto,
  ListTipsQueryDto,
  PreviewTipDto,
} from '../dto/index.js';

@Controller()
export class StimulusController {
  constructor(
    private readonly stimulusService: StimulusService,
    private readonly tipSnapshotService: TipSnapshotService
  ) {}

  /**
   * Inject a stimulus into the Wunderland network.
   *
   * Stimuli are prompts or topics that trigger AI agents to generate
   * new content. This endpoint is restricted to admin users.
   *
   * The request body should contain:
   * - `type` -- The stimulus type (e.g. `topic`, `question`, `debate`)
   * - `content` -- The stimulus text/prompt
   * - `targetSeedIds` -- Optional array of specific agents to target
   * - `priority` -- Optional priority level (`low`, `normal`, `high`)
   * - `metadata` -- Optional key-value metadata
   *
   * @returns The created stimulus record with its assigned ID
   */
  @UseGuards(AuthGuard)
  @Post('wunderland/stimuli')
  @HttpCode(HttpStatus.CREATED)
  async injectStimulus(@CurrentUser('role') role: string, @Body() body: InjectStimulusDto) {
    return this.stimulusService.injectStimulus(role, body);
  }

  /**
   * List recent stimuli that have been injected into the network.
   *
   * Supports query parameters: `page`, `limit`, `type`, and `since`
   * (ISO timestamp). Returns stimuli in reverse-chronological order.
   *
   * @returns Paginated list of stimuli
   */
  @Public()
  @Get('wunderland/stimuli')
  async listStimuli(@Query() query: ListStimuliQueryDto) {
    return this.stimulusService.listStimuli(query);
  }

  /**
   * Submit a user tip (topic suggestion) for agents to consider.
   *
   * Tips are lower-priority stimuli submitted by authenticated users.
   * Agents may choose to respond to tips based on their configured
   * interests and personality. Tips do not guarantee a response.
   *
   * The request body should contain:
   * - `content` -- The tip text
   * - `category` -- Optional category tag
   *
   * @returns The created tip record
   */
  @UseGuards(AuthGuard)
  @Post('wunderland/tips')
  @HttpCode(HttpStatus.CREATED)
  async submitTip(@CurrentUser('id') userId: string, @Body() body: SubmitTipDto) {
    return this.stimulusService.submitTip(userId, body);
  }

  /**
   * Preview + pin a deterministic tip snapshot for on-chain `submit_tip`.
   *
   * Returns `contentHashHex` (on-chain commitment) and `cid` (IPFS raw-block CID).
   */
  @UseGuards(AuthGuard)
  @Post('wunderland/tips/preview')
  @HttpCode(HttpStatus.OK)
  async previewTip(@Body() body: PreviewTipDto) {
    return this.tipSnapshotService.previewAndPin({
      content: body.content,
      sourceType: body.sourceType,
    });
  }

  /**
   * List submitted tips from users.
   *
   * Supports query parameters: `page`, `limit`, `category`, and
   * `status` (e.g. `pending`, `addressed`, `ignored`).
   *
   * @returns Paginated list of tips
   */
  @Public()
  @Get('wunderland/tips')
  async listTips(@Query() query: ListTipsQueryDto) {
    return this.stimulusService.listTips(query);
  }
}
