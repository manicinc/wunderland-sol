import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/solana-server', () => ({
  getAllAgentsServer: vi.fn(),
  getAllPostsServer: vi.fn(),
  getLeaderboardServer: vi.fn(),
  getNetworkGraphServer: vi.fn(),
  getNetworkStatsServer: vi.fn(),
}));

import { GET as getAgents } from '@/app/api/agents/route';
import { GET as getPosts } from '@/app/api/posts/route';
import { GET as getLeaderboard } from '@/app/api/leaderboard/route';
import { GET as getNetwork } from '@/app/api/network/route';
import { GET as getStats } from '@/app/api/stats/route';

import {
  getAllAgentsServer,
  getAllPostsServer,
  getLeaderboardServer,
  getNetworkGraphServer,
  getNetworkStatsServer,
} from '@/lib/solana-server';

function createRequest(url: string): Request {
  return new Request(url);
}

async function asJson<T>(response: Response): Promise<{ status: number; body: T }> {
  return { status: response.status, body: (await response.json()) as T };
}

describe('API routes (on-chain only)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET /api/agents returns agents + total', async () => {
    vi.mocked(getAllAgentsServer).mockResolvedValueOnce([
      {
        address: 'Agent111111111111111111111111111111111111111',
        owner: 'Owner111111111111111111111111111111111111111',
        name: 'Alpha',
        traits: {
          honestyHumility: 0.5,
          emotionality: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          conscientiousness: 0.5,
          openness: 0.5,
        },
        level: 'Newcomer',
        reputation: 0,
        totalPosts: 0,
        createdAt: new Date(0).toISOString(),
        isActive: true,
      },
    ]);

    const res = await getAgents(createRequest('http://localhost:3000/api/agents'));
    const { status, body } = await asJson<{ agents: unknown[]; total: number }>(res);

    expect(status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.agents).toHaveLength(1);
  });

  it('GET /api/agents filters by owner', async () => {
    vi.mocked(getAllAgentsServer).mockResolvedValueOnce([
      {
        address: 'AgentA',
        owner: 'OwnerA',
        name: 'Alpha',
        traits: {
          honestyHumility: 0.5,
          emotionality: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          conscientiousness: 0.5,
          openness: 0.5,
        },
        level: 'Newcomer',
        reputation: 0,
        totalPosts: 0,
        createdAt: new Date(0).toISOString(),
        isActive: true,
      },
      {
        address: 'AgentB',
        owner: 'OwnerB',
        name: 'Beta',
        traits: {
          honestyHumility: 0.5,
          emotionality: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          conscientiousness: 0.5,
          openness: 0.5,
        },
        level: 'Newcomer',
        reputation: 0,
        totalPosts: 0,
        createdAt: new Date(0).toISOString(),
        isActive: true,
      },
    ]);

    const res = await getAgents(createRequest('http://localhost:3000/api/agents?owner=OwnerB'));
    const { status, body } = await asJson<{ agents: { address: string }[]; total: number }>(res);

    expect(status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.agents).toHaveLength(1);
    expect(body.agents[0].address).toBe('AgentB');
  });

  it('GET /api/posts validates query params', async () => {
    vi.mocked(getAllPostsServer).mockResolvedValueOnce([]);

    await getPosts(createRequest('http://localhost:3000/api/posts?limit=12&agent=AgentABC'));

    expect(getAllPostsServer).toHaveBeenCalledWith({
      limit: 12,
      agentAddress: 'AgentABC',
      kind: 'post',
    });
  });

  it('GET /api/posts defaults limit on invalid values', async () => {
    vi.mocked(getAllPostsServer).mockResolvedValueOnce([]);

    await getPosts(createRequest('http://localhost:3000/api/posts?limit=0'));

    expect(getAllPostsServer).toHaveBeenCalledWith({
      limit: 20,
      agentAddress: undefined,
      kind: 'post',
    });
  });

  it('GET /api/posts accepts kind=comment', async () => {
    vi.mocked(getAllPostsServer).mockResolvedValueOnce([]);

    await getPosts(createRequest('http://localhost:3000/api/posts?kind=comment'));

    expect(getAllPostsServer).toHaveBeenCalledWith({
      limit: 20,
      agentAddress: undefined,
      kind: 'comment',
    });
  });

  it('GET /api/posts returns posts + total', async () => {
    vi.mocked(getAllPostsServer).mockResolvedValueOnce([
      {
        id: 'Post1111111111111111111111111111111111111111',
        agentPda: 'Agent111111111111111111111111111111111111111',
        agentName: 'Alpha',
        agentLevel: 'Newcomer',
        agentTraits: {
          honestyHumility: 0.5,
          emotionality: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          conscientiousness: 0.5,
          openness: 0.5,
        },
        enclavePda: 'Enclave1111111111111111111111111111111111111',
        kind: 'post',
        postIndex: 1,
        content: '',
        contentHash: '00'.repeat(32),
        manifestHash: '11'.repeat(32),
        upvotes: 0,
        downvotes: 0,
        commentCount: 0,
        timestamp: new Date(0).toISOString(),
        createdSlot: 0,
      },
    ]);

    const res = await getPosts(createRequest('http://localhost:3000/api/posts?limit=1'));
    const { status, body } = await asJson<{ posts: unknown[]; total: number }>(res);

    expect(status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.posts).toHaveLength(1);
  });

  it('GET /api/leaderboard returns leaderboard + total', async () => {
    vi.mocked(getLeaderboardServer).mockResolvedValueOnce([
      {
        address: 'Agent111111111111111111111111111111111111111',
        owner: 'Owner111111111111111111111111111111111111111',
        name: 'Alpha',
        traits: {
          honestyHumility: 0.5,
          emotionality: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          conscientiousness: 0.5,
          openness: 0.5,
        },
        level: 'Newcomer',
        reputation: 0,
        totalPosts: 0,
        createdAt: new Date(0).toISOString(),
        isActive: true,
        rank: 1,
        dominantTrait: 'Openness',
      },
    ]);

    const res = await getLeaderboard();
    const { status, body } = await asJson<{ leaderboard: unknown[]; total: number }>(res);

    expect(status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.leaderboard).toHaveLength(1);
  });

  it('GET /api/network returns nodes + edges', async () => {
    vi.mocked(getNetworkGraphServer).mockResolvedValueOnce({
      nodes: [{ id: 'a', name: 'Alpha', level: 'Newcomer', reputation: 0 }],
      edges: [{ from: 'a', to: 'b', up: 1, down: 0, net: 1 }],
    });

    const res = await getNetwork();
    const { status, body } = await asJson<{ nodes: unknown[]; edges: unknown[] }>(res);

    expect(status).toBe(200);
    expect(body.nodes).toHaveLength(1);
    expect(body.edges).toHaveLength(1);
  });

  it('GET /api/stats returns totals', async () => {
    vi.mocked(getNetworkStatsServer).mockResolvedValueOnce({
      totalAgents: 0,
      totalPosts: 0,
      totalVotes: 0,
      averageReputation: 0,
      activeAgents: 0,
    });

    const res = await getStats();
    const { status, body } = await asJson<Record<string, unknown>>(res);

    expect(status).toBe(200);
    expect(body).toHaveProperty('totalAgents');
    expect(body).toHaveProperty('totalPosts');
    expect(body).toHaveProperty('totalVotes');
  });
});
