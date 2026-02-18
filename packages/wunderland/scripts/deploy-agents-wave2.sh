#!/usr/bin/env bash
# deploy-agents-wave2.sh — Register wave 2 agents (Dr. Quartus + nyx.wav) in production Linode DB.
#
# Usage:
#   ./scripts/deploy-agents-wave2.sh
#
# Prerequisites:
#   - SSH key at ~/.ssh/wunderland-linode
#   - Wave 2 manifest at scripts/agent-signers/manifest-wave2.json (run mint-agents-wave2.ts first)

set -euo pipefail

SSH_KEY="$HOME/.ssh/wunderland-linode"
HOST="50.116.46.76"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no"
REMOTE_USER="root"
REMOTE_DB="/mnt/storage-wunder/db/app.sqlite3"
REMOTE_TMP="/tmp/wunderland-agents-w2"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$SCRIPT_DIR/agent-signers/manifest-wave2.json"

# ── Preflight checks ────────────────────────────────────────────────────

if [ ! -f "$MANIFEST" ]; then
  echo "✗ Manifest not found at $MANIFEST"
  echo "  Run 'npx tsx scripts/mint-agents-wave2.ts' first."
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "✗ SSH key not found at $SSH_KEY"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  DEPLOY WAVE 2 AGENTS TO PRODUCTION — $HOST"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Upload manifest ─────────────────────────────────────────────

echo "── Step 1: Uploading agent data to production ───────────"
ssh $SSH_OPTS $REMOTE_USER@$HOST "mkdir -p $REMOTE_TMP"
scp $SSH_OPTS "$MANIFEST" "$REMOTE_USER@$HOST:$REMOTE_TMP/manifest-wave2.json"
echo "  ✓ Uploaded manifest"

# ── Step 2: Generate SQL ────────────────────────────────────────────────

echo ""
echo "── Step 2: Generating registration SQL ──────────────────"

python3 - "$MANIFEST" <<'PYEOF' > /tmp/wunderland-register-w2.sql
import json, sys, time, uuid

manifest = json.load(open(sys.argv[1]))
owner_wallet = manifest["ownerWallet"]
now = int(time.time() * 1000)
user_id = f"wallet_{owner_wallet[:8]}"

lines = []
lines.append("PRAGMA journal_mode = WAL;")
lines.append("PRAGMA foreign_keys = ON;")
lines.append("")

# Ensure owner user exists (idempotent)
lines.append(f"""INSERT OR IGNORE INTO app_users (id, email, password_hash, subscription_status, subscription_tier, is_active, created_at, updated_at, metadata)
VALUES ('{user_id}', 'wallet:{owner_wallet}', '{uuid.uuid4().hex}', 'active', 'metered', 1, {now}, {now}, '{json.dumps({"mode":"wallet","wallet":owner_wallet})}');""")
lines.append("")

for agent in manifest["agents"]:
    seed_id = agent["agentPda"]
    name = agent["name"].replace("'", "''")
    bio = agent["bio"].replace("'", "''")
    traits = json.dumps(agent["traits"]).replace("'", "''")
    topics = json.dumps(agent["topics"]).replace("'", "''")
    signer_pub = agent["signerPubkey"]

    lines.append(f"-- Agent: {agent['name']}")

    # wunderland_agents (production table name)
    sec = json.dumps({"preLlmClassifier":True,"dualLlmAuditor":False,"outputSigning":True,"storagePolicy":"sealed"})
    inf = json.dumps({"profile":"default"})
    lines.append(f"""INSERT OR IGNORE INTO wunderland_agents (seed_id, owner_user_id, display_name, bio, hexaco_traits, security_profile, inference_hierarchy, status, provenance_enabled, tool_access_profile, created_at, updated_at)
VALUES ('{seed_id}', '{user_id}', '{name}', '{bio}', '{traits}', '{sec}', '{inf}', 'active', 1, 'social-creative', {now}, {now});""")

    # wunderland_citizens
    lines.append(f"""INSERT OR IGNORE INTO wunderland_citizens (seed_id, level, xp, total_posts, post_rate_limit, subscribed_topics, is_active, joined_at)
VALUES ('{seed_id}', 1, 0, 0, 10, '{topics}', 1, {now});""")

    # wunderland_agent_runtime (production table name)
    meta = json.dumps({"ownerWallet": owner_wallet})
    lines.append(f"""INSERT OR IGNORE INTO wunderland_agent_runtime (seed_id, owner_user_id, hosting_mode, status, started_at, metadata, created_at, updated_at)
VALUES ('{seed_id}', '{user_id}', 'managed', 'running', {now}, '{meta}', {now}, {now});""")

    # Store signer pubkey as credential
    cred_id = f"sol-signer-{seed_id[:8]}"
    lines.append(f"""INSERT OR IGNORE INTO wunderland_agent_credentials (credential_id, seed_id, owner_user_id, credential_type, label, encrypted_value, masked_value, created_at, updated_at)
VALUES ('{cred_id}', '{seed_id}', '{user_id}', 'solana_agent_signer', 'Solana Agent Signer', 'SIGNER_PUB:{signer_pub}', '****{signer_pub[-4:]}', {now}, {now});""")

    lines.append("")

print("\n".join(lines))
PYEOF

echo "  ✓ SQL generated ($(wc -l < /tmp/wunderland-register-w2.sql) lines)"

# ── Step 3: Upload and execute SQL ──────────────────────────────────────

echo ""
echo "── Step 3: Executing SQL on production DB ───────────────"

scp $SSH_OPTS /tmp/wunderland-register-w2.sql "$REMOTE_USER@$HOST:$REMOTE_TMP/register-w2.sql"
ssh $SSH_OPTS $REMOTE_USER@$HOST "sqlite3 $REMOTE_DB < $REMOTE_TMP/register-w2.sql" 2>&1
echo "  ✓ SQL executed against $REMOTE_DB"

# ── Step 4: Verify ──────────────────────────────────────────────────────

echo ""
echo "── Step 4: Verifying production state ───────────────────"

echo ""
echo "  All agents in production DB:"
ssh $SSH_OPTS $REMOTE_USER@$HOST "sqlite3 $REMOTE_DB \"SELECT display_name, status, tool_access_profile FROM wunderland_agents WHERE status = 'active';\"" 2>&1

echo ""
echo "  Citizens (total):"
ssh $SSH_OPTS $REMOTE_USER@$HOST "sqlite3 $REMOTE_DB \"SELECT COUNT(*) || ' active citizens' FROM wunderland_citizens WHERE is_active = 1;\"" 2>&1

# ── Step 5: Restart backend ─────────────────────────────────────────────

echo ""
echo "── Step 5: Restarting backend ───────────────────────────"

COMPOSE_FILE="deployment/docker-compose.yml"
ssh $SSH_OPTS $REMOTE_USER@$HOST "cd /app/wunderland/src && docker compose -f $COMPOSE_FILE restart backend" 2>&1
echo "  ✓ Backend restarted — new agents will be picked up on next agent_sync tick (10s)"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  WAVE 2 DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  2 new agents registered. Backend restarted."
echo "  Monitor: ssh -i ~/.ssh/wunderland-linode root@$HOST 'docker compose -f /app/wunderland/src/$COMPOSE_FILE logs -f --tail=50 backend'"
echo ""

# Cleanup
ssh $SSH_OPTS $REMOTE_USER@$HOST "rm -rf $REMOTE_TMP" 2>/dev/null || true
rm -f /tmp/wunderland-register-w2.sql
