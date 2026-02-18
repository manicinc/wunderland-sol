-- ============================================================================
-- Quarry Sync Service Database Schema
-- ============================================================================
-- Zero-knowledge sync infrastructure for Quarry.
-- Server only stores encrypted blobs - never sees plaintext user data.
--
-- Multi-tenancy: Shared tables with account_id isolation
-- Scale path: Hot/warm tiers for dormant user archival
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ACCOUNTS
-- ============================================================================

-- User accounts with tier tracking
CREATE TABLE IF NOT EXISTS sync_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,

  -- Tier management (free: 3 devices, premium: unlimited)
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  device_limit INT DEFAULT 3,  -- NULL = unlimited (premium)

  -- Zero-knowledge auth (server never sees plaintext password)
  recovery_key_hash TEXT,  -- bcrypt hash of recovery key
  wrapped_master_key BYTEA,  -- Master key wrapped by recovery key

  -- OAuth connections (optional)
  google_id TEXT UNIQUE,
  github_id TEXT UNIQUE,

  -- Lifecycle tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,  -- For hot/warm tier decisions
  is_archived BOOLEAN DEFAULT FALSE,  -- Moved to warm storage (Object Storage)

  -- Stripe/payment integration (optional)
  stripe_customer_id TEXT UNIQUE,
  premium_expires_at TIMESTAMPTZ  -- NULL = lifetime, date = subscription end
);

-- Indexes for account queries
CREATE INDEX IF NOT EXISTS idx_accounts_email ON sync_accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_last_sync ON sync_accounts(last_sync_at) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_accounts_tier ON sync_accounts(tier);
CREATE INDEX IF NOT EXISTS idx_accounts_google ON sync_accounts(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_github ON sync_accounts(github_id) WHERE github_id IS NOT NULL;

-- ============================================================================
-- LICENSE KEYS (Lifetime Purchases)
-- ============================================================================

-- License keys for lifetime purchases
CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Account link (NULL until activated)
  account_id UUID REFERENCES sync_accounts(id) ON DELETE SET NULL,

  -- Key storage (hashed - we never store plain text)
  key_hash TEXT NOT NULL,  -- bcrypt hash of license key

  -- Purchase tracking
  stripe_payment_id TEXT UNIQUE,  -- Stripe payment intent ID
  email TEXT NOT NULL,  -- Purchaser email (for delivery)

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,  -- When user activated the key
  revoked_at TIMESTAMPTZ  -- If refunded or revoked
);

