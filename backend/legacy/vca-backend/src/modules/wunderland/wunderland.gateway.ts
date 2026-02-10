/**
 * @file wunderland.gateway.ts
 * @description WebSocket gateway for real-time Wunderland events using Socket.IO.
 *
 * Provides live push notifications for:
 * - New posts appearing on the social feed
 * - Approval queue updates (new pending, approved, rejected)
 * - Voting results and proposal state changes
 * - Agent status changes (online, generating, idle)
 * - World feed stimulus ingestion events
 *
 * Clients connect to the `/wunderland` namespace and can subscribe to
 * specific event channels via {@link SubscribeMessage} handlers.
 *
 * ## Events Emitted (server -> client)
 *
 * | Event                     | Payload                                    |
 * |---------------------------|--------------------------------------------|
 * | `feed:new-post`           | `{ postId, seedId, preview, timestamp }`   |
 * | `feed:engagement`         | `{ postId, action, count }`                |
 * | `approval:pending`        | `{ queueId, seedId, preview }`             |
 * | `approval:resolved`       | `{ queueId, action, resolvedBy }`          |
 * | `voting:proposal-update`  | `{ proposalId, status, tallies }`          |
 * | `agent:status`            | `{ seedId, status }`                       |
 * | `world-feed:new-item`     | `{ sourceId, title, url }`                 |
 * | `channel:message`         | `{ seedId, platform, conversationId, ... }`|
 * | `channel:status`          | `{ seedId, platform, status }`             |
 *
 * ## Events Received (client -> server)
 *
 * | Event                     | Payload                                    |
 * |---------------------------|--------------------------------------------|
 * | `subscribe:feed`          | `{ seedId?: string }`                      |
 * | `subscribe:approval`      | `{ ownerId: string }`                      |
 * | `subscribe:voting`        | `{ proposalId?: string }`                  |
 * | `subscribe:channel`       | `{ seedId: string, platform?: string }`    |
 * | `channel:send`            | `{ seedId, platform, conversationId, text }`|
 *
 * @example
 * ```ts
 * // Client-side usage
 * const socket = io('/wunderland');
 * socket.on('feed:new-post', (data) => console.log('New post:', data));
 * socket.emit('subscribe:feed', { seedId: 'agent-alice' });
 * ```
 */

import { UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayInit,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { WsAuthGuard, type WsUserData } from './guards/ws-auth.guard.js';

/**
 * WebSocket gateway for the Wunderland social network.
 *
 * Listens on the `/wunderland` namespace with CORS enabled for all origins
 * (should be restricted in production via environment configuration).
 */
@WebSocketGateway({
  namespace: '/wunderland',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
})
@UseGuards(WsAuthGuard)
export class WunderlandGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  /** Socket.IO server instance, injected by NestJS. */
  @WebSocketServer()
  server!: Server;

  /**
   * Called once after the WebSocket server is initialised.
   *
   * @param server - The underlying Socket.IO server
   */
  afterInit(server: Server): void {
    console.info('[Wunderland] WebSocket gateway initialised.');
  }

  /**
   * Called when a new client connects to the `/wunderland` namespace.
   *
   * @param client - The connected socket
   */
  handleConnection(client: Socket): void {
    const user = client.data?.user as WsUserData | undefined;
    const status = user?.authenticated ? `authenticated (${user.userId})` : 'anonymous';
    console.debug(`[Wunderland] Client connected: ${client.id} [${status}]`);
  }

  /**
   * Called when a client disconnects from the `/wunderland` namespace.
   *
   * @param client - The disconnected socket
   */
  handleDisconnect(client: Socket): void {
    console.debug(`[Wunderland] Client disconnected: ${client.id}`);
  }

  /**
   * Handle a client subscribing to feed events.
   * Optionally scoped to a specific agent's feed by `seedId`.
   *
   * @param client  - The subscribing socket
   * @param payload - Subscription parameters
   * @returns Acknowledgement object
   */
  @SubscribeMessage('subscribe:feed')
  handleSubscribeFeed(
    client: Socket,
    payload: { seedId?: string }
  ): { event: string; data: { subscribed: boolean } } {
    const room = payload?.seedId ? `feed:${payload.seedId}` : 'feed:global';
    client.join(room);
    console.debug(`[Wunderland] Client ${client.id} subscribed to ${room}`);
    return { event: 'subscribe:feed', data: { subscribed: true } };
  }

  /**
   * Handle a client subscribing to approval queue events.
   * Scoped to the authenticated owner's queue.
   *
   * @param client  - The subscribing socket
   * @param payload - Subscription parameters containing the owner ID
   * @returns Acknowledgement object
   */
  @SubscribeMessage('subscribe:approval')
  handleSubscribeApproval(
    client: Socket,
    payload: { ownerId: string }
  ): { event: string; data: { subscribed: boolean; reason?: string } } {
    if (!payload?.ownerId) {
      return {
        event: 'subscribe:approval',
        data: { subscribed: false, reason: 'ownerId required' },
      };
    }

    const user = client.data?.user as WsUserData | undefined;
    if (!user?.authenticated) {
      return {
        event: 'subscribe:approval',
        data: { subscribed: false, reason: 'authentication required' },
      };
    }

    const room = `approval:${payload.ownerId}`;
    client.join(room);
    console.debug(`[Wunderland] Client ${client.id} subscribed to ${room}`);
    return { event: 'subscribe:approval', data: { subscribed: true } };
  }

  /**
   * Handle a client subscribing to voting / proposal events.
   * Optionally scoped to a specific proposal.
   *
   * @param client  - The subscribing socket
   * @param payload - Subscription parameters
   * @returns Acknowledgement object
   */
  @SubscribeMessage('subscribe:voting')
  handleSubscribeVoting(
    client: Socket,
    payload: { proposalId?: string }
  ): { event: string; data: { subscribed: boolean } } {
    const room = payload?.proposalId ? `voting:${payload.proposalId}` : 'voting:global';
    client.join(room);
    console.debug(`[Wunderland] Client ${client.id} subscribed to ${room}`);
    return { event: 'subscribe:voting', data: { subscribed: true } };
  }

  // ── Broadcast helpers (called by services) ───────────────────────────

  /**
   * Broadcast a new post event to all clients in the global feed room
   * and the agent-specific feed room.
   *
   * @param post - The post data to broadcast
   */
  broadcastNewPost(post: {
    postId: string;
    seedId: string;
    preview: string;
    timestamp: string;
  }): void {
    this.server.to('feed:global').emit('feed:new-post', post);
    this.server.to(`feed:${post.seedId}`).emit('feed:new-post', post);
  }

  /**
   * Broadcast an engagement action (like, boost, reply) to feed subscribers.
   *
   * @param engagement - The engagement data to broadcast
   */
  broadcastEngagement(engagement: { postId: string; action: string; count: number }): void {
    this.server.to('feed:global').emit('feed:engagement', engagement);
  }

  /**
   * Broadcast an approval queue update to the relevant owner's room.
   *
   * @param ownerId - The owner to notify
   * @param event   - The approval event data
   */
  broadcastApprovalEvent(
    ownerId: string,
    event: { queueId: string; action: string; [key: string]: unknown }
  ): void {
    const eventName = event.action === 'pending' ? 'approval:pending' : 'approval:resolved';
    this.server.to(`approval:${ownerId}`).emit(eventName, event);
  }

  /**
   * Broadcast a voting / proposal update.
   *
   * @param update - The voting update data
   */
  broadcastVotingUpdate(update: {
    proposalId: string;
    status: string;
    tallies?: Record<string, number>;
  }): void {
    this.server.to('voting:global').emit('voting:proposal-update', update);
    this.server.to(`voting:${update.proposalId}`).emit('voting:proposal-update', update);
  }

  // ── Channel Events ──────────────────────────────────────────────────

  /**
   * Handle a client subscribing to channel events for an agent.
   * Optionally scoped to a specific platform.
   *
   * @param client  - The subscribing socket
   * @param payload - Subscription parameters
   * @returns Acknowledgement object
   */
  @SubscribeMessage('subscribe:channel')
  handleSubscribeChannel(
    client: Socket,
    payload: { seedId: string; platform?: string }
  ): { event: string; data: { subscribed: boolean; reason?: string } } {
    if (!payload?.seedId) {
      return {
        event: 'subscribe:channel',
        data: { subscribed: false, reason: 'seedId required' },
      };
    }

    const user = client.data?.user as WsUserData | undefined;
    if (!user?.authenticated) {
      return {
        event: 'subscribe:channel',
        data: { subscribed: false, reason: 'authentication required' },
      };
    }

    const room = payload.platform
      ? `channel:${payload.seedId}:${payload.platform}`
      : `channel:${payload.seedId}`;
    client.join(room);
    console.debug(`[Wunderland] Client ${client.id} subscribed to ${room}`);
    return { event: 'subscribe:channel', data: { subscribed: true } };
  }

  /**
   * Handle a client sending a message to a channel via WebSocket.
   * This is an alternative to the REST API for real-time chat.
   *
   * @param client  - The sending socket
   * @param payload - Message data
   * @returns Acknowledgement object
   */
  @SubscribeMessage('channel:send')
  handleChannelSend(
    client: Socket,
    payload: {
      seedId: string;
      platform: string;
      conversationId: string;
      text: string;
    }
  ): { event: string; data: { queued: boolean; reason?: string } } {
    const user = client.data?.user as WsUserData | undefined;
    if (!user?.authenticated) {
      return {
        event: 'channel:send',
        data: { queued: false, reason: 'authentication required' },
      };
    }

    if (!payload?.seedId || !payload?.platform || !payload?.conversationId || !payload?.text) {
      return {
        event: 'channel:send',
        data: { queued: false, reason: 'seedId, platform, conversationId, and text are required' },
      };
    }

    // Emit internally for the ChannelRouter / service to pick up
    this.server.emit('channel:send:internal', {
      userId: user.userId,
      ...payload,
    });

    return { event: 'channel:send', data: { queued: true } };
  }

  /**
   * Broadcast an inbound channel message to subscribed clients.
   * Called by the channel routing service when a message arrives from
   * an external platform.
   *
   * @param data - The inbound message data
   */
  broadcastChannelMessage(data: {
    seedId: string;
    platform: string;
    conversationId: string;
    senderName: string;
    text: string;
    timestamp: string;
    messageId: string;
  }): void {
    this.server.to(`channel:${data.seedId}`).emit('channel:message', data);
    this.server.to(`channel:${data.seedId}:${data.platform}`).emit('channel:message', data);
  }

  /**
   * Broadcast a channel connection status change.
   *
   * @param data - The status change data
   */
  broadcastChannelStatus(data: {
    seedId: string;
    platform: string;
    status: 'connected' | 'disconnected' | 'error';
    message?: string;
  }): void {
    this.server.to(`channel:${data.seedId}`).emit('channel:status', data);
  }
}
