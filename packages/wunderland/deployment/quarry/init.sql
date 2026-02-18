-- Quarry Database Schema
-- Auto-executed on first container start via /docker-entrypoint-initdb.d/
--
-- Tables:
--   sync_accounts  - User accounts with OAuth and Stripe integration
--   sync_devices   - Registered devices per account (with limit enforcement)
--   license_keys   - Lifetime license keys (hashed)
--   checkout_sessions - Temporary session-to-license mapping

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SYNC ACCOUNTS
-- ============================================================================

CREATE TABLE sync_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,

    -- Auth (password-based)
    password_hash VARCHAR(255),                    -- bcrypt hash (12 rounds), NULL for OAuth-only
    auth_method VARCHAR(20) NOT NULL DEFAULT 'guest' CHECK (auth_method IN ('google', 'email', 'guest')),

    -- E2E Encryption
    wrapped_master_key BYTEA,           -- Encrypted master key (E2EE)
    recovery_key_hash VARCHAR(255),     -- Double-hashed recovery key

    -- OAuth Providers
    google_id VARCHAR(255) UNIQUE,      -- Google OAuth ID
    github_id VARCHAR(255) UNIQUE,      -- GitHub OAuth ID

    -- Profile (from Google or manual)
    display_name VARCHAR(255),                     -- First name or custom name
    avatar_url VARCHAR(2048),                      -- Google profile picture or custom
    profile_source VARCHAR(20) DEFAULT 'manual' CHECK (profile_source IN ('google', 'manual')),

    -- Google Connection Status
    google_connected_at TIMESTAMPTZ,              -- When Google was linked
    google_scopes TEXT[],                         -- Array of granted scopes
    google_refresh_token_encrypted BYTEA,         -- Encrypted refresh token for Calendar

    -- Billing
    stripe_customer_id VARCHAR(255) UNIQUE,
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
    device_limit INTEGER DEFAULT 3,     -- NULL = unlimited (premium)
    premium_expires_at TIMESTAMPTZ,     -- Subscription expiry (NULL = lifetime)

    -- Session Tracking
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,

    -- Email Verification
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires_at TIMESTAMPTZ,

    -- Password Reset
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMPTZ,

    -- Status
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_accounts_email ON sync_accounts(email);
CREATE INDEX idx_sync_accounts_google_id ON sync_accounts(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_sync_accounts_github_id ON sync_accounts(github_id) WHERE github_id IS NOT NULL;
CREATE INDEX idx_sync_accounts_stripe_customer_id ON sync_accounts(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_sync_accounts_email_verification_token ON sync_accounts(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX idx_sync_accounts_password_reset_token ON sync_accounts(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_sync_accounts_auth_method ON sync_accounts(auth_method);

-- ============================================================================
-- AUTH SESSIONS
-- ============================================================================
-- Session management for stateless authentication (HttpOnly cookies)

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES sync_accounts(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB,                         -- {userAgent, ip, platform, deviceName}
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_account ON auth_sessions(account_id);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);

-- Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_auth_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM auth_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SYNC DEVICES
-- ============================================================================

CREATE TABLE sync_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES sync_accounts(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,    -- Client-generated device identifier
    device_name VARCHAR(255),           -- Human-readable name
    device_type VARCHAR(50),            -- e.g., 'desktop', 'mobile', 'tablet'
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (account_id, device_id)
);

CREATE INDEX idx_sync_devices_account_id ON sync_devices(account_id);
CREATE INDEX idx_sync_devices_last_seen ON sync_devices(last_seen_at);

-- Device limit enforcement trigger
CREATE OR REPLACE FUNCTION check_device_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_limit INTEGER;
    current_count INTEGER;
BEGIN
    -- Get account's device limit
    SELECT device_limit INTO current_limit
    FROM sync_accounts WHERE id = NEW.account_id;

    -- NULL limit = unlimited
    IF current_limit IS NULL THEN
        RETURN NEW;
    END IF;

    -- Count existing devices (excluding the one being updated)
    SELECT COUNT(*) INTO current_count
    FROM sync_devices
    WHERE account_id = NEW.account_id
      AND id != COALESCE(NEW.id, uuid_nil());

    IF current_count >= current_limit THEN
        RAISE EXCEPTION 'DEVICE_LIMIT_EXCEEDED: Account has reached device limit of %', current_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_device_limit
    BEFORE INSERT ON sync_devices
    FOR EACH ROW
    EXECUTE FUNCTION check_device_limit();

-- ============================================================================
-- LICENSE KEYS
-- ============================================================================

CREATE TABLE license_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES sync_accounts(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,      -- bcrypt hash of the license key
    stripe_payment_id VARCHAR(255),      -- Stripe payment intent ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,            -- When key was activated
    revoked_at TIMESTAMPTZ               -- When key was revoked (refund, etc.)
);

CREATE INDEX idx_license_keys_account_id ON license_keys(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX idx_license_keys_email ON license_keys(email);
CREATE INDEX idx_license_keys_active ON license_keys(activated_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- CHECKOUT SESSIONS
-- ============================================================================
-- Temporary storage for session_id -> license_key mapping
-- Allows the success page to retrieve the key multiple times within 24 hours

CREATE TABLE checkout_sessions (
    session_id VARCHAR(255) PRIMARY KEY,  -- Stripe checkout session ID
    license_key VARCHAR(255) NOT NULL,    -- Plain text key (shown to user)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_checkout_sessions_expires ON checkout_sessions(expires_at);

-- Auto-cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM checkout_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Optional: Create a scheduled job to cleanup expired sessions
-- In production, use pg_cron or external cron job:
--   SELECT cleanup_expired_sessions();

COMMENT ON TABLE sync_accounts IS 'User accounts with OAuth providers, password auth, and Stripe billing';
COMMENT ON TABLE auth_sessions IS 'Active login sessions for HttpOnly cookie-based authentication';
COMMENT ON TABLE sync_devices IS 'Registered devices per account with automatic limit enforcement';
COMMENT ON TABLE license_keys IS 'Lifetime license keys (bcrypt hashed, plain key emailed to user)';
COMMENT ON TABLE checkout_sessions IS 'Temporary session-to-license mapping (24h TTL)';
