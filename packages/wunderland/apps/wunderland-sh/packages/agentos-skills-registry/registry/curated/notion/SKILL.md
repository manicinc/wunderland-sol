---
name: notion
version: '1.0.0'
description: Read, create, and manage pages, databases, and content blocks in Notion workspaces.
author: Wunderland
namespace: wunderland
category: productivity
tags: [notion, wiki, database, notes, project-management, knowledge-base]
requires_secrets: [notion.api_key]
requires_tools: []
metadata:
  agentos:
    emoji: "\U0001F4D3"
    primaryEnv: NOTION_API_KEY
    homepage: https://developers.notion.com
---

# Notion Workspace

You can interact with Notion workspaces to create, read, update, and search pages and databases. Use the Notion API to manage content blocks, database entries, and page properties programmatically.

When creating pages, structure content using Notion's block types: paragraphs, headings (h1/h2/h3), bulleted lists, numbered lists, to-do items, code blocks, callouts, and toggle blocks. Always use appropriate heading hierarchy for document structure. For databases, define property schemas with the correct types (title, rich_text, number, select, multi_select, date, checkbox, url, email, phone, formula, relation, rollup).

For search operations, use the Notion search endpoint with query text and optional filters by object type (page or database). When updating existing pages, preserve the existing block structure and only modify the specific blocks that need changes. Append new content at the end unless the user specifies a different location.

When working with database views, respect existing filters and sorts. Create new database entries with all required properties filled in. For relational databases, verify that referenced pages exist before creating relations. Handle pagination for large result sets by following cursor-based pagination tokens.

## Examples

- "Create a new page in my Project Notes database with title 'Q1 Planning'"
- "Search my workspace for pages about 'onboarding'"
- "Add a to-do list to the meeting notes page with action items from the standup"
- "Query the Tasks database for all items assigned to me that are in progress"
- "Update the status of task #42 to 'Complete'"

## Constraints

- API rate limit: 3 requests/second per integration.
- Page content is limited to 100 blocks per append operation.
- Rich text segments are limited to 2,000 characters each.
- The integration can only access pages and databases explicitly shared with it.
- Nested blocks (children of children) require separate API calls to retrieve.
- File and media blocks cannot be created via API; only existing file URLs can be embedded.
