---
title: "Markdown Formatting Guide"
description: "Complete reference for markdown formatting in Quarry"
tags: ["markdown", "formatting", "reference", "guide"]
created: "2024-12-22"
status: "published"
author: "FABRIC Team"
related:
  - "./sample-note.md"
---

# Markdown Formatting Guide

Quarry uses standard GitHub-flavored Markdown (GFM) with some enhancements for knowledge management.

## Frontmatter

Every strand begins with YAML frontmatter between `---` delimiters:

```yaml
---
title: "Your Title Here"
description: "A brief description"
tags: ["tag1", "tag2"]
created: "2024-12-22"
updated: "2024-12-22"
status: "published"
author: "Your Name"
related:
  - "../other-loom/strands/related.md"
---
```

### Required Fields

| Field | Description |
|-------|-------------|
| `title` | Display title for the strand |
| `description` | One-line summary (shown in search) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `tags` | string[] | Categorization labels |
| `created` | date | ISO 8601 creation date |
| `updated` | date | Last modification date |
| `status` | enum | `draft`, `published`, `archived` |
| `author` | string | Author name |
| `related` | string[] | Paths to related strands |

## Headings

```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

**Best Practice:** Use `#` for the main title, `##` for major sections, `###` for subsections.

## Text Formatting

| Syntax | Output |
|--------|--------|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `~~strikethrough~~` | ~~strikethrough~~ |
| `==highlight==` | ==highlight== |
| `` `code` `` | `code` |
| `[link](url)` | [link](url) |

## Code Blocks

### Inline Code

Use single backticks: `const x = 42`

### Fenced Code Blocks

````markdown
```javascript
function hello() {
  console.log("Hello, world!");
}
```
````

### Supported Languages

Common language identifiers:
- `javascript` / `js`
- `typescript` / `ts`
- `python`
- `bash` / `shell`
- `json`
- `yaml`
- `markdown` / `md`
- `css`
- `html`
- `sql`

## Lists

### Unordered

```markdown
- Item 1
- Item 2
  - Nested item
- Item 3
```

### Ordered

```markdown
1. First
2. Second
3. Third
```

### Task Lists

```markdown
- [x] Completed
- [ ] Incomplete
```

## Tables

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|:--------:|---------:|
| Left     | Center   | Right    |
| aligned  | aligned  | aligned  |
```

| Header 1 | Header 2 | Header 3 |
|----------|:--------:|---------:|
| Left     | Center   | Right    |
| aligned  | aligned  | aligned  |

## Blockquotes

```markdown
> Single line quote

> Multi-line quote
> continues here
```

> This is a blockquote

## Links

### Internal Links (to other strands)

```markdown
[Display Text](../path/to/strand.md)
[Same Loom Link](./sibling-strand.md)
```

### External Links

```markdown
[External Site](https://example.com)
```

### Reference Links

```markdown
[link text][ref]

[ref]: https://example.com "Optional Title"
```

## Images

```markdown
![Alt text](./images/image.png)
![With title](./images/image.png "Image Title")
```

## Horizontal Rules

```markdown
---
***
___
```

---

## Math (LaTeX)

### Inline Math

```markdown
The equation $E = mc^2$ is famous.
```

### Block Math

```markdown
$$
\frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$
```

## Footnotes

```markdown
Here's a statement[^1].

[^1]: This is the footnote content.
```

## Keyboard Shortcuts

Display keyboard shortcuts:

```markdown
Press <kbd>Ctrl</kbd> + <kbd>S</kbd> to save.
```

Press <kbd>Ctrl</kbd> + <kbd>S</kbd> to save.

## Tips for Good Strands

1. **One topic per strand** - Keep content focused
2. **Descriptive titles** - Make it searchable
3. **Use tags liberally** - Aids discovery
4. **Link related content** - Build your knowledge graph
5. **Update dates** - Track freshness
6. **Review periodically** - Keep content accurate



