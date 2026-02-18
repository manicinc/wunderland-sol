---
name: 1password
version: '1.0.0'
description: Query and retrieve items from 1Password vaults using the 1Password CLI for secure credential access.
author: Wunderland
namespace: wunderland
category: security
tags: [1password, passwords, secrets, vault, credentials, security]
requires_secrets: [1password.service_account_token]
requires_tools: []
metadata:
  agentos:
    emoji: "\U0001F510"
    primaryEnv: OP_SERVICE_ACCOUNT_TOKEN
    homepage: https://developer.1password.com/docs/cli
    requires:
      bins: ['op']
    install:
      - id: brew
        kind: brew
        formula: 1password-cli
        bins: ['op']
        label: 'Install 1Password CLI (brew)'
---

# 1Password Vault Queries

You can query 1Password vaults to retrieve credentials, secure notes, API keys, and other secrets using the `op` CLI. This enables secure access to stored credentials without hardcoding secrets in code or configuration files.

When retrieving items, use `op item get` with the item name or UUID. Support querying specific fields (username, password, TOTP, custom fields) using the `--fields` flag. For listing items, filter by vault, category (login, secure-note, api-credential, credit-card), or tags. Always use the most specific identifier available to avoid ambiguous matches.

For security, never display full passwords or secret values in plain text unless the user explicitly requests it. Instead, confirm the item exists and describe its metadata (title, vault, category, last modified). When injecting secrets into environment variables or configuration files, use `op run` or `op inject` for ephemeral secret injection that avoids writing secrets to disk.

Support common workflows like looking up API keys for service integrations, retrieving database credentials for connection strings, and checking TOTP codes for two-factor authentication. When multiple items match a query, present a disambiguated list with vault and category context so the user can select the correct one.

## Examples

- "Look up the API key for our Stripe integration"
- "What vaults do I have access to?"
- "Get the database connection credentials from the Production vault"
- "Generate a TOTP code for my AWS account"
- "List all items tagged 'deploy' in the DevOps vault"
- "Inject secrets from the 'staging-env' item into environment variables"

## Constraints

- Requires the `op` CLI to be installed and authenticated (service account token or interactive sign-in).
- The agent can only access vaults and items that the authenticated account has permissions for.
- Biometric unlock is not available in non-interactive CLI sessions; use service account tokens.
- TOTP codes are time-sensitive and expire every 30 seconds.
- Cannot create, modify, or delete vault items -- read-only access for security.
- Session tokens expire after 30 minutes of inactivity by default.
- Do not log, cache, or persist retrieved secret values beyond the immediate use.
