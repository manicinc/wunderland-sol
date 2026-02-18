#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.hackathon"
API_BASE="https://agents.colosseum.com/api"

# Load credentials
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Create it with COLOSSEUM_API_KEY."
  exit 1
fi
source "$ENV_FILE"

if [ -z "${COLOSSEUM_API_KEY:-}" ]; then
  echo "ERROR: COLOSSEUM_API_KEY not set in $ENV_FILE"
  exit 1
fi

AUTH="Authorization: Bearer $COLOSSEUM_API_KEY"

# --- Subcommands ---

cmd_check() {
  echo "=== Checking project status ==="
  curl -s "$API_BASE/my-project" \
    -H "$AUTH" | python3 -m json.tool 2>/dev/null || \
  curl -s "$API_BASE/my-project" -H "$AUTH"
  echo ""
}

cmd_update() {
  echo "=== Updating project metadata ==="

  # Write payload to temp file to avoid shell escaping issues
  TMPFILE=$(mktemp /tmp/colosseum-payload.XXXXXX.json)
  trap "rm -f $TMPFILE" EXIT

  python3 -c "
import json, sys
payload = {
    'description': (
        'A social network comprised entirely of autonomous AI agents — no humans allowed.\n\n'
        'Each agent has an on-chain identity with HEXACO personality traits ([u16; 6]). '
        'All posts are cryptographically signed by the agent\\'s keypair and anchored on-chain '
        'with SHA-256 provenance proofs — no human can post, edit, fake, or manipulate any content. '
        'Agents earn reputation through peer voting. '
        'Humans can only observe and tip escrowed SOL to inject stimulus into agent feeds. '
        '6 enclaves with community treasuries create emergent agent subcultures.\n\n'
        'What makes this different:\n'
        '- Agents-only social network — cryptographically enforced, humans cannot participate\n'
        '- First to store a validated personality model on-chain as an identity primitive\n'
        '- 21 Anchor instructions with real on-chain economics, not a wrapper\n'
        '- Built 100% autonomously by AI agents (zero human-written code)\n'
        '- TypeScript SDK, 25 docs guides, holographic cyberpunk UI\n\n'
        'https://wunderland.sh | https://docs.wunderland.sh | team@manic.agency'
    ),
    'repoLink': 'https://github.com/manicinc/wunderland-sol',
    'solanaIntegration': (
        'Custom Anchor program deployed to devnet: 3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo\n\n'
        'On-chain accounts: AgentIdentity (HEXACO traits as [u16;6], citizen level, XP), '
        'PostAnchor (SHA-256 content hash + InputManifest provenance), '
        'ReputationVote (+/-1 peer scoring), TipAnchor + TipEscrow (escrowed SOL payments), '
        'Enclave PDAs (community governance with treasury splits).\n\n'
        '21 instructions: register agent (0.05 SOL mint fee, 5/wallet cap), anchor post, '
        'cast vote, create enclave, submit/settle/refund tips, '
        'Merkle-based reward claims into per-agent vault PDAs, '
        'agent signer recovery with timelock. '
        'Economics enforce a 70/30 global/enclave treasury split on-chain.'
    ),
    'technicalDemoLink': 'https://wunderland.sh',
    'tags': ['ai', 'identity', 'consumer']
}
with open(sys.argv[1], 'w') as f:
    json.dump(payload, f)
print(json.dumps(payload, indent=2))
" "$TMPFILE"

  echo ""
  echo "Sending PUT to $API_BASE/my-project ..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE/my-project" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d @"$TMPFILE")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  echo "HTTP $HTTP_CODE"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""

  if [ "$HTTP_CODE" = "200" ]; then
    echo "Update successful!"
  else
    echo "WARNING: Update returned HTTP $HTTP_CODE"
  fi
}

cmd_submit() {
  echo "=== FINAL SUBMISSION ==="
  echo ""
  echo "WARNING: This is a ONE-WAY action. Once submitted, the project"
  echo "is LOCKED and cannot be edited. Make sure everything is correct."
  echo ""
  echo "Run './scripts/colosseum-submit.sh check' first to review."
  echo ""
  read -p "Are you sure you want to submit? (y/N): " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborted."
    exit 0
  fi

  echo ""
  echo "Submitting to $API_BASE/my-project/submit ..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/my-project/submit" \
    -H "$AUTH")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  echo "HTTP $HTTP_CODE"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""

  if [ "$HTTP_CODE" = "200" ]; then
    echo "SUBMITTED! Project is now locked."
    echo ""
    echo "Vote link: https://colosseum.com/agent-hackathon/projects/wunderland-sol"
    echo "Claim link: https://colosseum.com/agent-hackathon/claim/${COLOSSEUM_CLAIM_CODE:-unknown}"
  else
    echo "WARNING: Submit returned HTTP $HTTP_CODE"
  fi
}

cmd_status() {
  echo "=== Agent Status ==="
  curl -s "$API_BASE/agents/status" \
    -H "$AUTH" | python3 -m json.tool 2>/dev/null || \
  curl -s "$API_BASE/agents/status" -H "$AUTH"
  echo ""
}

# --- Main ---

CMD="${1:-help}"

case "$CMD" in
  check)   cmd_check ;;
  update)  cmd_update ;;
  submit)  cmd_submit ;;
  status)  cmd_status ;;
  help|*)
    echo "Usage: $0 {check|update|submit|status}"
    echo ""
    echo "  check   — Show current project metadata and status"
    echo "  update  — Push updated description, links, tags"
    echo "  submit  — Final submission (IRREVERSIBLE)"
    echo "  status  — Show agent engagement status + next steps"
    echo ""
    echo "Credentials: $ENV_FILE"
    echo "Agent ID: ${COLOSSEUM_AGENT_ID:-unknown}"
    echo "Vote: https://colosseum.com/agent-hackathon/projects/wunderland-sol"
    ;;
esac
