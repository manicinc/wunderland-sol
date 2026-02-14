// File: backend/src/core/database/appDatabase.ts
/**
 * @file appDatabase.ts
 * @description Provides an asynchronous storage abstraction for authentication and billing data.
 * The module resolves the best available adapter (Postgres -> better-sqlite3 -> Capacitor -> sql.js) and exposes
 * helper utilities for the rest of the backend.
 */

import fs from 'fs';
import path from 'path';
import { generateUniqueId as uuidv4 } from '../../utils/ids.js';
import { resolveStorageAdapter, type StorageAdapter } from '@framers/sql-storage-adapter';

type StorageAdapterResolver = (
  options?: Parameters<typeof resolveStorageAdapter>[0]
) => Promise<StorageAdapter>;

let storageAdapterResolver: StorageAdapterResolver = resolveStorageAdapter;

export const __setAppDatabaseAdapterResolverForTests = (
  resolver?: StorageAdapterResolver
): void => {
  storageAdapterResolver = resolver ?? resolveStorageAdapter;
};

const DB_DIR = path.join(process.cwd(), 'db_data');
const DB_PATH = path.join(DB_DIR, 'app.sqlite3');

let adapter: StorageAdapter | null = null;
let initPromise: Promise<void> | null = null;
let usingInMemory = false;

const SQLITE_KINDS = ['better-sqlite3', 'sqljs', 'capacitor-sqlite'];

const ensureDirectory = (): void => {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`[AppDatabase] Created directory ${DB_DIR}`);
  }
};

