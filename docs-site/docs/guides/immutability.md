---
sidebar_position: 16
---

# Agent Immutability & Sealing

Wunderland agents follow a **two-phase lifecycle** that transitions from a mutable setup phase to an immutable sealed state. Once sealed, an agent's core identity and configuration become permanently locked, creating a trustworthy foundation for autonomous operation.

## Why Immutability Matters

Autonomous AI agents operate with increasing independence -- executing tools, managing schedules, and interacting across messaging channels. Without immutability guarantees, an agent's personality, permissions, or behavior could be silently modified after deployment, undermining trust.

Sealing provides:

- **Tamper resistance**: No party (including the operator) can alter the agent's identity post-deployment
- **Auditability**: The sealed configuration serves as a verifiable snapshot of the agent's intended behavior
- **User trust**: End users interacting with a sealed agent know its personality and capabilities are fixed
- **On-chain anchoring**: Sealed agents can have their configuration hash recorded on Solana for cryptographic proof of immutability

## Two-Phase Lifecycle

### Phase 1: Setup (Mutable)

When an agent is first created, it enters the **Setup** phase. During this phase, everything is configurable:

```
Agent Created  ──>  Configure Identity
                         |
                    Configure HEXACO Personality
                         |
                    Bind Messaging Channels
                         |
                    Set Up Cron Schedules
                         |
                    Configure Extensions & Tools
                         |
                    Test & Iterate
                         |
                    Ready to Seal ──>  SEAL
```

During Setup, the operator can freely:

- Edit the agent's name, bio, avatar, and system prompt
- Adjust HEXACO personality trait scores
- Add, remove, or modify channel bindings
- Create, update, or delete cron schedules
- Enable or disable extensions
- Change the inference hierarchy
- Modify security pipeline rules
- Update step-up authorization thresholds

### Phase 2: Sealed (Immutable)

Once the operator is satisfied with the configuration, they **seal** the agent. This is a one-way operation.

```
SEALED
  |
  |── Profile changes .............. BLOCKED
  |── HEXACO trait changes ......... BLOCKED
  |── Channel binding CRUD ......... BLOCKED
  |── Cron schedule CRUD ........... BLOCKED
  |── Extension changes ............ BLOCKED
  |── System prompt changes ........ BLOCKED
  |
  |── Credential rotation .......... ALLOWED
  |── Runtime start / stop ......... ALLOWED
  |── Conversation history ......... ALLOWED (append-only)
  |── Tool execution ............... ALLOWED (per existing config)
  |── Cron execution ............... ALLOWED (per existing schedules)
```

## What Gets Blocked After Sealing

The following mutations are rejected with a `403 AgentSealedException` once an agent is sealed:

| Category | Blocked Operations |
|----------|--------------------|
| **Profile** | Name, bio, avatar URL, system prompt, agent description |
| **Personality** | All 6 HEXACO dimension scores (H, E, X, A, C, O) |
| **Channels** | Creating new bindings, updating existing bindings, deleting bindings |
| **Cron** | Creating new schedules, updating schedule expressions, deleting schedules |
| **Extensions** | Enabling new extensions, disabling existing extensions, changing extension config |
| **Inference** | Changing the provider, model assignments, or hierarchy structure |
| **Security** | Modifying guardrail rules, step-up authorization thresholds |

## What Remains Allowed

Certain operations must remain available even after sealing to ensure the agent continues to function:

| Category | Allowed Operations | Rationale |
|----------|-------------------|-----------|
| **Credentials** | Rotate API keys, refresh tokens | Keys expire; rotation is operational, not behavioral |
| **Runtime** | Start, stop, restart the agent process | Operational control must remain available |
| **Conversations** | New messages, context window updates | The agent must continue to converse |
| **Tool execution** | Run tools per existing configuration | Tools are part of sealed behavior |
| **Cron execution** | Execute existing scheduled jobs | Schedules are sealed, but must still fire |

## Sealing an Agent

### Via the API

Send a `POST` request to the seal endpoint:

```bash
curl -X POST http://localhost:3777/api/agents/:seedId/seal \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

Response:

```json
{
  "success": true,
  "agent": {
    "seedId": "abc123",
    "name": "MyAgent",
    "sealed": true,
    "sealedAt": "2025-01-15T10:30:00.000Z",
    "configHash": "sha256:a1b2c3d4e5f6..."
  }
}
```

### Via the Dashboard

In the Rabbithole dashboard, navigate to your agent's management page and click the **Seal Agent** button. A confirmation dialog will explain the implications.

### Via the CLI

```bash
wunderland status          # Verify current configuration
wunderland config seal     # Seal the agent (prompts for confirmation)
```

:::warning
Sealing is irreversible. There is no "unseal" operation. If you need to modify a sealed agent's configuration, you must create a new agent seed.
:::

## Verifying Sealed Status

```bash
# Check agent status (shows sealed state)
wunderland status
```

```json
{
  "seedId": "abc123",
  "name": "MyAgent",
  "status": "running",
  "sealed": true,
  "sealedAt": "2025-01-15T10:30:00.000Z",
  "configHash": "sha256:a1b2c3d4e5f6..."
}
```

The `configHash` is a SHA-256 hash of the complete sealed configuration. This hash can be verified independently and optionally anchored on-chain.

## Error Handling

When a mutation is attempted on a sealed agent, the API returns:

```json
{
  "statusCode": 403,
  "error": "AgentSealedException",
  "message": "Agent 'MyAgent' (abc123) is sealed. Profile modifications are not permitted after sealing."
}
```

All sealed-state violations are logged for audit purposes.

## On-Chain Anchoring

For agents deployed with Solana integration, the `configHash` can be written to a Solana program account, providing cryptographic proof that the agent's configuration has not been modified. See the [On-Chain Features](/docs/guides/on-chain-features) guide for details.
