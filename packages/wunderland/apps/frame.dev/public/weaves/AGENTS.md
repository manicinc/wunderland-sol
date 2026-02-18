# AI Agent Integration Guide

This guide helps AI coding assistants (Claude Code, Cursor, Gemini CLI, GitHub Copilot, etc.) work effectively with Quarry.

## Quick Start for AI Agents

```bash
# The weaves folder location (copy this path):
# [Your configured path will appear in Settings > Content Source]

# Example structure:
cd /path/to/weaves
ls -la
# weaves/
#   wiki/looms/getting-started/strands/
#   notes/looms/daily/strands/
```

## What is Quarry?

Quarry is a knowledge management system that stores documents as markdown files organized in a hierarchical structure called **OpenStrand**.

### Hierarchy

```
Fabric (root)
└── Weave (knowledge universe)
    └── Loom (module/category)
        └── Strand (atomic document)
```

## Common Tasks

### 1. List All Strands

```bash
find weaves -name "*.md" -type f
```

### 2. Create a New Strand

```bash
# Create the directory structure if needed
mkdir -p weaves/notes/looms/ideas/strands

# Create the strand with frontmatter
cat > weaves/notes/looms/ideas/strands/my-idea.md << 'EOF'
---
title: "My New Idea"
description: "A brief description of this idea"
tags: ["ideas", "brainstorm"]
created: "2024-12-22"
status: "draft"
---

# My New Idea

Content goes here...
EOF
```

### 3. Search Content

```bash
# Search by content
grep -r "search term" weaves --include="*.md"

# Search by tag in frontmatter
grep -r "tags:.*keyword" weaves --include="*.md"
```

### 4. Update a Strand

When editing an existing strand:
1. Preserve the existing frontmatter structure
2. Update the `updated` field to today's date
3. Keep the `title` and `description` accurate

### 5. Read Strand Metadata

```bash
# Extract frontmatter (between --- markers)
sed -n '/^---$/,/^---$/p' weaves/path/to/strand.md
```

## Frontmatter Template

```yaml
---
title: "Required: Document Title"
description: "Required: One-line summary"
tags: ["optional", "categorization"]
created: "2024-01-01"
updated: "2024-01-15"
status: "published"
author: "Optional Author Name"
related:
  - "../other-loom/strands/related-doc.md"
---
```

## File Naming Rules

| Element | Convention | Example |
|---------|------------|---------|
| Weave | lowercase, single word | `wiki`, `notes`, `projects` |
| Loom | kebab-case | `getting-started`, `api-docs` |
| Strand | kebab-case + .md | `quick-start.md`, `api-reference.md` |

## Content Guidelines

### DO:
- Use standard markdown formatting
- Include descriptive frontmatter
- Keep strands focused on single topics
- Use relative links for internal references
- Add relevant tags for discoverability

### DON'T:
- Create deeply nested directories (max 3-4 levels)
- Use spaces or special characters in filenames
- Skip required frontmatter fields (title, description)
- Create duplicate content across strands

## Integration Points

### With Quarry UI

Changes made to files are reflected in the Quarry UI after:
- Manual refresh (Ctrl/Cmd + R)
- Automatic polling (if enabled in settings)

### With Version Control

The weaves folder can be:
- Committed to git for version history
- Synced across machines via git remote
- Backed up to cloud storage

### With Other Tools

- **Obsidian**: Compatible markdown format
- **VS Code**: Full editing support with markdown preview
- **Static Site Generators**: Can build from weaves folder

## Troubleshooting

### Strand Not Appearing

1. Check file extension is `.md`
2. Verify frontmatter is valid YAML (no tabs, proper indentation)
3. Ensure file is in a `strands/` directory
4. Refresh the Quarry UI

### Broken Links

Internal links should be relative paths:
```markdown
<!-- Good -->
[Related Doc](../other-loom/strands/doc.md)

<!-- Bad -->
[Related Doc](/absolute/path/to/doc.md)
```

### Invalid Frontmatter

Common YAML issues:
- Missing quotes around strings with colons
- Tabs instead of spaces for indentation
- Missing closing `---` delimiter

## Support

- Documentation: `/docs/` folder in this repository
- Schema Reference: `/docs/schema-reference.md`
- Issues: GitHub Issues on the frame.dev repository



