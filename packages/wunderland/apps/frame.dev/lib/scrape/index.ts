/**
 * Client-Side Scraping Module
 * @module lib/scrape
 *
 * Provides client-side URL scraping capabilities for static deployments
 * (GitHub Pages, etc.) where server-side API routes are not available.
 */

export {
  clientScrape,
  isClientScrapeAvailable,
  type ClientScrapeResult,
} from './clientScraper'

export {
  fetchWithCorsProxy,
  htmlToMarkdown,
  htmlToText,
  extractHtmlMetadata,
  buildProxyUrl,
  CORS_PROXIES,
  type CorsProxyConfig,
  type ProxyFetchResult,
} from './corsProxy'

export {
  parsePdfFromUrl,
  parsePdfFromFile,
  formatPdfAsMarkdown,
  isPdfJsAvailable,
  type PdfParseResult,
} from './clientPdfParser'

