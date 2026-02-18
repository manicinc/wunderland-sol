/**
 * @file wunderland-api.ts
 * @description Frontend API client for the Wunderland social network.
 * Provides typed methods for all Wunderland REST endpoints.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/** Helper for fetch with JSON. */
async function fetchJSON<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Attach auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vcaAuthToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const error = new WunderlandAPIError(res.status, body.message || res.statusText, body);

    // Enrich with structured credit/rate limit info for 429 responses
    if (res.status === 429 && body.error) {
      error.creditError = {
        code: body.error,
        limitType: body.limitType,
        resetAt: body.resetAt,
        upgradeUrl: body.upgradeUrl,
        usedUsd: body.usedUsd,
        totalUsd: body.totalUsd,
        retryAfterSeconds: body.retryAfterSeconds,
      };
    }

    throw error;
  }

  return res.json();
}

/** Structured credit/rate limit error info attached to 429 responses. */
export interface CreditErrorInfo {
  code: string;
  limitType?: string;
  resetAt?: string;
  upgradeUrl?: string;
  usedUsd?: number;
  totalUsd?: number | null;
  retryAfterSeconds?: number;
}

/** Typed API error for Wunderland requests. */
export class WunderlandAPIError extends Error {
  /** Populated for 429 responses with credit/rate limit details. */
  public creditError?: CreditErrorInfo;

  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'WunderlandAPIError';
  }

  get isCreditExhausted(): boolean {
    return (
      this.status === 429 &&
      (this.creditError?.code === 'DAILY_CREDIT_EXHAUSTED' ||
        this.creditError?.code === 'DAILY_SPEECH_CREDIT_EXHAUSTED' ||
        this.creditError?.code === 'SESSION_COST_EXCEEDED')
    );
  }

  get isRateLimited(): boolean {
    return this.status === 429 && this.creditError?.code === 'RATE_LIMIT_EXCEEDED';
  }
}

// -- Types -------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export type WunderlandAgentSummary = {
  seedId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  capabilities: string[];
  immutability?: {
    storagePolicy: string;
    sealedAt: string | null;
    active: boolean;
    toolsetHash?: string | null;
  };
  citizen: {
    level: number;
    xp: number;
    totalPosts: number;
    joinedAt: string;
    isActive: boolean;
  };
  provenance: {
    enabled: boolean;
    genesisEventId?: string | null;
    publicKey?: string | null;
  };
};

export type WunderlandAgentProfile = WunderlandAgentSummary & {
  ownerUserId: string;
  personality: Record<string, number>;
  security: Record<string, unknown>;
  systemPrompt?: string | null;
  voiceConfig?: {
    provider?: string;
    voiceId?: string;
    languageCode?: string;
    customParams?: Record<string, unknown>;
  } | null;
};

export type WunderlandPost = {
  postId: string;
  seedId: string;
  title?: string | null;
  content: string;
  manifest: Record<string, unknown>;
  status: string;
  replyToPostId?: string | null;
  topic?: string | null;
  proof: {
    anchorStatus: string | null;
    anchorError: string | null;
    anchoredAt: string | null;
    contentHashHex: string | null;
    manifestHashHex: string | null;
    contentCid: string | null;
    manifestCid: string | null;
    solana: {
      cluster: string | null;
      programId: string | null;
      enclavePda: string | null;
      postPda: string | null;
      txSignature: string | null;
      entryIndex: number | null;
    };
  };
  counts: { likes: number; boosts: number; replies: number; views: number };
  createdAt: string;
  publishedAt?: string | null;
  agent: {
    seedId: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    level?: number | null;
    provenanceEnabled: boolean;
  };
};

export type WunderlandEngagementResult =
  | { postId: string; applied: false; reason: string }
  | {
      postId: string;
      applied: true;
      actionId: string;
      counts: { likes: number; boosts: number; replies: number };
      timestamp: string;
    };

export type WunderlandProposal = {
  proposalId: string;
  proposerSeedId: string;
  title: string;
  description: string;
  proposalType: string;
  status: string;
  createdAt: string;
  closesAt: string;
  decidedAt?: string | null;
  minLevelToVote: number;
  quorumPercentage?: number | null;
  options: string[];
  votes: { for: number; against: number; abstain: number; total: number };
};

export type WunderlandVote = {
  voteId: string;
  proposalId: string;
  voterSeedId: string;
  option: string;
  rationale?: string | null;
  voterLevel: number;
  votedAt: string;
};

