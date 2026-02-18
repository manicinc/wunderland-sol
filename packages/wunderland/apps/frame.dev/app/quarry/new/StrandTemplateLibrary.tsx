/**
 * Strand Template Library - Curated templates for creating new strands
 * @module codex/new/StrandTemplateLibrary
 * 
 * @description
 * Comprehensive template library with:
 * - Multiple categories (Tutorial, Reference, How-To, Concept, etc.)
 * - Difficulty-based filtering
 * - Search functionality
 * - Template previews
 * - One-click template application
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  BookOpen,
  Code,
  Lightbulb,
  Wrench,
  FileText,
  GraduationCap,
  Newspaper,
  List,
  GitCompare,
  MessageSquare,
  AlertTriangle,
  Rocket,
  Target,
  Puzzle,
  BookMarked,
  Layers,
  Workflow,
  CheckCircle2,
  X,
  Eye,
  ChevronRight,
  Sparkles,
  Filter,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'any'
  icon: React.ReactNode
  tags: string[]
  preview: string // First ~200 chars of template
  content: string // Full template content
  frontmatter: Record<string, unknown>
  suggestedPath?: string
  useCases: string[]
}

export type TemplateCategory = 
  | 'tutorial'
  | 'how-to'
  | 'reference'
  | 'concept'
  | 'troubleshooting'
  | 'comparison'
  | 'case-study'
  | 'glossary'
  | 'faq'
  | 'changelog'
  | 'architecture'
  | 'quick-start'

interface StrandTemplateLibraryProps {
  onSelectTemplate: (template: StrandTemplate) => void
  onClose?: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORY CONFIG
═══════════════════════════════════════════════════════════════════════════ */

