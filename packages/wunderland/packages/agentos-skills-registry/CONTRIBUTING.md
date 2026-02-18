# Contributing to @framers/agentos-skills-registry

Thank you for your interest in contributing a skill to the AgentOS ecosystem! This guide walks you through the process of creating, testing, and submitting a new skill.

## Overview

Skills are **SKILL.md files** — each containing YAML frontmatter (metadata) and a markdown body (instructions for the AI agent). They live inside the `@framers/agentos-skills-registry` package alongside the typed SDK. There are no individual packages per skill.

Skills are organized into two tiers:

| Tier          | Directory             | Namespace    | Maintained By               | Verified |
| ------------- | --------------------- | ------------ | --------------------------- | -------- |
| **Curated**   | `registry/curated/`   | `wunderland` | Framers staff               | Yes      |
| **Community** | `registry/community/` | `community`  | Original author / community | No       |

Curated skills ship pre-verified and are maintained by the Framers team. Community skills are submitted via pull request by anyone and are maintained by their authors.

## Creating a New Skill

### Step 1 — Fork the repo

Fork [framersai/agentos-skills-registry](https://github.com/framersai/agentos-skills-registry) and clone it locally.

```bash
git clone https://github.com/<your-username>/agentos-skills-registry.git
cd agentos-skills-registry
```

### Step 2 — Create the skill directory

Create a new directory under `registry/community/` with your skill name. The directory name must be lowercase, use hyphens for separators, and match the `name` field in your frontmatter.

```bash
mkdir -p registry/community/my-skill
```

### Step 3 — Write the SKILL.md file

Create `registry/community/my-skill/SKILL.md` with two parts:

1. **YAML frontmatter** between `---` delimiters containing metadata
2. **Markdown body** containing instructions for the AI agent

The markdown body should be written in **2nd person** ("You can...", "Use the...") because it is injected directly into an agent's system prompt.

### Step 4 — Write the YAML frontmatter

Fill in all required fields. See the [SKILL.md Format Reference](#skillmd-format-reference) below for the complete spec.

### Step 5 — Write the markdown body

The body is the actual instructions the AI agent will follow. It should include:

- A heading with the skill name
- A description of what the skill enables the agent to do
- Step-by-step guidance for how the agent should use the skill
- An **Examples** section with concrete usage examples
- A **Constraints** section documenting limitations

### Step 6 — Validate your skill

```bash
npm run validate registry/community/my-skill/SKILL.md
```

## SKILL.md Format Reference

### Required Fields

| Field         | Type   | Description                                                                |
| ------------- | ------ | -------------------------------------------------------------------------- |
| `name`        | string | Skill identifier. Must match the directory name. Lowercase, hyphens only.  |
| `version`     | string | Semantic version (e.g., `'1.0.0'`). Quote it to avoid YAML parsing issues. |
| `description` | string | Short description, under 200 characters.                                   |
| `author`      | string | Your name or GitHub username.                                              |
| `namespace`   | string | Must be `community` for community submissions.                             |
| `category`    | string | One of the valid categories listed below.                                  |
| `tags`        | array  | At least one tag. Use lowercase, hyphenated strings.                       |

### Optional Fields

| Field                       | Type   | Description                                                               |
| --------------------------- | ------ | ------------------------------------------------------------------------- |
| `requires_secrets`          | array  | Secret keys the skill needs (e.g., `[service.token]`). Use `[]` if none.  |
| `requires_tools`            | array  | Tool names the skill depends on (e.g., `[web-search]`). Use `[]` if none. |
| `metadata.agentos.emoji`    | string | Emoji icon for the skill in UIs.                                          |
| `metadata.agentos.homepage` | string | URL to the skill's related service or docs.                               |

### Valid Categories

- `information` — Data lookup, search, knowledge retrieval
- `developer-tools` — Code, repos, CI/CD, debugging
- `communication` — Chat, email, messaging platforms
- `productivity` — Note-taking, task management, organization
- `devops` — Infrastructure, monitoring, deployment
- `media` — Audio, video, image, streaming
- `security` — Passwords, encryption, access control
- `creative` — Art, writing, design, generation

### Full Template

Copy and paste this into `registry/community/<your-skill>/SKILL.md`:

```markdown
---
name: my-skill
version: '1.0.0'
description: A short description of what this skill does (under 200 characters).
author: your-github-username
namespace: community
category: information
tags: [example, template]
requires_secrets: []
requires_tools: []
metadata:
  agentos:
    emoji: "\U0001F527"
    homepage: https://example.com
---

# My Skill

You can use this skill to [describe what the agent can do]. When the user asks about [topic], you should [describe the agent's behavior].

Provide clear, structured responses. If the user's request is ambiguous, ask for clarification before proceeding.

## Examples

- "Example user query 1"
- "Example user query 2"
- "Example user query 3"

## Constraints

- Limitation or caveat 1.
- Limitation or caveat 2.
- Limitation or caveat 3.
```

## Testing Your Skill

Run the validation script against your SKILL.md file:

```bash
npm run validate registry/community/my-skill/SKILL.md
```

The validator checks:

- All required frontmatter fields are present
- Category is valid
- Description is under 200 characters
- Tags array has at least one entry
- Namespace is `community` or `wunderland`
- Skill name matches the directory name
- Markdown body is not empty
- No obvious secrets or API keys are embedded in the file

Fix any reported issues before submitting your PR.

## Submitting a PR

### 1. Create a branch

```bash
git checkout -b add-skill/my-skill
```

### 2. Commit your SKILL.md

```bash
git add registry/community/my-skill/SKILL.md
git commit -m "feat: add my-skill community skill"
```

### 3. Push and open a PR

```bash
git push origin add-skill/my-skill
```

Open a pull request against the `main` branch. The PR template will guide you through the checklist.

### PR Checklist

Before submitting, confirm:

- [ ] Skill is in `registry/community/<name>/SKILL.md`
- [ ] All required YAML fields are present
- [ ] `namespace` is set to `community`
- [ ] Category is one of the 8 valid categories
- [ ] Description is under 200 characters
- [ ] Markdown body includes usage instructions, Examples, and Constraints
- [ ] No secrets, API keys, or credentials are in the file
- [ ] `npm run validate` passes

### What Reviewers Look For

- **Quality**: Is the skill well-written? Are instructions clear and actionable?
- **No secrets**: The file must not contain API keys, tokens, passwords, or credentials.
- **Valid format**: Frontmatter must parse correctly with all required fields.
- **Usefulness**: Does the skill provide value that is not already covered by an existing skill?
- **Specificity**: Is the scope well-defined? Skills should do one thing well.

## Promotion to Curated

Community skills can be promoted to the curated tier. Promotion criteria:

1. **Longevity** — The skill has been in `registry/community/` for at least 3 months.
2. **Positive feedback** — The skill has received positive user feedback or adoption.
3. **Maintained** — The original author is responsive to issues and keeps the skill up to date.
4. **Staff review** — A Framers team member reviews the skill for quality and completeness.

When a skill is promoted:

- It moves from `registry/community/<name>/` to `registry/curated/<name>/`.
- The `namespace` field changes from `community` to `wunderland`.
- The `verified` flag is set to `true` in `registry.json`.
- The Framers team assumes co-maintenance responsibility.

To nominate a community skill for promotion, open an issue titled "Promote: <skill-name>" with a brief justification.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold this code. Please report unacceptable behavior to [team@frame.dev](mailto:team@frame.dev).