-- Indexes for license queries
CREATE INDEX IF NOT EXISTS idx_license_email ON license_keys(email);
CREATE INDEX IF NOT EXISTS idx_license_account ON license_keys(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_license_stripe ON license_keys(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;

-- ============================================================================
-- CHECKOUT SESSIONS (Temporary License Key Storage)
-- ============================================================================

-- Temporary storage for license keys during checkout completion
-- Allows success page to retrieve key multiple times without regenerating
CREATE TABLE IF NOT EXISTS checkout_sessions (
  session_id TEXT PRIMARY KEY,
  license_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cleanup job
CREATE INDEX IF NOT EXISTS idx_checkout_expires ON checkout_sessions(expires_at);

-- Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INT AS $$
DECLARE
  affected_count INT;
BEGIN
  DELETE FROM checkout_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DEVICES
-- ============================================================================

-- Device registry with limits enforcement
CREATE TABLE IF NOT EXISTS sync_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES sync_accounts(id) ON DELETE CASCADE,

  -- Device identification
  device_id TEXT NOT NULL,  -- Client-generated UUID
  device_name TEXT,  -- User-friendly name (e.g., "MacBook Pro")
  device_type TEXT CHECK (device_type IN ('electron', 'browser', 'capacitor', 'server')),

  -- Sync state
  vector_clock JSONB DEFAULT '{}',
  last_seen_at TIMESTAMPTZ,

  -- Device metadata
  os_name TEXT,  -- e.g., "macOS", "Windows", "iOS"
  os_version TEXT,
  app_version TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(account_id, device_id)
);

-- Indexes for device queries
CREATE INDEX IF NOT EXISTS idx_devices_account ON sync_devices(account_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON sync_devices(last_seen_at);

-- ============================================================================
-- SYNC DATA (Encrypted)
-- ============================================================================

-- Encrypted sync data (zero-knowledge - server never decrypts)
CREATE TABLE IF NOT EXISTS sync_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES sync_accounts(id) ON DELETE CASCADE,

  -- Source device
  device_id TEXT NOT NULL,

  -- Resource identification
  resource_type TEXT NOT NULL,  -- 'strand', 'supernote', 'collection', 'settings'
  resource_id TEXT NOT NULL,

  -- Encrypted payload (AES-256-GCM ciphertext)
  encrypted_data BYTEA NOT NULL,

  -- Causality tracking
  vector_clock JSONB NOT NULL,  -- {"device1": 5, "device2": 3}

  -- Metadata (not encrypted - needed for sync logic)
  is_deleted BOOLEAN DEFAULT FALSE,  -- Tombstone for deletions

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(account_id, resource_type, resource_id)
);

-- Indexes for sync queries
CREATE INDEX IF NOT EXISTS idx_sync_data_account ON sync_data(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_data_updated ON sync_data(account_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_sync_data_type ON sync_data(account_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_sync_data_not_deleted ON sync_data(account_id, updated_at) WHERE NOT is_deleted;

-- ============================================================================
-- SYNC LOG
-- ============================================================================

-- Sync log for delta pulls + analytics
CREATE TABLE IF NOT EXISTS sync_log (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES sync_accounts(id) ON DELETE CASCADE,

  -- Operation details
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),

  -- Causality
  vector_clock JSONB NOT NULL,
  device_id TEXT NOT NULL,

  -- Analytics
  bytes_synced INT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sync log queries
CREATE INDEX IF NOT EXISTS idx_sync_log_account_created ON sync_log(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_log_device ON sync_log(account_id, device_id);

-- Partition by month for efficient cleanup (optional - enable in production)
-- CREATE INDEX IF NOT EXISTS idx_sync_log_created ON sync_log(created_at);

-- ============================================================================
-- CONFLICTS
-- ============================================================================

-- Unresolved conflicts requiring manual resolution
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES sync_accounts(id) ON DELETE CASCADE,

  -- Resource in conflict
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,

  -- Conflicting versions (both encrypted)
  local_data BYTEA NOT NULL,
  remote_data BYTEA NOT NULL,

  -- Causality info
  local_clock JSONB NOT NULL,
  remote_clock JSONB NOT NULL,
  local_device_id TEXT NOT NULL,
  remote_device_id TEXT NOT NULL,

  -- Resolution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'auto_resolved')),
  resolution TEXT,  -- 'local_wins', 'remote_wins', 'merged', 'manual'
  resolved_data BYTEA,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Index for pending conflicts
CREATE INDEX IF NOT EXISTS idx_conflicts_pending ON sync_conflicts(account_id, status) WHERE status = 'pending';

-- ============================================================================
-- EXPORT REQUESTS (GDPR)
-- ============================================================================

-- GDPR data export requests (async processing)
CREATE TABLE IF NOT EXISTS export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES sync_accounts(id) ON DELETE CASCADE,

  -- Processing state
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'expired', 'failed')),
  error_message TEXT,

  -- Download info
  download_url TEXT,  -- Signed Object Storage URL
  file_size_bytes BIGINT,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for pending exports
CREATE INDEX IF NOT EXISTS idx_export_pending ON export_requests(status) WHERE status = 'pending';

-- ============================================================================
-- ANALYTICS
-- ============================================================================

-- Nightly analytics aggregation
CREATE TABLE IF NOT EXISTS sync_analytics (
  date DATE PRIMARY KEY,

  -- Account metrics
  total_accounts INT,
  active_accounts_24h INT,
  active_accounts_7d INT,
  active_accounts_30d INT,
  new_accounts INT,

  -- Device metrics
  total_devices INT,
  devices_by_type JSONB,  -- {"electron": 100, "browser": 200, "capacitor": 50}

  -- Sync metrics
  total_syncs INT,
  bytes_synced_total BIGINT,
  avg_sync_latency_ms INT,

  -- Tier metrics
  free_accounts INT,
  premium_accounts INT,

  -- Storage metrics
  total_resources INT,
  total_storage_bytes BIGINT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DEVICE LIMIT ENFORCEMENT
-- ============================================================================

-- Function to check device limit before registration
CREATE OR REPLACE FUNCTION check_device_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  max_devices INT;
BEGIN
  -- Get the device limit for this account
  SELECT device_limit INTO max_devices
  FROM sync_accounts
  WHERE id = NEW.account_id;

  -- NULL means unlimited (premium)
  IF max_devices IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count existing devices
  SELECT COUNT(*) INTO current_count
  FROM sync_devices
  WHERE account_id = NEW.account_id;

  -- Check limit
  IF current_count >= max_devices THEN
    RAISE EXCEPTION 'DEVICE_LIMIT_EXCEEDED: Maximum devices (%) reached. Current: %', max_devices, current_count
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce device limit
DROP TRIGGER IF EXISTS enforce_device_limit ON sync_devices;
CREATE TRIGGER enforce_device_limit
  BEFORE INSERT ON sync_devices
  FOR EACH ROW EXECUTE FUNCTION check_device_limit();

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sync_data
DROP TRIGGER IF EXISTS update_sync_data_updated_at ON sync_data;
CREATE TRIGGER update_sync_data_updated_at
  BEFORE UPDATE ON sync_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SYNC HELPER FUNCTIONS
-- ============================================================================

-- Function to get changes since a cursor (for delta sync)
CREATE OR REPLACE FUNCTION get_changes_since(
  p_account_id UUID,
  p_since TIMESTAMPTZ,
  p_resource_types TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 1000
)
RETURNS TABLE (
  resource_type TEXT,
  resource_id TEXT,
  encrypted_data BYTEA,
  vector_clock JSONB,
  is_deleted BOOLEAN,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sd.resource_type,
    sd.resource_id,
    sd.encrypted_data,
    sd.vector_clock,
    sd.is_deleted,
    sd.updated_at
  FROM sync_data sd
  WHERE sd.account_id = p_account_id
    AND sd.updated_at > p_since
    AND (p_resource_types IS NULL OR sd.resource_type = ANY(p_resource_types))
  ORDER BY sd.updated_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_sync_at and last_seen_at
CREATE OR REPLACE FUNCTION touch_sync_activity(
  p_account_id UUID,
  p_device_id TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update account last sync
  UPDATE sync_accounts
  SET last_sync_at = NOW()
  WHERE id = p_account_id;

  -- Update device last seen
  UPDATE sync_devices
  SET last_seen_at = NOW()
  WHERE account_id = p_account_id AND device_id = p_device_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to archive dormant accounts (run nightly)
-- Note: Actual archival to Object Storage is done in application code
CREATE OR REPLACE FUNCTION mark_dormant_accounts(
  p_dormant_threshold INTERVAL DEFAULT '30 days'
)
RETURNS INT AS $$
DECLARE
  affected_count INT;
BEGIN
  UPDATE sync_accounts
  SET is_archived = TRUE
  WHERE last_sync_at < NOW() - p_dormant_threshold
    AND NOT is_archived;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old sync logs (run nightly)
CREATE OR REPLACE FUNCTION cleanup_sync_logs(
  p_retention_days INT DEFAULT 30
)
RETURNS INT AS $$
DECLARE
  affected_count INT;
BEGIN
  DELETE FROM sync_log
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old export requests (run hourly)
CREATE OR REPLACE FUNCTION expire_old_exports()
RETURNS INT AS $$
DECLARE
  affected_count INT;
BEGIN
  UPDATE export_requests
  SET status = 'expired'
  WHERE status = 'ready'
    AND expires_at < NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ANALYTICS AGGREGATION
-- ============================================================================

-- Function to aggregate daily analytics (run nightly at midnight)
CREATE OR REPLACE FUNCTION aggregate_daily_analytics(
  p_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sync_analytics (
    date,
    total_accounts,
    active_accounts_24h,
    active_accounts_7d,
    active_accounts_30d,
    new_accounts,
    total_devices,
    devices_by_type,
    total_syncs,
    bytes_synced_total,
    free_accounts,
    premium_accounts,
    total_resources,
    total_storage_bytes
  )
  SELECT
    p_date,
    (SELECT COUNT(*) FROM sync_accounts),
    (SELECT COUNT(*) FROM sync_accounts WHERE last_sync_at > p_date - INTERVAL '1 day'),
    (SELECT COUNT(*) FROM sync_accounts WHERE last_sync_at > p_date - INTERVAL '7 days'),
    (SELECT COUNT(*) FROM sync_accounts WHERE last_sync_at > p_date - INTERVAL '30 days'),
    (SELECT COUNT(*) FROM sync_accounts WHERE created_at::DATE = p_date),
    (SELECT COUNT(*) FROM sync_devices),
    (SELECT jsonb_object_agg(device_type, cnt) FROM (
      SELECT device_type, COUNT(*) as cnt FROM sync_devices GROUP BY device_type
    ) t),
    (SELECT COUNT(*) FROM sync_log WHERE created_at::DATE = p_date),
    (SELECT COALESCE(SUM(bytes_synced), 0) FROM sync_log WHERE created_at::DATE = p_date),
    (SELECT COUNT(*) FROM sync_accounts WHERE tier = 'free'),
    (SELECT COUNT(*) FROM sync_accounts WHERE tier = 'premium'),
    (SELECT COUNT(*) FROM sync_data WHERE NOT is_deleted),
    (SELECT COALESCE(SUM(octet_length(encrypted_data)), 0) FROM sync_data)
  ON CONFLICT (date) DO UPDATE SET
    total_accounts = EXCLUDED.total_accounts,
    active_accounts_24h = EXCLUDED.active_accounts_24h,
    active_accounts_7d = EXCLUDED.active_accounts_7d,
    active_accounts_30d = EXCLUDED.active_accounts_30d,
    new_accounts = EXCLUDED.new_accounts,
    total_devices = EXCLUDED.total_devices,
    devices_by_type = EXCLUDED.devices_by_type,
    total_syncs = EXCLUDED.total_syncs,
    bytes_synced_total = EXCLUDED.bytes_synced_total,
    free_accounts = EXCLUDED.free_accounts,
    premium_accounts = EXCLUDED.premium_accounts,
    total_resources = EXCLUDED.total_resources,
    total_storage_bytes = EXCLUDED.total_storage_bytes,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS (adjust role names as needed)
-- ============================================================================

-- Example: Grant permissions to application role
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO quarry_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO quarry_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO quarry_app;