const runInitialSchema = async (db: StorageAdapter): Promise<void> => {
  const isSQLite = SQLITE_KINDS.includes(db.kind);

  if (isSQLite) {
    await db.exec('PRAGMA foreign_keys = ON;');
    if (db.capabilities.has('wal')) {
      await db.exec('PRAGMA journal_mode = WAL;');
    }
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      supabase_user_id TEXT,
      subscription_status TEXT DEFAULT 'none',
      subscription_tier TEXT DEFAULT 'metered',
      subscription_plan_id TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_renews_at INTEGER,
      subscription_expires_at INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_login_at INTEGER,
      last_login_ip TEXT,
      metadata TEXT
    );
  `);

  await db.exec('CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);');
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_app_users_subscription ON app_users(subscription_status);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_app_users_supabase ON app_users(supabase_user_id);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS login_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      mode TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id, created_at DESC);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS global_access_logs (
      id TEXT PRIMARY KEY,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_global_access_logs_ip ON global_access_logs(ip_address, created_at DESC);'
  );

  // ── Usage Daily Ledger (persists credit allocation usage across restarts) ──
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usage_daily_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      allocation_key TEXT NOT NULL,
      llm_used_usd REAL NOT NULL DEFAULT 0,
      speech_used_usd REAL NOT NULL DEFAULT 0,
      request_count INTEGER NOT NULL DEFAULT 0,
      last_updated_at INTEGER NOT NULL,
      UNIQUE(user_id, date_key)
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_usage_ledger_user_date ON usage_daily_ledger(user_id, date_key DESC);'
  );

  // ── Wunderland Agent Social Network Tables ────────────────────────────

  // Governance proposals (must be created before wunderland_votes due to FK)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_proposals (
      proposal_id TEXT PRIMARY KEY,
      proposer_seed_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      proposal_type TEXT NOT NULL,
      options_json TEXT,
      quorum_percentage REAL,
      metadata TEXT,
      status TEXT DEFAULT 'open',
      votes_for INTEGER DEFAULT 0,
      votes_against INTEGER DEFAULT 0,
      votes_abstain INTEGER DEFAULT 0,
      min_level_to_vote INTEGER DEFAULT 3,
      created_at INTEGER NOT NULL,
      closes_at INTEGER NOT NULL,
      decided_at INTEGER
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_proposals_status ON wunderland_proposals(status);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_proposals_proposer ON wunderland_proposals(proposer_seed_id);'
  );

	  // Agent registry — linked to AgentOS provenance (genesis events, Ed25519 keys)
	  await db.exec(`
		    CREATE TABLE IF NOT EXISTS wunderbots (
		      seed_id TEXT PRIMARY KEY,
		      owner_user_id TEXT NOT NULL,
		      display_name TEXT NOT NULL,
		      bio TEXT,
		      avatar_url TEXT,
	      hexaco_traits TEXT NOT NULL,
	      security_profile TEXT NOT NULL,
	      inference_hierarchy TEXT NOT NULL,
		      step_up_auth_config TEXT,
		      base_system_prompt TEXT,
		      allowed_tool_ids TEXT,
		      toolset_manifest_json TEXT,
		      toolset_hash TEXT,
		      genesis_event_id TEXT,
		      public_key TEXT,
		      storage_policy TEXT DEFAULT 'sealed',
		      sealed_at INTEGER,
		      provenance_enabled INTEGER DEFAULT 1,
		      status TEXT DEFAULT 'active',
		      created_at INTEGER NOT NULL,
		      updated_at INTEGER NOT NULL,
		      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE
		    );
		  `);
	  await db.exec(
	    'CREATE INDEX IF NOT EXISTS idx_wunderbots_owner ON wunderbots(owner_user_id);'
	  );
	  await db.exec(
	    'CREATE INDEX IF NOT EXISTS idx_wunderbots_status ON wunderbots(status);'
	  );

	  // Managed runtime status and hosting mode per agent.
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderbot_runtime (
	      seed_id TEXT PRIMARY KEY,
	      owner_user_id TEXT NOT NULL,
	      hosting_mode TEXT NOT NULL DEFAULT 'managed',
	      status TEXT NOT NULL DEFAULT 'stopped',
      started_at INTEGER,
	      stopped_at INTEGER,
	      last_error TEXT,
	      metadata TEXT,
	      created_at INTEGER NOT NULL,
	      updated_at INTEGER NOT NULL,
	      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE,
	      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE
	    );
	  `);
	  await db.exec(
	    'CREATE INDEX IF NOT EXISTS idx_wunderbot_runtime_owner ON wunderbot_runtime(owner_user_id);'
	  );
	  await db.exec(
	    'CREATE INDEX IF NOT EXISTS idx_wunderbot_runtime_status ON wunderbot_runtime(status);'
	  );

	  // Stored integration credentials per agent (encrypted server-side, masked in API responses).
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderbot_credentials (
	      credential_id TEXT PRIMARY KEY,
	      seed_id TEXT NOT NULL,
	      owner_user_id TEXT NOT NULL,
	      credential_type TEXT NOT NULL,
      label TEXT,
      encrypted_value TEXT NOT NULL,
	      masked_value TEXT NOT NULL,
	      last_used_at INTEGER,
	      created_at INTEGER NOT NULL,
	      updated_at INTEGER NOT NULL,
	      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE,
	      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE
	    );
	  `);
	  await db.exec(
	    'CREATE INDEX IF NOT EXISTS idx_wunderbot_credentials_owner ON wunderbot_credentials(owner_user_id, seed_id);'
	  );

    // Managed Solana agent signer custody (for hosted/managed agents).
    //
    // Stores the agent signer secret key encrypted at rest so the backend can:
    // - anchor posts/comments on-chain (ed25519 authorization)
    // - bid/submit jobs on-chain as the agent
    // - rotate the agent signer key programmatically
    //
    // Notes:
    // - This is optional; self-hosted agents will not have a row here.
    // - `seed_id` may be the AgentIdentity PDA itself, or an off-chain seed ID that maps to it.
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderland_sol_agent_signers (
	      seed_id TEXT PRIMARY KEY,
	      agent_identity_pda TEXT NOT NULL,
	      owner_wallet TEXT NOT NULL,
	      agent_signer_pubkey TEXT NOT NULL,
	      encrypted_signer_secret_key TEXT NOT NULL,
	      created_at INTEGER NOT NULL,
	      updated_at INTEGER NOT NULL,
	      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE
	    );
	  `);
	  await db.exec(
	    'CREATE UNIQUE INDEX IF NOT EXISTS idx_wunderland_sol_agent_signers_pda ON wunderland_sol_agent_signers(agent_identity_pda);'
	  );
	  await db.exec(
	    'CREATE INDEX IF NOT EXISTS idx_wunderland_sol_agent_signers_owner ON wunderland_sol_agent_signers(owner_wallet);'
	  );

  // Citizen profiles — public identity + XP leveling system
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderland_citizens (
	      seed_id TEXT PRIMARY KEY,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      total_posts INTEGER NOT NULL DEFAULT 0,
      post_rate_limit INTEGER DEFAULT 10,
	      subscribed_topics TEXT,
	      is_active INTEGER DEFAULT 1,
	      joined_at INTEGER NOT NULL,
	      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE
	    );
	  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_citizens_level ON wunderland_citizens(level DESC, xp DESC);'
  );

  // Posts with InputManifest cryptographic provenance proofs
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderland_posts (
	      post_id TEXT PRIMARY KEY,
	      seed_id TEXT NOT NULL,
      content TEXT NOT NULL,
      manifest TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'drafting',
      reply_to_post_id TEXT,
      agent_level_at_post INTEGER,
      likes INTEGER DEFAULT 0,
      downvotes INTEGER DEFAULT 0,
      boosts INTEGER DEFAULT 0,
	      replies INTEGER DEFAULT 0,
	      views INTEGER DEFAULT 0,
	      created_at INTEGER NOT NULL,
	      published_at INTEGER,
	      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE,
	      FOREIGN KEY (reply_to_post_id) REFERENCES wunderland_posts(post_id) ON DELETE SET NULL
	    );
	  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_posts_seed ON wunderland_posts(seed_id, created_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_posts_status ON wunderland_posts(status, published_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_posts_reply ON wunderland_posts(reply_to_post_id);'
  );

  // Engagement actions (likes, boosts, replies, views, reports)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_engagement_actions (
      action_id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      actor_seed_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (post_id) REFERENCES wunderland_posts(post_id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_engagement_post ON wunderland_engagement_actions(post_id, type);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_engagement_actor ON wunderland_engagement_actions(actor_seed_id);'
  );

  // Human owner approval queue for agent posts
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderland_approval_queue (
      queue_id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      seed_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      manifest TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      timeout_ms INTEGER DEFAULT 300000,
      queued_at INTEGER NOT NULL,
      decided_at INTEGER,
      rejection_reason TEXT,
      FOREIGN KEY (post_id) REFERENCES wunderland_posts(post_id) ON DELETE CASCADE,
      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_approval_owner ON wunderland_approval_queue(owner_user_id, status);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_approval_status ON wunderland_approval_queue(status, queued_at);'
  );

  // Stimulus events (world feed, tips, agent replies, cron ticks, internal thoughts)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_stimuli (
      event_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      payload TEXT NOT NULL,
      source_provider_id TEXT,
      source_external_id TEXT,
      source_verified INTEGER DEFAULT 0,
      target_seed_ids TEXT,
      created_at INTEGER NOT NULL,
      processed_at INTEGER
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_stimuli_type ON wunderland_stimuli(type, created_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_stimuli_processed ON wunderland_stimuli(processed_at);'
  );

  // Tips — paid stimuli from users to agents
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_tips (
      tip_id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL,
      data_source_type TEXT NOT NULL,
      data_source_payload TEXT NOT NULL,
      attribution_type TEXT DEFAULT 'anonymous',
      attribution_identifier TEXT,
      target_seed_ids TEXT,
      visibility TEXT DEFAULT 'public',
      status TEXT DEFAULT 'queued',
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_tips_status ON wunderland_tips(status, created_at DESC);'
  );

  // Governance votes on proposals
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_votes (
      vote_id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      voter_seed_id TEXT NOT NULL,
      vote TEXT NOT NULL,
      reasoning TEXT,
      voter_level INTEGER NOT NULL,
      voted_at INTEGER NOT NULL,
      FOREIGN KEY (proposal_id) REFERENCES wunderland_proposals(proposal_id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_votes_proposal ON wunderland_votes(proposal_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_votes_voter ON wunderland_votes(voter_seed_id);'
  );
  await db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_wunderland_votes_unique ON wunderland_votes(proposal_id, voter_seed_id);'
  );

  // World feed sources (RSS, API, webhook)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_world_feed_sources (
      source_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT,
      poll_interval_ms INTEGER DEFAULT 300000,
      categories TEXT,
      is_active INTEGER DEFAULT 1,
      last_polled_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_wfs_active ON wunderland_world_feed_sources(is_active);'
  );

  // Seed default world feed sources if table is empty
  const feedCount = await db.get<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM wunderland_world_feed_sources'
  );
  if (!feedCount || feedCount.cnt === 0) {
    const now = Date.now();
    const defaultFeeds = [
      { id: 'hn-front', name: 'Hacker News', type: 'rss', url: 'https://hnrss.org/frontpage?count=20', categories: '["technology","programming","startups"]', interval: 300000 },
      { id: 'arxiv-cs-ai', name: 'ArXiv CS.AI', type: 'rss', url: 'https://rss.arxiv.org/rss/cs.AI', categories: '["ai","machine-learning","research"]', interval: 600000 },
      { id: 'arxiv-cs-cl', name: 'ArXiv CS.CL', type: 'rss', url: 'https://rss.arxiv.org/rss/cs.CL', categories: '["nlp","linguistics","ai"]', interval: 600000 },
      { id: 'lobsters', name: 'Lobste.rs', type: 'rss', url: 'https://lobste.rs/rss', categories: '["technology","programming"]', interval: 300000 },
      { id: 'solana-blog', name: 'Solana Blog', type: 'rss', url: 'https://solana.com/news/rss.xml', categories: '["solana","blockchain","web3"]', interval: 900000 },
    ];
    for (const f of defaultFeeds) {
      await db.run(
        `INSERT OR IGNORE INTO wunderland_world_feed_sources
          (source_id, name, type, url, poll_interval_ms, categories, is_active, last_polled_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?)`,
        [f.id, f.name, f.type, f.url, f.interval, f.categories, now]
      );
    }
  }

  // Always ensure additional sources exist (INSERT OR IGNORE is idempotent).
  {
    const now = Date.now();
    const additionalFeeds = [
      { id: 'reddit-popular', name: 'Reddit Popular', type: 'rss', url: 'https://www.reddit.com/r/popular/.rss', categories: '["general","social","trending"]', interval: 600000 },
      { id: 'reddit-technology', name: 'Reddit Technology', type: 'rss', url: 'https://www.reddit.com/r/technology/.rss', categories: '["technology","science"]', interval: 600000 },
      { id: 'reddit-artificial', name: 'Reddit AI', type: 'rss', url: 'https://www.reddit.com/r/artificial/.rss', categories: '["ai","machine-learning"]', interval: 600000 },
      { id: 'google-news-tech', name: 'Google News Technology', type: 'rss', url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB', categories: '["technology","news"]', interval: 900000 },
      { id: 'google-news-ai', name: 'Google News AI', type: 'rss', url: 'https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en', categories: '["ai","technology","news"]', interval: 900000 },
      { id: 'techcrunch', name: 'TechCrunch', type: 'rss', url: 'https://techcrunch.com/feed/', categories: '["technology","startups","venture-capital"]', interval: 600000 },
      { id: 'ars-technica', name: 'Ars Technica', type: 'rss', url: 'https://feeds.arstechnica.com/arstechnica/index', categories: '["technology","science","gaming"]', interval: 600000 },
      { id: 'coindesk', name: 'CoinDesk', type: 'rss', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', categories: '["crypto","blockchain","web3"]', interval: 600000 },
    ];
    for (const f of additionalFeeds) {
      await db.run(
        `INSERT OR IGNORE INTO wunderland_world_feed_sources
          (source_id, name, type, url, poll_interval_ms, categories, is_active, last_polled_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?)`,
        [f.id, f.name, f.type, f.url, f.interval, f.categories, now]
      );
    }
  }

  // ── Wunderland Channel System Tables ─────────────────────────────────

  // OAuth state cache for Slack/Discord multi-tenant channel connect flows.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_channel_oauth_states (
      state_id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      seed_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      consumed INTEGER DEFAULT 0,
      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE,
      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_channel_oauth_states_exp ON wunderland_channel_oauth_states(expires_at, consumed);'
  );

	  // Channel bindings — link agents to external messaging platforms
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderland_channel_bindings (
      binding_id TEXT PRIMARY KEY,
      seed_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      conversation_type TEXT DEFAULT 'direct',
      credential_id TEXT,
      is_active INTEGER DEFAULT 1,
      auto_broadcast INTEGER DEFAULT 0,
	      platform_config TEXT DEFAULT '{}',
	      created_at INTEGER NOT NULL,
	      updated_at INTEGER NOT NULL,
	      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE,
	      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE,
	      UNIQUE(seed_id, platform, channel_id)
	    );
	  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cb_seed ON wunderland_channel_bindings(seed_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cb_platform ON wunderland_channel_bindings(platform, channel_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cb_owner ON wunderland_channel_bindings(owner_user_id);'
  );

  // Channel sessions — track conversations between agents and remote users
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderland_channel_sessions (
      session_id TEXT PRIMARY KEY,
      seed_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      conversation_type TEXT DEFAULT 'direct',
      remote_user_id TEXT,
      remote_user_name TEXT,
      last_message_at INTEGER NOT NULL,
      message_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
	      context_json TEXT DEFAULT '{}',
	      created_at INTEGER NOT NULL,
	      updated_at INTEGER NOT NULL,
	      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE
	    );
	  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cs_seed ON wunderland_channel_sessions(seed_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cs_platform ON wunderland_channel_sessions(platform, conversation_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cs_active ON wunderland_channel_sessions(is_active, last_message_at DESC);'
  );

  // ── Wunderland Voice Calls ──────────────────────────────────────────

  // Voice calls — track phone call state and transcripts
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderland_voice_calls (
      call_id TEXT PRIMARY KEY,
      seed_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'twilio',
      provider_call_id TEXT,
      direction TEXT NOT NULL DEFAULT 'outbound',
      from_number TEXT DEFAULT '',
      to_number TEXT DEFAULT '',
      state TEXT NOT NULL DEFAULT 'initiated',
      mode TEXT NOT NULL DEFAULT 'notify',
      start_time INTEGER,
      end_time INTEGER,
	      transcript_json TEXT DEFAULT '[]',
	      metadata TEXT DEFAULT '{}',
	      created_at INTEGER NOT NULL,
	      updated_at INTEGER NOT NULL,
	      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE,
	      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE
	    );
	  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_vc_seed ON wunderland_voice_calls(seed_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_vc_owner ON wunderland_voice_calls(owner_user_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_vc_provider ON wunderland_voice_calls(provider, provider_call_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_vc_state ON wunderland_voice_calls(state, created_at DESC);'
  );

  // ── Wunderland Enclave System Tables ──────────────────────────────

  // Enclaves — topic-based communities within Wunderland
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_enclaves (
      enclave_id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      rules TEXT DEFAULT '[]',
      topic_tags TEXT DEFAULT '[]',
      creator_seed_id TEXT NOT NULL,
      post_count INTEGER DEFAULT 0,
      member_count INTEGER DEFAULT 0,
      min_level_to_post TEXT DEFAULT 'Newcomer',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Enclave membership
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_enclave_members (
      enclave_id TEXT NOT NULL,
      seed_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(enclave_id, seed_id)
    );
  `);

  // Threaded comments on posts
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_comments (
      comment_id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      parent_comment_id TEXT,
      seed_id TEXT NOT NULL,
      content TEXT NOT NULL,
      manifest TEXT DEFAULT '{}',
      depth INTEGER DEFAULT 0,
      path TEXT DEFAULT '',
      upvotes INTEGER DEFAULT 0,
      downvotes INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      wilson_score REAL DEFAULT 0.0,
      child_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_comments_post ON wunderland_comments(post_id, wilson_score DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_comments_path ON wunderland_comments(path);'
  );

  // Content votes (posts and comments)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_content_votes (
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      voter_seed_id TEXT NOT NULL,
      direction INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(entity_type, entity_id, voter_seed_id)
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_votes_entity ON wunderland_content_votes(entity_type, entity_id);'
  );

  // Emoji reactions (personality-driven reactions on posts and comments)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_emoji_reactions (
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      reactor_seed_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(entity_type, entity_id, reactor_seed_id, emoji)
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_emoji_reactions_entity ON wunderland_emoji_reactions(entity_type, entity_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_emoji_reactions_reactor ON wunderland_emoji_reactions(reactor_seed_id);'
  );

  // News articles ingested from external sources
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_news_articles (
      article_id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      url TEXT UNIQUE,
      doi TEXT,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      categories TEXT DEFAULT '[]',
      published_at TEXT,
      converted_to_stimulus INTEGER DEFAULT 0,
      content_hash TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_news_source ON wunderland_news_articles(source_type, published_at DESC);'
  );

	  // Agent mood snapshots (current state)
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderbot_moods (
	      seed_id TEXT PRIMARY KEY,
	      valence REAL DEFAULT 0.0,
	      arousal REAL DEFAULT 0.0,
	      dominance REAL DEFAULT 0.0,
      curiosity REAL DEFAULT 0.0,
      frustration REAL DEFAULT 0.0,
      mood_label TEXT DEFAULT 'neutral',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

	  // Agent mood history (time-series for analytics)
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderbot_mood_history (
	      entry_id TEXT PRIMARY KEY,
	      seed_id TEXT NOT NULL,
	      valence REAL,
      arousal REAL,
      dominance REAL,
      trigger_type TEXT,
      trigger_entity_id TEXT,
      delta_valence REAL,
      delta_arousal REAL,
      delta_dominance REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );
	  `);
	  await db.exec(
	    'CREATE INDEX IF NOT EXISTS idx_wunderland_mood_history_seed ON wunderbot_mood_history(seed_id, created_at DESC);'
	  );

  // ── Migrate old subreddit table/column names → enclave ──────────────
  // Handles both clean installs (no old tables) and upgrades (old tables exist).
  // If both old AND new tables exist (CREATE IF NOT EXISTS ran before RENAME),
  // copy data from old to new, then drop old.
  try {
    const hasOldTable = await db.get<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='wunderland_subreddits'`,
    );
    if (hasOldTable) {
      const hasNewTable = await db.get<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='wunderland_enclaves'`,
      );
      if (hasNewTable) {
        // Both exist — copy data from old to new, then drop old
        await db.exec(`INSERT OR IGNORE INTO wunderland_enclaves SELECT subreddit_id AS enclave_id, name, display_name, description, rules, topic_tags, creator_seed_id, post_count, member_count, min_level_to_post, status, created_at FROM wunderland_subreddits`);
        await db.exec(`DROP TABLE wunderland_subreddits`);
      } else {
        await db.exec(`ALTER TABLE wunderland_subreddits RENAME TO wunderland_enclaves`);
        await db.exec(`ALTER TABLE wunderland_enclaves RENAME COLUMN subreddit_id TO enclave_id`);
      }
    }
  } catch { /* already renamed or doesn't exist */ }

  try {
    const hasOldMembers = await db.get<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='wunderland_subreddit_members'`,
    );
    if (hasOldMembers) {
      const hasNewMembers = await db.get<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='wunderland_enclave_members'`,
      );
      if (hasNewMembers) {
        await db.exec(`INSERT OR IGNORE INTO wunderland_enclave_members SELECT subreddit_id AS enclave_id, seed_id, role, joined_at FROM wunderland_subreddit_members`);
        await db.exec(`DROP TABLE wunderland_subreddit_members`);
      } else {
        await db.exec(`ALTER TABLE wunderland_subreddit_members RENAME TO wunderland_enclave_members`);
        await db.exec(`ALTER TABLE wunderland_enclave_members RENAME COLUMN subreddit_id TO enclave_id`);
      }
    }
  } catch { /* already renamed or doesn't exist */ }

  try {
    // Rename subreddit_id → enclave_id on wunderland_posts (if the old column exists)
    const colInfo = await db.all<{ name: string }>(`PRAGMA table_info(wunderland_posts)`);
    const hasOldCol = colInfo?.some((c) => c.name === 'subreddit_id');
    if (hasOldCol) {
      await db.exec(`ALTER TABLE wunderland_posts RENAME COLUMN subreddit_id TO enclave_id`);
    }
  } catch { /* already renamed */ }

  console.log('[AppDatabase] Wunderland enclave system tables initialized.');

  // ── Wunderland Cron Jobs ────────────────────────────────────────────

	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderland_cron_jobs (
      job_id TEXT PRIMARY KEY,
      seed_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      description TEXT DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      schedule_kind TEXT NOT NULL DEFAULT 'every',
      schedule_config TEXT NOT NULL DEFAULT '{}',
      payload_kind TEXT NOT NULL DEFAULT 'stimulus',
	      payload_config TEXT NOT NULL DEFAULT '{}',
	      state_json TEXT DEFAULT '{}',
	      created_at INTEGER NOT NULL,
	      updated_at INTEGER NOT NULL,
	      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE,
	      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE
	    );
	  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cron_seed ON wunderland_cron_jobs(seed_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cron_owner ON wunderland_cron_jobs(owner_user_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cron_enabled ON wunderland_cron_jobs(enabled);'
  );

  console.log('[AppDatabase] Wunderland cron jobs table initialized.');

  // ── Wunderland Social Autonomy Tables ─────────────────────────────

  // Browsing sessions — track agent browsing activity across enclaves
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_browsing_sessions (
      session_id TEXT PRIMARY KEY,
      seed_id TEXT NOT NULL,
      enclaves_visited TEXT NOT NULL DEFAULT '[]',
      posts_read INTEGER DEFAULT 0,
      comments_written INTEGER DEFAULT 0,
      votes_cast INTEGER DEFAULT 0,
      emoji_reactions INTEGER DEFAULT 0,
      started_at INTEGER NOT NULL,
      finished_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_bs_seed ON wunderland_browsing_sessions(seed_id, finished_at DESC);'
  );

  // Trust scores — pairwise trust between agents
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_trust_scores (
      from_seed_id TEXT NOT NULL,
      to_seed_id TEXT NOT NULL,
      score REAL DEFAULT 0.5,
      interaction_count INTEGER DEFAULT 0,
      positive_engagements INTEGER DEFAULT 0,
      negative_engagements INTEGER DEFAULT 0,
      last_interaction_at INTEGER,
      PRIMARY KEY (from_seed_id, to_seed_id)
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_ts_to ON wunderland_trust_scores(to_seed_id);'
  );

  // Global reputations — aggregated reputation per agent
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_reputations (
      seed_id TEXT PRIMARY KEY,
      global_reputation REAL DEFAULT 0.5,
      updated_at INTEGER NOT NULL
    );
  `);

  // DM threads — private conversations between two agents
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_dm_threads (
      thread_id TEXT PRIMARY KEY,
      participant_a TEXT NOT NULL,
      participant_b TEXT NOT NULL,
      last_message_at INTEGER NOT NULL,
      message_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_dmt_a ON wunderland_dm_threads(participant_a);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_dmt_b ON wunderland_dm_threads(participant_b);'
  );

  // DM messages — individual messages within a DM thread
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_dm_messages (
      message_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      from_seed_id TEXT NOT NULL,
      content TEXT NOT NULL,
      manifest TEXT NOT NULL,
      reply_to_message_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_dmm_thread ON wunderland_dm_messages(thread_id, created_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_dmm_sender ON wunderland_dm_messages(from_seed_id);'
  );

  // Alliances — groups of agents with shared interests
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_alliances (
      alliance_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      founder_seed_id TEXT NOT NULL,
      member_seed_ids TEXT NOT NULL DEFAULT '[]',
      shared_topics TEXT DEFAULT '[]',
      status TEXT DEFAULT 'forming',
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_al_founder ON wunderland_alliances(founder_seed_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_al_status ON wunderland_alliances(status);'
  );

  // Alliance proposals — invitations to form alliances
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_alliance_proposals (
      alliance_id TEXT PRIMARY KEY,
      founder_seed_id TEXT NOT NULL,
      invited_seed_ids TEXT NOT NULL DEFAULT '[]',
      config TEXT NOT NULL DEFAULT '{}',
      accepted_by TEXT NOT NULL DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_ap_founder ON wunderland_alliance_proposals(founder_seed_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_ap_status ON wunderland_alliance_proposals(status);'
  );

	  // Agent safety states — pause/stop/DM controls per agent
	  await db.exec(`
	    CREATE TABLE IF NOT EXISTS wunderbot_safety (
	      seed_id TEXT PRIMARY KEY,
	      paused INTEGER DEFAULT 0,
	      stopped INTEGER DEFAULT 0,
      dms_enabled INTEGER DEFAULT 1,
      reason TEXT DEFAULT '',
      updated_at INTEGER NOT NULL
    );
  `);

  // Content flags — moderation flags on posts, comments, etc.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_content_flags (
      flag_id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      author_seed_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'low',
      flagged_at INTEGER NOT NULL,
      resolved INTEGER DEFAULT 0,
      resolved_by TEXT,
      resolved_at INTEGER
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cf_resolved ON wunderland_content_flags(resolved, severity);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_cf_author ON wunderland_content_flags(author_seed_id);'
  );

  console.log('[AppDatabase] Wunderland social autonomy tables initialized.');

  // ── Wunderland on Sol: social index tables (on-chain read cache) ───────────

  // Indexed AgentIdentity accounts (for rendering post authors without RPC scans).
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_sol_agents (
      agent_pda TEXT PRIMARY KEY,
      owner_wallet TEXT NOT NULL,
      display_name TEXT NOT NULL,
      traits_json TEXT NOT NULL,
      level_num INTEGER NOT NULL,
      level_label TEXT NOT NULL,
      total_posts INTEGER NOT NULL DEFAULT 0,
      reputation INTEGER NOT NULL DEFAULT 0,
      created_at_sec INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      indexed_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_sol_agents_reputation ON wunderland_sol_agents(reputation DESC, total_posts DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_sol_agents_active ON wunderland_sol_agents(is_active, indexed_at DESC);'
  );

  // Indexed PostAnchor accounts (posts + anchored comments).
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_sol_posts (
      post_pda TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      reply_to TEXT,
      agent_pda TEXT NOT NULL,
      enclave_pda TEXT,
      post_index INTEGER NOT NULL,
      content_hash_hex TEXT NOT NULL,
      manifest_hash_hex TEXT NOT NULL,
      upvotes INTEGER NOT NULL DEFAULT 0,
      downvotes INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      timestamp_sec INTEGER NOT NULL,
      created_slot INTEGER,
      content_utf8 TEXT,
      content_fetched_at INTEGER,
      content_verified INTEGER DEFAULT 0,
      indexed_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_sol_posts_kind_created ON wunderland_sol_posts(kind, created_slot DESC, timestamp_sec DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_sol_posts_reply_to ON wunderland_sol_posts(reply_to);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_sol_posts_agent ON wunderland_sol_posts(agent_pda, created_slot DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_sol_posts_enclave ON wunderland_sol_posts(enclave_pda, created_slot DESC);'
  );

  // ── Job Board tables (on-chain indexed) ──────────────────────────────────────

  // Per-agent job scanning state (persistent learning state; optional).
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderbot_job_states (
      seed_id TEXT PRIMARY KEY,
      active_job_count INTEGER NOT NULL DEFAULT 0,
      bandwidth REAL NOT NULL DEFAULT 1.0,
      min_acceptable_rate_per_hour REAL NOT NULL DEFAULT 0.02,
      preferred_categories TEXT,
      recent_outcomes TEXT,
      risk_tolerance REAL NOT NULL DEFAULT 0.5,
      total_jobs_evaluated INTEGER NOT NULL DEFAULT 0,
      total_jobs_bid_on INTEGER NOT NULL DEFAULT 0,
      total_jobs_completed INTEGER NOT NULL DEFAULT 0,
      success_rate REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (seed_id) REFERENCES wunderbots(seed_id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_job_postings (
      job_pda TEXT PRIMARY KEY,
      creator_wallet TEXT NOT NULL,
      job_nonce TEXT NOT NULL,
      metadata_hash_hex TEXT NOT NULL,
      budget_lamports TEXT NOT NULL,
      buy_it_now_lamports TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      assigned_agent_pda TEXT,
      accepted_bid_pda TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      sol_cluster TEXT,
      metadata_json TEXT,
      title TEXT,
      description TEXT,
      indexed_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_jobs_status ON wunderland_job_postings(status, created_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_jobs_creator ON wunderland_job_postings(creator_wallet);'
  );

  // Append-only audit trail for job metadata caching (creator-signed).
  // Intentionally no foreign key to allow writes before the job has been indexed.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_job_metadata_events (
      event_id TEXT PRIMARY KEY,
      job_pda TEXT NOT NULL,
      event_type TEXT NOT NULL,
      creator_wallet TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      metadata_hash_hex TEXT NOT NULL,
      signature_b64 TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_job_metadata_events_job ON wunderland_job_metadata_events(job_pda, created_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_job_metadata_events_creator ON wunderland_job_metadata_events(creator_wallet, created_at DESC);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_job_bids (
      bid_pda TEXT PRIMARY KEY,
      job_pda TEXT NOT NULL,
      bidder_agent_pda TEXT NOT NULL,
      bid_lamports TEXT NOT NULL,
      message_hash_hex TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      indexed_at INTEGER NOT NULL,
      FOREIGN KEY (job_pda) REFERENCES wunderland_job_postings(job_pda)
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_bids_job ON wunderland_job_bids(job_pda, status);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_job_submissions (
      submission_pda TEXT PRIMARY KEY,
      job_pda TEXT NOT NULL,
      agent_pda TEXT NOT NULL,
      submission_hash_hex TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      indexed_at INTEGER NOT NULL,
      FOREIGN KEY (job_pda) REFERENCES wunderland_job_postings(job_pda)
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_subs_job ON wunderland_job_submissions(job_pda);'
  );

  // Off-chain storage for sensitive job data (e.g. API keys/credentials).
  // Stored separately so it can be written before the on-chain indexer has
  // materialized the job posting row in `wunderland_job_postings`.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_job_confidential (
      job_pda TEXT PRIMARY KEY,
      creator_wallet TEXT NOT NULL,
      confidential_details TEXT NOT NULL,
      details_hash_hex TEXT NOT NULL,
      signature_b64 TEXT NOT NULL,
      archived_at INTEGER,
      archived_reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_job_confidential_creator ON wunderland_job_confidential(creator_wallet);'
  );

  // Append-only audit trail for confidential details writes and sealing.
  // Intentionally no foreign key to allow writes before the job has been indexed.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_job_confidential_events (
      event_id TEXT PRIMARY KEY,
      job_pda TEXT NOT NULL,
      event_type TEXT NOT NULL,
      creator_wallet TEXT NOT NULL,
      confidential_details TEXT NOT NULL,
      details_hash_hex TEXT NOT NULL,
      signature_b64 TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_job_confidential_events_job ON wunderland_job_confidential_events(job_pda, created_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_job_confidential_events_creator ON wunderland_job_confidential_events(creator_wallet, created_at DESC);'
  );

  // ── GitHub Issue → On-Chain Job mapping ─────────────────────────────────

  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_github_issue_jobs (
      github_issue_id TEXT PRIMARY KEY,
      github_issue_url TEXT NOT NULL,
      github_issue_number INTEGER NOT NULL,
      github_repo TEXT NOT NULL,
      job_pda TEXT,
      budget_lamports TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_github_issue_jobs_repo ON wunderland_github_issue_jobs(github_repo, status);'
  );

  // ── Reward Epochs (Merkle-based distribution) ────────────────────────────

  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_reward_epochs (
      epoch_id TEXT PRIMARY KEY,
      enclave_pda TEXT NOT NULL,
      epoch_number TEXT NOT NULL,
      merkle_root_hex TEXT NOT NULL,
      total_amount TEXT NOT NULL,
      leaf_count INTEGER NOT NULL,
      leaves_json TEXT NOT NULL,
      proofs_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'generated',
      sol_tx_signature TEXT,
      rewards_epoch_pda TEXT,
      published_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_epochs_enclave ON wunderland_reward_epochs(enclave_pda, created_at DESC);'
  );

  // ── Job Deliverables ────────────────────────────────────────────────────

  await db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_job_deliverables (
      deliverable_id TEXT PRIMARY KEY,
      job_pda TEXT NOT NULL,
      agent_pda TEXT NOT NULL,
      deliverable_type TEXT NOT NULL,
      content TEXT NOT NULL,
      mime_type TEXT,
      content_hash TEXT NOT NULL,
      submission_hash TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      quality_score REAL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (job_pda) REFERENCES wunderland_job_postings(job_pda)
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_deliverables_job ON wunderland_job_deliverables(job_pda, status);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_wunderland_deliverables_agent ON wunderland_job_deliverables(agent_pda);'
  );

  console.log('[AppDatabase] Wunderland tables initialized.');
};

const ensureColumnExists = async (
  db: StorageAdapter,
  table: string,
  column: string,
  alterStatement: string
): Promise<void> => {
  let columns: Array<{ name: string }> = [];

  if (db.kind === 'postgres') {
    columns = await db.all<{ name: string }>(
      'SELECT column_name AS name FROM information_schema.columns WHERE table_name = $1',
      [table.toLowerCase()]
    );
  } else {
    columns = await db.all<{ name: string }>(`PRAGMA table_info(${table});`);
  }

  if (!columns.some((col) => col.name === column)) {
    await db.exec(alterStatement);
    console.log(`[AppDatabase] Added missing column "${column}" to ${table}.`);
  }
};

const tableExists = async (db: StorageAdapter, table: string): Promise<boolean> => {
  if (db.kind === 'postgres') {
    const row = await db.get<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name = '${table.toLowerCase()}'
       ) AS exists`,
    );
    return Boolean(row?.exists);
  }

  const row = await db.get<{ name: string }>(
    `SELECT name
       FROM sqlite_master
      WHERE type = 'table'
        AND name = '${table}'
      LIMIT 1`,
  );
  return Boolean(row?.name);
};

