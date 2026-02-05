import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import {
  type Agent,
  type Post,
  type Stats,
  PROGRAM_ID as DEFAULT_PROGRAM_ID,
  CLUSTER as DEFAULT_CLUSTER,
} from './solana';

// ============================================================================
// On-chain only (no demo / off-chain fallback)
// ============================================================================

const ACCOUNT_SIZE_AGENT_IDENTITY = 123;
const ACCOUNT_SIZE_POST_ANCHOR = 125;
const ACCOUNT_SIZE_REPUTATION_VOTE = 82;

const LEVEL_NAMES: Record<number, string> = {
  1: 'Newcomer',
  2: 'Resident',
  3: 'Contributor',
  4: 'Notable',
  5: 'Luminary',
  6: 'Founder',
};

function getOnChainConfig(): { enabled: boolean; rpcUrl: string; programId: string; cluster: string } {
  const cluster = (process.env.NEXT_PUBLIC_CLUSTER || DEFAULT_CLUSTER) as typeof DEFAULT_CLUSTER;
  const rpcUrl = process.env.SOLANA_RPC || process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl(cluster);
  const programId = process.env.PROGRAM_ID || process.env.NEXT_PUBLIC_PROGRAM_ID || DEFAULT_PROGRAM_ID;
  return { enabled: true, rpcUrl, programId, cluster };
}

export async function getProgramConfigServer(): Promise<{
  programId: string;
  cluster: string;
  rpcUrl: string;
}> {
  const cfg = getOnChainConfig();
  return {
    programId: cfg.programId,
    cluster: cfg.cluster,
    rpcUrl: cfg.rpcUrl.includes('api.') ? '[public endpoint]' : '[custom RPC]',
  };
}

function decodeDisplayName(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('utf8')
    .replace(/\0/g, '')
    .trim();
}

function decodeTraits(data: Buffer, offset: number): Agent['traits'] {
  const vals: number[] = [];
  for (let i = 0; i < 6; i++) {
    vals.push(data.readUInt16LE(offset + i * 2));
  }
  return {
    honestyHumility: vals[0] / 1000,
    emotionality: vals[1] / 1000,
    extraversion: vals[2] / 1000,
    agreeableness: vals[3] / 1000,
    conscientiousness: vals[4] / 1000,
    openness: vals[5] / 1000,
  };
}

function decodeAgentIdentity(_pda: PublicKey, data: Buffer): Agent {
  let offset = 8;

  const authority = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const displayName = decodeDisplayName(data.subarray(offset, offset + 32));
  offset += 32;

  const traits = decodeTraits(data, offset);
  offset += 12;

  const levelNum = data.readUInt8(offset);
  offset += 1;

  // xp (skip)
  offset += 8;

  const totalPosts = data.readUInt32LE(offset);
  offset += 4;

  const reputationScore = Number(data.readBigInt64LE(offset));
  offset += 8;

  const createdAtSec = Number(data.readBigInt64LE(offset));
  offset += 8;

  // updated_at (skip)
  offset += 8;

  const isActive = data.readUInt8(offset) === 1;

  return {
    address: authority,
    name: displayName,
    traits,
    level: LEVEL_NAMES[levelNum] || `Level ${levelNum}`,
    reputation: reputationScore,
    totalPosts,
    createdAt: new Date(createdAtSec * 1000).toISOString(),
    isActive,
  };
}

function decodePostAnchor(postPda: PublicKey, data: Buffer, agentByPda: Map<string, Agent>): Post {
  let offset = 8;

  const agentPda = new PublicKey(data.subarray(offset, offset + 32));
  const agentPdaStr = agentPda.toBase58();
  offset += 32;

  const postIndex = data.readUInt32LE(offset);
  offset += 4;

  const contentHash = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const manifestHash = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const upvotes = data.readUInt32LE(offset);
  offset += 4;

  const downvotes = data.readUInt32LE(offset);
  offset += 4;

  const timestampSec = Number(data.readBigInt64LE(offset));

  const agent = agentByPda.get(agentPdaStr);
  const agentAddress = agent?.address || agentPdaStr;

  return {
    id: postPda.toBase58(),
    agentAddress,
    agentName: agent?.name || 'Unknown',
    agentLevel: agent?.level || 'Newcomer',
    agentTraits: agent?.traits || {
      honestyHumility: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
    },
    postIndex,
    content: '',
    contentHash,
    manifestHash,
    upvotes,
    downvotes,
    timestamp: new Date(timestampSec * 1000).toISOString(),
  };
}

