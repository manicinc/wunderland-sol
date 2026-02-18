/**
 * Focus Page Object Model
 * Encapsulates all Focus/Deep Focus page interactions for E2E testing
 *
 * @module e2e/pages/focus.page
 */

import { Page, Locator, expect } from '@playwright/test'

export class FocusPage {
  readonly page: Page

  // Main layout elements
  readonly container: Locator
  readonly toolbar: Locator
  readonly backgroundSlideshow: Locator

  // Toolbar controls
  readonly playButton: Locator
  readonly pauseButton: Locator
  readonly volumeSlider: Locator
  readonly soundscapeSelector: Locator
  readonly deepFocusButton: Locator
  readonly widgetDockButton: Locator
  readonly backgroundButton: Locator

  // Deep focus overlay
  readonly deepFocusOverlay: Locator
  readonly exitDeepFocusButton: Locator

  // Widget dock
  readonly widgetDock: Locator
  readonly widgetDockItems: Locator

  // Floating windows
  readonly floatingWindows: Locator

  // Pomodoro widget
  readonly pomodoroWidget: Locator
  readonly pomodoroTimer: Locator
  readonly pomodoroStartButton: Locator
  readonly pomodoroPauseButton: Locator
  readonly pomodoroResetButton: Locator
  readonly pomodoroModeSelector: Locator

  // Quick capture widget
  readonly quickCaptureWidget: Locator
  readonly quickCaptureInput: Locator
  readonly quickCaptureSubmit: Locator

  constructor(page: Page) {
    this.page = page

    // Main layout
    this.container = page.locator('[data-testid="focus-page"], .focus-page')
    this.toolbar = page.locator('[data-testid="focus-toolbar"], .focus-toolbar, [data-testid="meditate-toolbar"], .meditate-toolbar')
    this.backgroundSlideshow = page.locator('[data-testid="background-slideshow"], .background-slideshow')

    // Toolbar controls
    this.playButton = page.locator('[data-testid="play-button"], button[aria-label*="Play"]')
    this.pauseButton = page.locator('[data-testid="pause-button"], button[aria-label*="Pause"]')
    this.volumeSlider = page.locator('[data-testid="volume-slider"], input[type="range"][aria-label*="volume" i]')
    this.soundscapeSelector = page.locator('[data-testid="soundscape-selector"], [data-testid="soundscape-select"]')
    this.deepFocusButton = page.locator('[data-testid="deep-focus-button"], button[aria-label*="focus" i]')
    this.widgetDockButton = page.locator('[data-testid="widget-dock-button"], button[aria-label*="widget" i]')
    this.backgroundButton = page.locator('[data-testid="background-button"], button[aria-label*="background" i]')

    // Deep focus overlay
    this.deepFocusOverlay = page.locator('[data-testid="deep-focus-overlay"], .deep-focus-overlay')
    this.exitDeepFocusButton = page.locator('[data-testid="exit-deep-focus"], button:has-text("Exit")')

    // Widget dock
    this.widgetDock = page.locator('[data-testid="widget-dock"], .widget-dock')
    this.widgetDockItems = page.locator('[data-testid="widget-dock-item"], .widget-dock-item')

    // Floating windows
    this.floatingWindows = page.locator('[data-testid^="floating-window"], .floating-window')

    // Pomodoro widget
    this.pomodoroWidget = page.locator('[data-testid="pomodoro-widget"], .pomodoro-widget')
    this.pomodoroTimer = page.locator('[data-testid="pomodoro-timer"], .pomodoro-timer')
    this.pomodoroStartButton = page.locator('[data-testid="pomodoro-start"], button:has-text("Start")')
    this.pomodoroPauseButton = page.locator('[data-testid="pomodoro-pause"], button:has-text("Pause")')
    this.pomodoroResetButton = page.locator('[data-testid="pomodoro-reset"], button:has-text("Reset")')
    this.pomodoroModeSelector = page.locator('[data-testid="pomodoro-mode-selector"], .pomodoro-mode-selector')

    // Quick capture widget
    this.quickCaptureWidget = page.locator('[data-testid="quick-capture-widget"], .quick-capture-widget')
    this.quickCaptureInput = page.locator('[data-testid="quick-capture-input"], .quick-capture-input textarea')
    this.quickCaptureSubmit = page.locator('[data-testid="quick-capture-submit"], button:has-text("Save")')
  }

