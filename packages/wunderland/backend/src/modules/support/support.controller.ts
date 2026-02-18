// File: backend/src/modules/support/support.controller.ts
/**
 * @file support.controller.ts
 * @description NestJS controller for the support ticket system.
 * Exposes user-facing and VA admin-facing endpoints.
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { VaAdminGuard } from '../../common/guards/va-admin.guard.js';
import { ProTierGuard } from '../../common/guards/pro-tier.guard.js';
import { SupportService } from './support.service.js';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // =========================================================================
  // User endpoints (require auth + Pro tier)
  // =========================================================================

  @UseGuards(AuthGuard, ProTierGuard)
  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as any).user;
    const { subject, category, priority, description, piiShared } = req.body as {
      subject?: string;
      category?: string;
      priority?: string;
      description?: string;
      piiShared?: boolean;
    };

    if (!subject || !category || !description) {
      res.status(400).json({ message: 'Subject, category, and description are required.' });
      return;
    }

    const ticket = await this.supportService.createTicket({
      userId: user.sub || user.id,
      userEmail: user.email || '',
      userName: user.name,
      userPlan: user.tier || 'metered',
      subject,
      category,
      priority,
      description,
      piiShared: piiShared ?? false,
    });

    res.status(201).json({ ticket });
  }

  @UseGuards(AuthGuard, ProTierGuard)
  @Get('tickets')
  async listMyTickets(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as any).user;
    const userId = user.sub || user.id;
    const { status, limit, offset } = req.query as {
      status?: string;
      limit?: string;
      offset?: string;
    };

    const result = await this.supportService.listUserTickets(userId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    res.json(result);
  }

  @UseGuards(AuthGuard, ProTierGuard)
  @Get('tickets/:id')
  async getMyTicket(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as any).user;
    const userId = user.sub || user.id;
    const ticketId = req.params.id;

    const result = await this.supportService.getUserTicket(ticketId, userId);
    if (!result) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    res.json(result);
  }

  @UseGuards(AuthGuard, ProTierGuard)
  @Post('tickets/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addUserComment(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as any).user;
    const userId = user.sub || user.id;
    const ticketId = req.params.id;
    const { content } = req.body as { content?: string };

    if (!content) {
      res.status(400).json({ message: 'Content is required.' });
      return;
    }

    const comment = await this.supportService.addUserComment(ticketId, userId, content);
    if (!comment) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    res.status(201).json({ comment });
  }

  @UseGuards(AuthGuard, ProTierGuard)
  @Patch('tickets/:id/pii')
  async togglePii(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as any).user;
    const userId = user.sub || user.id;
    const ticketId = req.params.id;
    const { enabled } = req.body as { enabled?: boolean };

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ message: 'enabled (boolean) is required.' });
      return;
    }

    const ticket = await this.supportService.togglePiiSharing(ticketId, userId, enabled);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    res.json({ ticket });
  }

  // =========================================================================
  // VA Admin endpoints (require auth + VA admin role)
  // =========================================================================

  @UseGuards(AuthGuard, VaAdminGuard)
  @Get('admin/tickets')
  async adminListTickets(@Req() req: Request, @Res() res: Response): Promise<void> {
    const { status, priority, category, assignedTo, limit, offset } = req.query as {
      status?: string;
      priority?: string;
      category?: string;
      assignedTo?: string;
      limit?: string;
      offset?: string;
    };

    const result = await this.supportService.listAllTickets({
      status,
      priority,
      category,
      assignedTo,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    res.json(result);
  }

  @UseGuards(AuthGuard, VaAdminGuard)
  @Get('admin/tickets/:id')
  async adminGetTicket(@Req() req: Request, @Res() res: Response): Promise<void> {
    const ticketId = req.params.id;
    const result = await this.supportService.getAdminTicket(ticketId);

    if (!result) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    res.json(result);
  }

  @UseGuards(AuthGuard, VaAdminGuard)
  @Post('admin/tickets/:id/assign')
  async adminAssignTicket(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as any).user;
    const ticketId = req.params.id;
    const vaAdminEmail = user.email;

    const ticket = await this.supportService.assignTicket(ticketId, vaAdminEmail);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    res.json({ ticket });
  }

  @UseGuards(AuthGuard, VaAdminGuard)
  @Patch('admin/tickets/:id/status')
  async adminUpdateStatus(@Req() req: Request, @Res() res: Response): Promise<void> {
    const ticketId = req.params.id;
    const { status } = req.body as { status?: string };

    if (!status) {
      res.status(400).json({ message: 'Status is required.' });
      return;
    }

    const ticket = await this.supportService.updateTicketStatus(ticketId, status);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found or invalid status.' });
      return;
    }

    res.json({ ticket });
  }

  @UseGuards(AuthGuard, VaAdminGuard)
  @Post('admin/tickets/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async adminAddComment(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as any).user;
    const ticketId = req.params.id;
    const { content } = req.body as { content?: string };

    if (!content) {
      res.status(400).json({ message: 'Content is required.' });
      return;
    }

    const comment = await this.supportService.addAdminComment(ticketId, user.email, content);
    if (!comment) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    res.status(201).json({ comment });
  }

  @UseGuards(AuthGuard, VaAdminGuard)
  @Get('admin/stats')
  async adminGetStats(@Req() _req: Request, @Res() res: Response): Promise<void> {
    const stats = await this.supportService.getStats();
    res.json(stats);
  }
}
