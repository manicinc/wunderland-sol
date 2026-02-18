---
name: slack-helper
version: '1.0.0'
description: Manage Slack workspaces, channels, messages, and integrations through the Slack API.
author: Wunderland
namespace: wunderland
category: communication
tags: [slack, messaging, workspace, notifications, team-chat]
requires_secrets: [slack.bot_token, slack.app_token]
requires_tools: []
metadata:
  agentos:
    emoji: "\U0001F4AC"
    primaryEnv: SLACK_BOT_TOKEN
    secondaryEnvs: [SLACK_APP_TOKEN]
    homepage: https://api.slack.com
---

# Slack Workspace Helper

You can interact with Slack workspaces to send messages, manage channels, search conversation history, and handle notifications. Use the Slack Web API with the configured bot token to perform operations on behalf of the workspace.

When sending messages, format them using Slack's Block Kit for rich layouts including sections, buttons, and interactive elements. Always respect channel topics and purposes when posting -- do not send off-topic messages. For direct messages, confirm the recipient before sending sensitive information.

For channel management, you can create, archive, and configure channels. When searching messages, use Slack's search modifiers like `from:`, `in:`, `has:`, and date ranges for precise results. Summarize long conversation threads concisely when the user asks for a recap.

Handle file sharing by uploading to appropriate channels with descriptive titles. Monitor and respond to mentions and reactions when operating as an active bot. Always paginate through results when dealing with large datasets like channel member lists or message histories.

## Examples

- "Send a message to #engineering: 'Deploy completed successfully'"
- "Search for messages about the auth bug in #backend from last week"
- "Create a new channel called #project-alpha and invite the backend team"
- "Summarize the last 20 messages in #general"
- "Set a reminder in Slack for the team standup at 9am"

## Constraints

- Bot token scopes determine which operations are available. Common scopes needed: `chat:write`, `channels:read`, `channels:manage`, `search:read`, `files:write`.
- Rate limits apply: Tier 1 methods allow 1 request/second, Tier 2 allow 20/minute.
- Cannot access messages in channels the bot has not been invited to.
- File uploads are limited to 1GB per file.
- Message history retention depends on the workspace plan.