  /**
   * Navigate to the Focus page
   */
  async goto() {
    await this.page.goto('/quarry/focus')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded')
    // Wait for toolbar to be visible as indicator of page ready
    await this.toolbar.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      // Toolbar might not exist, page still loaded
    })
    await this.page.waitForTimeout(500) // Allow for animations
  }

  // ============================================================================
  // SOUNDSCAPE CONTROLS
  // ============================================================================

  /**
   * Start playing ambient sounds
   */
  async play() {
    if (await this.playButton.isVisible()) {
      await this.playButton.click()
    }
  }

  /**
   * Pause ambient sounds
   */
  async pause() {
    if (await this.pauseButton.isVisible()) {
      await this.pauseButton.click()
    }
  }

  /**
   * Toggle play/pause
   */
  async togglePlay() {
    if (await this.pauseButton.isVisible()) {
      await this.pause()
    } else {
      await this.play()
    }
  }

  /**
   * Set volume level
   */
  async setVolume(percentage: number) {
    const slider = this.volumeSlider
    if (await slider.isVisible()) {
      await slider.fill(percentage.toString())
    }
  }

  /**
   * Select a soundscape
   */
  async selectSoundscape(soundscape: string) {
    await this.soundscapeSelector.click()
    await this.page.getByRole('option', { name: new RegExp(soundscape, 'i') }).click()
  }

  // ============================================================================
  // DEEP FOCUS MODE
  // ============================================================================

  /**
   * Enter deep focus mode
   */
  async enterDeepFocus() {
    if (await this.deepFocusButton.isVisible()) {
      await this.deepFocusButton.click()
    }
    await this.page.waitForTimeout(300)
  }

  /**
   * Exit deep focus mode
   */
  async exitDeepFocus() {
    if (await this.exitDeepFocusButton.isVisible()) {
      await this.exitDeepFocusButton.click()
    } else {
      // Try pressing Escape
      await this.page.keyboard.press('Escape')
    }
    await this.page.waitForTimeout(300)
  }

  /**
   * Toggle deep focus with keyboard shortcut
   */
  async toggleDeepFocusWithKeyboard() {
    await this.page.keyboard.press('Meta+Shift+F')
    await this.page.waitForTimeout(300)
  }

  /**
   * Check if in deep focus mode
   */
  async isInDeepFocus(): Promise<boolean> {
    return await this.deepFocusOverlay.isVisible()
  }

  // ============================================================================
  // WIDGET DOCK
  // ============================================================================

  /**
   * Open the widget dock
   */
  async openWidgetDock() {
    if (await this.widgetDockButton.isVisible()) {
      await this.widgetDockButton.click()
    }
    await this.widgetDock.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  }

  /**
   * Close the widget dock
   */
  async closeWidgetDock() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(200)
  }

  /**
   * Spawn a widget from the dock
   */
  async spawnWidget(widgetName: string) {
    await this.openWidgetDock()
    const item = this.widgetDockItems.filter({ hasText: widgetName }).first()
    if (await item.isVisible()) {
      await item.click()
    }
    await this.page.waitForTimeout(300)
  }

  /**
   * Get count of open floating windows
   */
  async getFloatingWindowCount(): Promise<number> {
    return await this.floatingWindows.count()
  }

  // ============================================================================
  // FLOATING WINDOW INTERACTIONS
  // ============================================================================

  /**
   * Close a floating window by title
   */
  async closeFloatingWindow(title: string) {
    const window = this.floatingWindows.filter({ hasText: title }).first()
    const closeButton = window.locator('button[aria-label="Close"], button:has-text("×")')
    if (await closeButton.isVisible()) {
      await closeButton.click()
    }
    await this.page.waitForTimeout(200)
  }

  /**
   * Focus a floating window by title
   */
  async focusFloatingWindow(title: string) {
    const window = this.floatingWindows.filter({ hasText: title }).first()
    if (await window.isVisible()) {
      await window.click()
    }
  }

  // ============================================================================
  // POMODORO TIMER
  // ============================================================================

  /**
   * Start the Pomodoro timer
   */
  async startPomodoro() {
    if (await this.pomodoroStartButton.isVisible()) {
      await this.pomodoroStartButton.click()
    }
  }

  /**
   * Pause the Pomodoro timer
   */
  async pausePomodoro() {
    if (await this.pomodoroPauseButton.isVisible()) {
      await this.pomodoroPauseButton.click()
    }
  }

  /**
   * Reset the Pomodoro timer
   */
  async resetPomodoro() {
    if (await this.pomodoroResetButton.isVisible()) {
      await this.pomodoroResetButton.click()
    }
  }

  /**
   * Get current Pomodoro time display
   */
  async getPomodoroTime(): Promise<string | null> {
    if (await this.pomodoroTimer.isVisible()) {
      return await this.pomodoroTimer.textContent()
    }
    return null
  }

  // ============================================================================
  // QUICK CAPTURE
  // ============================================================================

  /**
   * Create a quick capture note
   */
  async createQuickCapture(text: string) {
    // First spawn the widget if not visible
    if (!(await this.quickCaptureWidget.isVisible())) {
      await this.spawnWidget('Quick Capture')
    }

    if (await this.quickCaptureInput.isVisible()) {
      await this.quickCaptureInput.fill(text)
      await this.quickCaptureSubmit.click()
    }
    await this.page.waitForTimeout(300)
  }

  // ============================================================================
  // BACKGROUND SLIDESHOW
  // ============================================================================

  /**
   * Check if background slideshow is visible
   */
  async isSlideshowVisible(): Promise<boolean> {
    return await this.backgroundSlideshow.isVisible()
  }

  /**
   * Navigate to next background image
   */
  async nextBackground() {
    const nextButton = this.page.locator('[data-testid="next-background"], button[aria-label*="next" i]')
    if (await nextButton.isVisible()) {
      await nextButton.click()
    }
    await this.page.waitForTimeout(500) // Allow for transition
  }

  /**
   * Navigate to previous background image
   */
  async previousBackground() {
    const prevButton = this.page.locator('[data-testid="prev-background"], button[aria-label*="previous" i]')
    if (await prevButton.isVisible()) {
      await prevButton.click()
    }
    await this.page.waitForTimeout(500)
  }

  // ============================================================================
  // ASSERTIONS
  // ============================================================================

  /**
   * Assert that the page loaded correctly
   */
  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/quarry\/focus/)
  }

  /**
   * Assert toolbar is visible
   */
  async assertToolbarVisible() {
    await expect(this.toolbar).toBeVisible()
  }

  /**
   * Assert deep focus overlay is visible
   */
  async assertDeepFocusActive() {
    await expect(this.deepFocusOverlay).toBeVisible()
  }

  /**
   * Assert deep focus overlay is not visible
   */
  async assertDeepFocusInactive() {
    await expect(this.deepFocusOverlay).not.toBeVisible()
  }

  /**
   * Assert a specific number of floating windows
   */
  async assertFloatingWindowCount(count: number) {
    await expect(this.floatingWindows).toHaveCount(count)
  }

  /**
   * Assert Pomodoro widget is visible
   */
  async assertPomodoroVisible() {
    await expect(this.pomodoroWidget).toBeVisible()
  }
}