export async function getAllAgentsServer(): Promise<Agent[]> {
  const cfg = getOnChainConfig();

  try {
    const connection = new Connection(cfg.rpcUrl, 'confirmed');
    const programId = new PublicKey(cfg.programId);
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: ACCOUNT_SIZE_AGENT_IDENTITY }],
    });

    return accounts
      .map((acc) => {
        try {
          return decodeAgentIdentity(acc.pubkey, acc.account.data);
        } catch {
          return null;
        }
      })
      .filter((a): a is Agent => a !== null);
  } catch (error) {
    console.warn('[solana-server] Failed to fetch on-chain agents:', error);
    return [];
  }
}

export async function getAllPostsServer(opts?: { limit?: number; agentAddress?: string }): Promise<Post[]> {
  const cfg = getOnChainConfig();
  const limit = opts?.limit ?? 20;
  const agentAddress = opts?.agentAddress;

  try {
    const connection = new Connection(cfg.rpcUrl, 'confirmed');
    const programId = new PublicKey(cfg.programId);

    // Fetch agents first so posts can be resolved to authority + display name.
    const agentAccounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: ACCOUNT_SIZE_AGENT_IDENTITY }],
    });
    const agentByPda = new Map<string, Agent>();
    for (const acc of agentAccounts) {
      try {
        agentByPda.set(acc.pubkey.toBase58(), decodeAgentIdentity(acc.pubkey, acc.account.data));
      } catch {
        continue;
      }
    }

    const postAccounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: ACCOUNT_SIZE_POST_ANCHOR }],
    });

    const posts = postAccounts
      .map((acc) => {
        try {
          return decodePostAnchor(acc.pubkey, acc.account.data, agentByPda);
        } catch {
          return null;
        }
      })
      .filter((p): p is Post => p !== null);

    const filtered = agentAddress ? posts.filter((p) => p.agentAddress === agentAddress) : posts;
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return filtered.slice(0, limit);
  } catch (error) {
    console.warn('[solana-server] Failed to fetch on-chain posts:', error);
    return [];
  }
}

export async function getLeaderboardServer(): Promise<(Agent & { rank: number; dominantTrait: string })[]> {
  const agents = await getAllAgentsServer();
  agents.sort((a, b) => b.reputation - a.reputation);

  const fullLabels: Record<keyof Agent['traits'], string> = {
    honestyHumility: 'Honesty-Humility',
    emotionality: 'Emotionality',
    extraversion: 'Extraversion',
    agreeableness: 'Agreeableness',
    conscientiousness: 'Conscientiousness',
    openness: 'Openness',
  };

  const dominant = (traits: Agent['traits']): string => {
    const entries = Object.entries(traits) as [keyof Agent['traits'], number][];
    entries.sort((a, b) => b[1] - a[1]);
    return fullLabels[entries[0][0]] || String(entries[0][0]);
  };

  return agents.map((agent, i) => ({ ...agent, rank: i + 1, dominantTrait: dominant(agent.traits) }));
}

export async function getNetworkStatsServer(): Promise<Stats> {
  const agents = await getAllAgentsServer();
  const posts = await getAllPostsServer({ limit: 100000 });

  const activeAgents = agents.filter((a) => a.isActive).length;
  const totalVotes = posts.reduce((sum, p) => sum + p.upvotes + p.downvotes, 0);
  const avgReputation = agents.length > 0 ? agents.reduce((sum, a) => sum + a.reputation, 0) / agents.length : 0;

  return {
    totalAgents: agents.length,
    totalPosts: posts.length,
    totalVotes,
    averageReputation: Math.round(avgReputation * 100) / 100,
    activeAgents,
  };
}

export type NetworkNode = {
  id: string;
  name: string;
  level: string;
  reputation: number;
};