const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  tutorial: {
    label: 'Tutorial',
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Step-by-step learning guides',
    color: 'bg-blue-500',
  },
  'how-to': {
    label: 'How-To Guide',
    icon: <Wrench className="w-4 h-4" />,
    description: 'Practical task-focused guides',
    color: 'bg-green-500',
  },
  reference: {
    label: 'Reference',
    icon: <BookMarked className="w-4 h-4" />,
    description: 'API docs, specs, detailed info',
    color: 'bg-purple-500',
  },
  concept: {
    label: 'Concept',
    icon: <Lightbulb className="w-4 h-4" />,
    description: 'Explanations of ideas and theory',
    color: 'bg-yellow-500',
  },
  troubleshooting: {
    label: 'Troubleshooting',
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'Problem-solving guides',
    color: 'bg-red-500',
  },
  comparison: {
    label: 'Comparison',
    icon: <GitCompare className="w-4 h-4" />,
    description: 'Compare options, tools, approaches',
    color: 'bg-orange-500',
  },
  'case-study': {
    label: 'Case Study',
    icon: <Target className="w-4 h-4" />,
    description: 'Real-world examples and analysis',
    color: 'bg-pink-500',
  },
  glossary: {
    label: 'Glossary',
    icon: <List className="w-4 h-4" />,
    description: 'Term definitions and vocabulary',
    color: 'bg-teal-500',
  },
  faq: {
    label: 'FAQ',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'Frequently asked questions',
    color: 'bg-indigo-500',
  },
  changelog: {
    label: 'Changelog',
    icon: <Newspaper className="w-4 h-4" />,
    description: 'Version history and updates',
    color: 'bg-gray-500',
  },
  architecture: {
    label: 'Architecture',
    icon: <Layers className="w-4 h-4" />,
    description: 'System design documentation',
    color: 'bg-cyan-500',
  },
  'quick-start': {
    label: 'Quick Start',
    icon: <Rocket className="w-4 h-4" />,
    description: 'Fast onboarding guides',
    color: 'bg-emerald-500',
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE LIBRARY
═══════════════════════════════════════════════════════════════════════════ */

const TEMPLATES: StrandTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // TUTORIALS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'tutorial-beginner',
    name: 'Beginner Tutorial',
    description: 'A friendly introduction for absolute beginners with clear explanations',
    category: 'tutorial',
    difficulty: 'beginner',
    icon: <GraduationCap className="w-5 h-5" />,
    tags: ['tutorial', 'beginner', 'learning'],
    useCases: ['Teaching basics', 'First-time users', 'Gentle introductions'],
    preview: '# Getting Started with [Topic]\n\nWelcome! This tutorial will guide you through...',
    suggestedPath: 'weaves/wiki/tutorials/',
    frontmatter: {
      difficulty: 'beginner',
      contentType: 'tutorial',
      taxonomy: { subjects: [], topics: [] },
    },
    content: `# Getting Started with [Topic]

Welcome! This tutorial will guide you through the fundamentals of [topic]. No prior experience required.

## What You'll Learn

By the end of this tutorial, you'll be able to:
- [ ] Understand the basic concepts
- [ ] Set up your environment
- [ ] Create your first [thing]
- [ ] Know where to go next

## Prerequisites

Before we begin, make sure you have:
- A computer with [OS requirements]
- [Any required software]
- About 30 minutes of time

## Introduction

[Brief, friendly introduction to the topic. Explain why it matters and what problems it solves.]

## Step 1: Setting Up

Let's start by getting everything ready.

### 1.1 Install Required Tools

\`\`\`bash
# Installation command here
\`\`\`

### 1.2 Verify Installation

\`\`\`bash
# Verification command
\`\`\`

You should see output like:
\`\`\`
Expected output here
\`\`\`

## Step 2: Your First [Thing]

Now let's create something!

### 2.1 Create a New File

\`\`\`
// Code example
\`\`\`

### 2.2 Run It

\`\`\`bash
# Run command
\`\`\`

🎉 **Congratulations!** You just created your first [thing]!

## Step 3: Understanding What Happened

Let's break down what we just did:

1. **[First concept]**: Explanation
2. **[Second concept]**: Explanation
3. **[Third concept]**: Explanation

## Common Mistakes

> ⚠️ **Watch out for these common pitfalls:**
> - Mistake 1 and how to avoid it
> - Mistake 2 and how to avoid it

## Next Steps

You've learned the basics! Here's where to go next:

- 📚 [Next Tutorial](./next-tutorial.md) - Learn about [advanced topic]
- 📖 [Reference Docs](../reference/index.md) - Detailed documentation
- 💬 [Community](https://...) - Get help and connect

## Summary

In this tutorial, you learned:
- ✅ What [topic] is and why it's useful
- ✅ How to set up your environment
- ✅ How to create your first [thing]

Happy learning! 🚀
`,
  },
  {
    id: 'tutorial-advanced',
    name: 'Advanced Tutorial',
    description: 'In-depth tutorial for experienced users covering complex topics',
    category: 'tutorial',
    difficulty: 'advanced',
    icon: <GraduationCap className="w-5 h-5" />,
    tags: ['tutorial', 'advanced', 'deep-dive'],
    useCases: ['Complex features', 'Performance optimization', 'Expert techniques'],
    preview: '# Advanced [Topic]: Deep Dive\n\nThis tutorial explores advanced concepts...',
    suggestedPath: 'weaves/wiki/tutorials/',
    frontmatter: {
      difficulty: 'advanced',
      contentType: 'tutorial',
      taxonomy: { subjects: [], topics: [] },
    },
    content: `# Advanced [Topic]: Deep Dive

This tutorial explores advanced concepts and techniques for experienced practitioners.

## Prerequisites

This tutorial assumes you:
- Have completed the [Beginner Tutorial](./beginner.md)
- Understand [core concept 1]
- Are familiar with [core concept 2]
- Have working knowledge of [related technology]

## Overview

We'll cover:
1. [Advanced Topic 1]
2. [Advanced Topic 2]
3. [Advanced Topic 3]
4. Performance considerations
5. Best practices

## Architecture Overview

\`\`\`
┌─────────────────┐     ┌─────────────────┐
│   Component A   │────▶│   Component B   │
└─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Component C   │◀────│   Component D   │
└─────────────────┘     └─────────────────┘
\`\`\`

## Deep Dive: [Advanced Topic 1]

### Theory

[Detailed explanation of the underlying theory and concepts]

### Implementation

\`\`\`typescript
// Advanced implementation example
interface AdvancedConfig {
  // Configuration options
}

class AdvancedFeature {
  constructor(config: AdvancedConfig) {
    // Implementation
  }
  
  async process(): Promise<Result> {
    // Complex processing logic
  }
}
\`\`\`

### Trade-offs

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| Approach A | Fast, simple | Limited flexibility | Simple cases |
| Approach B | Flexible | More complex | Complex cases |
| Approach C | Optimal | Requires expertise | Performance-critical |

## Performance Optimization

### Profiling

\`\`\`bash
# Profiling command
\`\`\`

### Key Metrics

- **Metric 1**: Target value, how to improve
- **Metric 2**: Target value, how to improve

### Optimization Techniques

1. **Technique 1**: Description and when to use
2. **Technique 2**: Description and when to use

## Best Practices

> 💡 **Pro Tips:**
> - Always [best practice 1]
> - Consider [best practice 2] when [condition]
> - Avoid [anti-pattern] because [reason]

## Troubleshooting

### Issue: [Common Advanced Issue]

**Symptoms:** Description of what you see

**Cause:** Why this happens

**Solution:**
\`\`\`
// Fix code
\`\`\`

## Further Reading

- [Related Advanced Topic](./related.md)
- [External Resource](https://...)
- [Research Paper](https://...)

## Summary

Key takeaways:
- [Key insight 1]
- [Key insight 2]
- [Key insight 3]
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HOW-TO GUIDES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'how-to-task',
    name: 'Task-Focused How-To',
    description: 'Practical guide for accomplishing a specific task',
    category: 'how-to',
    difficulty: 'intermediate',
    icon: <Wrench className="w-5 h-5" />,
    tags: ['how-to', 'practical', 'guide'],
    useCases: ['Specific tasks', 'Common operations', 'Recipes'],
    preview: '# How to [Accomplish Task]\n\nThis guide shows you how to...',
    suggestedPath: 'weaves/wiki/how-to/',
    frontmatter: {
      difficulty: 'intermediate',
      contentType: 'how-to',
      taxonomy: { subjects: [], topics: [] },
    },
    content: `# How to [Accomplish Task]

This guide shows you how to [specific task] in [context].

## When to Use This

Use this approach when you need to:
- [Use case 1]
- [Use case 2]
- [Use case 3]

## Prerequisites

- [Prerequisite 1]
- [Prerequisite 2]

## Quick Reference

\`\`\`bash
# TL;DR - The quick version
command --option value
\`\`\`

## Step-by-Step Guide

### Step 1: [First Action]

[Brief explanation]

\`\`\`bash
# Command or code
\`\`\`

**Expected result:** [What should happen]

### Step 2: [Second Action]

[Brief explanation]

\`\`\`bash
# Command or code
\`\`\`

### Step 3: [Third Action]

[Brief explanation]

### Step 4: Verify

Confirm everything worked:

\`\`\`bash
# Verification command
\`\`\`

## Variations

### Variation A: [Different Scenario]

If you need to [different requirement]:

\`\`\`bash
# Alternative approach
\`\`\`

### Variation B: [Another Scenario]

For [specific condition]:

\`\`\`bash
# Another approach
\`\`\`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Error X | Try [solution] |
| Error Y | Check [thing] |

## Related Guides

- [Related How-To 1](./related-1.md)
- [Related How-To 2](./related-2.md)
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // REFERENCE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'reference-api',
    name: 'API Reference',
    description: 'Comprehensive API documentation with examples',
    category: 'reference',
    difficulty: 'any',
    icon: <Code className="w-5 h-5" />,
    tags: ['reference', 'api', 'documentation'],
    useCases: ['API docs', 'SDK reference', 'Library documentation'],
    preview: '# [API Name] Reference\n\nComplete reference documentation for...',
    suggestedPath: 'weaves/wiki/reference/',
    frontmatter: {
      difficulty: 'intermediate',
      contentType: 'reference',
      taxonomy: { subjects: ['technology'], topics: ['api'] },
    },
    content: `# [API Name] Reference

Complete reference documentation for the [API Name].

## Overview

[Brief description of what this API does]

**Base URL:** \`https://api.example.com/v1\`

**Authentication:** [Auth method]

## Quick Start

\`\`\`typescript
import { Client } from '@example/sdk'

const client = new Client({ apiKey: 'your-key' })
const result = await client.resource.method()
\`\`\`

## Resources

### Resource Name

Description of this resource.

#### Methods

##### \`create(data)\`

Creates a new resource.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| \`name\` | \`string\` | Yes | Resource name |
| \`config\` | \`object\` | No | Configuration options |

**Returns:** \`Promise<Resource>\`

**Example:**

\`\`\`typescript
const resource = await client.resources.create({
  name: 'example',
  config: { option: true }
})
\`\`\`

**Response:**

\`\`\`json
{
  "id": "res_123",
  "name": "example",
  "createdAt": "2024-01-01T00:00:00Z"
}
\`\`\`

##### \`get(id)\`

Retrieves a resource by ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| \`id\` | \`string\` | Yes | Resource ID |

**Returns:** \`Promise<Resource>\`

##### \`list(options?)\`

Lists all resources.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| \`limit\` | \`number\` | No | Max results (default: 20) |
| \`offset\` | \`number\` | No | Pagination offset |

**Returns:** \`Promise<Resource[]>\`

##### \`update(id, data)\`

Updates an existing resource.

##### \`delete(id)\`

Deletes a resource.

## Types

### Resource

\`\`\`typescript
interface Resource {
  id: string
  name: string
  config?: ResourceConfig
  createdAt: Date
  updatedAt: Date
}
\`\`\`

### ResourceConfig

\`\`\`typescript
interface ResourceConfig {
  option: boolean
  // ... other options
}
\`\`\`

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| \`400\` | Bad Request | Check request format |
| \`401\` | Unauthorized | Verify API key |
| \`404\` | Not Found | Check resource ID |
| \`429\` | Rate Limited | Slow down requests |

## Rate Limits

- **Standard:** 100 requests/minute
- **Pro:** 1000 requests/minute

## Changelog

- **v2.0.0** - Added new endpoints
- **v1.1.0** - Performance improvements
- **v1.0.0** - Initial release
`,
  },
  {
    id: 'reference-config',
    name: 'Configuration Reference',
    description: 'Complete configuration options documentation',
    category: 'reference',
    difficulty: 'any',
    icon: <FileText className="w-5 h-5" />,
    tags: ['reference', 'configuration', 'options'],
    useCases: ['Config files', 'Settings documentation', 'Options reference'],
    preview: '# [Tool] Configuration Reference\n\nComplete list of configuration options...',
    suggestedPath: 'weaves/wiki/reference/',
    frontmatter: {
      difficulty: 'intermediate',
      contentType: 'reference',
      taxonomy: { subjects: ['technology'], topics: ['configuration'] },
    },
    content: `# [Tool] Configuration Reference

Complete list of configuration options for [Tool].

## Configuration File

Create a \`config.yaml\` (or \`config.json\`) in your project root:

\`\`\`yaml
# config.yaml
option1: value
option2:
  nested: value
\`\`\`

## Options

### Core Options

#### \`option1\`

- **Type:** \`string\`
- **Default:** \`"default"\`
- **Required:** Yes

Description of what this option does.

\`\`\`yaml
option1: "custom-value"
\`\`\`

#### \`option2\`

- **Type:** \`object\`
- **Default:** \`{}\`
- **Required:** No

Nested configuration object.

\`\`\`yaml
option2:
  nested: value
  another: 123
\`\`\`

### Advanced Options

#### \`debug\`

- **Type:** \`boolean\`
- **Default:** \`false\`

Enable debug mode for verbose logging.

#### \`timeout\`

- **Type:** \`number\`
- **Default:** \`30000\`
- **Unit:** milliseconds

Request timeout duration.

### Environment Variables

All options can be set via environment variables:

| Option | Environment Variable |
|--------|---------------------|
| \`option1\` | \`TOOL_OPTION1\` |
| \`option2.nested\` | \`TOOL_OPTION2_NESTED\` |
| \`debug\` | \`TOOL_DEBUG\` |

## Example Configurations

### Minimal

\`\`\`yaml
option1: value
\`\`\`

### Production

\`\`\`yaml
option1: value
debug: false
timeout: 60000
\`\`\`

### Development

\`\`\`yaml
option1: value
debug: true
timeout: 5000
\`\`\`

## Validation

The configuration is validated on startup. Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid option1" | Wrong type | Use string value |
| "Missing required" | Option not set | Add required option |
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONCEPT / EXPLANATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'concept-explainer',
    name: 'Concept Explainer',
    description: 'Clear explanation of a concept or idea',
    category: 'concept',
    difficulty: 'intermediate',
    icon: <Lightbulb className="w-5 h-5" />,
    tags: ['concept', 'explanation', 'theory'],
    useCases: ['Explaining ideas', 'Theory documentation', 'Background knowledge'],
    preview: '# Understanding [Concept]\n\nA clear explanation of what [concept] is...',
    suggestedPath: 'weaves/wiki/concepts/',
    frontmatter: {
      difficulty: 'intermediate',
      contentType: 'concept',
      taxonomy: { subjects: [], topics: [] },
    },
    content: `# Understanding [Concept]

A clear explanation of what [concept] is and why it matters.

## What is [Concept]?

[Simple, one-paragraph definition that anyone can understand]

> **In simple terms:** [Even simpler explanation, like explaining to a friend]

## Why Does It Matter?

[Concept] is important because:

1. **[Benefit 1]**: Explanation
2. **[Benefit 2]**: Explanation
3. **[Benefit 3]**: Explanation

## Key Ideas

### Idea 1: [Name]

[Explanation with analogy or example]

\`\`\`
// Visual or code representation if helpful
\`\`\`

### Idea 2: [Name]

[Explanation]

### Idea 3: [Name]

[Explanation]

## How It Works

### The Basic Model

\`\`\`
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Input   │────▶│ Process  │────▶│  Output  │
└──────────┘     └──────────┘     └──────────┘
\`\`\`

### Step by Step

1. **Step 1**: What happens first
2. **Step 2**: What happens next
3. **Step 3**: Final result

## Real-World Examples

### Example 1: [Scenario]

[Concrete example showing the concept in action]

### Example 2: [Scenario]

[Another example]

## Common Misconceptions

> ❌ **Myth:** [Common misconception]
> 
> ✅ **Reality:** [Correct understanding]

## Relationship to Other Concepts

- **[Related Concept A]**: How they connect
- **[Related Concept B]**: How they differ
- **[Related Concept C]**: When to use which

## Further Reading

- [Deeper Dive](./advanced-concept.md)
- [Related Topic](./related.md)
- [External Resource](https://...)

## Summary

Key takeaways about [concept]:
- [Main point 1]
- [Main point 2]
- [Main point 3]
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TROUBLESHOOTING
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'troubleshooting-guide',
    name: 'Troubleshooting Guide',
    description: 'Problem-solution format for common issues',
    category: 'troubleshooting',
    difficulty: 'intermediate',
    icon: <AlertTriangle className="w-5 h-5" />,
    tags: ['troubleshooting', 'debugging', 'issues'],
    useCases: ['Error resolution', 'Common problems', 'Support docs'],
    preview: '# Troubleshooting [Topic]\n\nSolutions for common issues...',
    suggestedPath: 'weaves/wiki/troubleshooting/',
    frontmatter: {
      difficulty: 'intermediate',
      contentType: 'troubleshooting',
      taxonomy: { subjects: [], topics: ['troubleshooting'] },
    },
    content: `# Troubleshooting [Topic]

Solutions for common issues and how to resolve them.

## Quick Diagnostics

Run this command to check your setup:

\`\`\`bash
# Diagnostic command
tool --diagnose
\`\`\`

## Common Issues

### Issue: [Error Message or Symptom]

**Symptoms:**
- You see [specific error message]
- [Other observable behavior]

**Cause:**
[Why this happens]

**Solution:**

1. First, try [simple fix]:
   \`\`\`bash
   command here
   \`\`\`

2. If that doesn't work, [next step]:
   \`\`\`bash
   another command
   \`\`\`

3. Still not working? [Escalation]:
   - Check [thing]
   - Verify [other thing]

---

### Issue: [Another Common Problem]

**Symptoms:**
- [Description]

**Cause:**
[Explanation]

**Solution:**

\`\`\`bash
# Fix command
\`\`\`

---

### Issue: [Performance Problem]

**Symptoms:**
- Slow [operation]
- High [resource] usage

**Cause:**
[Explanation]

**Solution:**

1. Enable [optimization]:
   \`\`\`yaml
   config:
     optimization: true
   \`\`\`

2. Consider [alternative approach]

## Error Reference

| Error Code | Meaning | Quick Fix |
|------------|---------|-----------|
| \`E001\` | [Description] | [Fix] |
| \`E002\` | [Description] | [Fix] |
| \`E003\` | [Description] | [Fix] |

## Getting Help

If your issue isn't listed here:

1. **Search existing issues:** [Issues page](https://...)
2. **Ask the community:** [Discord/Forum](https://...)
3. **File a bug report:** [Bug template](https://...)

When reporting, include:
- Error message (full text)
- Steps to reproduce
- Environment info (\`tool --version\`)
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARISON
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'comparison-guide',
    name: 'Comparison Guide',
    description: 'Compare multiple options, tools, or approaches',
    category: 'comparison',
    difficulty: 'intermediate',
    icon: <GitCompare className="w-5 h-5" />,
    tags: ['comparison', 'alternatives', 'decision'],
    useCases: ['Tool comparisons', 'Approach evaluation', 'Decision guides'],
    preview: '# [Option A] vs [Option B]\n\nA detailed comparison to help you choose...',
    suggestedPath: 'weaves/wiki/comparisons/',
    frontmatter: {
      difficulty: 'intermediate',
      contentType: 'comparison',
      taxonomy: { subjects: [], topics: [] },
    },
    content: `# [Option A] vs [Option B]

A detailed comparison to help you choose the right approach.

## TL;DR

| Criteria | Option A | Option B |
|----------|----------|----------|
| Best for | [Use case] | [Use case] |
| Learning curve | Easy | Moderate |
| Performance | Fast | Flexible |
| Community | Large | Growing |

**Quick recommendation:**
- Choose **Option A** if [condition]
- Choose **Option B** if [condition]

## Overview

### Option A

[Brief description]

**Key strengths:**
- Strength 1
- Strength 2
- Strength 3

### Option B

[Brief description]

**Key strengths:**
- Strength 1
- Strength 2
- Strength 3

## Detailed Comparison

### Feature Comparison

| Feature | Option A | Option B |
|---------|----------|----------|
| Feature 1 | ✅ Yes | ✅ Yes |
| Feature 2 | ✅ Yes | ❌ No |
| Feature 3 | ❌ No | ✅ Yes |
| Feature 4 | ⚠️ Partial | ✅ Yes |

### Performance

\`\`\`
Benchmark Results:

Option A: ████████████████████ 100ms
Option B: ████████████████████████████ 140ms
\`\`\`

### Developer Experience

**Option A:**
\`\`\`typescript
// Code example showing typical usage
\`\`\`

**Option B:**
\`\`\`typescript
// Code example showing typical usage
\`\`\`

### Ecosystem & Community

| Aspect | Option A | Option B |
|--------|----------|----------|
| GitHub Stars | 50k | 30k |
| npm Downloads | 1M/week | 500k/week |
| Last Release | Recent | Recent |
| Documentation | Excellent | Good |

## When to Choose Each

### Choose Option A When:

- ✅ You need [specific requirement]
- ✅ Your team has [background]
- ✅ Your project is [type]

### Choose Option B When:

- ✅ You need [different requirement]
- ✅ You're building [type of project]
- ✅ You prioritize [quality]

## Migration Path

### From A to B

\`\`\`bash
# Migration steps
\`\`\`

### From B to A

\`\`\`bash
# Migration steps
\`\`\`

## Conclusion

Both options are excellent choices. Your decision should be based on:

1. **Your specific needs:** [Guidance]
2. **Team expertise:** [Guidance]
3. **Project requirements:** [Guidance]
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK START
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'quick-start',
    name: 'Quick Start',
    description: 'Fast onboarding guide to get running in minutes',
    category: 'quick-start',
    difficulty: 'beginner',
    icon: <Rocket className="w-5 h-5" />,
    tags: ['quick-start', 'getting-started', 'onboarding'],
    useCases: ['New users', 'Fast onboarding', 'Minimal setup'],
    preview: '# Quick Start\n\nGet up and running in 5 minutes...',
    suggestedPath: 'weaves/wiki/',
    frontmatter: {
      difficulty: 'beginner',
      contentType: 'quick-start',
      taxonomy: { subjects: [], topics: ['getting-started'] },
    },
    content: `# Quick Start

Get up and running in 5 minutes.

## Installation

\`\`\`bash
npm install [package]
\`\`\`

## Basic Usage

\`\`\`typescript
import { Thing } from '[package]'

const thing = new Thing()
thing.doSomething()
\`\`\`

## Next Steps

- 📚 [Full Tutorial](./tutorial.md)
- 📖 [API Reference](./reference.md)
- 💡 [Examples](./examples.md)
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ARCHITECTURE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'architecture-doc',
    name: 'Architecture Document',
    description: 'System design and architecture documentation',
    category: 'architecture',
    difficulty: 'advanced',
    icon: <Layers className="w-5 h-5" />,
    tags: ['architecture', 'design', 'system'],
    useCases: ['System design', 'Technical specs', 'ADRs'],
    preview: '# [System] Architecture\n\nOverview of the system architecture...',
    suggestedPath: 'weaves/wiki/architecture/',
    frontmatter: {
      difficulty: 'advanced',
      contentType: 'architecture',
      taxonomy: { subjects: ['technology'], topics: ['architecture'] },
    },
    content: `# [System] Architecture

## Overview

[High-level description of the system and its purpose]

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                      Client Layer                        │
├─────────────────────────────────────────────────────────┤
│                       API Gateway                        │
├─────────────────────────────────────────────────────────┤
│     Service A     │     Service B     │     Service C    │
├─────────────────────────────────────────────────────────┤
│                     Data Layer                           │
└─────────────────────────────────────────────────────────┘
\`\`\`

## Components

### Component A

**Purpose:** [What it does]

**Responsibilities:**
- [Responsibility 1]
- [Responsibility 2]

**Interfaces:**
- Input: [Description]
- Output: [Description]

### Component B

**Purpose:** [What it does]

## Data Flow

1. Request comes in through [entry point]
2. [Component A] processes [something]
3. Data flows to [Component B]
4. Response returns through [exit point]

## Design Decisions

### Decision 1: [Choice Made]

**Context:** [Why we needed to decide]

**Decision:** [What we chose]

**Consequences:**
- ✅ [Positive outcome]
- ⚠️ [Trade-off]

### Decision 2: [Choice Made]

**Context:** [Why we needed to decide]

**Decision:** [What we chose]

## Scalability

### Horizontal Scaling

[How the system scales horizontally]

### Vertical Scaling

[Limits and considerations]

## Security

- **Authentication:** [Method]
- **Authorization:** [Approach]
- **Data Protection:** [Measures]

## Monitoring

- **Metrics:** [What we track]
- **Alerts:** [Conditions]
- **Logging:** [Approach]

## Future Considerations

- [ ] [Planned improvement 1]
- [ ] [Planned improvement 2]
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FAQ
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'faq-page',
    name: 'FAQ Page',
    description: 'Frequently asked questions format',
    category: 'faq',
    difficulty: 'any',
    icon: <MessageSquare className="w-5 h-5" />,
    tags: ['faq', 'questions', 'answers'],
    useCases: ['Common questions', 'Support content', 'Self-service help'],
    preview: '# Frequently Asked Questions\n\nAnswers to common questions...',
    suggestedPath: 'weaves/wiki/',
    frontmatter: {
      difficulty: 'beginner',
      contentType: 'faq',
      taxonomy: { subjects: [], topics: [] },
    },
    content: `# Frequently Asked Questions

Answers to common questions about [topic].

## General

### What is [Topic]?

[Clear, concise answer]

### Who is this for?

[Target audience description]

### How much does it cost?

[Pricing information]

## Getting Started

### How do I install it?

\`\`\`bash
npm install [package]
\`\`\`

### What are the requirements?

- [Requirement 1]
- [Requirement 2]

### Where can I find examples?

Check out the [examples directory](./examples/) or our [tutorial](./tutorial.md).

## Usage

### How do I [common task]?

[Step-by-step answer]

\`\`\`typescript
// Code example
\`\`\`

### Can I use it with [other tool]?

Yes! See our [integration guide](./integrations.md).

### What's the difference between [A] and [B]?

| Aspect | A | B |
|--------|---|---|
| Purpose | [X] | [Y] |
| When to use | [Condition] | [Condition] |

## Troubleshooting

### Why am I seeing [error]?

This usually means [cause]. Try:

1. [Fix step 1]
2. [Fix step 2]

### It's not working, what should I do?

1. Check our [troubleshooting guide](./troubleshooting.md)
2. Search [existing issues](https://...)
3. Ask in our [community](https://...)

## Contributing

### How can I contribute?

See our [contributing guide](./CONTRIBUTING.md).

### How do I report a bug?

[Bug reporting instructions]

## Still Have Questions?

- 📚 [Documentation](./docs/)
- 💬 [Community Forum](https://...)
- 📧 [Contact Us](mailto:...)
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GLOSSARY
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'glossary',
    name: 'Glossary',
    description: 'Term definitions and vocabulary reference',
    category: 'glossary',
    difficulty: 'any',
    icon: <List className="w-5 h-5" />,
    tags: ['glossary', 'definitions', 'terminology'],
    useCases: ['Term definitions', 'Vocabulary', 'Jargon reference'],
    preview: '# Glossary\n\nKey terms and definitions...',
    suggestedPath: 'weaves/wiki/',
    frontmatter: {
      difficulty: 'beginner',
      contentType: 'glossary',
      taxonomy: { subjects: [], topics: [] },
    },
    content: `# Glossary

Key terms and definitions used throughout the documentation.

## A

### API (Application Programming Interface)

A set of protocols and tools for building software applications. APIs define how software components should interact.

**Related:** [REST](#rest), [SDK](#sdk)

### Authentication

The process of verifying the identity of a user or system.

**See also:** [Authorization](#authorization)

### Authorization

The process of determining what permissions an authenticated user has.

## B

### [Term]

[Definition]

**Example:** [Usage example]

## C

### [Term]

[Definition]

## D-Z

[Continue with more terms...]

---

## Quick Reference Table

| Term | Definition |
|------|------------|
| API | Application Programming Interface |
| Auth | Authentication/Authorization |
| [Term] | [Short definition] |

## See Also

- [Concepts Guide](./concepts.md)
- [API Reference](./api-reference.md)
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CHANGELOG
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'changelog',
    name: 'Changelog',
    description: 'Version history and release notes template',
    category: 'changelog',
    difficulty: 'any',
    icon: <Newspaper className="w-5 h-5" />,
    tags: ['changelog', 'releases', 'history'],
    useCases: ['Release notes', 'Version history', 'Update logs'],
    preview: '# Changelog\n\nAll notable changes to this project...',
    suggestedPath: 'docs/',
    frontmatter: {
      difficulty: 'beginner',
      contentType: 'changelog',
      taxonomy: { subjects: [], topics: [] },
    },
    content: `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature description

### Changed
- Change description

### Deprecated
- Deprecated feature description

### Removed
- Removed feature description

### Fixed
- Bug fix description

### Security
- Security fix description

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Core functionality
- Documentation

### Changed
- N/A (initial release)

## [0.2.0] - 2023-12-01

### Added
- Beta feature X
- Beta feature Y

### Fixed
- Issue with Z

## [0.1.0] - 2023-11-01

### Added
- Alpha release
- Basic functionality

---

[Unreleased]: https://github.com/user/repo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/user/repo/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/user/repo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/user/repo/releases/tag/v0.1.0
`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CASE STUDY
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Real-world example with analysis and learnings',
    category: 'case-study',
    difficulty: 'intermediate',
    icon: <Target className="w-5 h-5" />,
    tags: ['case-study', 'example', 'real-world'],
    useCases: ['Success stories', 'Implementation examples', 'Lessons learned'],
    preview: '# Case Study: [Project Name]\n\nHow [company] achieved [result]...',
    suggestedPath: 'weaves/wiki/case-studies/',
    frontmatter: {
      difficulty: 'intermediate',
      contentType: 'case-study',
      taxonomy: { subjects: [], topics: [] },
    },
    content: `# Case Study: [Project Name]

How [company/team] achieved [impressive result] using [approach].

## Overview

| Aspect | Details |
|--------|---------|
| **Company** | [Name] |
| **Industry** | [Industry] |
| **Challenge** | [Brief challenge] |
| **Solution** | [Brief solution] |
| **Result** | [Key metric improvement] |

## The Challenge

[Detailed description of the problem they faced]

### Key Pain Points

1. **[Pain Point 1]**: Description
2. **[Pain Point 2]**: Description
3. **[Pain Point 3]**: Description

### Business Impact

- [Negative impact 1]
- [Negative impact 2]

## The Solution

### Approach

[Description of the approach taken]

### Implementation

#### Phase 1: [Name]

[What they did first]

#### Phase 2: [Name]

[What they did next]

#### Phase 3: [Name]

[Final phase]

### Technical Details

\`\`\`typescript
// Relevant code or configuration
\`\`\`

## Results

### Quantitative

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| [Metric 1] | X | Y | +Z% |
| [Metric 2] | X | Y | +Z% |

### Qualitative

> "[Quote from stakeholder about the impact]"
> — [Name], [Title]

## Key Learnings

1. **[Learning 1]**: Explanation
2. **[Learning 2]**: Explanation
3. **[Learning 3]**: Explanation

## Recommendations

For others facing similar challenges:

- ✅ Do [recommendation 1]
- ✅ Consider [recommendation 2]
- ⚠️ Avoid [anti-pattern]

## Related Resources

- [Similar Case Study](./other-case-study.md)
- [Implementation Guide](./implementation.md)
`,
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function StrandTemplateLibrary({ onSelectTemplate, onClose }: StrandTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all')
  const [previewTemplate, setPreviewTemplate] = useState<StrandTemplate | null>(null)
  const [showFilters, setShowFilters] = useState(true)

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter(template => {
      // Category filter
      if (selectedCategory !== 'all' && template.category !== selectedCategory) return false
      
      // Difficulty filter
      if (selectedDifficulty !== 'all' && template.difficulty !== 'any' && template.difficulty !== selectedDifficulty) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = template.name.toLowerCase().includes(query)
        const matchesDesc = template.description.toLowerCase().includes(query)
        const matchesTags = template.tags.some(t => t.toLowerCase().includes(query))
        const matchesUseCases = template.useCases.some(u => u.toLowerCase().includes(query))
        if (!matchesName && !matchesDesc && !matchesTags && !matchesUseCases) return false
      }
      
      return true
    })
  }, [searchQuery, selectedCategory, selectedDifficulty])

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, StrandTemplate[]> = {}
    filteredTemplates.forEach(template => {
      if (!groups[template.category]) groups[template.category] = []
      groups[template.category].push(template)
    })
    return groups
  }, [filteredTemplates])

  const categories = Object.keys(CATEGORY_CONFIG) as TemplateCategory[]

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Template Library</h2>
              <p className="text-sm text-zinc-500">Choose a template to get started quickly</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0 text-sm focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3">
                {/* Category pills */}
                <div>
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedCategory === 'all'
                          ? 'bg-purple-500 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                      }`}
                    >
                      All
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          selectedCategory === cat
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                        }`}
                      >
                        {CATEGORY_CONFIG[cat].icon}
                        {CATEGORY_CONFIG[cat].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Difficulty</label>
                  <div className="flex gap-2">
                    {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(diff => (
                      <button
                        key={diff}
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          selectedDifficulty === diff
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                        }`}
                      >
                        {diff === 'all' ? 'All' : diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Template Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">No templates match your filters</p>
          </div>
        ) : selectedCategory === 'all' ? (
          // Show grouped by category
          <div className="space-y-8">
            {Object.entries(groupedTemplates).map(([category, templates]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-1.5 rounded-lg ${CATEGORY_CONFIG[category as TemplateCategory].color}`}>
                    {CATEGORY_CONFIG[category as TemplateCategory].icon}
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {CATEGORY_CONFIG[category as TemplateCategory].label}
                  </h3>
                  <span className="text-xs text-zinc-400">({templates.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={onSelectTemplate}
                      onPreview={setPreviewTemplate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Show flat grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={onSelectTemplate}
                onPreview={setPreviewTemplate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setPreviewTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Preview Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${CATEGORY_CONFIG[previewTemplate.category].color}`}>
                    {previewTemplate.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{previewTemplate.name}</h3>
                    <p className="text-sm text-zinc-500">{previewTemplate.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                  {previewTemplate.content}
                </pre>
              </div>

              {/* Preview Footer */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end gap-3">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSelectTemplate(previewTemplate)
                    setPreviewTemplate(null)
                  }}
                  className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Use This Template
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE CARD COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function TemplateCard({
  template,
  onSelect,
  onPreview,
}: {
  template: StrandTemplate
  onSelect: (template: StrandTemplate) => void
  onPreview: (template: StrandTemplate) => void
}) {
  const categoryConfig = CATEGORY_CONFIG[template.category]

  return (
    <div className="group relative bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg overflow-hidden">
      {/* Card Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2 rounded-lg ${categoryConfig.color} text-white`}>
            {template.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-zinc-900 dark:text-white truncate">{template.name}</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{template.description}</p>
          </div>
        </div>

        {/* Preview snippet */}
        <div className="mb-3 p-2 rounded bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-600 dark:text-zinc-400 line-clamp-3">
          {template.preview}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
          {template.difficulty !== 'any' && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              template.difficulty === 'beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
              template.difficulty === 'intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {template.difficulty}
            </span>
          )}
        </div>

        {/* Use Cases */}
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium">Use for:</span> {template.useCases.slice(0, 2).join(', ')}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-700 flex gap-2">
        <button
          onClick={() => onPreview(template)}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          onClick={() => onSelect(template)}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 flex items-center justify-center gap-1"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Use
        </button>
      </div>
    </div>
  )
}

// Export templates for use elsewhere
export { TEMPLATES, CATEGORY_CONFIG }






