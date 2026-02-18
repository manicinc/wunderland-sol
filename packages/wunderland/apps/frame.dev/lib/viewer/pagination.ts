/**
 * Pagination Engine
 * @module lib/viewer/pagination
 *
 * Calculates page breaks for paginated document view.
 * Supports letter and A4 page sizes with configurable margins.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PageConfig {
  /** Page width in inches */
  width: number
  /** Page height in inches */
  height: number
  /** Top margin in inches */
  marginTop: number
  /** Right margin in inches */
  marginRight: number
  /** Bottom margin in inches */
  marginBottom: number
  /** Left margin in inches */
  marginLeft: number
  /** DPI for conversion */
  dpi: number
}

export interface PageBreak {
  /** Page number (1-indexed) */
  pageNumber: number
  /** Pixel offset from top of content */
  offset: number
  /** Element that starts this page */
  startElement?: HTMLElement
}

export interface PaginationResult {
  /** Total number of pages */
  totalPages: number
  /** Array of page break positions */
  pageBreaks: PageBreak[]
  /** Content height in pixels */
  contentHeight: number
  /** Page height in pixels */
  pageHeight: number
}

// ============================================================================
// PAGE CONFIGURATIONS
// ============================================================================

export const PAGE_CONFIGS: Record<'letter' | 'a4', PageConfig> = {
  letter: {
    width: 8.5,
    height: 11,
    marginTop: 1,
    marginRight: 1,
    marginBottom: 1,
    marginLeft: 1,
    dpi: 96,
  },
  a4: {
    width: 8.27,
    height: 11.69,
    marginTop: 1,
    marginRight: 0.79,
    marginBottom: 1,
    marginLeft: 0.79,
    dpi: 96,
  },
}

// ============================================================================
// PAGINATION ENGINE
// ============================================================================

/**
 * Calculate page breaks for content
 */
export function calculatePageBreaks(
  contentElement: HTMLElement,
  config: PageConfig = PAGE_CONFIGS.letter
): PaginationResult {
  const pageHeightPx = inchesToPixels(config.height - config.marginTop - config.marginBottom, config.dpi)
  const contentHeight = contentElement.scrollHeight

  // If content fits on one page, no breaks needed
  if (contentHeight <= pageHeightPx) {
    return {
      totalPages: 1,
      pageBreaks: [{ pageNumber: 1, offset: 0, startElement: contentElement }],
      contentHeight,
      pageHeight: pageHeightPx,
    }
  }

  const pageBreaks: PageBreak[] = []
  let currentPageNumber = 1
  let currentOffset = 0

  // Add first page
  pageBreaks.push({
    pageNumber: 1,
    offset: 0,
    startElement: contentElement.firstElementChild as HTMLElement,
  })

  // Find natural break points
  const children = Array.from(contentElement.children) as HTMLElement[]

  for (let i = 0; i < children.length; i++) {
    const element = children[i]
    const elementTop = element.offsetTop
    const elementHeight = element.offsetHeight

    // Check if element crosses page boundary
    const currentPageEnd = currentPageNumber * pageHeightPx
    const elementBottom = elementTop + elementHeight

    if (elementBottom > currentPageEnd) {
      // Element crosses page boundary
      const remainingOnPage = currentPageEnd - elementTop

      // If element is too large and we're past the middle of the page, break before it
      if (
        remainingOnPage < elementHeight / 2 &&
        elementTop > currentOffset + pageHeightPx / 2
      ) {
        // Break before this element
        currentPageNumber++
        currentOffset = elementTop
        pageBreaks.push({
          pageNumber: currentPageNumber,
          offset: elementTop,
          startElement: element,
        })
      } else if (isBreakableElement(element) && elementHeight > pageHeightPx / 2) {
        // Large breakable element (like a long paragraph or list)
        // Break at the page boundary
        currentPageNumber++
        currentOffset = currentPageEnd
        pageBreaks.push({
          pageNumber: currentPageNumber,
          offset: currentPageEnd,
          startElement: element,
        })
      } else {
        // Element is non-breakable (heading, code block, etc.) or small enough
        // Check if it should start a new page
        if (remainingOnPage < elementHeight && elementTop > currentOffset) {
          currentPageNumber++
          currentOffset = elementTop
          pageBreaks.push({
            pageNumber: currentPageNumber,
            offset: elementTop,
            startElement: element,
          })
        }
      }
    }

    // Check if we need additional breaks for very tall elements
    while (elementBottom > (currentPageNumber + 1) * pageHeightPx) {
      currentPageNumber++
      currentOffset = currentPageNumber * pageHeightPx
      pageBreaks.push({
        pageNumber: currentPageNumber,
        offset: currentOffset,
        startElement: element,
      })
    }
  }

  return {
    totalPages: Math.ceil(contentHeight / pageHeightPx),
    pageBreaks,
    contentHeight,
    pageHeight: pageHeightPx,
  }
}

