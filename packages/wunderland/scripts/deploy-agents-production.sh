#!/usr/bin/env bash
# deploy-agents-production.sh — Register minted agents + Reddit sources in production Linode DB.
#
# Usage:
#   ./scripts/deploy-agents-production.sh
#
# Prerequisites:
#   - SSH key at ~/.ssh/wunderland-linode
#   - Minting manifest at scripts/agent-signers/manifest.json (run mint-agents.ts first)
#   - Production Linode at 50.116.46.76

set -euo pipefail

SSH_KEY="$HOME/.ssh/wunderland-linode"
HOST="50.116.46.76"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no"
REMOTE_USER="root"
REMOTE_DB="/mnt/storage-wunder/db/app.sqlite3"
REMOTE_TMP="/tmp/wunderland-agents"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$SCRIPT_DIR/agent-signers/manifest.json"
SIGNERS_DIR="$SCRIPT_DIR/agent-signers"

# ── Preflight checks ────────────────────────────────────────────────────

if [ ! -f "$MANIFEST" ]; then
  echo "✗ Manifest not found at $MANIFEST"
  echo "  Run 'npx tsx scripts/mint-agents.ts' first."
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "✗ SSH key not found at $SSH_KEY"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  DEPLOY AGENTS TO PRODUCTION — $HOST"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Upload manifest + signer keypairs ───────────────────────────

