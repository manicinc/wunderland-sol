/**
 * Bulk PR Creator
 * @module lib/import-export/github/BulkPRCreator
 *
 * Automates pull request creation for bulk imports.
 * Requires GitHub Personal Access Token.
 */

import type { StrandContent } from '@/lib/content/types'

// ============================================================================
// TYPES
// ============================================================================

export interface BulkPROptions {
  /** GitHub repository owner */
  owner: string
  /** GitHub repository name */
  repo: string
  /** Base branch to create PR against */
  baseBranch?: string
  /** GitHub Personal Access Token */
  token: string
  /** PR title prefix */
  titlePrefix?: string
  /** Commit message suffix */
  commitMessageSuffix?: string
}

export interface BulkPRResult {
  /** Created PR number */
  prNumber: number
  /** PR URL */
  prUrl: string
  /** Branch name */
  branchName: string
  /** Number of files committed */
  filesCommitted: number
}

export interface FileToCommit {
  path: string
  content: string
}

// ============================================================================
// BULK PR CREATOR
// ============================================================================

export class BulkPRCreator {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  /**
   * Create a pull request with all imported strands
   */
  async createPRForImport(
    strands: StrandContent[],
    options: Omit<BulkPROptions, 'token'>
  ): Promise<BulkPRResult> {
    const {
      owner,
      repo,
      baseBranch = 'master',
      titlePrefix = 'Import',
      commitMessageSuffix = '',
    } = options

    // Generate branch name
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const branchName = `import-${timestamp}`

    // Prepare files for commit
    const files = this.prepareFiles(strands)

    // Get base branch SHA
    const baseSha = await this.getBranchSHA(owner, repo, baseBranch)

    // Create new branch
    await this.createBranch(owner, repo, branchName, baseSha)

    // Create tree with all files
    const treeSha = await this.createTree(owner, repo, baseSha, files)

    // Create commit
    const commitMessage = this.generateCommitMessage(strands, commitMessageSuffix)
    const commitSha = await this.createCommit(owner, repo, commitMessage, treeSha, baseSha)

    // Update branch reference
    await this.updateBranch(owner, repo, branchName, commitSha)

    // Create pull request
    const prData = await this.createPR(
      owner,
      repo,
      branchName,
      baseBranch,
      `${titlePrefix}: ${strands.length} strand(s)`,
      this.generatePRDescription(strands)
    )

    return {
      prNumber: prData.number,
      prUrl: prData.html_url,
      branchName,
      filesCommitted: files.length,
    }
  }

  /**
   * Prepare files for commit
   */
  private prepareFiles(strands: StrandContent[]): FileToCommit[] {
    return strands.map((strand) => ({
      path: strand.path || `weaves/${strand.weave}/${strand.slug}.md`,
      content: this.formatStrandContent(strand),
    }))
  }

  /**
   * Format strand content with frontmatter
   */
  private formatStrandContent(strand: StrandContent): string {
    const frontmatter = strand.frontmatter || {}
    const frontmatterYaml = Object.keys(frontmatter).length > 0
      ? `---\n${Object.entries(frontmatter)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n')}\n---\n\n`
      : ''

    return `${frontmatterYaml}${strand.content}`
  }

  /**
   * Generate commit message
   */
  private generateCommitMessage(strands: StrandContent[], suffix: string): string {
    const strandsByWeave = new Map<string, number>()

    for (const strand of strands) {
      const weave = strand.weave || 'default'
      strandsByWeave.set(weave, (strandsByWeave.get(weave) || 0) + 1)
    }

    const breakdown = Array.from(strandsByWeave.entries())
      .map(([weave, count]) => `- ${weave} (${count} strands)`)
      .join('\n')

    return `Import ${strands.length} strand(s) from Frame.dev

Imported from:
${breakdown}

${suffix}

🤖 Generated with Frame.dev

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
  }

  /**
   * Generate PR description
   */
  private generatePRDescription(strands: StrandContent[]): string {
    const strandsByWeave = new Map<string, StrandContent[]>()

    for (const strand of strands) {
      const weave = strand.weave || 'default'
      if (!strandsByWeave.has(weave)) {
        strandsByWeave.set(weave, [])
      }
      strandsByWeave.get(weave)!.push(strand)
    }

    return `## Import Summary

Importing **${strands.length} strand(s)** into the Quarry Codex.

### Breakdown by Weave

${Array.from(strandsByWeave.entries())
  .map(
    ([weave, weaveStrands]) =>
      `**${weave}**: ${weaveStrands.length} strand(s)\n${weaveStrands.map((s) => `  - ${s.title || s.slug}`).join('\n')}`
  )
  .join('\n\n')}

### Import Details

- **Total strands**: ${strands.length}
- **Total weaves**: ${strandsByWeave.size}
- **Import date**: ${new Date().toLocaleDateString()}
- **Generated by**: Frame.dev

### Changes

This PR adds the following markdown files:

${strands.map((s) => `- \`${s.path || `weaves/${s.weave}/${s.slug}.md`}\``).join('\n')}

### Testing

- [ ] All files have valid frontmatter
- [ ] Content renders correctly in Codex viewer
- [ ] Links and references are intact
- [ ] Taxonomy and metadata are accurate

---

🤖 Generated with [Frame.dev](https://frame.dev)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
  }

  // ==========================================================================
  // GITHUB API METHODS
  // ==========================================================================

  /**
   * Get branch SHA
   */
  private async getBranchSHA(owner: string, repo: string, branch: string): Promise<string> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get branch SHA: ${response.statusText}`)
    }

    const data = await response.json()
    return data.object.sha
  }

  /**
   * Create new branch
   */
  private async createBranch(owner: string, repo: string, branchName: string, sha: string): Promise<void> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create branch: ${response.statusText}`)
    }
  }

  /**
   * Create tree with all files
   */
  private async createTree(
    owner: string,
    repo: string,
    baseSha: string,
    files: FileToCommit[]
  ): Promise<string> {
    const tree = files.map((file) => ({
      path: file.path,
      mode: '100644' as const,
      type: 'blob' as const,
      content: file.content,
    }))

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_tree: baseSha,
        tree,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create tree: ${response.statusText}`)
    }

    const data = await response.json()
    return data.sha
  }

  /**
   * Create commit
   */
  private async createCommit(
    owner: string,
    repo: string,
    message: string,
    treeSha: string,
    parentSha: string
  ): Promise<string> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        tree: treeSha,
        parents: [parentSha],
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create commit: ${response.statusText}`)
    }

    const data = await response.json()
    return data.sha
  }

  /**
   * Update branch reference
   */
  private async updateBranch(owner: string, repo: string, branchName: string, sha: string): Promise<void> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sha,
          force: true,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update branch: ${response.statusText}`)
    }
  }

  /**
   * Create pull request
   */
  private async createPR(
    owner: string,
    repo: string,
    head: string,
    base: string,
    title: string,
    body: string
  ): Promise<{ number: number; html_url: string }> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create PR: ${response.statusText}`)
    }

    return await response.json()
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a BulkPRCreator instance with token
 */
export function createBulkPRCreator(token: string): BulkPRCreator {
  return new BulkPRCreator(token)
}