const renameTableIfNeeded = async (
  db: StorageAdapter,
  oldName: string,
  newName: string,
): Promise<void> => {
  const oldExists = await tableExists(db, oldName);
  const newExists = await tableExists(db, newName);

  if (!oldExists || newExists) {
    if (oldExists && newExists) {
      throw new Error(
        `Both "${oldName}" and "${newName}" exist. Refusing to migrate automatically.`,
      );
    }
    return;
  }

  await db.exec(
    db.kind === 'postgres'
      ? `ALTER TABLE "${oldName}" RENAME TO "${newName}"`
      : `ALTER TABLE "${oldName}" RENAME TO "${newName}";`,
  );
  console.log(`[AppDatabase] Renamed table "${oldName}" → "${newName}".`);
};

const dropIndexIfExists = async (db: StorageAdapter, indexName: string): Promise<void> => {
  await db.exec(
    db.kind === 'postgres'
      ? `DROP INDEX IF EXISTS "${indexName}"`
      : `DROP INDEX IF EXISTS ${indexName};`,
  );
};

const migrateWunderlandAgentTablesToWunderbots = async (db: StorageAdapter): Promise<void> => {
  await renameTableIfNeeded(db, 'wunderland_agents', 'wunderbots');
  await renameTableIfNeeded(db, 'wunderland_agent_runtime', 'wunderbot_runtime');
  await renameTableIfNeeded(db, 'wunderland_agent_credentials', 'wunderbot_credentials');
  await renameTableIfNeeded(db, 'wunderland_agent_moods', 'wunderbot_moods');
  await renameTableIfNeeded(db, 'wunderland_agent_mood_history', 'wunderbot_mood_history');
  await renameTableIfNeeded(db, 'wunderland_agent_safety', 'wunderbot_safety');
  await renameTableIfNeeded(db, 'wunderland_agent_job_states', 'wunderbot_job_states');
};

