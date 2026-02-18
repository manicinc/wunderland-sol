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
      lemon_customer_id TEXT,
      lemon_subscription_id TEXT,
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

  await db.exec(`
    CREATE TABLE IF NOT EXISTS lemonsqueezy_events (
      id TEXT PRIMARY KEY,
      event_name TEXT NOT NULL,
      processed_at INTEGER,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      owner_user_id TEXT NOT NULL,
      seat_limit INTEGER NOT NULL DEFAULT 5,
      plan_id TEXT NOT NULL DEFAULT 'organization',
      settings_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL,
      slug TEXT,
      plan_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      config TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_user_agents_user ON user_agents(user_id);');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_user_agents_status ON user_agents(status);');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_agent_creation_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES user_agents(id) ON DELETE SET NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agent_creation_user ON user_agent_creation_log(user_id, created_at DESC);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      lemon_checkout_id TEXT,
      lemon_subscription_id TEXT,
      lemon_customer_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user ON checkout_sessions(user_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON checkout_sessions(status);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      seat_units INTEGER NOT NULL DEFAULT 1,
      daily_usage_cap_usd REAL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
      UNIQUE (organization_id, user_id)
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS organization_invites (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER,
      inviter_user_id TEXT,
      created_at INTEGER NOT NULL,
      accepted_at INTEGER,
      revoked_at INTEGER,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (inviter_user_id) REFERENCES app_users(id) ON DELETE SET NULL
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);'
  );
  await db.exec('CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS agency_usage_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      workflow_definition_id TEXT NOT NULL,
      agency_id TEXT,
      seats INTEGER NOT NULL,
      launched_at INTEGER NOT NULL,
      expires_at INTEGER,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agency_usage_user ON agency_usage_log(user_id, launched_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agency_usage_definition ON agency_usage_log(workflow_definition_id);'
  );

  await db.exec(`
	    CREATE TABLE IF NOT EXISTS agentos_persona_submissions (
	      id TEXT PRIMARY KEY,
	      persona_id TEXT NOT NULL,
	      label TEXT NOT NULL,
	      prompt TEXT NOT NULL,
	      description TEXT,
	      metadata TEXT,
	      bundle_path TEXT,
	      status TEXT NOT NULL DEFAULT 'pending',
	      submitted_by TEXT,
	      approved_by TEXT,
	      submitted_at INTEGER NOT NULL,
	      approved_at INTEGER,
	      rejection_reason TEXT
	    );
	  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agentos_persona_submissions_status ON agentos_persona_submissions(status);'
  );
  await db.exec(`
	    CREATE TABLE IF NOT EXISTS agentos_memory_redactions (
	      redaction_id TEXT PRIMARY KEY,
	      scope TEXT NOT NULL,
	      user_id TEXT,
	      persona_id TEXT,
	      organization_id TEXT,
	      memory_hash TEXT NOT NULL,
	      reason TEXT,
	      actor_type TEXT NOT NULL DEFAULT 'agent',
	      actor_id TEXT,
	      created_at INTEGER NOT NULL
	    );
	  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agentos_memory_redactions_scope ON agentos_memory_redactions(scope);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agentos_memory_redactions_lookup ON agentos_memory_redactions(scope, user_id, persona_id, organization_id, memory_hash);'
  );

  await db.exec(`
	    CREATE TABLE IF NOT EXISTS agency_executions (
	      agency_id TEXT PRIMARY KEY,
	      user_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      goal TEXT NOT NULL,
      workflow_definition_id TEXT,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      duration_ms INTEGER,
      total_cost_usd REAL,
      total_tokens INTEGER,
      output_format TEXT,
      consolidated_output TEXT,
      formatted_output TEXT,
      emergent_metadata TEXT,
      error TEXT,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agency_executions_user ON agency_executions(user_id, started_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agency_executions_conversation ON agency_executions(conversation_id);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS agency_seats (
      id TEXT PRIMARY KEY,
      agency_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      persona_id TEXT NOT NULL,
      gmi_instance_id TEXT,
      status TEXT NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      output TEXT,
      error TEXT,
      usage_tokens INTEGER,
      usage_cost_usd REAL,
      retry_count INTEGER DEFAULT 0,
      metadata TEXT,
      FOREIGN KEY (agency_id) REFERENCES agency_executions(agency_id) ON DELETE CASCADE
    );
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_agency_seats_agency ON agency_seats(agency_id);');
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agency_seats_gmi ON agency_seats(gmi_instance_id);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agentos_persona_submissions_persona ON agentos_persona_submissions(persona_id);'
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

  // =========================================================================
  // Support Ticket System
  // =========================================================================

  await db.exec(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      anonymous_id TEXT NOT NULL,
      pii_shared INTEGER DEFAULT 0,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'open',
      description TEXT NOT NULL,
      attachments TEXT,
      user_email TEXT,
      user_name TEXT,
      user_plan TEXT,
      assigned_to_email TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      resolved_at INTEGER,
      closed_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);');
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority, created_at DESC);'
  );
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to_email);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS support_ticket_comments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      author_type TEXT NOT NULL,
      author_id TEXT,
      author_display TEXT,
      content TEXT NOT NULL,
      attachments TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON support_ticket_comments(ticket_id, created_at ASC);'
  );

  await db.exec(`
    CREATE TABLE IF NOT EXISTS support_anonymous_ids (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      anonymous_id TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_anonymous_ids_user ON support_anonymous_ids(user_id);'
  );

  console.log('[AppDatabase] Support ticket tables initialized.');

  // ── Agent Metrics & Task Management ────────────────────────────────────────

  await db.exec(`
    CREATE TABLE IF NOT EXISTS agent_llm_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed_id TEXT NOT NULL,
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      estimated_cost_usd REAL,
      request_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_llm_usage_seed ON agent_llm_usage(seed_id, created_at);');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS agent_tool_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed_id TEXT NOT NULL,
      tool_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      error_message TEXT,
      input_summary TEXT,
      output_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_tool_exec_seed ON agent_tool_executions(seed_id, created_at);');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS agent_channel_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      channel_id TEXT,
      event_type TEXT NOT NULL,
      response_time_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_channel_activity_seed ON agent_channel_activity(seed_id, created_at);');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS agent_behavior_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_behavior_seed ON agent_behavior_events(seed_id, created_at);');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS agent_runtime_tasks (
      id TEXT PRIMARY KEY,
      seed_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      title TEXT NOT NULL,
      description TEXT,
      progress INTEGER DEFAULT 0,
      result_summary TEXT,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_seed ON agent_runtime_tasks(seed_id, status);');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_runtime_tasks(status, created_at);');

  console.log('[AppDatabase] Agent metrics & task tables initialized.');
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
        'organizations',
        'settings_json',
        adapter.kind === 'postgres'
          ? 'ALTER TABLE organizations ADD COLUMN settings_json TEXT'
          : 'ALTER TABLE organizations ADD COLUMN settings_json TEXT;'
      );

      await ensureWorkbenchUser(adapter);
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
