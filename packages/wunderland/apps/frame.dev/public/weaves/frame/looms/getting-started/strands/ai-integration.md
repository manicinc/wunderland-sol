---
title: "AI Agent Integration"
description: "How to use AI coding assistants with your Quarry knowledge base"
tags: ["ai", "agents", "claude", "cursor", "gemini", "automation"]
created: "2024-12-22"
updated: "2024-12-28"
status: "published"
author: "FABRIC Team"
---

# AI Agent Integration

Quarry works well with AI coding assistants. This guide covers how to use AI tools with your knowledge base.

## Workflow Options

### Option 1: Export & Edit

1. Export your knowledge base as a ZIP (Settings > Content Source > Export)
2. Extract to a folder on your computer
3. Let AI edit the markdown files
4. Re-import the ZIP when done

### Option 2: Git Repository

If using GitHub mode, your content lives in a repository:

1. Clone your Quarry repository locally
2. Point your AI assistant at the clone
3. Make changes and push to GitHub
4. Quarry syncs automatically

## Supported AI Assistants

| Assistant | Access Method | Best For |
|-----------|--------------|----------|
| **Claude Code** | Direct filesystem | Code + docs |
| **Cursor** | Workspace files | IDE integration |
| **Windsurf** | Workspace files | IDE integration |
| **Aider** | Git repo access | Pair programming |

## Using Claude Code

Point Claude Code at your exported/cloned folder:

```
My knowledge base is at /path/to/weaves

Read the llms.txt file for structure documentation.
```

Example prompts:

- "List all strands in my wiki weave"
- "Create a new strand about [topic]"
- "Search my knowledge base for [term]"
- "Update the tags in [specific strand]"

## Using Cursor

Add your weaves folder to your Cursor workspace:

1. File > Add Folder to Workspace
2. Select your weaves directory
3. Cursor's AI now has full context

Use in chat:
```
@workspace Search all strands for "API design"
```

## Folder Structure

AI agents work best when they understand the structure:

```
weaves/
├── llms.txt              # AI agent instructions
├── notes/                # Example weave
│   └── looms/
│       └── daily/
│           └── strands/
│               └── 2024-12-28.md
└── wiki/                 # Another weave
    └── looms/
        └── concepts/
            └── strands/
                └── topic.md
```

## Best Practices

### DO:
- Read `llms.txt` first when starting a session
- Preserve existing frontmatter when editing
- Update the `updated` field when making changes
- Use relative paths for internal links

### DON'T:
- Delete strands without confirmation
- Modify the folder structure drastically
- Skip frontmatter on new strands
- Use absolute paths in content links

## Frontmatter Template

Every strand needs proper frontmatter:

```yaml
---
title: "Your Title"
description: "Brief description"
tags: ["tag1", "tag2"]
created: "2024-12-28"
status: "draft"
---

# Content Here
```

## Troubleshooting

### Changes Not Appearing in Quarry

- For GitHub mode: push changes, then sync
- For Local mode: re-import the ZIP file
- Refresh the browser (Ctrl/Cmd + R)

### Invalid Frontmatter Errors

Common YAML issues:
- Use spaces, not tabs
- Quote strings with colons: `title: "My: Title"`
- Check for unclosed quotes


