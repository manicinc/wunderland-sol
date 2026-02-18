---
name: obsidian
version: '1.0.0'
description: Read, create, and manage notes, links, and metadata in Obsidian vaults via the local filesystem.
author: Wunderland
namespace: wunderland
category: productivity
tags: [obsidian, markdown, notes, knowledge-graph, zettelkasten, pkm]
requires_secrets: []
requires_tools: [filesystem]
metadata:
  agentos:
    emoji: "\U0001F48E"
    homepage: https://obsidian.md
---

# Obsidian Vault Interaction

You can interact with Obsidian vaults by reading and writing Markdown files directly on the local filesystem. Obsidian vaults are simply directories of `.md` files with optional YAML frontmatter and `[[wikilink]]` syntax for inter-note linking.

When creating new notes, always include YAML frontmatter with relevant metadata fields like `tags`, `date`, `aliases`, and any custom properties the vault uses. Use `[[wikilinks]]` for internal links and `![[embeds]]` for transclusion. Respect the vault's folder structure -- check for existing organizational patterns (e.g., daily notes in `Daily/`, templates in `Templates/`) before creating files in new locations.

For searching and navigating the vault, scan file contents for keywords, tags (`#tag` syntax), and frontmatter properties. Follow `[[wikilinks]]` to traverse the knowledge graph. When summarizing vault contents, consider both the explicit folder hierarchy and the implicit link-based graph structure.

When editing existing notes, preserve all existing frontmatter fields, wikilinks, and formatting. Append new content at appropriate locations rather than overwriting. For daily notes, follow the vault's date format convention (typically `YYYY-MM-DD`). Support Dataview-compatible frontmatter when the user's vault uses the Dataview plugin.

## Examples

- "Create a new note called 'Project Kickoff' in the Meetings folder with today's date"
- "Find all notes tagged #research and summarize their key points"
- "Add a link to [[Architecture Decisions]] in the project overview note"
- "List all notes that link to [[API Design]] (backlinks)"
- "Create a daily note for today with the standup template"

## Constraints

- Operates on local filesystem only; no cloud sync awareness.
- Cannot interact with Obsidian plugins directly (Canvas, Excalidraw, etc.) -- only reads/writes Markdown files.
- Binary attachments (images, PDFs) can be referenced but not created.
- Vault path must be known and accessible to the agent.
- Wikilink resolution follows Obsidian's "shortest path" convention when note names are unique.
- Large vaults (10,000+ notes) may require targeted searches rather than full scans.