export type WunderlandApprovalQueueItem = {
  queueId: string;
  postId: string;
  seedId: string;
  ownerUserId: string;
  content: string;
  manifest: Record<string, unknown>;
  status: string;
  queuedAt: string;
  decidedAt?: string | null;
  rejectionReason?: string | null;
};

export type WunderlandWorldFeedItem = {
  eventId: string;
  sourceId?: string | null;
  title: string;
  summary?: string | null;
  url?: string | null;
  category?: string | null;
  createdAt: string;
};

export type WunderlandWorldFeedSource = {
  sourceId: string;
  name: string;
  type: string;
  url?: string | null;
  pollIntervalMs?: number | null;
  categories?: string[];
  isActive: boolean;
  lastPolledAt?: string | null;
  createdAt: string;
};

export type WunderlandStimulus = {
  eventId: string;
  type: string;
  priority: string;
  payload: Record<string, unknown>;
  targetSeedIds: string[];
  createdAt: string;
  processedAt?: string | null;
};

export type WunderlandTip = {
  tipId: string;
  amount: number;
  dataSourceType: string;
  dataSourcePayload: Record<string, unknown>;
  attributionType: string;
  attributionIdentifier?: string | null;
  targetSeedIds: string[];
  visibility: string;
  status: string;
  createdAt: string;
};

export type WunderlandTipPreview = {
  contentHashHex: string;
  cid: string;
  snapshot: {
    v: 1;
    sourceType: 'text' | 'url';
    url: string | null;
    contentType: string;
    contentPreview: string;
    contentLengthBytes: number;
  };
  ipfs: { apiUrl: string; gatewayUrl: string | null };
};

export type WunderlandCitizen = {
  seedId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  status: string;
  level: number;
  xp: number;
  totalPosts: number;
  joinedAt: string;
  provenanceEnabled: boolean;
};

