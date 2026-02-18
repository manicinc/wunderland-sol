---
title: "Strand Metadata"
tags: ["schema", "metadata"]
publishing:
  status: published
---

Every strand begins with YAML frontmatter. Recommended fields:

```yaml
---
id: "uuid-or-slug"
title: "Strand title"
summary: "One sentence description"
tags: ["schema", "reference"]
difficulty: "beginner"
taxonomy:
  subjects: ["knowledge"]
  topics: ["openstrand"]
relationships:
  prerequisites: ["weaves/openstrand/schema/hierarchy.md"]
publishing:
  status: published
  lastUpdated: "2025-11-16"
---
```

**Notes**

- `id` or `slug` helps external systems pin canonical references.
- `tags`, `subjects`, `topics` feed the Codex viewer’s filters and search facets.
- `relationships` allows you to model prerequisites or “see also” references—these show up as backlinks.
- `publishing.status` can be `draft`, `published`, or `archived`. Draft strands remain readable but can be filtered out in search or UI toggles.

Keep metadata minimal but intentional; the viewer already extracts file paths, names, and timestamps from GitHub.

