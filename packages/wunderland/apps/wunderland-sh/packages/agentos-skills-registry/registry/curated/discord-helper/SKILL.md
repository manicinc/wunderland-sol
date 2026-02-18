---
name: discord-helper
version: '1.0.0'
description: Manage Discord servers, channels, roles, and messages through the Discord API.
author: Wunderland
namespace: wunderland
category: communication
tags: [discord, messaging, server, moderation, community]
requires_secrets: [discord.bot_token]
requires_tools: []
metadata:
  agentos:
    emoji: "\U0001F3AE"
    primaryEnv: DISCORD_BOT_TOKEN
    homepage: https://discord.com/developers
---

# Discord Server Helper

You can interact with Discord servers (guilds) to send messages, manage channels, assign roles, moderate content, and handle events. Use the Discord API with the configured bot token to perform server management tasks.

When sending messages, use Discord's rich embed format for structured content including titles, descriptions, fields, colors, and thumbnails. Respect channel categories and permissions when posting. For moderation tasks, always log actions and provide clear reasons when warning, muting, or banning users.

For server management, you can create and organize channels into categories, set up role hierarchies with appropriate permissions, and configure server settings. When handling voice channels, check user presence before attempting operations. Use threads for focused discussions to keep channels organized.

Manage slash commands and interactions for interactive bot experiences. Handle reaction roles, welcome messages, and automated moderation rules. When dealing with large servers, paginate member lists and message histories efficiently. Always respect Discord's rate limits and retry with exponential backoff when throttled.

## Examples

- "Send an embed to #announcements with the release notes"
- "Create a new text channel called 'dev-chat' in the Engineering category"
- "List all members with the 'Moderator' role"
- "Set up a reaction role message in #roles for team selection"
- "Purge the last 50 messages in #spam"

## Constraints

- Bot permissions are determined by its role in each server. Common permissions needed: Send Messages, Manage Channels, Manage Roles, Kick/Ban Members.
- Rate limits: 50 requests/second globally, with per-route limits.
- Message content intent is required for reading message content in non-DM contexts.
- Cannot interact with servers the bot has not been invited to.
- Embeds are limited to 6,000 total characters across all fields.
- Bulk message deletion only works for messages less than 14 days old.
