<template>
  <div class="canvas-editor" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- Toolbar -->
    <div class="canvas-toolbar">
      <div class="toolbar-left">
        <h3 class="canvas-title">Canvas</h3>
        <span v-if="hasUnsavedChanges" class="unsaved-indicator">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="4" />
          </svg>
          Unsaved changes
        </span>
      </div>

      <div class="toolbar-right">
        <button
          @click="exportToPNG"
          class="toolbar-btn"
          title="Export to PNG"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>PNG</span>
        </button>
        <button
          @click="exportToSVG"
          class="toolbar-btn"
          title="Export to SVG"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>SVG</span>
        </button>
        <button
          @click="clearCanvas"
          class="toolbar-btn"
          title="Clear Canvas"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span>Clear</span>
        </button>
        <button
          @click="toggleFullscreen"
          class="toolbar-btn"
          title="Toggle Fullscreen"
        >
          <svg v-if="!isFullscreen" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Canvas Container -->
    <div class="canvas-container">
      <component
        :is="TldrawComponent"
        :initial-data="modelValue"
        :on-change="handleCanvasChange"
        :read-only="readonly"
        :theme="isDarkMode ? 'dark' : 'light'"
        :auto-save-interval="autoSaveInterval"
        :on-editor-ready="handleEditorReady"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { applyReactInVue } from 'veaury'
import TldrawWrapperReact, { type TldrawWrapperHandle } from './TldrawWrapper'

// Wrap React component for use in Vue
const TldrawComponent = applyReactInVue(TldrawWrapperReact)

// Store editor handle for export functions
const editorHandle = ref<TldrawWrapperHandle | null>(null)

interface Props {
  modelValue: string
  readonly?: boolean
  autoSaveInterval?: number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  autoSaveInterval: 2000,
})

const emit = defineEmits<Emits>()

// State
const isFullscreen = ref(false)
const hasUnsavedChanges = ref(false)

// Detect dark mode from CSS variables or theme
const isDarkMode = computed(() => {
  if (typeof window === 'undefined') return false
  const rootStyle = getComputedStyle(document.documentElement)
  const bgColor = rootStyle.getPropertyValue('--color-bg-primary')
  // Simple heuristic: if background is dark, we're in dark mode
  return bgColor && bgColor.includes('15, 23, 42')
})

/**
 * Handle editor ready callback from TldrawWrapper
 */
function handleEditorReady(handle: TldrawWrapperHandle) {
  editorHandle.value = handle
}

/**
 * Handle canvas data changes
 */
function handleCanvasChange(data: string) {
  hasUnsavedChanges.value = true
  emit('update:modelValue', data)

  // Reset unsaved indicator after a delay
  setTimeout(() => {
    hasUnsavedChanges.value = false
  }, 1000)
}

/**
 * Export canvas to PNG and download
 */
async function exportToPNG() {
  if (!editorHandle.value) {
    console.warn('Canvas editor not ready')
    return null
  }

  const dataUrl = await editorHandle.value.exportToPNG({ scale: 2 })
  if (!dataUrl) {
    console.warn('No content to export')
    return null
  }

  // Trigger download
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `canvas-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  return dataUrl
}

/**
 * Export canvas to SVG and download
 */
async function exportToSVG() {
  if (!editorHandle.value) {
    console.warn('Canvas editor not ready')
    return null
  }

  const svgString = await editorHandle.value.exportToSVG()
  if (!svgString) {
    console.warn('No content to export')
    return null
  }

  // Trigger download
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `canvas-${Date.now()}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return svgString
}

/**
 * Get PNG as data URL (for embedding in markdown)
 */
async function getPNGDataUrl(): Promise<string | null> {
  if (!editorHandle.value) return null
  return await editorHandle.value.exportToPNG({ scale: 2 })
}

/**
 * Get SVG as string (for embedding in markdown)
 */
async function getSVGString(): Promise<string | null> {
  if (!editorHandle.value) return null
  return await editorHandle.value.exportToSVG()
}

/**
 * Get canvas snapshot data
 */
function getSnapshot(): string | null {
  if (!editorHandle.value) return null
  return editorHandle.value.getSnapshot()
}

/**
 * Check if canvas has content
 */
function hasContent(): boolean {
  if (!editorHandle.value) return false
  return editorHandle.value.hasContent()
}

/**
 * Check if canvas has handwriting
 */
function hasHandwriting(): boolean {
  if (!editorHandle.value) return false
  return editorHandle.value.hasHandwriting()
}

/**
 * Clear canvas
 */
function clearCanvas() {
  if (!confirm('Are you sure you want to clear the entire canvas? This cannot be undone.')) {
    return
  }

  if (editorHandle.value) {
    editorHandle.value.clear()
  }
  emit('update:modelValue', '')
  hasUnsavedChanges.value = false
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

// Expose methods for parent component
defineExpose({
  exportToPNG,
  exportToSVG,
  getPNGDataUrl,
  getSVGString,
  getSnapshot,
  hasContent,
  hasHandwriting,
  clearCanvas,
})
</script>

<style lang="scss" scoped>
.canvas-editor {
  @apply flex flex-col h-full;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  position: relative;

  &.is-fullscreen {
    @apply fixed inset-0 z-50;
    border-radius: 0;
  }
}

.canvas-toolbar {
  @apply flex items-center justify-between px-3 py-2 border-b shrink-0;
  background-color: var(--color-bg-tertiary);
  border-bottom-color: var(--color-border-primary);
  min-height: 48px;
}

.toolbar-left,
.toolbar-right {
  @apply flex items-center gap-2;
}

.canvas-title {
  @apply text-base font-semibold m-0;
  color: var(--color-text-primary);
}

.unsaved-indicator {
  @apply flex items-center gap-1 text-xs;
  color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));

  .icon {
    @apply w-2 h-2;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
}

.toolbar-btn {
  @apply flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium transition-all;
  color: var(--color-text-secondary);
  background-color: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    color: var(--color-text-primary);
    background-color: var(--color-bg-secondary);
  }

  .icon {
    @apply w-4 h-4;
    stroke-width: 2;
  }

  span {
    @apply hidden sm:inline;
  }
}

.canvas-container {
  @apply flex-1 overflow-hidden;
  position: relative;
}

// Tldraw theme customization
:deep(.tldraw-canvas) {
  font-family: var(--font-family-base);

  // Override tldraw colors to match diary theme
  --color-background: var(--color-bg-primary);
  --color-low: var(--color-bg-secondary);
  --color-low-border: var(--color-border-primary);
  --color-text: var(--color-text-primary);
  --color-text-1: var(--color-text-secondary);
}

// Mobile adjustments
@media (max-width: 640px) {
  .canvas-toolbar {
    @apply px-2 py-1.5;
  }

  .toolbar-btn {
    @apply px-2 py-1;

    span {
      @apply hidden;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