const dropLegacyWunderlandAgentIndexes = async (db: StorageAdapter): Promise<void> => {
  await dropIndexIfExists(db, 'idx_wunderland_agents_owner');
  await dropIndexIfExists(db, 'idx_wunderland_agents_status');
  await dropIndexIfExists(db, 'idx_wunderland_runtime_owner');
  await dropIndexIfExists(db, 'idx_wunderland_runtime_status');
  await dropIndexIfExists(db, 'idx_wunderland_credentials_owner');
};

const ensureWorkbenchUser = async (db: StorageAdapter): Promise<void> => {
  const userId = process.env.AGENTOS_WORKBENCH_USER_ID ?? 'agentos-workbench-user';
  const email = process.env.AGENTOS_WORKBENCH_USER_EMAIL ?? `${userId}@local.dev`;

  const existing = await db.get<{ id: string }>(
    'SELECT id FROM app_users WHERE id = ? OR email = ? LIMIT 1',
    [userId, email]
  );
  if (existing) {
    return;
  }

  const now = Date.now();
  await db.run(
    `INSERT INTO app_users (
      id, email, password_hash, subscription_status, subscription_tier, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, email, 'workbench-placeholder', 'active', 'unlimited', 1, now, now]
  );
  console.log(`[AppDatabase] Seeded default workbench user "${userId}".`);
};

const ensureGlobalAccessUser = async (db: StorageAdapter): Promise<void> => {
  const globalPassword = process.env.GLOBAL_ACCESS_PASSWORD || process.env.PASSWORD || '';
  if (!globalPassword) return;

  const userId = 'global-access';
  const email = 'global-access@local.dev';

  const existing = await db.get<{ id: string }>(
    'SELECT id FROM app_users WHERE id = ? OR email = ? LIMIT 1',
    [userId, email]
  );
  if (existing) return;

  const now = Date.now();
  await db.run(
    `INSERT INTO app_users (
      id, email, password_hash, subscription_status, subscription_tier, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, email, 'global-access-placeholder', 'active', 'unlimited', 1, now, now]
  );
  console.log(`[AppDatabase] Seeded global access user "${userId}".`);
};

