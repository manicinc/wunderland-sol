/**
 * Template Publisher Service
 * @module lib/templates/templatePublisher
 *
 * @description
 * Handles template creation, export, and publishing:
 * - Generate template JSON from drafts
 * - Export templates as downloadable files
 * - Save/load drafts from localStorage
 * - Publish templates to GitHub repositories
 * - Update registry.json with new entries
 */

import type {
  TemplateDraft,
  TemplateDraftStorage,
  PublishTarget,
  PublishResult,
  TemplateValidation,
  TemplateRepository,
  RemoteTemplateEntry,
  RemoteTemplateRegistry,
} from './types'
import { STORAGE_KEYS, OFFICIAL_TEMPLATE_REPO } from './types'
import type { StrandTemplate } from '@/components/quarry/templates/types'

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
═══════════════════════════════════════════════════════════════════════════ */

/** GitHub API base URL */
const GITHUB_API_URL = 'https://api.github.com'

/** Current draft storage version */
const DRAFT_STORAGE_VERSION = 1

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate URL-friendly slug from string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate unique draft ID
 */
function generateDraftId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `draft-${timestamp}-${random}`
}

/**
 * Get GitHub PAT from settings
 */
function getGitHubToken(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const settings = localStorage.getItem('codex-settings')
    if (settings) {
      const parsed = JSON.parse(settings)
      return parsed.githubToken || parsed.github?.pat || null
    }
  } catch {
    // Ignore parsing errors
  }
  return null
}

/**
 * Get user info from GitHub token
 */
async function getGitHubUser(token: string): Promise<{ login: string; name?: string } | null> {
  try {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })
    if (response.ok) {
      return response.json()
    }
  } catch {
    // Ignore errors
  }
  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE JSON GENERATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Convert draft to full template JSON
 */
export function generateTemplateJSON(draft: TemplateDraft): string {
  const template: StrandTemplate = {
    id: draft.id || slugify(draft.name),
    name: draft.name,
    category: draft.category,
    icon: draft.icon,
    description: draft.description,
    shortDescription: draft.shortDescription,
    difficulty: draft.difficulty,
    estimatedTime: draft.estimatedTime,
    tags: draft.tags,
    version: draft.version || '1.0.0',
    author: draft.author,
    featured: draft.featured,
    popularity: 0,
    defaultData: draft.defaultData,
    fields: draft.fields,
    frontmatter: draft.frontmatter,
    template: draft.template,
    status: 'stable',
  }
  return JSON.stringify(template, null, 2)
}

/**
 * Export template as downloadable JSON file
 */
