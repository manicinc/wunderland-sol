/**
 * GitHub PR Creation API Route
 * @module api/github/create-pr
 * 
 * @remarks
 * Creates a pull request with file changes to the Quarry Codex repository.
 * Supports optional auto-merge when PAT has sufficient permissions.
 */

import { NextRequest, NextResponse } from 'next/server'

const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'OpenStrand'
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'frame.codex'
const DEFAULT_BRANCH = process.env.GITHUB_DEFAULT_BRANCH || 'master'

interface CreatePRRequest {
  filePath: string
  content: string
  branchName: string
  commitMessage: string
  prTitle: string
  prBody: string
  autoMerge?: boolean
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
    const body: CreatePRRequest = await request.json()
    
    const {
      filePath,
      content,
      branchName,
      commitMessage,
      prTitle,
      prBody,
      autoMerge = false,
    } = body
    
    // Validate required fields
    if (!filePath || !content || !branchName || !commitMessage || !prTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
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
    
    // 2. Create a new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
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
    
    // 3. Get the current file SHA (if it exists)
    let fileSha: string | undefined
    try {
      const fileResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${branchName}`,
        { headers }
      )
      if (fileResponse.ok) {
        const fileData = await fileResponse.json()
        fileSha = fileData.sha
      }
    } catch {
      // File doesn't exist, which is fine for new files
    }
    
    // 4. Create or update the file
    const fileContent = Buffer.from(content).toString('base64')
    const createFileResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: commitMessage,
          content: fileContent,
          branch: branchName,
          ...(fileSha && { sha: fileSha }),
        }),
      }
    )
    
    if (!createFileResponse.ok) {
      const error = await createFileResponse.json()
      return NextResponse.json(
        { error: `Failed to create/update file: ${error.message || createFileResponse.statusText}` },
        { status: createFileResponse.status }
      )
    }
    
    // 5. Create pull request
    const createPRResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: prTitle,
          body: prBody,
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
    
    // 6. Optionally enable auto-merge
    if (autoMerge && prData.number) {
      try {
        // Enable auto-merge via GraphQL (requires repo to have auto-merge enabled)
        const enableAutoMergeResponse = await fetch(
          'https://api.github.com/graphql',
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: `
                mutation EnableAutoMerge($pullRequestId: ID!) {
                  enablePullRequestAutoMerge(input: {
                    pullRequestId: $pullRequestId
                    mergeMethod: SQUASH
                  }) {
                    pullRequest {
                      autoMergeRequest {
                        enabledAt
                      }
                    }
                  }
                }
              `,
              variables: {
                pullRequestId: prData.node_id,
              },
            }),
          }
        )
        
        if (!enableAutoMergeResponse.ok) {
          console.warn('Failed to enable auto-merge:', await enableAutoMergeResponse.text())
        }
      } catch (err) {
        console.warn('Auto-merge not available:', err)
      }
    }
    
    return NextResponse.json({
      success: true,
      prNumber: prData.number,
      prUrl: prData.html_url,
      branchName,
    })
    
  } catch (error) {
    console.error('Error creating PR:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}