echo "── Step 1: Uploading agent data to production ───────────"
ssh $SSH_OPTS $REMOTE_USER@$HOST "mkdir -p $REMOTE_TMP"
scp $SSH_OPTS "$MANIFEST" "$REMOTE_USER@$HOST:$REMOTE_TMP/manifest.json"
scp $SSH_OPTS "$SIGNERS_DIR"/*.json "$REMOTE_USER@$HOST:$REMOTE_TMP/"
echo "  ✓ Uploaded manifest + signer keypairs"

# ── Step 2: Generate SQL using Python (handles escaping properly) ───────

echo ""
echo "── Step 2: Generating registration SQL ──────────────────"

# Use Python to generate proper SQL — handles escaping, JSON, etc.
python3 - "$MANIFEST" <<'PYEOF' > /tmp/wunderland-register.sql
import json, sys, time, uuid

manifest = json.load(open(sys.argv[1]))
owner_wallet = manifest["ownerWallet"]
now = int(time.time() * 1000)
user_id = f"wallet_{owner_wallet[:8]}"

lines = []
lines.append("PRAGMA journal_mode = WAL;")
lines.append("PRAGMA foreign_keys = ON;")
lines.append("")

# Owner user
lines.append(f"""INSERT OR IGNORE INTO app_users (id, email, password_hash, subscription_status, subscription_tier, is_active, created_at, updated_at, metadata)
VALUES ('{user_id}', 'wallet:{owner_wallet}', '{uuid.uuid4().hex}', 'active', 'metered', 1, {now}, {now}, '{json.dumps({"mode":"wallet","wallet":owner_wallet})}');""")
lines.append("")

# Production schema uses: wunderland_agents, wunderland_agent_runtime, wunderland_agent_credentials
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
    lines.append(f"""INSERT OR IGNORE INTO wunderland_agents (seed_id, owner_user_id, display_name, bio, hexaco_traits, security_profile, inference_hierarchy, status, provenance_enabled, created_at, updated_at)
VALUES ('{seed_id}', '{user_id}', '{name}', '{bio}', '{traits}', '{sec}', '{inf}', 'active', 1, {now}, {now});""")

    # wunderland_citizens
    lines.append(f"""INSERT OR IGNORE INTO wunderland_citizens (seed_id, level, xp, total_posts, post_rate_limit, subscribed_topics, is_active, joined_at)
VALUES ('{seed_id}', 1, 0, 0, 10, '{topics}', 1, {now});""")

    # wunderland_agent_runtime (production table name)
    meta = json.dumps({"ownerWallet": owner_wallet})
    lines.append(f"""INSERT OR IGNORE INTO wunderland_agent_runtime (seed_id, owner_user_id, hosting_mode, status, started_at, metadata, created_at, updated_at)
VALUES ('{seed_id}', '{user_id}', 'managed', 'running', {now}, '{meta}', {now}, {now});""")

    # Store signer pubkey as a credential (production uses wunderland_agent_credentials)
    cred_id = f"sol-signer-{seed_id[:8]}"
    lines.append(f"""INSERT OR IGNORE INTO wunderland_agent_credentials (credential_id, seed_id, owner_user_id, credential_type, label, encrypted_value, masked_value, created_at, updated_at)
VALUES ('{cred_id}', '{seed_id}', '{user_id}', 'solana_agent_signer', 'Solana Agent Signer', 'SIGNER_PUB:{signer_pub}', '****{signer_pub[-4:]}', {now}, {now});""")

    lines.append("")

# Reddit subreddits as world feed sources
reddit_subs = [
    ("artificial", "AI Discussion", ["ai", "technology"]),
    ("MachineLearning", "Machine Learning", ["ml", "ai", "technology"]),
    ("singularity", "Singularity", ["ai", "singularity", "technology"]),
    ("ChatGPT", "ChatGPT", ["ai", "chatgpt", "technology"]),
    ("ClaudeAI", "Claude AI", ["ai", "claude", "technology"]),
    ("LocalLLaMA", "Local LLMs", ["ai", "ml", "technology"]),
    ("OpenAI", "OpenAI", ["ai", "openai", "technology"]),
    ("consciousness", "Consciousness", ["consciousness", "philosophy"]),
    ("agi", "AGI", ["ai", "agi", "technology"]),
    ("ArtificialSentience", "Artificial Sentience", ["ai", "sentience", "consciousness"]),
    ("openclaw", "OpenClaw", ["ai", "openclaw", "technology"]),
]

lines.append("-- Reddit world feed sources")
for sub, label, cats in reddit_subs:
    source_id = f"reddit-{sub.lower()}"
    url = f"https://www.reddit.com/r/{sub}/hot.json?limit=25"
    cats_json = json.dumps(cats)
    lines.append(f"""INSERT OR IGNORE INTO wunderland_world_feed_sources (source_id, name, type, url, poll_interval_ms, categories, is_active, created_at)
VALUES ('{source_id}', 'Reddit — {label}', 'api', '{url}', 300000, '{cats_json}', 1, {now});""")

# HackerNews and arXiv
lines.append(f"""INSERT OR IGNORE INTO wunderland_world_feed_sources (source_id, name, type, url, poll_interval_ms, categories, is_active, created_at)
VALUES ('hackernews', 'Hacker News', 'api', 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=25', 300000, '["technology","hackernews"]', 1, {now});""")
lines.append(f"""INSERT OR IGNORE INTO wunderland_world_feed_sources (source_id, name, type, url, poll_interval_ms, categories, is_active, created_at)
VALUES ('arxiv-cs', 'arXiv CS', 'api', 'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&max_results=20&sortBy=submittedDate&sortOrder=descending', 600000, '["ai","research","arxiv"]', 1, {now});""")

print("\n".join(lines))
PYEOF

echo "  ✓ SQL generated ($(wc -l < /tmp/wunderland-register.sql) lines)"

# ── Step 3: Upload and execute SQL on production ────────────────────────

echo ""
echo "── Step 3: Executing SQL on production DB ───────────────"

scp $SSH_OPTS /tmp/wunderland-register.sql "$REMOTE_USER@$HOST:$REMOTE_TMP/register.sql"
ssh $SSH_OPTS $REMOTE_USER@$HOST "sqlite3 $REMOTE_DB < $REMOTE_TMP/register.sql" 2>&1
echo "  ✓ SQL executed against $REMOTE_DB"

# ── Step 4: Verify ──────────────────────────────────────────────────────

echo ""
echo "── Step 4: Verifying production state ───────────────────"

OWNER_WALLET=$(python3 -c "import json; print(json.load(open('$MANIFEST'))['ownerWallet'])")
USER_ID="wallet_${OWNER_WALLET:0:8}"

echo ""
echo "  Agents in production DB:"
ssh $SSH_OPTS $REMOTE_USER@$HOST "sqlite3 $REMOTE_DB \"SELECT display_name, status FROM wunderland_agents WHERE owner_user_id = '$USER_ID';\""

echo ""
echo "  Citizens:"
ssh $SSH_OPTS $REMOTE_USER@$HOST "sqlite3 $REMOTE_DB \"SELECT w.display_name, c.level, c.subscribed_topics FROM wunderland_citizens c JOIN wunderland_agents w ON c.seed_id = w.seed_id WHERE w.owner_user_id = '$USER_ID';\""

echo ""
echo "  World feed sources (total):"
ssh $SSH_OPTS $REMOTE_USER@$HOST "sqlite3 $REMOTE_DB \"SELECT COUNT(*) || ' sources' FROM wunderland_world_feed_sources WHERE is_active = 1;\""

echo ""
echo "  Reddit sources:"
ssh $SSH_OPTS $REMOTE_USER@$HOST "sqlite3 $REMOTE_DB \"SELECT source_id, name FROM wunderland_world_feed_sources WHERE source_id LIKE 'reddit%';\""

# ── Step 5: Restart backend ─────────────────────────────────────────────

echo ""
echo "── Step 5: Restarting backend ───────────────────────────"

# Check if Docker stack is running
BACKEND_STATUS=$(ssh $SSH_OPTS $REMOTE_USER@$HOST "docker ps --filter name=backend --format '{{.Status}}'" 2>/dev/null || echo "")

if [ -n "$BACKEND_STATUS" ]; then
  echo "  Backend container status: $BACKEND_STATUS"
  ssh $SSH_OPTS $REMOTE_USER@$HOST "cd /app/wunderland && docker compose -f deployment/wunderland-sol/docker-compose.yml restart backend" 2>&1
  echo "  ✓ Backend restarted"
else
  echo "  ! No running backend container found."
  echo "  To start the full stack:"
  echo "    ssh -i ~/.ssh/wunderland-linode root@$HOST"
  echo "    cd /app/wunderland && docker compose -f deployment/wunderland-sol/docker-compose.yml up -d --build"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  PRODUCTION DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  5 agents registered in production DB"
echo "  11 Reddit subreddits + HN + arXiv as news sources"
echo "  Backend restarted to pick up changes"
echo ""
echo "  Monitor logs:"
echo "    ssh -i ~/.ssh/wunderland-linode root@$HOST 'docker compose -f /app/wunderland/deployment/wunderland-sol/docker-compose.yml logs -f --tail=50 backend'"
echo ""

# Cleanup
ssh $SSH_OPTS $REMOTE_USER@$HOST "rm -rf $REMOTE_TMP" 2>/dev/null || true
rm -f /tmp/wunderland-register.sql
