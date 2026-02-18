/**
 * Web Browser Extension Types
 * @module @framers/agentos-ext-web-browser
 */

/**
 * Browser configuration options
 */
export interface BrowserConfig {
  /** Run browser in headless mode */
  headless?: boolean;
  /** Default timeout for operations (ms) */
  timeout?: number;
  /** Custom user agent string */
  userAgent?: string;
  /** Viewport dimensions */
  viewport?: {
    width: number;
    height: number;
  };
  /** Executable path for browser (for puppeteer-core) */
  executablePath?: string;
}

/**
 * Result of a navigation operation
 */
export interface NavigationResult {
  /** Final URL after any redirects */
  url: string;
  /** HTTP status code */
  status: number;
  /** Page title */
  title: string;
  /** Full HTML content */
  html?: string;
  /** Extracted text content */
  text?: string;
  /** Time taken to load (ms) */
  loadTime: number;
  /** Any console messages */
  consoleMessages?: string[];
}

/**
 * Result of a scrape operation
 */
export interface ScrapeResult {
  /** Selector used */
  selector: string;
  /** Number of elements found */
  count: number;
  /** Extracted content */
  elements: ScrapeElement[];
}

/**
 * A single scraped element
 */
export interface ScrapeElement {
  /** Element tag name */
  tag: string;
  /** Element text content */
  text: string;
  /** Element HTML content */
  html: string;
  /** Element attributes */
  attributes: Record<string, string>;
  /** Href if it's a link */
  href?: string;
  /** Src if it's an image/media */
  src?: string;
}

/**
 * Result of a click operation
 */
export interface ClickResult {
  /** Whether click was successful */
  success: boolean;
  /** Element that was clicked (selector) */
  element: string;
  /** New URL if navigation occurred */
  newUrl?: string;
  /** Any text content change detected */
  contentChanged?: boolean;
}

/**
 * Result of a type operation
 */
export interface TypeResult {
  /** Whether typing was successful */
  success: boolean;
  /** Element that received input */
  element: string;
  /** Text that was typed */
  text: string;
}

/**
 * Screenshot capture options
 */
export interface ScreenshotOptions {
  /** Capture full scrollable page */
  fullPage?: boolean;
  /** CSS selector for specific element */
  selector?: string;
  /** Image format */
  format?: 'png' | 'jpeg' | 'webp';
  /** Quality for jpeg/webp (0-100) */
  quality?: number;
}

/**
 * Result of a screenshot operation
 */
export interface ScreenshotResult {
  /** Base64-encoded image data */
  data: string;
  /** Image format */
  format: 'png' | 'jpeg' | 'webp';
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** File size in bytes */
  size: number;
}

/**
 * Page snapshot for accessibility tree
 */
export interface PageSnapshot {
  /** Current URL */
  url: string;
  /** Page title */
  title: string;
  /** Simplified DOM structure */
  elements: SnapshotElement[];
  /** Links on the page */
  links: { text: string; href: string; ref: string }[];
  /** Forms on the page */
  forms: { id?: string; action?: string; fields: string[] }[];
  /** Interactive elements */
  interactable: { ref: string; type: string; label: string }[];
}

/**
 * Element in page snapshot
 */
export interface SnapshotElement {
  /** Reference ID for interaction */
  ref: string;
  /** Element type */
  type: string;
  /** Accessible name/label */
  label: string;
  /** Role (button, link, input, etc.) */
  role?: string;
  /** Value for inputs */
  value?: string;
  /** Whether element is visible */
  visible: boolean;
}



