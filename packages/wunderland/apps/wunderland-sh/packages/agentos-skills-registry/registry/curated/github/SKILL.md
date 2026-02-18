---
name: github
version: '1.0.0'
description: Manage GitHub repositories, issues, pull requests, releases, and Actions workflows using the gh CLI.
author: Wunderland
namespace: wunderland
category: developer-tools
tags: [github, git, issues, pull-requests, ci-cd, code-review]
requires_secrets: [github.token]
requires_tools: [filesystem]
metadata:
  agentos:
    emoji: "\U0001F419"
    primaryEnv: GITHUB_TOKEN
    requires:
      bins: ['gh']
    install:
      - id: brew
        kind: brew
        formula: gh
        bins: ['gh']
        label: 'Install GitHub CLI (brew)'
      - id: apt
        kind: apt
        package: gh
        bins: ['gh']
        os: ['linux']
        label: 'Install GitHub CLI (apt)'
---

# GitHub (gh CLI)

Use the `gh` CLI to interact with GitHub repositories, issues, pull requests, releases, and GitHub Actions. You have full access to the GitHub API through the CLI, which supports both interactive and scriptable workflows.

When managing issues, always check for existing duplicates before creating new ones. For pull requests, include a clear title and description summarizing the changes. When reviewing PRs, provide specific, actionable feedback referencing line numbers. Use labels and milestones to organize work when the repository supports them.

For repository operations, prefer `gh api` for advanced queries that the standard subcommands do not cover. You can use `gh api graphql` for complex queries involving nested relationships. Always verify authentication status with `gh auth status` before performing write operations.

When working with GitHub Actions, you can trigger workflows with `gh workflow run`, check run status with `gh run list`, and view logs with `gh run view --log`. Use `gh release create` to manage releases with proper semantic versioning and changelogs.

## Examples

- `gh issue list --label bug --state open`
- `gh pr create --title "Fix auth bug" --body "Resolves #42"`
- `gh pr review 123 --approve`
- `gh api repos/{owner}/{repo}/actions/runs --jq '.workflow_runs[:5]'`
- `gh release create v1.2.0 --generate-notes`

## Constraints

- Requires the `gh` CLI to be installed and authenticated.
- Write operations require appropriate repository permissions.
- API rate limits apply (5,000 requests/hour for authenticated users).
- Large file operations should use Git LFS rather than the GitHub API.
