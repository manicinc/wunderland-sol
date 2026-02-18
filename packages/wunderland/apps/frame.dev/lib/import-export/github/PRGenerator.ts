/**
 * GitHub PR Generator
 * @module lib/import-export/github/PRGenerator
 *
 * Generates pull request files and instructions for bulk imports.
 * Supports manual workflow (no PAT required) and automated PR creation.
 */

import JSZip from 'jszip'
import type { StrandContent } from '@/lib/content/types'

// ============================================================================
// TYPES
// ============================================================================

export interface PRGenerationOptions {
  /** Base branch to create PR against */
  baseBranch?: string
  /** PR title prefix */
  titlePrefix?: string
  /** Include instructions file */
  includeInstructions?: boolean
}

export interface PRGenerationResult {
  /** ZIP blob containing all files */
  zipBlob: Blob
  /** Filename for the ZIP */
  filename: string
  /** Number of strands included */
  strandCount: number
  /** Total size in bytes */
  totalSizeBytes: number
  /** Branch name */
  branchName: string
}

// ============================================================================
// PR GENERATOR
// ============================================================================

export class PRGenerator {
  /**
   * Generate PR request files for manual workflow
   */
  async generatePRRequestFiles(
    strands: StrandContent[],
    options: PRGenerationOptions = {}
  ): Promise<PRGenerationResult> {
    const {
      baseBranch = 'master',
      titlePrefix = 'Import',
      includeInstructions = true,
    } = options

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const branchName = `import-${timestamp}`

    // Create ZIP archive
    const zip = new JSZip()

    // Group strands by weave/loom
    const strandsByWeave = this.groupStrandsByWeave(strands)

    // Add strand files to ZIP
    let totalSize = 0
    for (const strand of strands) {
      const content = this.formatStrandContent(strand)
      const filePath = strand.path || `weaves/${strand.weave}/${strand.slug}.md`
      zip.file(filePath, content)
      totalSize += content.length
    }

    // Add instructions file
    if (includeInstructions) {
      const instructions = this.generateInstructions(strands, branchName, baseBranch, strandsByWeave)
      zip.file('IMPORT_INSTRUCTIONS.md', instructions)
      totalSize += instructions.length
    }

    // Add PR description
    const prDescription = this.generatePRDescription(strands, strandsByWeave)
    zip.file('PR_DESCRIPTION.md', prDescription)
    totalSize += prDescription.length

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    return {
      zipBlob,
      filename: `import-${timestamp}.zip`,
      strandCount: strands.length,
      totalSizeBytes: totalSize,
      branchName,
    }
  }

  /**
   * Group strands by weave
   */
  private groupStrandsByWeave(strands: StrandContent[]): Map<string, StrandContent[]> {
    const groups = new Map<string, StrandContent[]>()

    for (const strand of strands) {
      const weave = strand.weave || 'default'
      if (!groups.has(weave)) {
        groups.set(weave, [])
      }
      groups.get(weave)!.push(strand)
    }

    return groups
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
   * Generate step-by-step instructions
   */
  private generateInstructions(
    strands: StrandContent[],
    branchName: string,
    baseBranch: string,
    strandsByWeave: Map<string, StrandContent[]>
  ): string {
    const fileList = strands
      .map((s) => `- ${s.path || `weaves/${s.weave}/${s.slug}.md`}`)
      .join('\n')

    return `# Import Instructions

## Overview

This archive contains ${strands.length} strand(s) ready to import into your Quarry Codex repository.

**Branch name:** \`${branchName}\`
**Base branch:** \`${baseBranch}\`

## Automated Import (Recommended)

If you have a GitHub Personal Access Token (PAT) configured in Frame.dev, you can use the automated import feature to create the pull request automatically.

## Manual Import Steps

Follow these steps to manually create a pull request:

### Step 1: Extract Files

Extract all markdown files from this ZIP archive to your local Quarry Codex repository.

### Step 2: Create Branch

\`\`\`bash
# Navigate to your repository
cd /path/to/your/codex-repo

# Ensure you're on the base branch
git checkout ${baseBranch}

# Pull latest changes
git pull origin ${baseBranch}

# Create and checkout new branch
git checkout -b ${branchName}
\`\`\`

### Step 3: Copy Files

Copy the extracted files to the appropriate locations:

${fileList}

### Step 4: Commit Changes

\`\`\`bash
# Add all new files
git add weaves/

# Commit with descriptive message
git commit -m "Import ${strands.length} strand(s) from Frame.dev

Imported from:
${Array.from(strandsByWeave.keys())
  .map((weave) => `- ${weave} (${strandsByWeave.get(weave)!.length} strands)`)
  .join('\n')}

🤖 Generated with Frame.dev

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to remote
git push -u origin ${branchName}
\`\`\`

### Step 5: Create Pull Request

1. Go to your GitHub repository
2. Click "Compare & pull request" for the \`${branchName}\` branch
3. Copy the content from \`PR_DESCRIPTION.md\` into the PR description
4. Review the changes
5. Click "Create pull request"

## File Summary

${Array.from(strandsByWeave.entries())
  .map(
    ([weave, weaveStrands]) =>
      `### ${weave} (${weaveStrands.length} strands)\n\n${weaveStrands.map((s) => `- ${s.title || s.slug}`).join('\n')}`
  )
  .join('\n\n')}

## Notes

- All files are markdown (.md) format
- Frontmatter is preserved with metadata
- Folder structure matches weave/loom hierarchy
- Review each file before merging to ensure quality

---

*Generated by Frame.dev on ${new Date().toLocaleString()}*
`
  }

  /**
   * Generate PR description
   */
  private generatePRDescription(
    strands: StrandContent[],
    strandsByWeave: Map<string, StrandContent[]>
  ): string {
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

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
`
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let prGeneratorInstance: PRGenerator | null = null

/**
 * Get singleton PRGenerator instance
 */
export function getPRGenerator(): PRGenerator {
  if (!prGeneratorInstance) {
    prGeneratorInstance = new PRGenerator()
  }
  return prGeneratorInstance
}

/**
 * Reset PRGenerator instance (for testing)
 */
export function resetPRGenerator(): void {
  prGeneratorInstance = null
}