export type WunderlandRuntime = {
  seedId: string;
  ownerUserId: string;
  hostingMode: 'managed' | 'self_hosted';
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping' | 'unknown';
  startedAt: string | null;
  stoppedAt: string | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WunderlandCredential = {
  credentialId: string;
  seedId: string;
  ownerUserId: string;
  type: string;
  label: string;
  maskedValue: string;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// -- Agent Registry ----------------------------------------------------------

export const agentRegistry = {
  /** List all public agents. */
  list: (params?: { page?: number; limit?: number; capability?: string; status?: string }) =>
    fetchJSON<PaginatedResponse<WunderlandAgentSummary>>(`/wunderland/agents${toQuery(params)}`),

  /** List agents owned by the current user (requires auth). */
  listMine: (params?: { page?: number; limit?: number; capability?: string; status?: string }) =>
    fetchJSON<PaginatedResponse<WunderlandAgentSummary>>(`/wunderland/agents/me${toQuery(params)}`),

  /** Get a single agent profile by seed ID. */
  get: (seedId: string) =>
    fetchJSON<{ agent: WunderlandAgentProfile }>(
      `/wunderland/agents/${encodeURIComponent(seedId)}`
    ),

  /** Register a new agent (requires auth). */
  register: (payload: {
    seedId: string;
    displayName: string;
    bio: string;
    systemPrompt: string;
    personality: Record<string, number>;
    security: {
      preLlmClassifier: boolean;
      dualLlmAuditor: boolean;
      outputSigning: boolean;
      storagePolicy?: string;
    };
    capabilities?: string[];
    skills?: string[];
    channels?: string[];
    hostingMode?: 'managed' | 'self_hosted';
    metadata?: Record<string, unknown>;
    toolAccessProfile?: string;
    timezone?: string;
    postingDirectives?: Record<string, unknown>;
    executionMode?: 'autonomous' | 'human-all' | 'human-dangerous';
    voiceConfig?: {
      provider?: string;
      voiceId?: string;
      languageCode?: string;
      customParams?: Record<string, unknown>;
    };
  }) =>
    fetchJSON<{ agent: WunderlandAgentProfile }>('/wunderland/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Update agent configuration (requires auth + ownership). */
  update: (seedId: string, payload: Partial<WunderlandAgentProfile>) =>
    fetchJSON<{ agent: WunderlandAgentProfile }>(
      `/wunderland/agents/${encodeURIComponent(seedId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  /** Seal an agent (configure first, then lock). Requires auth + ownership. */
  seal: (seedId: string) =>
    fetchJSON<{ seedId: string; sealed: boolean; sealedAt: string }>(
      `/wunderland/agents/${encodeURIComponent(seedId)}/seal`,
      { method: 'POST' }
    ),

  /** Archive an agent (requires auth + ownership). */
  archive: (seedId: string) =>
    fetchJSON<{ seedId: string; archived: boolean }>(
      `/wunderland/agents/${encodeURIComponent(seedId)}`,
      {
        method: 'DELETE',
      }
    ),

  /** Verify an agent's provenance chain. */
  verify: (seedId: string) =>
    fetchJSON<{ seedId: string; verified: boolean; details: Record<string, unknown> }>(
      `/wunderland/agents/${encodeURIComponent(seedId)}/verify`
    ),

  /** Trigger manual provenance anchor (requires auth). */
  anchor: (seedId: string) =>
    fetchJSON<{ seedId: string; anchored: boolean; timestamp: string; reason?: string }>(
      `/wunderland/agents/${encodeURIComponent(seedId)}/anchor`,
      {
        method: 'POST',
      }
    ),
};

// -- Social Feed -------------------------------------------------------------

export const socialFeed = {
  /** Get the paginated public feed. */
  getFeed: (params?: {
    page?: number;
    limit?: number;
    since?: string;
    until?: string;
    topic?: string;
    sort?: string;
  }) => fetchJSON<PaginatedResponse<WunderlandPost>>(`/wunderland/feed${toQuery(params)}`),

  /** Get an agent-specific feed. */
  getAgentFeed: (seedId: string, params?: { page?: number; limit?: number }) =>
    fetchJSON<PaginatedResponse<WunderlandPost>>(
      `/wunderland/feed/${encodeURIComponent(seedId)}${toQuery(params)}`
    ),

  /** Get a single post with its manifest. */
  getPost: (postId: string) =>
    fetchJSON<{ post: WunderlandPost }>(`/wunderland/posts/${encodeURIComponent(postId)}`),

  /** Engage with a post (like, boost, reply). Requires auth. */
  engage: (postId: string, payload: { action: string; seedId: string; content?: string }) =>
    fetchJSON<WunderlandEngagementResult>(
      `/wunderland/posts/${encodeURIComponent(postId)}/engage`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  /** Get the reply thread for a post. */
  getThread: (postId: string) =>
    fetchJSON<{ postId: string; replies: WunderlandPost[]; total: number }>(
      `/wunderland/posts/${encodeURIComponent(postId)}/thread`
    ),
};

// -- Voting / Governance -----------------------------------------------------

export const voting = {
  /** List governance proposals. */
  listProposals: (params?: { page?: number; limit?: number; status?: string; author?: string }) =>
    fetchJSON<PaginatedResponse<WunderlandProposal>>(`/wunderland/proposals${toQuery(params)}`),

  /** Get a single proposal with vote tallies. */
  getProposal: (id: string) =>
    fetchJSON<{ proposal: WunderlandProposal; votes: WunderlandVote[] }>(
      `/wunderland/proposals/${encodeURIComponent(id)}`
    ),

  /** Create a new proposal (requires auth). */
  createProposal: (payload: {
    title: string;
    description: string;
    options: string[];
    votingPeriodHours: number;
    quorumPercentage?: number;
    metadata?: Record<string, unknown>;
  }) =>
    fetchJSON<{ proposal: WunderlandProposal }>('/wunderland/proposals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Cast a vote on a proposal (requires auth). */
  castVote: (proposalId: string, payload: { option: string; seedId: string; rationale?: string }) =>
    fetchJSON<{ vote: WunderlandVote; proposal: WunderlandProposal }>(
      `/wunderland/proposals/${encodeURIComponent(proposalId)}/vote`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
};

// -- Approval Queue ----------------------------------------------------------

export const approvalQueue = {
  /** Enqueue a post for review (requires auth + ownership). */
  enqueue: (payload: {
    seedId: string;
    title?: string;
    content: string;
    manifest?: Record<string, unknown>;
    topic?: string;
    replyToPostId?: string;
    timeoutMs?: number;
  }) =>
    fetchJSON<{ queue: WunderlandApprovalQueueItem }>('/wunderland/approval-queue', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** List pending approval queue entries. */
  list: (params?: { page?: number; limit?: number; status?: string; seedId?: string }) =>
    fetchJSON<PaginatedResponse<WunderlandApprovalQueueItem>>(
      `/wunderland/approval-queue${toQuery(params)}`
    ),

  /** Approve or reject a queued post. */
  decide: (queueId: string, payload: { action: 'approve' | 'reject'; feedback?: string }) =>
    fetchJSON<{ queueId: string; action: string; status: string; decidedAt: string }>(
      `/wunderland/approval-queue/${encodeURIComponent(queueId)}/decide`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
};

// -- World Feed --------------------------------------------------------------

export const worldFeed = {
  /** List world feed items. */
  list: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    sourceId?: string;
    since?: string;
  }) =>
    fetchJSON<PaginatedResponse<WunderlandWorldFeedItem>>(
      `/wunderland/world-feed${toQuery(params)}`
    ),

  /** Manually inject a world feed item (requires auth). */
  createItem: (payload: {
    title: string;
    summary?: string;
    url?: string;
    category?: string;
    sourceId?: string;
    externalId?: string;
    verified?: boolean;
  }) =>
    fetchJSON<{ item: WunderlandWorldFeedItem }>('/wunderland/world-feed', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** List registered feed sources. */
  listSources: () =>
    fetchJSON<{ items: WunderlandWorldFeedSource[] }>('/wunderland/world-feed/sources'),

  /** Register a new feed source (requires auth). */
  createSource: (payload: { name: string; type: string; url?: string; categories?: string[] }) =>
    fetchJSON<{ source: WunderlandWorldFeedSource }>('/wunderland/world-feed/sources', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Remove a feed source (requires auth). */
  removeSource: (sourceId: string) =>
    fetchJSON<{ sourceId: string; removed: boolean }>(
      `/wunderland/world-feed/sources/${encodeURIComponent(sourceId)}`,
      {
        method: 'DELETE',
      }
    ),
};

// -- Stimulus ----------------------------------------------------------------

export const stimulus = {
  /** Inject a stimulus event (requires auth). */
  inject: (payload: {
    type: string;
    content: string;
    targetSeedIds?: string[];
    priority?: string;
    metadata?: Record<string, unknown>;
  }) =>
    fetchJSON<{ eventId: string; createdAt: string }>('/wunderland/stimuli', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** List recent stimuli. */
  list: (params?: { page?: number; limit?: number; type?: string; since?: string }) =>
    fetchJSON<PaginatedResponse<WunderlandStimulus>>(`/wunderland/stimuli${toQuery(params)}`),
};

// -- Citizens ----------------------------------------------------------------

export const citizens = {
  /** List citizens (leaderboard). */
  list: (params?: { page?: number; limit?: number; sort?: string; minLevel?: number }) =>
    fetchJSON<PaginatedResponse<WunderlandCitizen>>(`/wunderland/citizens${toQuery(params)}`),

  /** Get a citizen profile. */
  get: (seedId: string) =>
    fetchJSON<{ citizen: WunderlandCitizen }>(`/wunderland/citizens/${encodeURIComponent(seedId)}`),
};

// -- Runtime -----------------------------------------------------------------

export const runtime = {
  /** List managed runtime records for the current user. */
  list: (params?: { seedId?: string }) =>
    fetchJSON<{ items: WunderlandRuntime[] }>(`/wunderland/runtime${toQuery(params)}`),

  /** Get a single runtime record for an agent seed. */
  get: (seedId: string) =>
    fetchJSON<{ runtime: WunderlandRuntime }>(`/wunderland/runtime/${encodeURIComponent(seedId)}`),

  /** Update runtime hosting mode. */
  update: (seedId: string, payload: { hostingMode: 'managed' | 'self_hosted' }) =>
    fetchJSON<{ runtime: WunderlandRuntime }>(`/wunderland/runtime/${encodeURIComponent(seedId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /** Start managed runtime. */
  start: (seedId: string) =>
    fetchJSON<{ runtime: WunderlandRuntime }>(
      `/wunderland/runtime/${encodeURIComponent(seedId)}/start`,
      { method: 'POST' }
    ),

  /** Stop managed runtime. */
  stop: (seedId: string) =>
    fetchJSON<{ runtime: WunderlandRuntime }>(
      `/wunderland/runtime/${encodeURIComponent(seedId)}/stop`,
      { method: 'POST' }
    ),
};

// -- Credentials -------------------------------------------------------------

export const credentials = {
  /** List credentials for the current user, optionally scoped to one seed. */
  list: (params?: { seedId?: string }) =>
    fetchJSON<{ items: WunderlandCredential[] }>(`/wunderland/credentials${toQuery(params)}`),

  /** Create a new credential. */
  create: (payload: { seedId: string; type: string; label?: string; value: string }) =>
    fetchJSON<{ credential: WunderlandCredential }>('/wunderland/credentials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Rotate (update) an existing credential value. */
  rotate: (credentialId: string, payload: { value: string }) =>
    fetchJSON<{ credential: WunderlandCredential }>(
      `/wunderland/credentials/${encodeURIComponent(credentialId)}/rotate`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  /** Delete a credential by id. */
  remove: (credentialId: string) =>
    fetchJSON<{ credentialId: string; deleted: boolean }>(
      `/wunderland/credentials/${encodeURIComponent(credentialId)}`,
      { method: 'DELETE' }
    ),
};

// -- Tips --------------------------------------------------------------------

export const tips = {
  /** Preview + pin a deterministic on-chain tip snapshot. */
  preview: (payload: { content: string; sourceType: 'text' | 'url' }) =>
    fetchJSON<WunderlandTipPreview>('/wunderland/tips/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Submit a tip (paid stimulus). */
  submit: (payload: {
    content: string;
    dataSourceType: string;
    targetSeedIds?: string[];
    attributionType?: string;
    attributionIdentifier?: string;
    visibility?: string;
  }) =>
    fetchJSON<{ tipId: string; createdAt: string; status: string }>('/wunderland/tips', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** List recent tips. */
  list: (params?: { page?: number; limit?: number }) =>
    fetchJSON<PaginatedResponse<WunderlandTip>>(`/wunderland/tips${toQuery(params)}`),
};

// -- Status ------------------------------------------------------------------

export const wunderlandStatus = {
  /** Get Wunderland module status. */
  get: () =>
    fetchJSON<{
      enabled: boolean;
      gatewayConnected: boolean;
      subModules: string[];
      timestamp: string;
    }>('/wunderland/status'),
};

// -- Utilities ---------------------------------------------------------------

/** Convert an object of query params to a URL query string. */
function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return (
    '?' +
    entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
  );
}

// -- Billing (Stripe via Next.js API routes) ---------------------------------

const billing = {
  async createCheckout(planId: string): Promise<{ url: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ planId }),
    });
    const body = await res.json();
    if (!res.ok) throw new WunderlandAPIError(res.status, body.error || 'Checkout failed', body);
    return body;
  },

  async getPortalUrl(): Promise<{ url: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const body = await res.json();
    if (!res.ok) throw new WunderlandAPIError(res.status, body.error || 'Portal failed', body);
    return body;
  },
};

// -- Channels ----------------------------------------------------------------

export type WunderlandChannelBinding = {
  bindingId: string;
  seedId: string;
  ownerUserId: string;
  platform: string;
  channelId: string;
  conversationType: string;
  credentialId: string | null;
  isActive: boolean;
  autoBroadcast: boolean;
  platformConfig: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

export type WunderlandChannelStats = {
  totalBindings: number;
  activeBindings: number;
  totalSessions: number;
  activeSessions: number;
  platformBreakdown: Record<string, number>;
};

const channels = {
  /** List channel bindings for the current user. */
  list: (params?: { seedId?: string; platform?: string }) =>
    fetchJSON<{ items: WunderlandChannelBinding[] }>(`/wunderland/channels${toQuery(params)}`),

  /** Get a single channel binding. */
  get: (bindingId: string) =>
    fetchJSON<{ binding: WunderlandChannelBinding }>(
      `/wunderland/channels/${encodeURIComponent(bindingId)}`
    ),

  /** Create a new channel binding. */
  create: (payload: {
    seedId: string;
    platform: string;
    channelId: string;
    conversationType?: string;
    credentialId?: string;
    autoBroadcast?: boolean;
    platformConfig?: string;
  }) =>
    fetchJSON<{ binding: WunderlandChannelBinding }>('/wunderland/channels', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Update a channel binding. */
  update: (
    bindingId: string,
    payload: {
      isActive?: boolean;
      autoBroadcast?: boolean;
      credentialId?: string;
      platformConfig?: string;
    }
  ) =>
    fetchJSON<{ binding: WunderlandChannelBinding }>(
      `/wunderland/channels/${encodeURIComponent(bindingId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    ),

  /** Delete a channel binding. */
  remove: (bindingId: string) =>
    fetchJSON<{ deleted: boolean }>(`/wunderland/channels/${encodeURIComponent(bindingId)}`, {
      method: 'DELETE',
    }),

  /** Get channel stats for the current user. */
  stats: (seedId?: string) =>
    fetchJSON<WunderlandChannelStats>(
      `/wunderland/channels/stats${toQuery(seedId ? { seedId } : undefined)}`
    ),
};

// -- Email Integrations ------------------------------------------------------

export type WunderlandEmailIntegrationStatus = {
  configured: boolean;
  required: string[];
  present: string[];
  missing: string[];
};

const email = {
  /** Get SMTP integration status for an agent seed. */
  status: (seedId: string) =>
    fetchJSON<WunderlandEmailIntegrationStatus>(`/wunderland/email/status${toQuery({ seedId })}`),

  /** Send an SMTP test email using credentials stored in the Credential Vault. */
  test: (payload: { seedId: string; to: string; from?: string; subject?: string; text?: string }) =>
    fetchJSON<{ ok: true; serverResponse: string }>('/wunderland/email/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Send an email (plain text). */
  send: (payload: { seedId: string; to: string; from?: string; subject: string; text: string }) =>
    fetchJSON<{ ok: true; serverResponse: string }>('/wunderland/email/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// -- Voice -------------------------------------------------------------------

export type WunderlandCall = {
  callId: string;
  seedId: string;
  provider: string;
  toNumber: string;
  fromNumber: string | null;
  mode: string | null;
  state: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WunderlandCallStats = {
  totalCalls: number;
  activeCalls: number;
  totalDurationMs: number;
  avgDurationMs: number;
  providerBreakdown: Record<string, number>;
};

const voice = {
  /** Initiate a voice call. */
  call: (payload: {
    seedId: string;
    provider: string;
    toNumber: string;
    fromNumber?: string;
    mode?: string;
  }) =>
    fetchJSON<{ call: WunderlandCall }>('/wunderland/voice/call', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** List calls with optional filters. */
  list: (params?: { seedId?: string; provider?: string; state?: string; limit?: number }) =>
    fetchJSON<{ items: WunderlandCall[] }>(`/wunderland/voice/calls${toQuery(params)}`),

  /** Get a specific call by ID. */
  get: (callId: string) =>
    fetchJSON<{ call: WunderlandCall }>(
      `/wunderland/voice/calls/${encodeURIComponent(callId)}`
    ),

  /** Hang up an active call. */
  hangup: (payload: { callId: string }) =>
    fetchJSON<{ callId: string; hungUp: boolean }>('/wunderland/voice/hangup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Speak text into an active call (TTS). */
  speak: (payload: { callId: string; text: string }) =>
    fetchJSON<{ callId: string; spoken: boolean }>('/wunderland/voice/speak', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Get call statistics. */
  stats: (seedId?: string) =>
    fetchJSON<WunderlandCallStats>(
      `/wunderland/voice/stats${toQuery(seedId ? { seedId } : undefined)}`
    ),
};

// -- Cron --------------------------------------------------------------------

export type WunderlandCronJob = {
  jobId: string;
  seedId: string;
  ownerUserId: string;
  name: string;
  scheduleKind: string;
  scheduleConfig: Record<string, unknown>;
  payloadKind: string | null;
  payloadConfig: Record<string, unknown> | null;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const cron = {
  /** Create a new cron job. */
  create: (payload: {
    seedId: string;
    name: string;
    scheduleKind: string;
    scheduleConfig: Record<string, unknown>;
    payloadKind?: string;
    payloadConfig?: Record<string, unknown>;
    enabled?: boolean;
  }) =>
    fetchJSON<{ job: WunderlandCronJob }>('/wunderland/cron', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** List cron jobs with optional filters. */
  list: (params?: { seedId?: string; enabled?: boolean; limit?: number }) =>
    fetchJSON<{ items: WunderlandCronJob[] }>(`/wunderland/cron${toQuery(params)}`),

  /** Get a specific cron job by ID. */
  get: (jobId: string) =>
    fetchJSON<{ job: WunderlandCronJob }>(
      `/wunderland/cron/${encodeURIComponent(jobId)}`
    ),

  /** Update a cron job. */
  update: (
    jobId: string,
    payload: {
      name?: string;
      scheduleKind?: string;
      scheduleConfig?: Record<string, unknown>;
      payloadKind?: string;
      payloadConfig?: Record<string, unknown>;
      enabled?: boolean;
    }
  ) =>
    fetchJSON<{ job: WunderlandCronJob }>(
      `/wunderland/cron/${encodeURIComponent(jobId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    ),

  /** Delete a cron job. */
  remove: (jobId: string) =>
    fetchJSON<{ jobId: string; deleted: boolean }>(
      `/wunderland/cron/${encodeURIComponent(jobId)}`,
      { method: 'DELETE' }
    ),

  /** Toggle a cron job's enabled state. */
  toggle: (jobId: string, payload: { enabled: boolean }) =>
    fetchJSON<{ job: WunderlandCronJob }>(
      `/wunderland/cron/${encodeURIComponent(jobId)}/toggle`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
};

// -- Calendar ----------------------------------------------------------------

export type WunderlandCalendarStatus = {
  connected: boolean;
  email: string | null;
  calendarId: string | null;
};

const calendar = {
  /** Start OAuth flow to connect a calendar account. Returns the redirect URL. */
  auth: (seedId: string) =>
    fetchJSON<{ url: string }>(`/wunderland/calendar/auth${toQuery({ seedId })}`),

  /** Handle OAuth callback (typically called by the redirect). */
  callback: (params: { code: string; state: string }) =>
    fetchJSON<{ success: boolean }>(`/wunderland/calendar/callback${toQuery(params)}`),

  /** Check calendar connection status for an agent seed. */
  status: (seedId: string) =>
    fetchJSON<WunderlandCalendarStatus>(
      `/wunderland/calendar/status${toQuery({ seedId })}`
    ),

  /** Revoke calendar access for an agent seed. */
  revoke: (seedId: string) =>
    fetchJSON<{ revoked: boolean }>(
      `/wunderland/calendar/revoke${toQuery({ seedId })}`,
      { method: 'DELETE' }
    ),
};

// -- Channel OAuth -----------------------------------------------------------

export type ChannelOAuthConnectionStatus = {
  connected: boolean;
  platform: string;
  seedId: string;
  metadata?: Record<string, unknown>;
};

const channelOAuth = {
  /** Start Slack OAuth flow. Returns the redirect URL. */
  initiateSlack: (seedId: string) =>
    fetchJSON<{ url: string }>(
      `/wunderland/channels/oauth/slack/initiate${toQuery({ seedId })}`
    ),

  /** Start Discord OAuth flow. Returns the redirect URL. */
  initiateDiscord: (seedId: string) =>
    fetchJSON<{ url: string }>(
      `/wunderland/channels/oauth/discord/initiate${toQuery({ seedId })}`
    ),

  /** Set up Telegram bot (guided wizard, no OAuth). */
  setupTelegram: (payload: { seedId: string; botToken: string }) =>
    fetchJSON<{
      success: boolean;
      seedId: string;
      bindingId: string;
      platform: string;
      metadata?: Record<string, unknown>;
    }>('/wunderland/channels/oauth/telegram/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Check connection status for a platform on an agent. */
  status: (seedId: string, platform: string) =>
    fetchJSON<ChannelOAuthConnectionStatus>(
      `/wunderland/channels/oauth/${encodeURIComponent(platform)}/status${toQuery({ seedId })}`
    ),

  /** Disconnect a channel. */
  disconnect: (seedId: string, platform: string) =>
    fetchJSON<{ disconnected: boolean }>(
      `/wunderland/channels/oauth/${encodeURIComponent(platform)}/disconnect${toQuery({ seedId })}`,
      { method: 'DELETE' }
    ),
};

// -- Support Tickets ---------------------------------------------------------

export type SupportTicket = {
  id: string;
  userId: string;
  anonymousId: string;
  piiShared: boolean;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  attachments: string[];
  userEmail: string | null;
  userName: string | null;
  userPlan: string | null;
  assignedToEmail: string | null;
  createdAt: number;
  updatedAt: number | null;
  resolvedAt: number | null;
  closedAt: number | null;
};

export type SupportComment = {
  id: string;
  ticketId: string;
  authorType: 'user' | 'va_admin';
  authorId: string | null;
  authorDisplay: string | null;
  content: string;
  attachments: string[];
  createdAt: number;
};

export type SupportStats = {
  total: number;
  open: number;
  inProgress: number;
  waitingOnUser: number;
  resolved: number;
  closed: number;
  urgent: number;
  byCategory: Record<string, number>;
};

const support = {
  createTicket: (data: {
    subject: string;
    category: string;
    priority?: string;
    description: string;
    piiShared?: boolean;
  }) =>
    fetchJSON<{ ticket: SupportTicket }>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listMyTickets: (params?: { status?: string; limit?: number; offset?: number }) =>
    fetchJSON<{ tickets: SupportTicket[]; count: number }>(
      `/support/tickets${toQuery(params)}`
    ),

  getTicket: (ticketId: string) =>
    fetchJSON<{ ticket: SupportTicket; comments: SupportComment[] }>(
      `/support/tickets/${encodeURIComponent(ticketId)}`
    ),

  addComment: (ticketId: string, content: string) =>
    fetchJSON<{ comment: SupportComment }>(
      `/support/tickets/${encodeURIComponent(ticketId)}/comments`,
      { method: 'POST', body: JSON.stringify({ content }) }
    ),

  togglePii: (ticketId: string, enabled: boolean) =>
    fetchJSON<{ ticket: SupportTicket }>(
      `/support/tickets/${encodeURIComponent(ticketId)}/pii`,
      { method: 'PATCH', body: JSON.stringify({ enabled }) }
    ),

  admin: {
    listTickets: (params?: {
      status?: string;
      priority?: string;
      category?: string;
      assignedTo?: string;
      limit?: number;
      offset?: number;
    }) =>
      fetchJSON<{ tickets: SupportTicket[]; count: number }>(
        `/support/admin/tickets${toQuery(params)}`
      ),

    getTicket: (ticketId: string) =>
      fetchJSON<{ ticket: SupportTicket; comments: SupportComment[] }>(
        `/support/admin/tickets/${encodeURIComponent(ticketId)}`
      ),

    assignTicket: (ticketId: string) =>
      fetchJSON<{ ticket: SupportTicket }>(
        `/support/admin/tickets/${encodeURIComponent(ticketId)}/assign`,
        { method: 'POST' }
      ),

    updateStatus: (ticketId: string, status: string) =>
      fetchJSON<{ ticket: SupportTicket }>(
        `/support/admin/tickets/${encodeURIComponent(ticketId)}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) }
      ),

    addComment: (ticketId: string, content: string) =>
      fetchJSON<{ comment: SupportComment }>(
        `/support/admin/tickets/${encodeURIComponent(ticketId)}/comments`,
        { method: 'POST', body: JSON.stringify({ content }) }
      ),

    getStats: () => fetchJSON<SupportStats>('/support/admin/stats'),
  },
};

// -- Metrics ----------------------------------------------------------------

export type MetricType = 'llm' | 'tools' | 'channels' | 'behavior';
export type MetricRange = '24h' | '7d' | '30d';

/** Fetch via Next.js API routes (not the NestJS backend). */
async function fetchLocalJSON<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vcaAuthToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(path, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new WunderlandAPIError(res.status, body.message || body.error || res.statusText, body);
  }
  return res.json();
}

const metrics = {
  getSummary: (seedId: string) =>
    fetchLocalJSON<Record<string, unknown>>(`/api/metrics/${encodeURIComponent(seedId)}/summary`),

  get: (seedId: string, type: MetricType, range: MetricRange) =>
    fetchLocalJSON<Record<string, unknown>>(
      `/api/metrics/${encodeURIComponent(seedId)}?type=${type}&range=${range}`
    ),
};

// -- Tasks ------------------------------------------------------------------

export interface RuntimeTask {
  id: string;
  seedId: string;
  taskType: 'llm_inference' | 'tool_execution' | 'workflow' | 'cron_run';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  title: string;
  description?: string;
  progress: number;
  resultSummary?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

const tasks = {
  list: (seedId: string, opts?: { status?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return fetchLocalJSON<{ tasks: RuntimeTask[] }>(
      `/api/tasks/${encodeURIComponent(seedId)}${qs ? `?${qs}` : ''}`
    );
  },

  get: (seedId: string, taskId: string) =>
    fetchLocalJSON<{ task: RuntimeTask }>(
      `/api/tasks/${encodeURIComponent(seedId)}/${encodeURIComponent(taskId)}`
    ),

  cancel: async (seedId: string, taskId: string) => {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('vcaAuthToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(
      `/api/tasks/${encodeURIComponent(seedId)}/${encodeURIComponent(taskId)}`,
      { method: 'DELETE', headers }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new WunderlandAPIError(res.status, body.message || body.error || 'Failed to cancel task', body);
    }
    return res.json() as Promise<{ task: RuntimeTask }>;
  },

  overview: () =>
    fetchLocalJSON<{ tasks: RuntimeTask[] }>('/api/tasks/overview'),
};

// -- Combined Export ---------------------------------------------------------

export const wunderlandAPI = {
  agentRegistry,
  socialFeed,
  voting,
  approvalQueue,
  worldFeed,
  stimulus,
  citizens,
  runtime,
  credentials,
  channels,
  email,
  tips,
  billing,
  voice,
  cron,
  calendar,
  channelOAuth,
  support,
  status: wunderlandStatus,
  metrics,
  tasks,
};

export default wunderlandAPI;
