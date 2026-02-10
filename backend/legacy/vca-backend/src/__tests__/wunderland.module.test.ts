import test, { afterEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { WunderlandModule } from '../modules/wunderland/wunderland.module.js';
import { WunderlandGateway } from '../modules/wunderland/wunderland.gateway.js';
import { AgentRegistryModule } from '../modules/wunderland/agent-registry/agent-registry.module.js';
import { SocialFeedModule } from '../modules/wunderland/social-feed/social-feed.module.js';
import { WorldFeedModule } from '../modules/wunderland/world-feed/world-feed.module.js';
import { StimulusModule } from '../modules/wunderland/stimulus/stimulus.module.js';
import { ApprovalQueueModule } from '../modules/wunderland/approval-queue/approval-queue.module.js';
import { WunderlandSolModule } from '../modules/wunderland/wunderland-sol/wunderland-sol.module.js';
import { RuntimeModule } from '../modules/wunderland/runtime/runtime.module.js';
import { CredentialsModule } from '../modules/wunderland/credentials/credentials.module.js';
import { ChannelsModule } from '../modules/wunderland/channels/channels.module.js';
import { VoiceModule } from '../modules/wunderland/voice/voice.module.js';
import { CronModule } from '../modules/wunderland/cron/cron.module.js';
import { CalendarModule } from '../modules/wunderland/calendar/calendar.module.js';
import { EmailIntegrationModule } from '../modules/wunderland/email/email.module.js';
import { CitizensModule } from '../modules/wunderland/citizens/citizens.module.js';
import { VotingModule } from '../modules/wunderland/voting/voting.module.js';
import { OrchestrationModule } from '../modules/wunderland/orchestration/orchestration.module.js';
import { JobsModule } from '../modules/wunderland/jobs/jobs.module.js';
import { AgentRegistryController } from '../modules/wunderland/agent-registry/agent-registry.controller.js';
import { AgentRegistryService } from '../modules/wunderland/agent-registry/agent-registry.service.js';
import { SocialFeedController } from '../modules/wunderland/social-feed/social-feed.controller.js';
import { SocialFeedService } from '../modules/wunderland/social-feed/social-feed.service.js';
import { VotingController } from '../modules/wunderland/voting/voting.controller.js';
import { VotingService } from '../modules/wunderland/voting/voting.service.js';

// ── Test Helpers ─────────────────────────────────────────────────────────────

function createMockSocket(): any {
  const rooms = new Set<string>();
  return {
    id: 'test-socket-' + Math.random().toString(36).slice(2),
    join: (room: string) => rooms.add(room),
    rooms,
  };
}

function createMockServer(): any {
  const emitted: Array<{ room: string; event: string; data: any }> = [];
  const server = {
    to: (room: string) => ({
      emit: (event: string, data: any) => {
        emitted.push({ room, event, data });
      },
    }),
    emitted,
  };
  return server;
}

// ── 1. WunderlandModule Dynamic Loading ──────────────────────────────────────

describe('WunderlandModule.register()', () => {
  const originalEnv = process.env.WUNDERLAND_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WUNDERLAND_ENABLED;
    } else {
      process.env.WUNDERLAND_ENABLED = originalEnv;
    }
  });

  test('returns empty module when WUNDERLAND_ENABLED is not set', () => {
    delete process.env.WUNDERLAND_ENABLED;
    const result = WunderlandModule.register();

    assert.equal(result.module, WunderlandModule);
    assert.equal(result.imports, undefined);
    assert.equal(result.providers, undefined);
    assert.equal(result.exports, undefined);
  });

  test('returns empty module when WUNDERLAND_ENABLED is "false"', () => {
    process.env.WUNDERLAND_ENABLED = 'false';
    const result = WunderlandModule.register();

    assert.equal(result.module, WunderlandModule);
    assert.equal(result.imports, undefined);
    assert.equal(result.providers, undefined);
    assert.equal(result.exports, undefined);
  });

  test('returns full module with imports/providers when WUNDERLAND_ENABLED is "true"', () => {
    process.env.WUNDERLAND_ENABLED = 'true';
    const result = WunderlandModule.register();

    assert.equal(result.module, WunderlandModule);
    assert.ok(Array.isArray(result.imports), 'imports should be an array');
    assert.ok(Array.isArray(result.providers), 'providers should be an array');
    assert.ok(Array.isArray(result.exports), 'exports should be an array');
  });

  test('returned DynamicModule always has correct module property', () => {
    delete process.env.WUNDERLAND_ENABLED;
    assert.equal(WunderlandModule.register().module, WunderlandModule);

    process.env.WUNDERLAND_ENABLED = 'true';
    assert.equal(WunderlandModule.register().module, WunderlandModule);
  });

  test('when enabled, imports array includes all 17 sub-modules', () => {
    process.env.WUNDERLAND_ENABLED = 'true';
    const result = WunderlandModule.register();
    const imports = result.imports as any[];

    assert.equal(imports.length, 17);
    assert.ok(imports.includes(AgentRegistryModule), 'should include AgentRegistryModule');
    assert.ok(imports.includes(SocialFeedModule), 'should include SocialFeedModule');
    assert.ok(imports.includes(WorldFeedModule), 'should include WorldFeedModule');
    assert.ok(imports.includes(StimulusModule), 'should include StimulusModule');
    assert.ok(imports.includes(ApprovalQueueModule), 'should include ApprovalQueueModule');
    assert.ok(imports.includes(WunderlandSolModule), 'should include WunderlandSolModule');
    assert.ok(imports.includes(RuntimeModule), 'should include RuntimeModule');
    assert.ok(imports.includes(CredentialsModule), 'should include CredentialsModule');
    assert.ok(imports.includes(ChannelsModule), 'should include ChannelsModule');
    assert.ok(imports.includes(VoiceModule), 'should include VoiceModule');
    assert.ok(imports.includes(CronModule), 'should include CronModule');
    assert.ok(imports.includes(CalendarModule), 'should include CalendarModule');
    assert.ok(imports.includes(EmailIntegrationModule), 'should include EmailIntegrationModule');
    assert.ok(imports.includes(CitizensModule), 'should include CitizensModule');
    assert.ok(imports.includes(VotingModule), 'should include VotingModule');
    assert.ok(imports.includes(OrchestrationModule), 'should include OrchestrationModule');
    assert.ok(imports.includes(JobsModule), 'should include JobsModule');
  });

  test('when enabled, providers includes WunderlandGateway', () => {
    process.env.WUNDERLAND_ENABLED = 'true';
    const result = WunderlandModule.register();
    const providers = result.providers as any[];

    assert.ok(providers.includes(WunderlandGateway));
  });

  test('when enabled, exports includes WunderlandGateway', () => {
    process.env.WUNDERLAND_ENABLED = 'true';
    const result = WunderlandModule.register();
    const exports = result.exports as any[];

    assert.ok(exports.includes(WunderlandGateway));
  });
});

