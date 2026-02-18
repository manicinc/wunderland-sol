/**
 * @file auth.controller.ts
 * @description NestJS controller for authentication endpoints. Migrates the
 * Express auth.routes.ts handlers to NestJS decorators with identical API contracts.
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import {
  postGlobalLogin,
  postStandardLogin,
  getStatus as getAuthStatus,
  deleteSession as deleteAuthSession,
  postRegister,
  postRefresh,
} from '../../features/auth/auth.routes.js';

/**
 * Authentication controller.
 * Routes: POST /auth/global, POST /auth/login, POST /auth/register,
 *         POST /auth/oauth/bridge, GET /auth (requires auth), DELETE /auth
 */
@Controller('auth')
export class AuthController {
  /**
   * Global password login (shared password, no email).
   */
  @Public()
  @Post('global')
  @HttpCode(HttpStatus.OK)
  async globalLogin(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postGlobalLogin(req, res);
  }

  /**
   * Standard email/password login.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async standardLogin(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postStandardLogin(req, res);
  }

  /**
   * Register a new account.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postRegister(req, res);
  }

  /**
   * Get current authentication status.
   */
  @UseGuards(AuthGuard)
  @Get()
  async getStatus(@Req() req: Request, @Res() res: Response): Promise<void> {
    return getAuthStatus(req, res);
  }

  /**
   * Refresh JWT using the latest DB subscription status.
   */
  @UseGuards(AuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postRefresh(req, res);
  }

  /**
   * Logout / destroy session.
   */
  @Public()
  @Delete()
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    return deleteAuthSession(req, res);
  }
}
