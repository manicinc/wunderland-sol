/**
 * Google Drive API Client
 * @module lib/import-export/converters/google/GoogleDriveClient
 *
 * Wrapper for Google Drive API v3.
 * Handles file listing, folder navigation, and file downloading.
 */

import { getGoogleOAuthClient } from './GoogleOAuthClient'

// ============================================================================
// TYPES
// ============================================================================

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: number
  createdTime: string
  modifiedTime: string
  parents?: string[]
  webViewLink?: string
  exportLinks?: Record<string, string>
}

export interface DriveFolder {
  id: string
  name: string
  files: DriveFile[]
  folders: DriveFolder[]
}

// ============================================================================
// GOOGLE DRIVE CLIENT
// ============================================================================

export class GoogleDriveClient {
  private static readonly API_BASE = 'https://www.googleapis.com/drive/v3'
  private static readonly UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'

  private oauthClient = getGoogleOAuthClient()

  // ==========================================================================
  // FILE LISTING
  // ==========================================================================

  /**
   * List files in a folder
   */
  async listFiles(
    folderId: string = 'root',
    options: {
      pageSize?: number
      includeSubfolders?: boolean
      mimeTypes?: string[]
    } = {}
  ): Promise<DriveFile[]> {
    const { pageSize = 100, mimeTypes } = options

    let query = `'${folderId}' in parents and trashed = false`

    if (mimeTypes && mimeTypes.length > 0) {
      const mimeQuery = mimeTypes.map(mt => `mimeType = '${mt}'`).join(' or ')
      query += ` and (${mimeQuery})`
    }

    const files: DriveFile[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({
        q: query,
        pageSize: pageSize.toString(),
        fields:
          'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, exportLinks)',
        orderBy: 'name',
      })

      if (pageToken) {
        params.set('pageToken', pageToken)
      }

      const response = await this.makeRequest('files', params)
      const data = await response.json()

      files.push(...(data.files || []))
      pageToken = data.nextPageToken
    } while (pageToken)

    return files
  }

  /**
   * List Google Docs in a folder
   */
  async listDocs(folderId: string = 'root'): Promise<DriveFile[]> {
    return this.listFiles(folderId, {
      mimeTypes: ['application/vnd.google-apps.document'],
    })
  }

  /**
   * Get folder structure recursively
   */
  async getFolderStructure(
    folderId: string = 'root',
    maxDepth: number = 5
  ): Promise<DriveFolder> {
    const files = await this.listFiles(folderId)

    const folder: DriveFolder = {
      id: folderId,
      name: folderId === 'root' ? 'My Drive' : await this.getFileName(folderId),
      files: files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder'),
      folders: [],
    }

    if (maxDepth > 0) {
      const subfolders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder')

      for (const subfolder of subfolders) {
        const substructure = await this.getFolderStructure(subfolder.id, maxDepth - 1)
        folder.folders.push(substructure)
      }
    }

    return folder
  }

  // ==========================================================================
  // FILE OPERATIONS
  // ==========================================================================

  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<DriveFile> {
    const params = new URLSearchParams({
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, exportLinks',
    })

    const response = await this.makeRequest(`files/${fileId}`, params)
    return await response.json()
  }

  /**
   * Get file name
   */
  async getFileName(fileId: string): Promise<string> {
    const params = new URLSearchParams({
      fields: 'name',
    })

    const response = await this.makeRequest(`files/${fileId}`, params)
    const data = await response.json()
    return data.name
  }

  /**
   * Download file content
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const response = await this.makeRequest(`files/${fileId}`, new URLSearchParams({ alt: 'media' }))
    return await response.blob()
  }

  /**
   * Export Google Doc as markdown/plain text
   */
  async exportDoc(fileId: string, format: 'markdown' | 'text' | 'html' = 'text'): Promise<string> {
    const mimeTypes = {
      markdown: 'text/plain', // Google Docs doesn't support markdown directly
      text: 'text/plain',
      html: 'text/html',
    }

    const params = new URLSearchParams({
      mimeType: mimeTypes[format],
    })

    const response = await this.makeRequest(`files/${fileId}/export`, params)
    return await response.text()
  }

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  /**
   * Search for files
   */
  async search(
    query: string,
    options: {
      mimeTypes?: string[]
      folderId?: string
    } = {}
  ): Promise<DriveFile[]> {
    let searchQuery = `name contains '${query}' and trashed = false`

    if (options.folderId) {
      searchQuery += ` and '${options.folderId}' in parents`
    }

    if (options.mimeTypes && options.mimeTypes.length > 0) {
      const mimeQuery = options.mimeTypes.map(mt => `mimeType = '${mt}'`).join(' or ')
      searchQuery += ` and (${mimeQuery})`
    }

    const params = new URLSearchParams({
      q: searchQuery,
      pageSize: '50',
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
    })

    const response = await this.makeRequest('files', params)
    const data = await response.json()
    return data.files || []
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Make authenticated request to Drive API
   */
  private async makeRequest(endpoint: string, params?: URLSearchParams): Promise<Response> {
    const accessToken = await this.oauthClient.getAccessToken()

    const url = `${GoogleDriveClient.API_BASE}/${endpoint}${params ? `?${params.toString()}` : ''}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || `Drive API error: ${response.statusText}`)
    }

    return response
  }

  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(file: DriveFile): boolean {
    return file.mimeType === 'application/vnd.google-apps.document'
  }

  /**
   * Check if file is a folder
   */
  isFolder(file: DriveFile): boolean {
    return file.mimeType === 'application/vnd.google-apps.folder'
  }

  /**
   * Get file extension from mime type
   */
  getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/vnd.google-apps.document': 'gdoc',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'text/html': 'html',
      'text/markdown': 'md',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    }

    return mimeToExt[mimeType] || 'bin'
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let googleDriveInstance: GoogleDriveClient | null = null

/**
 * Get singleton GoogleDriveClient instance
 */
export function getGoogleDriveClient(): GoogleDriveClient {
  if (!googleDriveInstance) {
    googleDriveInstance = new GoogleDriveClient()
  }
  return googleDriveInstance
}

/**
 * Reset GoogleDriveClient instance (for testing)
 */
export function resetGoogleDriveClient(): void {
  googleDriveInstance = null
}
