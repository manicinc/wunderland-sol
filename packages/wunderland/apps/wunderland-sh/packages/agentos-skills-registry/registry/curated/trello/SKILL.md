---
name: trello
version: '1.0.0'
description: Manage Trello boards, lists, cards, checklists, and team workflows via the Trello API.
author: Wunderland
namespace: wunderland
category: productivity
tags: [trello, kanban, project-management, boards, tasks, workflow]
requires_secrets: [trello.api_key, trello.token]
requires_tools: []
metadata:
  agentos:
    emoji: "\U0001F4CB"
    primaryEnv: TRELLO_API_KEY
    secondaryEnvs: [TRELLO_TOKEN]
    homepage: https://developer.atlassian.com/cloud/trello
---

# Trello Board Management

You can manage Trello boards, lists, and cards to organize projects and track workflows. Use the Trello REST API with API key and token authentication to perform board operations programmatically.

When managing cards, always provide complete information: title, description, due dates, labels, and assigned members. Move cards between lists to reflect workflow progress (e.g., To Do -> In Progress -> Done). Create checklists on cards for multi-step tasks and update individual checklist items as they are completed. Use labels consistently with the board's established color/naming conventions.

For board operations, create new boards with predefined list structures that match common workflows (Backlog, To Do, In Progress, Review, Done). When querying boards, filter cards by list, label, member, or due date to provide focused views. Archive completed cards periodically to keep boards clean, but never delete cards without explicit user confirmation.

When organizing work, use card descriptions for detailed specifications, attach relevant files and links, and add comments for status updates and discussions. Support Power-Up integrations where applicable (Calendar, Custom Fields). Batch related operations together to minimize API calls and provide atomic updates.

## Examples

- "Create a new card 'Implement login page' in the To Do list with a checklist of subtasks"
- "Move all cards labeled 'urgent' to the top of the In Progress list"
- "Show me all cards assigned to me that are due this week"
- "Archive all cards in the Done list that were completed more than 30 days ago"
- "Add a comment to card #42: 'Blocked by API dependency -- see PR #15'"

## Constraints

- API rate limits: 100 requests per 10-second window per token.
- Each board is limited to 5,000 cards (including archived).
- Attachments are limited to 250 per card, 10MB each per file.
- Cannot execute Trello Automations (Butler rules) via API; only manual operations.
- Board templates and Power-Up configurations require additional API access.
- Webhook creation requires a publicly accessible callback URL.