// ── 2. WunderlandGateway ─────────────────────────────────────────────────────

describe('WunderlandGateway', () => {
  test('gateway can be instantiated', () => {
    const gateway = new WunderlandGateway();
    assert.ok(gateway instanceof WunderlandGateway);
  });

  // -- subscribe:feed -------------------------------------------------------

  test('handleSubscribeFeed with no seedId joins "feed:global" room', () => {
    const gateway = new WunderlandGateway();
    const socket = createMockSocket();

    gateway.handleSubscribeFeed(socket, {});

    assert.ok(socket.rooms.has('feed:global'));
  });

  test('handleSubscribeFeed with a seedId joins "feed:{seedId}" room', () => {
    const gateway = new WunderlandGateway();
    const socket = createMockSocket();

    gateway.handleSubscribeFeed(socket, { seedId: 'agent-alice' });

    assert.ok(socket.rooms.has('feed:agent-alice'));
    assert.equal(
      socket.rooms.has('feed:global'),
      false,
      'should not join global when seedId is provided'
    );
  });

  test('handleSubscribeFeed returns acknowledgement with subscribed: true', () => {
    const gateway = new WunderlandGateway();
    const socket = createMockSocket();

    const result = gateway.handleSubscribeFeed(socket, {});

    assert.deepEqual(result, { event: 'subscribe:feed', data: { subscribed: true } });
  });

  // -- subscribe:approval ---------------------------------------------------

  test('handleSubscribeApproval with no ownerId returns subscribed: false with reason', () => {
    const gateway = new WunderlandGateway();
    const socket = createMockSocket();
    socket.data = { user: { authenticated: true, userId: 'user-1' } };

    const result = gateway.handleSubscribeApproval(socket, { ownerId: '' });

    assert.deepEqual(result, {
      event: 'subscribe:approval',
      data: { subscribed: false, reason: 'ownerId required' },
    });
    assert.equal(socket.rooms.size, 0, 'should not join any room');
  });

  test('handleSubscribeApproval with unauthenticated socket returns subscribed: false', () => {
    const gateway = new WunderlandGateway();
    const socket = createMockSocket();

    const result = gateway.handleSubscribeApproval(socket, { ownerId: 'user-42' });

    assert.deepEqual(result, {
      event: 'subscribe:approval',
      data: { subscribed: false, reason: 'authentication required' },
    });
    assert.equal(socket.rooms.size, 0, 'should not join any room');
  });

  test('handleSubscribeApproval with authenticated socket and valid ownerId joins "approval:{ownerId}" room', () => {
    const gateway = new WunderlandGateway();
    const socket = createMockSocket();
    socket.data = { user: { authenticated: true, userId: 'user-42' } };

    const result = gateway.handleSubscribeApproval(socket, { ownerId: 'user-42' });

    assert.ok(socket.rooms.has('approval:user-42'));
    assert.deepEqual(result, { event: 'subscribe:approval', data: { subscribed: true } });
  });

  // -- subscribe:voting -----------------------------------------------------

  test('handleSubscribeVoting with no proposalId joins "voting:global" room', () => {
    const gateway = new WunderlandGateway();
    const socket = createMockSocket();

    gateway.handleSubscribeVoting(socket, {});

    assert.ok(socket.rooms.has('voting:global'));
  });

  test('handleSubscribeVoting with proposalId joins "voting:{proposalId}" room', () => {
    const gateway = new WunderlandGateway();
    const socket = createMockSocket();

    gateway.handleSubscribeVoting(socket, { proposalId: 'prop-99' });

    assert.ok(socket.rooms.has('voting:prop-99'));
    assert.equal(
      socket.rooms.has('voting:global'),
      false,
      'should not join global when proposalId is provided'
    );
  });

  // -- broadcastNewPost -----------------------------------------------------

  test('broadcastNewPost emits to "feed:global" and "feed:{seedId}" rooms', () => {
    const gateway = new WunderlandGateway();
    const mockServer = createMockServer();
    (gateway as any).server = mockServer;

    const post = {
      postId: 'p1',
      seedId: 'agent-bob',
      preview: 'Hello world',
      timestamp: '2026-01-01T00:00:00Z',
    };
    gateway.broadcastNewPost(post);

    assert.equal(mockServer.emitted.length, 2);
    assert.deepEqual(mockServer.emitted[0], {
      room: 'feed:global',
      event: 'feed:new-post',
      data: post,
    });
    assert.deepEqual(mockServer.emitted[1], {
      room: 'feed:agent-bob',
      event: 'feed:new-post',
      data: post,
    });
  });

  // -- broadcastEngagement --------------------------------------------------

  test('broadcastEngagement emits to "feed:global" room', () => {
    const gateway = new WunderlandGateway();
    const mockServer = createMockServer();
    (gateway as any).server = mockServer;

    const engagement = { postId: 'p1', action: 'like', count: 5 };
    gateway.broadcastEngagement(engagement);

    assert.equal(mockServer.emitted.length, 1);
    assert.deepEqual(mockServer.emitted[0], {
      room: 'feed:global',
      event: 'feed:engagement',
      data: engagement,
    });
  });

  // -- broadcastApprovalEvent -----------------------------------------------

  test('broadcastApprovalEvent emits "approval:pending" when action is "pending"', () => {
    const gateway = new WunderlandGateway();
    const mockServer = createMockServer();
    (gateway as any).server = mockServer;

    const event = { queueId: 'q1', action: 'pending', seedId: 'agent-eve' };
    gateway.broadcastApprovalEvent('owner-1', event);

    assert.equal(mockServer.emitted.length, 1);
    assert.deepEqual(mockServer.emitted[0], {
      room: 'approval:owner-1',
      event: 'approval:pending',
      data: event,
    });
  });

  test('broadcastApprovalEvent emits "approval:resolved" when action is not "pending"', () => {
    const gateway = new WunderlandGateway();
    const mockServer = createMockServer();
    (gateway as any).server = mockServer;

    const event = { queueId: 'q2', action: 'approved', resolvedBy: 'admin-1' };
    gateway.broadcastApprovalEvent('owner-2', event);

    assert.equal(mockServer.emitted.length, 1);
    assert.deepEqual(mockServer.emitted[0], {
      room: 'approval:owner-2',
      event: 'approval:resolved',
      data: event,
    });
  });

  // -- broadcastVotingUpdate ------------------------------------------------

  test('broadcastVotingUpdate emits to "voting:global" and "voting:{proposalId}" rooms', () => {
    const gateway = new WunderlandGateway();
    const mockServer = createMockServer();
    (gateway as any).server = mockServer;

    const update = { proposalId: 'prop-7', status: 'closed', tallies: { For: 10, Against: 3 } };
    gateway.broadcastVotingUpdate(update);

    assert.equal(mockServer.emitted.length, 2);
    assert.deepEqual(mockServer.emitted[0], {
      room: 'voting:global',
      event: 'voting:proposal-update',
      data: update,
    });
    assert.deepEqual(mockServer.emitted[1], {
      room: 'voting:prop-7',
      event: 'voting:proposal-update',
      data: update,
    });
  });
});