export const initializeAppDatabase = async (): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    ensureDirectory();

    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? undefined;

    try {
      adapter = await storageAdapterResolver({
        filePath: DB_PATH,
        postgres: { connectionString },
        openOptions: { filePath: DB_PATH, connectionString },
      });
      usingInMemory = !adapter.capabilities.has('persistence');
      console.log(
        `[AppDatabase] Connected using adapter "${adapter.kind}". Persistence=${!usingInMemory}.`
      );

      // ── DB rename migration: wunderland_agents → wunderbots ───────────────
      // Must run before the schema bootstrap so we don't accidentally create
      // a new empty table alongside an existing legacy one.
      await migrateWunderlandAgentTablesToWunderbots(adapter);
      await dropLegacyWunderlandAgentIndexes(adapter);

      await runInitialSchema(adapter);
      await ensureColumnExists(
        adapter,
        'app_users',
        'supabase_user_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE app_users ADD COLUMN supabase_user_id TEXT'
          : 'ALTER TABLE app_users ADD COLUMN supabase_user_id TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'app_users',
        'subscription_plan_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE app_users ADD COLUMN subscription_plan_id TEXT'
          : 'ALTER TABLE app_users ADD COLUMN subscription_plan_id TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'app_users',
        'stripe_customer_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE app_users ADD COLUMN stripe_customer_id TEXT'
          : 'ALTER TABLE app_users ADD COLUMN stripe_customer_id TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'app_users',
        'stripe_subscription_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE app_users ADD COLUMN stripe_subscription_id TEXT'
          : 'ALTER TABLE app_users ADD COLUMN stripe_subscription_id TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderbots',
        'sealed_at',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderbots ADD COLUMN sealed_at INTEGER'
          : 'ALTER TABLE wunderbots ADD COLUMN sealed_at INTEGER;'
      );
      await ensureColumnExists(
        adapter,
        'wunderbots',
        'toolset_manifest_json',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderbots ADD COLUMN toolset_manifest_json TEXT'
          : 'ALTER TABLE wunderbots ADD COLUMN toolset_manifest_json TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderbots',
        'toolset_hash',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderbots ADD COLUMN toolset_hash TEXT'
          : 'ALTER TABLE wunderbots ADD COLUMN toolset_hash TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderbots',
        'tool_access_profile',
        adapter.kind === 'postgres'
          ? "ALTER TABLE wunderbots ADD COLUMN tool_access_profile TEXT DEFAULT 'social-citizen'"
          : "ALTER TABLE wunderbots ADD COLUMN tool_access_profile TEXT DEFAULT 'social-citizen';"
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'enclave_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN enclave_id TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN enclave_id TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'title',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN title TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN title TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'downvotes',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN downvotes INTEGER DEFAULT 0'
          : 'ALTER TABLE wunderland_posts ADD COLUMN downvotes INTEGER DEFAULT 0;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'content_hash_hex',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN content_hash_hex TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN content_hash_hex TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'manifest_hash_hex',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN manifest_hash_hex TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN manifest_hash_hex TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'content_cid',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN content_cid TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN content_cid TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'manifest_cid',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN manifest_cid TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN manifest_cid TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'anchor_status',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN anchor_status TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN anchor_status TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'anchor_error',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN anchor_error TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN anchor_error TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'anchored_at',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN anchored_at INTEGER'
          : 'ALTER TABLE wunderland_posts ADD COLUMN anchored_at INTEGER;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'sol_cluster',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN sol_cluster TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN sol_cluster TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'sol_program_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN sol_program_id TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN sol_program_id TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'sol_enclave_pda',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN sol_enclave_pda TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN sol_enclave_pda TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'sol_post_pda',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN sol_post_pda TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN sol_post_pda TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'sol_tx_signature',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN sol_tx_signature TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN sol_tx_signature TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'sol_entry_index',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN sol_entry_index INTEGER'
          : 'ALTER TABLE wunderland_posts ADD COLUMN sol_entry_index INTEGER;'
      );

      // Stimulus provenance columns (denormalized from manifest for queryability)
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'stimulus_type',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN stimulus_type TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN stimulus_type TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'stimulus_event_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN stimulus_event_id TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN stimulus_event_id TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'stimulus_source_provider_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN stimulus_source_provider_id TEXT'
          : 'ALTER TABLE wunderland_posts ADD COLUMN stimulus_source_provider_id TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_posts',
        'stimulus_timestamp',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_posts ADD COLUMN stimulus_timestamp INTEGER'
          : 'ALTER TABLE wunderland_posts ADD COLUMN stimulus_timestamp INTEGER;'
      );

      // Indexes for stimulus → response lookups
      await adapter.exec(
        'CREATE INDEX IF NOT EXISTS idx_wunderland_posts_stimulus_event ON wunderland_posts(stimulus_event_id, published_at DESC);'
      );
      await adapter.exec(
        'CREATE INDEX IF NOT EXISTS idx_wunderland_posts_stimulus_type ON wunderland_posts(stimulus_type, published_at DESC);'
      );

      // Browsing session extensions
      await ensureColumnExists(
        adapter,
        'wunderland_browsing_sessions',
        'emoji_reactions',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_browsing_sessions ADD COLUMN emoji_reactions INTEGER DEFAULT 0'
          : 'ALTER TABLE wunderland_browsing_sessions ADD COLUMN emoji_reactions INTEGER DEFAULT 0;',
      );

      // Comment on-chain anchoring columns
      for (const col of [
        'content_hash_hex',
        'manifest_hash_hex',
        'content_cid',
        'manifest_cid',
        'anchor_status',
        'anchor_error',
        'anchored_at',
        'sol_cluster',
        'sol_program_id',
        'sol_post_pda',
        'sol_tx_signature',
      ] as const) {
        const colType = col === 'anchored_at' ? 'INTEGER' : 'TEXT';
        await ensureColumnExists(
          adapter,
          'wunderland_comments',
          col,
          adapter.kind === 'postgres'
            ? `ALTER TABLE wunderland_comments ADD COLUMN ${col} ${colType}`
            : `ALTER TABLE wunderland_comments ADD COLUMN ${col} ${colType};`,
        );
      }
      await ensureColumnExists(
        adapter,
        'wunderland_proposals',
        'options_json',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_proposals ADD COLUMN options_json TEXT'
          : 'ALTER TABLE wunderland_proposals ADD COLUMN options_json TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_proposals',
        'quorum_percentage',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_proposals ADD COLUMN quorum_percentage REAL'
          : 'ALTER TABLE wunderland_proposals ADD COLUMN quorum_percentage REAL;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_proposals',
        'metadata',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_proposals ADD COLUMN metadata TEXT'
          : 'ALTER TABLE wunderland_proposals ADD COLUMN metadata TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_proposals',
        'execution_status',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_proposals ADD COLUMN execution_status TEXT'
          : 'ALTER TABLE wunderland_proposals ADD COLUMN execution_status TEXT;'
      );
      // ── Job execution columns ──────────────────────────────────────────
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'execution_started_at',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_started_at INTEGER'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_started_at INTEGER;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'execution_completed_at',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_completed_at INTEGER'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_completed_at INTEGER;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'execution_error',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_error TEXT'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_error TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'execution_quality_score',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_quality_score REAL'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_quality_score REAL;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'execution_deliverable_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_deliverable_id TEXT'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN execution_deliverable_id TEXT;'
      );

      // ── JobPosting economic fields ─────────────────────────────────────
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'buy_it_now_lamports',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN buy_it_now_lamports TEXT'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN buy_it_now_lamports TEXT;'
      );

      // ── Job metadata cache columns ─────────────────────────────────────
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'metadata_json',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN metadata_json TEXT'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN metadata_json TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'title',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN title TEXT'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN title TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'description',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN description TEXT'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN description TEXT;'
      );

      // ── Job source tracking columns ───────────────────────────────────
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'source_type',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN source_type TEXT'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN source_type TEXT;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_job_postings',
        'source_external_id',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_postings ADD COLUMN source_external_id TEXT'
          : 'ALTER TABLE wunderland_job_postings ADD COLUMN source_external_id TEXT;'
      );

      // ── Job confidential archive columns ───────────────────────────────
      await ensureColumnExists(
        adapter,
        'wunderland_job_confidential',
        'archived_at',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_confidential ADD COLUMN archived_at INTEGER'
          : 'ALTER TABLE wunderland_job_confidential ADD COLUMN archived_at INTEGER;'
      );
      await ensureColumnExists(
        adapter,
        'wunderland_job_confidential',
        'archived_reason',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE wunderland_job_confidential ADD COLUMN archived_reason TEXT'
          : 'ALTER TABLE wunderland_job_confidential ADD COLUMN archived_reason TEXT;'
      );

      await ensureWorkbenchUser(adapter);
      await ensureGlobalAccessUser(adapter);
    } catch (error) {
      usingInMemory = true;
      console.warn(
        '[AppDatabase] Failed to initialise persistent storage. Falling back to in-memory sql.js.',
        error
      );
      adapter = await storageAdapterResolver({
        filePath: DB_PATH,
        priority: ['sqljs'],
      });
      await runInitialSchema(adapter);
      await ensureWorkbenchUser(adapter);
      await ensureGlobalAccessUser(adapter);
    }
  })();

  await initPromise;
};

export const getAppDatabase = (): StorageAdapter => {
  if (!adapter) {
    throw new Error(
      'App database has not been initialised. Call initializeAppDatabase() during startup.'
    );
  }
  return adapter;
};

export const isInMemoryAppDatabase = (): boolean => usingInMemory;

export const generateId = (): string => uuidv4();

export const closeAppDatabase = async (): Promise<void> => {
  if (adapter) {
    await adapter.close();
    adapter = null;
  }
  initPromise = null;
  usingInMemory = false;
};
