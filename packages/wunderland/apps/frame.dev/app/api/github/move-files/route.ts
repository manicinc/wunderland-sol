/**
 * GitHub Move Files API Route
 * @module api/github/move-files
 *
 * @remarks
 * Moves files within the Quarry Codex repository by creating a PR.
 * Each move operation: reads source, creates at destination, deletes source.
 */

import { NextRequest, NextResponse } from 'next/server'

const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'OpenStrand'
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'frame.codex'
const DEFAULT_BRANCH = process.env.GITHUB_DEFAULT_BRANCH || 'master'

interface MoveOperation {
  type: 'move'
  sourcePath: string
  destPath: string
  name: string
  nodeType: 'file' | 'dir'
}

interface MoveFilesRequest {
  operations: MoveOperation[]
  branchName?: string
  commitMessage?: string
  prTitle?: string
  prBody?: string
}

interface FileInfo {
  path: string
  content: string
  sha: string
}

/**
 * Recursively get all files in a directory
 */
async function getDirectoryFiles(
  token: string,
  path: string,
  branch: string
): Promise<FileInfo[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${branch}`,
    { headers }
  )

  if (!response.ok) {
    throw new Error(`Failed to get directory contents: ${response.statusText}`)
  }

  const items = await response.json()
  const files: FileInfo[] = []

  for (const item of items) {
    if (item.type === 'file') {
      // Get file content
      const fileResponse = await fetch(item.download_url)
      const content = await fileResponse.text()
      files.push({
        path: item.path,
        content,
        sha: item.sha,
      })
    } else if (item.type === 'dir') {
      // Recursively get files in subdirectory
      const subFiles = await getDirectoryFiles(token, item.path, branch)
      files.push(...subFiles)
    }
  }

  return files
}

/**
 * Get file content and SHA
 */
async function getFileContent(
  token: string,
  path: string,
  branch: string
): Promise<FileInfo | null> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${branch}`,
    { headers }
  )

  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error(`Failed to get file: ${response.statusText}`)
  }

  const data = await response.json()

  // If it's a directory, return null (handled separately)
  if (Array.isArray(data)) return null

  // Decode base64 content
  const content = Buffer.from(data.content, 'base64').toString('utf-8')

  return {
    path: data.path,
    content,
    sha: data.sha,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get PAT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const body: MoveFilesRequest = await request.json()

    const {
      operations,
      branchName = `move-files-${Date.now()}`,
      commitMessage = 'chore: reorganize files',
      prTitle = 'Reorganize files',
      prBody = 'This PR moves files to new locations.',
    } = body

    // Validate operations
    if (!operations || operations.length === 0) {
      return NextResponse.json(
        { error: 'No move operations provided' },
        { status: 400 }
      )
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    // 1. Get the latest commit SHA on the default branch
    const refResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${DEFAULT_BRANCH}`,
      { headers }
    )

    if (!refResponse.ok) {
      const error = await refResponse.json()
      return NextResponse.json(
        { error: `Failed to get ref: ${error.message || refResponse.statusText}` },
        { status: refResponse.status }
      )
    }

    const refData = await refResponse.json()
    const baseSha = refData.object.sha

    // 2. Get the base tree
    const baseTreeResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${baseSha}`,
      { headers }
    )

    if (!baseTreeResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get base commit' },
        { status: 500 }
      )
    }

    const baseCommit = await baseTreeResponse.json()
    const baseTreeSha = baseCommit.tree.sha

    // 3. Collect all file operations for the tree
    const treeItems: Array<{
      path: string
      mode: '100644' | '040000'
      type: 'blob' | 'tree'
      sha?: string | null
      content?: string
    }> = []

    // Process each move operation
    for (const op of operations) {
      if (op.nodeType === 'file') {
        // Get file content
        const file = await getFileContent(token, op.sourcePath, DEFAULT_BRANCH)
        if (!file) {
          console.warn(`[move-files] File not found: ${op.sourcePath}`)
          continue
        }

        // Add file at new location
        treeItems.push({
          path: op.destPath,
          mode: '100644',
          type: 'blob',
          content: file.content,
        })

        // Delete file at old location
        treeItems.push({
          path: op.sourcePath,
          mode: '100644',
          type: 'blob',
          sha: null, // null SHA deletes the file
        })
      } else {
        // Directory move - get all files and move them
        const files = await getDirectoryFiles(token, op.sourcePath, DEFAULT_BRANCH)

        for (const file of files) {
          // Calculate new path
          const relativePath = file.path.slice(op.sourcePath.length)
          const newPath = op.destPath + relativePath

          // Add file at new location
          treeItems.push({
            path: newPath,
            mode: '100644',
            type: 'blob',
            content: file.content,
          })

          // Delete file at old location
          treeItems.push({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: null,
          })
        }
      }
    }

    if (treeItems.length === 0) {
      return NextResponse.json(
        { error: 'No files to move' },
        { status: 400 }
      )
    }

    // 4. Create new tree with changes
    const createTreeResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      }
    )

    if (!createTreeResponse.ok) {
      const error = await createTreeResponse.json()
      return NextResponse.json(
        { error: `Failed to create tree: ${error.message || createTreeResponse.statusText}` },
        { status: createTreeResponse.status }
      )
    }

    const newTree = await createTreeResponse.json()

    // 5. Create commit with new tree
    const createCommitResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: commitMessage,
          tree: newTree.sha,
          parents: [baseSha],
        }),
      }
    )

    if (!createCommitResponse.ok) {
      const error = await createCommitResponse.json()
      return NextResponse.json(
        { error: `Failed to create commit: ${error.message || createCommitResponse.statusText}` },
        { status: createCommitResponse.status }
      )
    }

    const newCommit = await createCommitResponse.json()

    // 6. Create branch pointing to new commit
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: newCommit.sha,
        }),
      }
    )

    if (!createBranchResponse.ok) {
      const error = await createBranchResponse.json()
      return NextResponse.json(
        { error: `Failed to create branch: ${error.message || createBranchResponse.statusText}` },
        { status: createBranchResponse.status }
      )
    }

    // 7. Create pull request
    const movesSummary = operations
      .map((op) => `- \`${op.sourcePath}\` → \`${op.destPath}\``)
      .join('\n')

    const fullPrBody = `${prBody}

## Files Moved

${movesSummary}

---

*Created via Quarry Codex file reorganization*`

    const createPRResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: prTitle,
          body: fullPrBody,
          head: branchName,
          base: DEFAULT_BRANCH,
        }),
      }
    )

    if (!createPRResponse.ok) {
      const error = await createPRResponse.json()
      return NextResponse.json(
        { error: `Failed to create PR: ${error.message || createPRResponse.statusText}` },
        { status: createPRResponse.status }
      )
    }

    const prData = await createPRResponse.json()

    return NextResponse.json({
      success: true,
      prNumber: prData.number,
      prUrl: prData.html_url,
      branchName,
      filesProcessed: treeItems.filter((t) => t.content).length,
    })
  } catch (error) {
    console.error('[move-files] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