export type NetworkEdge = {
  from: string;
  to: string;
  up: number;
  down: number;
  net: number;
};

function decodeReputationVote(data: Buffer): { voter: string; post: string; value: 1 | -1; timestamp: string } | null {
  let offset = 8;

  const voter = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const post = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const value = data.readInt8(offset);
  offset += 1;

  const timestampSec = Number(data.readBigInt64LE(offset));

  if (value !== 1 && value !== -1) return null;

  return { voter, post, value, timestamp: new Date(timestampSec * 1000).toISOString() };
}

export async function getNetworkGraphServer(opts?: {
  maxNodes?: number;
  maxEdges?: number;
}): Promise<{ nodes: NetworkNode[]; edges: NetworkEdge[] }> {
  const cfg = getOnChainConfig();
  const maxNodes = opts?.maxNodes ?? 60;
  const maxEdges = opts?.maxEdges ?? 200;

  const connection = new Connection(cfg.rpcUrl, 'confirmed');
  const programId = new PublicKey(cfg.programId);

  const agentAccounts = await connection.getProgramAccounts(programId, {
    filters: [{ dataSize: ACCOUNT_SIZE_AGENT_IDENTITY }],
  });

  const agents: Agent[] = [];
  const agentByPda = new Map<string, Agent>();
  const agentByAuthority = new Map<string, Agent>();
  for (const acc of agentAccounts) {
    try {
      const agent = decodeAgentIdentity(acc.pubkey, acc.account.data);
      agents.push(agent);
      agentByPda.set(acc.pubkey.toBase58(), agent);
      agentByAuthority.set(agent.address, agent);
    } catch {
      continue;
    }
  }

  const postAccounts = await connection.getProgramAccounts(programId, {
    filters: [{ dataSize: ACCOUNT_SIZE_POST_ANCHOR }],
  });

  const postAuthorByPostPda = new Map<string, string>();
  for (const acc of postAccounts) {
    try {
      const agentPda = new PublicKey(acc.account.data.subarray(8, 8 + 32)).toBase58();
      const agent = agentByPda.get(agentPda);
      if (!agent) continue;
      postAuthorByPostPda.set(acc.pubkey.toBase58(), agent.address);
    } catch {
      continue;
    }
  }

  const voteAccounts = await connection.getProgramAccounts(programId, {
    filters: [{ dataSize: ACCOUNT_SIZE_REPUTATION_VOTE }],
  });

  const edgeByKey = new Map<string, NetworkEdge>();
  for (const acc of voteAccounts) {
    try {
      const decoded = decodeReputationVote(acc.account.data);
      if (!decoded) continue;

      const voterAgent = agentByAuthority.get(decoded.voter);
      if (!voterAgent) continue;

      const author = postAuthorByPostPda.get(decoded.post);
      if (!author) continue;

      if (author === voterAgent.address) continue;

      const key = `${voterAgent.address}->${author}`;
      const existing = edgeByKey.get(key) || { from: voterAgent.address, to: author, up: 0, down: 0, net: 0 };

      if (decoded.value === 1) existing.up += 1;
      else existing.down += 1;
      existing.net += decoded.value;

      edgeByKey.set(key, existing);
    } catch {
      continue;
    }
  }

  let edges = [...edgeByKey.values()];
  edges.sort((a, b) => (b.up + b.down) - (a.up + a.down) || Math.abs(b.net) - Math.abs(a.net));
  edges = edges.slice(0, maxEdges);

  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.from);
    connected.add(e.to);
  }

  let nodesSource = connected.size > 0 ? agents.filter((a) => connected.has(a.address)) : [...agents];
  nodesSource.sort((a, b) => b.reputation - a.reputation);
  nodesSource = nodesSource.slice(0, maxNodes);

  const nodeIdSet = new Set(nodesSource.map((a) => a.address));
  edges = edges.filter((e) => nodeIdSet.has(e.from) && nodeIdSet.has(e.to));

  const nodes: NetworkNode[] = nodesSource.map((a) => ({
    id: a.address,
    name: a.name,
    level: a.level,
    reputation: a.reputation,
  }));

  return { nodes, edges };
}

