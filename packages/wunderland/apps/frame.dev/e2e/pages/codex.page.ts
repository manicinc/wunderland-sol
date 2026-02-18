/**
 * Codex Page Object Model
 * Encapsulates all Codex-related page interactions for E2E testing
 *
 * @module e2e/pages/codex.page
 */

import { Page, Locator, expect } from '@playwright/test'

export class CodexPage {
  readonly page: Page

  // Main layout elements
  readonly sidebar: Locator
  readonly mainContent: Locator
  readonly toolbar: Locator

  // Filter bar elements
  readonly filterBar: Locator
  readonly filterButton: Locator
  readonly subjectFilter: Locator
  readonly topicFilter: Locator
  readonly tagFilter: Locator
  readonly dateFilter: Locator
  readonly clearFiltersButton: Locator

  // Strand list
  readonly strandList: Locator
  readonly strandItems: Locator

  // Metadata editor
  readonly metadataEditor: Locator
  readonly subjectInput: Locator
  readonly topicInput: Locator
  readonly tagInput: Locator

  // Glossary panel
  readonly glossaryPanel: Locator
  readonly glossaryTerms: Locator

  constructor(page: Page) {
    this.page = page

    // Main layout
    this.sidebar = page.locator('[data-testid="codex-sidebar"]')
    this.mainContent = page.locator('[data-testid="codex-content"]')
    this.toolbar = page.locator('[data-testid="codex-toolbar"]')

    // Filter bar - use more flexible selectors
    this.filterBar = page.locator('[data-testid="taxonomy-filter-bar"], .taxonomy-filter-bar')
    this.filterButton = page.locator('[data-testid="filter-button"], button:has-text("Filter")')
    this.subjectFilter = page.locator('[data-testid="subject-filter"]')
    this.topicFilter = page.locator('[data-testid="topic-filter"]')
    this.tagFilter = page.locator('[data-testid="tag-filter"]')
    this.dateFilter = page.locator('[data-testid="date-filter"]')
    this.clearFiltersButton = page.locator('[data-testid="clear-filters"], button:has-text("Clear")')

    // Strand list
    this.strandList = page.locator('[data-testid="strand-list"]')
    this.strandItems = page.locator('[data-testid="strand-item"]')

    // Metadata editor
    this.metadataEditor = page.locator('[data-testid="metadata-editor"]')
    this.subjectInput = page.locator('[data-testid="subject-input"], input[placeholder*="subject" i]')
    this.topicInput = page.locator('[data-testid="topic-input"], input[placeholder*="topic" i]')
    this.tagInput = page.locator('[data-testid="tag-input"], input[placeholder*="tag" i]')

    // Glossary panel
    this.glossaryPanel = page.locator('[data-testid="glossary-panel"]')
    this.glossaryTerms = page.locator('[data-testid="glossary-term"]')
  }

