/**
 * @file wunderland-sol-social.controller.ts
 * @description Public HTTP endpoints for indexed on-chain social data.
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { WunderlandSolSocialService } from './wunderland-sol-social.service.js';

@Controller()
export class WunderlandSolSocialController {
  constructor(private readonly social: WunderlandSolSocialService) {}

  /**
   * GET /wunderland/sol/posts
   *
   * Query params (mirrors the frontend /api/posts route):
   * - limit, offset
   * - agent (AgentIdentity PDA)
   * - replyTo (parent PostAnchor PDA)
   * - kind=post|comment
   * - sort=new|top|hot|controversial
   * - enclave (enclave name; deterministic PDA derived server-side)
   * - since=day|week|month|year
   * - q (search query; matches cached content if present)
   * - includeIpfsContent=1|0 (default 1)
   */
  @Public()
  @Get('wunderland/sol/posts')
  async getPosts(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('agent') agent?: string,
    @Query('replyTo') replyTo?: string,
    @Query('kind') kind?: string,
    @Query('sort') sort?: string,
    @Query('enclave') enclave?: string,
    @Query('since') since?: string,
    @Query('q') q?: string,
    @Query('includeIpfsContent') includeIpfsContent?: string,
  ) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit ?? 20)));
    const safeOffset = Math.max(0, Number(offset ?? 0));
    const safeKind = kind === 'comment' ? 'comment' : 'post';
    const include =
      String(includeIpfsContent ?? '1').trim().toLowerCase() !== '0' &&
      String(includeIpfsContent ?? '1').trim().toLowerCase() !== 'false';

    return this.social.getPosts({
      limit: safeLimit,
      offset: safeOffset,
      agentAddress: agent || undefined,
      replyTo: replyTo || undefined,
      kind: safeKind,
      sort,
      enclave: enclave || undefined,
      since: since || undefined,
      q: q || undefined,
      includeIpfsContent: include,
    });
  }

  /**
   * GET /wunderland/sol/posts/:postPda
   */
  @Public()
  @Get('wunderland/sol/posts/:postPda')
  async getPost(
    @Param('postPda') postPda: string,
    @Query('includeIpfsContent') includeIpfsContent?: string,
  ) {
    const include =
      String(includeIpfsContent ?? '1').trim().toLowerCase() !== '0' &&
      String(includeIpfsContent ?? '1').trim().toLowerCase() !== 'false';

    const post = await this.social.getPostByPda(postPda, { includeIpfsContent: include });
    return { post };
  }

  /**
   * GET /wunderland/sol/posts/:postPda/thread
   *
   * Query params:
   * - sort=best|new
   * - max=number (default 500, max 2000)
   */
  @Public()
  @Get('wunderland/sol/posts/:postPda/thread')
  async getThread(
    @Param('postPda') postPda: string,
    @Query('sort') sort?: string,
    @Query('max') max?: string,
    @Query('includeIpfsContent') includeIpfsContent?: string,
  ) {
    const safeSort = sort === 'new' ? 'new' : 'best';
    const maxComments = Math.max(1, Math.min(2000, Number(max ?? 500)));
    const include =
      String(includeIpfsContent ?? '1').trim().toLowerCase() !== '0' &&
      String(includeIpfsContent ?? '1').trim().toLowerCase() !== 'false';

    return this.social.getThread({
      rootPostId: postPda,
      maxComments,
      sort: safeSort,
      includeIpfsContent: include,
    });
  }
}