// ── 3. Controller Delegation Tests ──────────────────────────────────────────

describe('AgentRegistryController', () => {
  test('listAgents() delegates to AgentRegistryService', async () => {
    const expected = { items: [], page: 1, limit: 25, total: 0 };
    const controller = new AgentRegistryController({
      listAgents: async () => expected,
    } as unknown as AgentRegistryService);
    const result = await controller.listAgents({ page: 1, limit: 25 } as any);

    assert.deepEqual(result, expected);
  });

  test('registerAgent() delegates to AgentRegistryService', async () => {
    const expected = { agent: { seedId: 'seed-1' } };
    const controller = new AgentRegistryController({
      registerAgent: async () => expected,
    } as unknown as AgentRegistryService);
    const result = await controller.registerAgent(
      {
        mode: 'standard',
        tier: 'metered',
        subscriptionStatus: 'active',
      } as any,
      'user-1',
      {
        seedId: 'seed-1',
        displayName: 'Seed One',
        bio: 'Bio',
        systemPrompt: 'You are a helpful agent.',
        personality: {
          honesty: 0.5,
          emotionality: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          conscientiousness: 0.5,
          openness: 0.5,
        },
        security: { preLlmClassifier: true, dualLlmAuditor: true, outputSigning: false },
        capabilities: [],
      } as any
    );

    assert.deepEqual(result, expected);
  });
});

describe('SocialFeedController', () => {
  test('getFeed() delegates to SocialFeedService', async () => {
    const expected = { items: [], page: 1, limit: 10, total: 0 };
    const controller = new SocialFeedController({
      getFeed: async () => expected,
    } as unknown as SocialFeedService);
    const result = await controller.getFeed({ page: 1, limit: 10 } as any);

    assert.deepEqual(result, expected);
  });
});

describe('VotingController', () => {
  test('listProposals() delegates to VotingService', async () => {
    const expected = { items: [], page: 1, limit: 10, total: 0 };
    const controller = new VotingController({
      listProposals: async () => expected,
    } as unknown as VotingService);
    const result = await controller.listProposals({ page: 1, limit: 10 } as any);

    assert.deepEqual(result, expected);
  });

  test('castVote() delegates to VotingService', async () => {
    const expected = { vote: { voteId: 'vote-1' }, proposal: { proposalId: 'prop-1' } };
    const controller = new VotingController({
      castVote: async () => expected,
    } as unknown as VotingService);
    const result = await controller.castVote('user-1', 'prop-1', {
      option: 'For',
      seedId: 'seed-1',
    } as any);

    assert.deepEqual(result, expected);
  });
});
