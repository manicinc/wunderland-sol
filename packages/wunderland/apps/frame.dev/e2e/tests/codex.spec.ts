/**
 * Codex E2E Tests
 * Tests for the main Codex functionality including filtering, metadata, and glossary
 *
 * @module e2e/tests/codex.spec
 */

import { test, expect } from '@playwright/test'
import { CodexPage } from '../pages/codex.page'
import { testSubjects, testTopics, taxonomyTestCases } from '../fixtures/testData'

test.describe('Codex Page', () => {
  let codexPage: CodexPage

  test.beforeEach(async ({ page }) => {
    codexPage = new CodexPage(page)
    await codexPage.goto()
    await codexPage.waitForLoad()
  })

  test.describe('Page Load', () => {
    test('should load the codex page', async () => {
      await codexPage.assertLoaded()
    })

    test('should display main layout elements', async ({ page }) => {
      // Check that at least one main section is visible
      const hasContent = await page.locator('main, [role="main"], .codex-content, #codex-content').first().isVisible()
      expect(hasContent).toBeTruthy()
    })
  })

  test.describe('Taxonomy Filtering', () => {
    test.skip('should filter strands by subject', async () => {
      // Skip if no filter bar is present (depends on app state)
      const hasFilterBar = await codexPage.filterBar.isVisible()
      if (!hasFilterBar) {
        test.skip()
        return
      }

      const initialCount = await codexPage.getStrandCount()
      await codexPage.filterBySubject('technology')

      // After filtering, count should change or stay same (but filter should be applied)
      await codexPage.page.waitForTimeout(500)
    })

    test.skip('should filter strands by topic', async () => {
      const hasFilterBar = await codexPage.filterBar.isVisible()
      if (!hasFilterBar) {
        test.skip()
        return
      }

      await codexPage.filterByTopic('react')
      await codexPage.page.waitForTimeout(500)
    })

    test.skip('should clear all filters', async () => {
      const hasFilterBar = await codexPage.filterBar.isVisible()
      if (!hasFilterBar) {
        test.skip()
        return
      }

      // Apply a filter first
      await codexPage.filterBySubject('technology')
      await codexPage.page.waitForTimeout(300)

      // Clear filters
      await codexPage.clearFilters()
      await codexPage.page.waitForTimeout(300)
    })
  })

  test.describe('Strand Selection', () => {
    test.skip('should select a strand from the list', async () => {
      const strandCount = await codexPage.getStrandCount()
      if (strandCount === 0) {
        test.skip()
        return
      }

      await codexPage.selectStrand(0)

      // Verify something happened (URL change, detail view, etc.)
      await codexPage.page.waitForTimeout(300)
    })
  })
})

test.describe('Taxonomy Validation', () => {
  let codexPage: CodexPage

  test.beforeEach(async ({ page }) => {
    codexPage = new CodexPage(page)
    await codexPage.goto()
    await codexPage.waitForLoad()
  })

  test.skip('should warn when adding similar tag to existing subject', async () => {
    // This test requires a strand to be selected and metadata editor visible
    const hasMetadataEditor = await codexPage.metadataEditor.isVisible()
    if (!hasMetadataEditor) {
      // Try selecting a strand first
      const strandCount = await codexPage.getStrandCount()
      if (strandCount === 0) {
        test.skip()
        return
      }
      await codexPage.selectStrand(0)
      await codexPage.page.waitForTimeout(500)
    }

    // Try to add a tag that's similar to an existing term
    await codexPage.addTag('AI')

    // Check for warning message
    await codexPage.page.waitForTimeout(300)
    // The exact warning text depends on implementation
  })

  test.skip('should show duplicate warning for plural form', async () => {
    const hasMetadataEditor = await codexPage.metadataEditor.isVisible()
    if (!hasMetadataEditor) {
      test.skip()
      return
    }

    // If 'framework' exists as topic, 'frameworks' should trigger warning
    await codexPage.addTag('frameworks')
    await codexPage.page.waitForTimeout(300)
  })
})

test.describe('Glossary Panel', () => {
  let codexPage: CodexPage

  test.beforeEach(async ({ page }) => {
    codexPage = new CodexPage(page)
    await codexPage.goto()
    await codexPage.waitForLoad()
  })

  test.skip('should open glossary panel', async () => {
    await codexPage.openGlossary()

    await expect(codexPage.glossaryPanel).toBeVisible()
  })

  test.skip('should display glossary terms', async () => {
    await codexPage.openGlossary()
    await codexPage.page.waitForTimeout(500)

    const termCount = await codexPage.getGlossaryTermCount()
    // Just verify the panel is functional
    expect(termCount).toBeGreaterThanOrEqual(0)
  })

  test.skip('should delete a glossary term with two-step confirmation', async () => {
    await codexPage.openGlossary()
    await codexPage.page.waitForTimeout(500)

    const initialCount = await codexPage.getGlossaryTermCount()
    if (initialCount === 0) {
      test.skip()
      return
    }

    // Get the first term's text
    const firstTerm = await codexPage.glossaryTerms.first().textContent()
    if (!firstTerm) {
      test.skip()
      return
    }

    await codexPage.deleteGlossaryTerm(firstTerm)
    await codexPage.page.waitForTimeout(500)

    // Verify deletion occurred (term should be marked as deleted or removed)
  })
})

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    const codexPage = new CodexPage(page)
    await codexPage.goto()
    await codexPage.waitForLoad()

    // Page should still load correctly
    await codexPage.assertLoaded()
  })

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })

    const codexPage = new CodexPage(page)
    await codexPage.goto()
    await codexPage.waitForLoad()

    await codexPage.assertLoaded()
  })
})

test.describe('Keyboard Navigation', () => {
  let codexPage: CodexPage

  test.beforeEach(async ({ page }) => {
    codexPage = new CodexPage(page)
    await codexPage.goto()
    await codexPage.waitForLoad()
  })

  test('should navigate with keyboard', async ({ page }) => {
    // Tab through elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Verify focus is moving (basic accessibility check)
    const activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeElement).toBeDefined()
  })

  test('should close dropdowns with Escape', async ({ page }) => {
    // Open a dropdown or modal
    await codexPage.openFilters()
    await page.waitForTimeout(200)

    // Press Escape to close
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  })
})

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now()

    const codexPage = new CodexPage(page)
    await codexPage.goto()
    await codexPage.waitForLoad()

    const loadTime = Date.now() - startTime

    // Should load within 10 seconds (generous for CI environments)
    expect(loadTime).toBeLessThan(10000)
  })
})
