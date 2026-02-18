/**
 * @file voice.controller.ts
 * @description REST endpoints for voice call management.
 *
 * Routes:
 *   POST   /wunderland/voice/call     — Initiate a new call
 *   GET    /wunderland/voice/calls    — List calls for current user
 *   GET    /wunderland/voice/calls/:id — Get a specific call
 *   POST   /wunderland/voice/hangup   — Hang up an active call
 *   POST   /wunderland/voice/speak    — Speak text on an active call
 *   GET    /wunderland/voice/stats    — Call statistics
 */

import {
  Controller,
  Get, Post,
  Param, Body, Query,
  UseGuards, HttpCode, HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { VoiceService } from './voice.service.js';
import { InitiateCallDto, ListCallsQueryDto, HangupCallDto, SpeakTextDto } from '../dto/voice.dto.js';

@Controller('wunderland/voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  private assertPaidAccess(user: any): void {
    const status = user?.subscriptionStatus ?? user?.subscription_status;
    const isPaid = status === 'active' || status === 'trialing' || user?.role === 'admin';
    if (!isPaid) {
      throw new ForbiddenException(
        'Active paid subscription required for voice call features.',
      );
    }
  }

  // ── Initiate Call ──

  @UseGuards(AuthGuard)
  @Post('call')
  @HttpCode(HttpStatus.CREATED)
  async initiateCall(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Body() body: InitiateCallDto,
  ) {
    this.assertPaidAccess(user);
    return this.voiceService.initiateCall(userId, body);
  }

  // ── List Calls ──

  @UseGuards(AuthGuard)
  @Get('calls')
  async listCalls(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query() query: ListCallsQueryDto,
  ) {
    this.assertPaidAccess(user);
    return this.voiceService.listCalls(userId, query);
  }

  // ── Get Call ──

  @UseGuards(AuthGuard)
  @Get('calls/:callId')
  async getCall(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('callId') callId: string,
  ) {
    this.assertPaidAccess(user);
    return this.voiceService.getCall(userId, callId);
  }

  // ── Hangup ──

  @UseGuards(AuthGuard)
  @Post('hangup')
  async hangupCall(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Body() body: HangupCallDto,
  ) {
    this.assertPaidAccess(user);
    return this.voiceService.hangupCall(userId, body.callId);
  }

  // ── Speak Text ──

  @UseGuards(AuthGuard)
  @Post('speak')
  async speakText(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Body() body: SpeakTextDto,
  ) {
    this.assertPaidAccess(user);

    // Append text as a transcript entry and return
    await this.voiceService.appendTranscriptEntry(body.callId, {
      role: 'assistant',
      text: body.text,
      timestamp: Date.now(),
    });

    return { success: true, callId: body.callId, text: body.text };
  }

  // ── Stats ──

  @UseGuards(AuthGuard)
  @Get('stats')
  async getCallStats(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query('seedId') seedId?: string,
  ) {
    this.assertPaidAccess(user);
    return this.voiceService.getCallStats(userId, seedId);
  }
}