  /**
   * Navigate to the Codex page
   */
  async goto() {
    await this.page.goto('/quarry')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForLoad() {
    // Wait for either the main content or a loading indicator to appear/disappear
    await this.page.waitForLoadState('domcontentloaded')
    // Give the app time to hydrate
    await this.page.waitForTimeout(500)
  }

  // ============================================================================
  // FILTER OPERATIONS
  // ============================================================================

  /**
   * Open the filter dropdown
   */
  async openFilters() {
    if (await this.filterButton.isVisible()) {
      await this.filterButton.click()
    }
  }

  /**
   * Filter strands by subject
   */
  async filterBySubject(subject: string) {
    await this.openFilters()
    await this.subjectFilter.click()
    await this.page.getByRole('checkbox', { name: subject }).check()
    // Close dropdown by clicking outside
    await this.page.keyboard.press('Escape')
  }

  /**
   * Filter strands by topic
   */
  async filterByTopic(topic: string) {
    await this.openFilters()
    await this.topicFilter.click()
    await this.page.getByRole('checkbox', { name: topic }).check()
    await this.page.keyboard.press('Escape')
  }

  /**
   * Filter strands by tag
   */
  async filterByTag(tag: string) {
    await this.openFilters()
    await this.tagFilter.click()
    await this.page.getByRole('checkbox', { name: tag }).check()
    await this.page.keyboard.press('Escape')
  }

  /**
   * Clear all applied filters
   */
  async clearFilters() {
    if (await this.clearFiltersButton.isVisible()) {
      await this.clearFiltersButton.click()
    }
  }

  /**
   * Get the count of displayed strands
   */
  async getStrandCount(): Promise<number> {
    return await this.strandItems.count()
  }

  // ============================================================================
  // STRAND OPERATIONS
  // ============================================================================

  /**
   * Select a strand by index
   */
  async selectStrand(index: number) {
    const strand = this.strandItems.nth(index)
    await strand.click()
    await this.page.waitForTimeout(300) // Allow for animation/loading
  }

  /**
   * Select a strand by title text
   */
  async selectStrandByTitle(title: string) {
    const strand = this.strandItems.filter({ hasText: title }).first()
    await strand.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Get all strand titles
   */
  async getStrandTitles(): Promise<string[]> {
    const titles = await this.strandItems.locator('[data-testid="strand-title"], .strand-title, h3, h4').allTextContents()
    return titles.filter(t => t.trim())
  }

  // ============================================================================
  // METADATA OPERATIONS
  // ============================================================================

  /**
   * Add a subject to the current strand
   */
  async addSubject(subject: string) {
    await this.subjectInput.fill(subject)
    await this.subjectInput.press('Enter')
  }

  /**
   * Add a topic to the current strand
   */
  async addTopic(topic: string) {
    await this.topicInput.fill(topic)
    await this.topicInput.press('Enter')
  }

  /**
   * Add a tag to the current strand
   */
  async addTag(tag: string) {
    await this.tagInput.fill(tag)
    await this.tagInput.press('Enter')
  }

  /**
   * Get all subjects for the current strand
   */
  async getSubjects(): Promise<string[]> {
    return await this.metadataEditor
      .locator('[data-testid="subject-pill"], .subject-pill')
      .allTextContents()
  }

  /**
   * Get all topics for the current strand
   */
  async getTopics(): Promise<string[]> {
    return await this.metadataEditor
      .locator('[data-testid="topic-pill"], .topic-pill')
      .allTextContents()
  }

  /**
   * Get all tags for the current strand
   */
  async getTags(): Promise<string[]> {
    return await this.metadataEditor
      .locator('[data-testid="tag-pill"], .tag-pill')
      .allTextContents()
  }

  // ============================================================================
  // GLOSSARY OPERATIONS
  // ============================================================================

  /**
   * Open the glossary panel
   */
  async openGlossary() {
    const glossaryButton = this.page.locator('[data-testid="glossary-button"], button:has-text("Glossary")')
    if (await glossaryButton.isVisible()) {
      await glossaryButton.click()
    }
  }

  /**
   * Get glossary term count
   */
  async getGlossaryTermCount(): Promise<number> {
    return await this.glossaryTerms.count()
  }

  /**
   * Delete a glossary term by name
   */
  async deleteGlossaryTerm(term: string) {
    const termElement = this.glossaryPanel.locator(`[data-testid="glossary-term"]:has-text("${term}")`)
    const deleteButton = termElement.locator('[data-testid="delete-term"], button:has-text("Delete")')

    // First click to confirm
    await deleteButton.click()
    // Second click to actually delete (two-step confirmation)
    await this.page.waitForTimeout(200)
    await deleteButton.click()
  }

  /**
   * Edit a glossary term
   */
  async editGlossaryTerm(originalTerm: string, newTerm: string) {
    const termElement = this.glossaryPanel.locator(`[data-testid="glossary-term"]:has-text("${originalTerm}")`)
    const editButton = termElement.locator('[data-testid="edit-term"], button:has-text("Edit")')

    await editButton.click()

    const input = termElement.locator('input[type="text"]')
    await input.clear()
    await input.fill(newTerm)
    await input.press('Enter')
  }

  // ============================================================================
  // ASSERTIONS
  // ============================================================================

  /**
   * Assert that the page loaded correctly
   */
  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/quarry/)
  }

  /**
   * Assert that a filter is applied
   */
  async assertFilterApplied(type: 'subject' | 'topic' | 'tag', value: string) {
    const filterPill = this.filterBar.locator(`[data-testid="filter-pill"]:has-text("${value}")`)
    await expect(filterPill).toBeVisible()
  }

  /**
   * Assert strand count
   */
  async assertStrandCount(count: number) {
    await expect(this.strandItems).toHaveCount(count)
  }

  /**
   * Assert a warning is displayed (e.g., duplicate term warning)
   */
  async assertWarningVisible(textPattern: RegExp | string) {
    const warning = this.page.getByText(textPattern)
    await expect(warning).toBeVisible()
  }
}