/**
 * Check if element can be broken across pages
 */
function isBreakableElement(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase()

  // Non-breakable elements
  const nonBreakable = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'pre',
    'code',
    'table',
    'img',
    'figure',
    'blockquote',
  ]

  if (nonBreakable.includes(tag)) {
    return false
  }

  // Check if element has class indicating it shouldn't break
  if (element.classList.contains('no-break') || element.classList.contains('keep-together')) {
    return false
  }

  return true
}

/**
 * Convert inches to pixels
 */
export function inchesToPixels(inches: number, dpi: number = 96): number {
  return inches * dpi
}

/**
 * Convert pixels to inches
 */
export function pixelsToInches(pixels: number, dpi: number = 96): number {
  return pixels / dpi
}

/**
 * Get page number for a given pixel offset
 */
export function getPageAtOffset(offset: number, pageHeight: number): number {
  return Math.floor(offset / pageHeight) + 1
}

/**
 * Apply page breaks to content by wrapping in page divs
 */
export function applyPageBreaks(
  contentElement: HTMLElement,
  paginationResult: PaginationResult,
  config: PageConfig = PAGE_CONFIGS.letter
): void {
  const { pageBreaks, pageHeight } = paginationResult

  // Clear any existing pagination
  removePagination(contentElement)

  // If only one page, no need to paginate
  if (pageBreaks.length <= 1) {
    return
  }

  // Create page containers
  const pages: HTMLDivElement[] = []
  for (let i = 0; i < pageBreaks.length; i++) {
    const page = document.createElement('div')
    page.className = 'page'
    page.dataset.pageNumber = String(i + 1)
    page.style.minHeight = `${pageHeight}px`
    pages.push(page)
  }

  // Move children to appropriate pages
  const children = Array.from(contentElement.children) as HTMLElement[]
  let currentPageIndex = 0

  for (const child of children) {
    const childTop = child.offsetTop

    // Find which page this child belongs to
    while (
      currentPageIndex < pageBreaks.length - 1 &&
      childTop >= pageBreaks[currentPageIndex + 1].offset
    ) {
      currentPageIndex++
    }

    // Move child to page (clone to preserve)
    pages[currentPageIndex].appendChild(child.cloneNode(true))
  }

  // Clear content and add pages
  contentElement.innerHTML = ''
  pages.forEach((page) => contentElement.appendChild(page))

  // Add pagination class to container
  contentElement.classList.add('paginated-content')
}

/**
 * Remove pagination from content
 */
export function removePagination(contentElement: HTMLElement): void {
  if (!contentElement.classList.contains('paginated-content')) {
    return
  }

  // Get all children from pages
  const pages = contentElement.querySelectorAll('.page')
  const allChildren: Node[] = []

  pages.forEach((page) => {
    Array.from(page.childNodes).forEach((child) => {
      allChildren.push(child.cloneNode(true))
    })
  })

  // Clear and restore
  contentElement.innerHTML = ''
  allChildren.forEach((child) => contentElement.appendChild(child))

  // Remove pagination class
  contentElement.classList.remove('paginated-content')
}

/**
 * Create page numbers overlay
 */
export function createPageNumbers(totalPages: number): HTMLElement {
  const container = document.createElement('div')
  container.className = 'page-numbers'

  for (let i = 1; i <= totalPages; i++) {
    const pageNum = document.createElement('div')
    pageNum.className = 'page-number'
    pageNum.textContent = String(i)
    pageNum.dataset.page = String(i)
    container.appendChild(pageNum)
  }

  return container
}
