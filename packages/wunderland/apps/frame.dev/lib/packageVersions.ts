/**
 * Package Version Fetcher
 *
 * Fetches latest versions from npm registry for all @framers packages.
 * Used by the API page to display up-to-date version badges.
 *
 * Versions are cached via Next.js ISR (revalidate: 3600 = 1 hour)
 */

export interface PackageVersions {
  agentos: string
  codexViewer: string
  sqlStorageAdapter: string
  openstrandSdk: string
}

const PACKAGES = {
  agentos: '@framers/agentos',
  codexViewer: '@framers/codex-viewer',
  sqlStorageAdapter: '@framers/sql-storage-adapter',
  openstrandSdk: '@framers/openstrand-sdk',
} as const

/**
 * Fetch the latest version of a package from npm registry
 */
async function fetchNpmVersion(packageName: string): Promise<string> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${packageName}/latest`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!response.ok) {
      console.warn(`Failed to fetch ${packageName} from npm: ${response.status}`)
      return 'N/A'
    }

    const data = await response.json()
    return data.version || 'N/A'
  } catch (error) {
    console.warn(`Error fetching ${packageName} version:`, error)
    return 'N/A'
  }
}

/**
 * Get all package versions from npm
 * Results are cached via Next.js ISR
 */
export async function getPackageVersions(): Promise<PackageVersions> {
  const [agentos, codexViewer, sqlStorageAdapter, openstrandSdk] = await Promise.all([
    fetchNpmVersion(PACKAGES.agentos),
    fetchNpmVersion(PACKAGES.codexViewer),
    fetchNpmVersion(PACKAGES.sqlStorageAdapter),
    fetchNpmVersion(PACKAGES.openstrandSdk),
  ])

  return {
    agentos,
    codexViewer,
    sqlStorageAdapter,
    openstrandSdk,
  }
}