export function exportTemplateJSON(draft: TemplateDraft): void {
  const json = generateTemplateJSON(draft)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${draft.id || slugify(draft.name)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Generate registry entry for template
 */
export function generateRegistryEntry(
  draft: TemplateDraft,
  path: string
): RemoteTemplateEntry {
  return {
    path,
    id: draft.id || slugify(draft.name),
    version: draft.version || '1.0.0',
    category: draft.category,
    summary: draft.shortDescription,
    featured: draft.featured,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE VALIDATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Validate template draft
 */
export function validateTemplate(draft: TemplateDraft): TemplateValidation {
  const errors: TemplateValidation['errors'] = []
  const warnings: TemplateValidation['warnings'] = []

  // Required fields
  if (!draft.name?.trim()) {
    errors.push({ field: 'name', message: 'Template name is required' })
  } else if (draft.name.length < 3) {
    errors.push({ field: 'name', message: 'Template name must be at least 3 characters' })
  }

  if (!draft.category) {
    errors.push({ field: 'category', message: 'Category is required' })
  }

  if (!draft.description?.trim()) {
    errors.push({ field: 'description', message: 'Description is required' })
  }

  if (!draft.shortDescription?.trim()) {
    errors.push({ field: 'shortDescription', message: 'Short description is required' })
  } else if (draft.shortDescription.length > 200) {
    errors.push({ field: 'shortDescription', message: 'Short description must be under 200 characters' })
  }

  if (!draft.template?.trim()) {
    errors.push({ field: 'template', message: 'Template content is required' })
  }

  // Check for placeholder usage
  if (draft.fields.length > 0 && draft.template) {
    const placeholderPattern = /\{(\w+)\}/g
    const usedPlaceholders = new Set<string>()
    let match
    while ((match = placeholderPattern.exec(draft.template)) !== null) {
      usedPlaceholders.add(match[1])
    }

    // Check for unused fields
    for (const field of draft.fields) {
      if (!usedPlaceholders.has(field.name)) {
        warnings.push({
          field: `fields.${field.name}`,
          message: `Field "${field.label}" is defined but not used in template`,
        })
      }
    }

    // Check for undefined placeholders
    for (const placeholder of usedPlaceholders) {
      if (!draft.fields.find((f) => f.name === placeholder)) {
        warnings.push({
          field: 'template',
          message: `Placeholder {${placeholder}} has no matching field definition`,
        })
      }
    }
  }

  // Field validation
  const fieldNames = new Set<string>()
  for (const field of draft.fields) {
    if (!field.name?.trim()) {
      errors.push({ field: 'fields', message: 'All fields must have a name' })
    } else if (fieldNames.has(field.name)) {
      errors.push({ field: `fields.${field.name}`, message: `Duplicate field name: ${field.name}` })
    } else {
      fieldNames.add(field.name)
    }

    if (!field.label?.trim()) {
      errors.push({ field: `fields.${field.name}`, message: `Field "${field.name}" must have a label` })
    }

    if (['select', 'multiselect', 'radio'].includes(field.type) && (!field.options || field.options.length === 0)) {
      errors.push({
        field: `fields.${field.name}`,
        message: `Field "${field.label}" requires options`,
      })
    }
  }

  // Warnings for optional best practices
  if (!draft.icon) {
    warnings.push({ field: 'icon', message: 'Consider adding an icon for better visibility' })
  }

  if (draft.tags.length === 0) {
    warnings.push({ field: 'tags', message: 'Adding tags helps users find your template' })
  }

  if (!draft.author?.trim()) {
    warnings.push({ field: 'author', message: 'Consider adding an author name' })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DRAFT STORAGE
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get draft storage from localStorage
 */
function getDraftStorage(): TemplateDraftStorage {
  if (typeof window === 'undefined') {
    return { drafts: {}, lastModified: {}, version: DRAFT_STORAGE_VERSION }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DRAFTS)
    if (stored) {
      const parsed = JSON.parse(stored) as TemplateDraftStorage
      // Handle version migrations if needed
      if (parsed.version !== DRAFT_STORAGE_VERSION) {
        // For now, just update version
        parsed.version = DRAFT_STORAGE_VERSION
      }
      return parsed
    }
  } catch {
    // Ignore parsing errors
  }

  return { drafts: {}, lastModified: {}, version: DRAFT_STORAGE_VERSION }
}

/**
 * Save draft storage to localStorage
 */
function saveDraftStorage(storage: TemplateDraftStorage): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(storage))
}

/**
 * Save a draft template
 */
export function saveDraft(draft: TemplateDraft): TemplateDraft {
  const storage = getDraftStorage()
  const id = draft.id || generateDraftId()
  const now = Date.now()

  const savedDraft: TemplateDraft = {
    ...draft,
    id,
    createdAt: draft.createdAt || now,
    updatedAt: now,
  }

  storage.drafts[id] = savedDraft
  storage.lastModified[id] = now
  saveDraftStorage(storage)

  return savedDraft
}

/**
 * Load all drafts from localStorage
 */
export function loadDrafts(): TemplateDraft[] {
  const storage = getDraftStorage()
  return Object.values(storage.drafts).sort((a, b) => {
    const aTime = storage.lastModified[a.id!] || 0
    const bTime = storage.lastModified[b.id!] || 0
    return bTime - aTime // Most recent first
  })
}

/**
 * Load a single draft by ID
 */
export function loadDraft(id: string): TemplateDraft | null {
  const storage = getDraftStorage()
  return storage.drafts[id] || null
}

/**
 * Delete a draft from localStorage
 */
export function deleteDraft(id: string): void {
  const storage = getDraftStorage()
  delete storage.drafts[id]
  delete storage.lastModified[id]
  saveDraftStorage(storage)
}

/**
 * Get default empty draft
 */
export function getDefaultDraft(): TemplateDraft {
  return {
    name: '',
    category: 'general',
    icon: 'FileText',
    description: '',
    shortDescription: '',
    difficulty: 'beginner',
    estimatedTime: '5 min',
    tags: [],
    version: '1.0.0',
    author: '',
    featured: false,
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'Enter a title',
      },
    ],
    frontmatter: {
      required: ['title'],
      optional: [],
    },
    template: `---
title: "{title}"
created: "{date}"
---

# {title}

Start writing here...
`,
    defaultData: {},
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   GITHUB PUBLISHING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch file content from repository
 */
async function getFileContent(
  repo: TemplateRepository,
  path: string,
  token: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${repo.owner}/${repo.repo}/contents/${path}?ref=${repo.branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`)
    }

    const data = await response.json()
    return {
      content: atob(data.content),
      sha: data.sha,
    }
  } catch (error) {
    console.error('Failed to get file content:', error)
    return null
  }
}

/**
 * Create or update file in repository
 */
async function createOrUpdateFile(
  repo: TemplateRepository,
  path: string,
  content: string,
  message: string,
  token: string,
  sha?: string,
  branch?: string
): Promise<{ sha: string; url: string }> {
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${repo.owner}/${repo.repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: branch || repo.branch,
        ...(sha && { sha }),
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to create file: ${response.status}`)
  }

  const data = await response.json()
  return {
    sha: data.content.sha,
    url: data.content.html_url,
  }
}

/**
 * Create a new branch from default branch
 */
async function createBranch(
  repo: TemplateRepository,
  branchName: string,
  token: string
): Promise<void> {
  // Get the SHA of the default branch
  const refResponse = await fetch(
    `${GITHUB_API_URL}/repos/${repo.owner}/${repo.repo}/git/ref/heads/${repo.branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  )

  if (!refResponse.ok) {
    throw new Error('Failed to get default branch reference')
  }

  const refData = await refResponse.json()
  const sha = refData.object.sha

  // Create new branch
  const createResponse = await fetch(
    `${GITHUB_API_URL}/repos/${repo.owner}/${repo.repo}/git/refs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    }
  )

  if (!createResponse.ok) {
    const error = await createResponse.json()
    // Ignore if branch already exists
    if (error.message?.includes('Reference already exists')) {
      return
    }
    throw new Error(error.message || 'Failed to create branch')
  }
}

/**
 * Create a pull request
 */
async function createPullRequest(
  repo: TemplateRepository,
  title: string,
  body: string,
  headBranch: string,
  token: string
): Promise<{ number: number; url: string }> {
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${repo.owner}/${repo.repo}/pulls`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        head: headBranch,
        base: repo.branch,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create pull request')
  }

  const data = await response.json()
  return {
    number: data.number,
    url: data.html_url,
  }
}

/**
 * Update registry.json with new template entry
 */
async function updateRegistry(
  repo: TemplateRepository,
  entry: RemoteTemplateEntry,
  token: string,
  branch?: string
): Promise<void> {
  const registryPath = 'registry.json'

  // Get current registry
  const existing = await getFileContent(repo, registryPath, token)

  let registry: RemoteTemplateRegistry
  if (existing) {
    registry = JSON.parse(existing.content)
  } else {
    // Create new registry
    registry = {
      schemaVersion: '1.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      repository: {
        name: repo.name,
        description: repo.description,
        author: 'Community',
        license: 'MIT',
      },
      categories: [],
      templates: [],
    }
  }

  // Update or add template entry
  const existingIndex = registry.templates.findIndex((t) => t.id === entry.id)
  if (existingIndex >= 0) {
    registry.templates[existingIndex] = entry
  } else {
    registry.templates.push(entry)
  }

  // Update timestamp
  registry.lastUpdated = new Date().toISOString().split('T')[0]

  // Save registry
  await createOrUpdateFile(
    repo,
    registryPath,
    JSON.stringify(registry, null, 2),
    `chore: update registry with ${entry.id}`,
    token,
    existing?.sha,
    branch
  )
}

/**
 * Generate PR body for template contribution
 */
export function generatePRBody(draft: TemplateDraft): string {
  return `## New Template: ${draft.name}

### Description
${draft.description}

### Category
${draft.category}

### Difficulty
${draft.difficulty}

### Tags
${draft.tags.length > 0 ? draft.tags.map((t) => `\`${t}\``).join(', ') : 'None'}

### Fields
${draft.fields.map((f) => `- **${f.label}** (${f.type}${f.required ? ', required' : ''})`).join('\n')}

---

*This template was created using the Quarry Codex Template Builder.*
`
}

/**
 * Publish template to GitHub repository
 */
export async function publishToGitHub(
  draft: TemplateDraft,
  target: PublishTarget,
  githubPAT?: string
): Promise<PublishResult> {
  const token = githubPAT || getGitHubToken()

  if (!token) {
    return {
      success: false,
      error: 'GitHub Personal Access Token is required. Add it in Settings → Integrations.',
      errorType: 'auth',
    }
  }

  // Validate template first
  const validation = validateTemplate(draft)
  if (!validation.valid) {
    return {
      success: false,
      error: `Template validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
      errorType: 'validation',
    }
  }

  try {
    const templateJSON = generateTemplateJSON(draft)
    const templatePath = `templates/${target.path}`
    const entry = generateRegistryEntry(draft, target.path)

    if (target.createPR) {
      // Create branch, commit, and PR
      const branchName = target.branchName || `template/${slugify(draft.name)}-${Date.now()}`

      await createBranch(target.repository, branchName, token)

      // Create template file on new branch
      await createOrUpdateFile(
        target.repository,
        templatePath,
        templateJSON,
        target.commitMessage,
        token,
        undefined,
        branchName
      )

      // Update registry on new branch
      if (target.updateRegistry) {
        await updateRegistry(target.repository, entry, token, branchName)
      }

      // Create PR
      const pr = await createPullRequest(
        target.repository,
        target.prTitle || `feat: add ${draft.name} template`,
        target.prBody || generatePRBody(draft),
        branchName,
        token
      )

      return {
        success: true,
        url: pr.url,
        prNumber: pr.number,
      }
    } else {
      // Direct commit to default branch
      const result = await createOrUpdateFile(
        target.repository,
        templatePath,
        templateJSON,
        target.commitMessage,
        token
      )

      // Update registry
      if (target.updateRegistry) {
        await updateRegistry(target.repository, entry, token)
      }

      return {
        success: true,
        url: result.url,
        sha: result.sha,
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred'

    let errorType: PublishResult['errorType'] = 'network'
    if (message.includes('Bad credentials') || message.includes('401')) {
      errorType = 'auth'
    } else if (message.includes('403') || message.includes('permission')) {
      errorType = 'permission'
    } else if (message.includes('conflict') || message.includes('409')) {
      errorType = 'conflict'
    }

    return {
      success: false,
      error: message,
      errorType,
    }
  }
}

/**
 * Check if user has write access to repository
 */
export async function checkRepoAccess(
  repo: TemplateRepository,
  token?: string
): Promise<{ canWrite: boolean; isOwner: boolean; reason?: string }> {
  const pat = token || getGitHubToken()

  if (!pat) {
    return { canWrite: false, isOwner: false, reason: 'No GitHub token configured' }
  }

  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${repo.owner}/${repo.repo}`,
      {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      return { canWrite: false, isOwner: false, reason: 'Cannot access repository' }
    }

    const data = await response.json()
    const user = await getGitHubUser(pat)

    return {
      canWrite: data.permissions?.push || false,
      isOwner: user?.login === repo.owner,
    }
  } catch (error) {
    return {
      canWrite: false,
      isOwner: false,
      reason: 'Failed to check repository access',
    }
  }
}

/**
 * Get default publish target for a draft
 */
export function getDefaultPublishTarget(draft: TemplateDraft): PublishTarget {
  const slug = slugify(draft.name)

  return {
    repository: OFFICIAL_TEMPLATE_REPO,
    path: `${draft.category}/${slug}.json`,
    updateRegistry: true,
    createPR: true,
    commitMessage: `feat: add ${draft.name} template`,
    prTitle: `feat: Add ${draft.name} template`,
    prBody: generatePRBody(draft),
    branchName: `template/${slug}`,
  }
}
