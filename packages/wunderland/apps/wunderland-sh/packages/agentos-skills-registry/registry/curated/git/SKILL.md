---
name: git
version: '1.0.0'
description: Work with Git repositories from the command line.
author: Wunderland
namespace: wunderland
category: developer-tools
tags: [git, version-control, vcs, branching, commits]
requires_secrets: []
requires_tools: [filesystem]
metadata:
  agentos:
    emoji: '🧰'
    requires:
      bins: ['git']
    install:
      - id: brew
        kind: brew
        formula: git
        bins: ['git']
        label: 'Install git (brew)'
      - id: apt
        kind: apt
        package: git
        bins: ['git']
        os: ['linux']
        label: 'Install git (apt)'
---

# Git

Use `git` to inspect history, create branches, commit changes, and resolve conflicts.

## Common workflows

- Check status: `git status`
- Create a branch: `git checkout -b my-branch`
- Stage + commit: `git add -A && git commit -m "message"`
- Rebase: `git rebase -i origin/main`
