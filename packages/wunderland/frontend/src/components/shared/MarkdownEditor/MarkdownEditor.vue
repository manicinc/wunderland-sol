<template>
  <div class="markdown-editor" :class="{ 'is-split-view': viewMode === 'split' }">
    <!-- Toolbar -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <div class="view-mode-toggle">
          <button
            @click="viewMode = 'edit'"
            :class="{ active: viewMode === 'edit' }"
            class="mode-btn"
            title="Edit Only (Ctrl+1)"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Edit</span>
          </button>
          <button
            @click="viewMode = 'split'"
            :class="{ active: viewMode === 'split' }"
            class="mode-btn"
            title="Split View (Ctrl+2)"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span>Split</span>
          </button>
          <button
            @click="viewMode = 'preview'"
            :class="{ active: viewMode === 'preview' }"
            class="mode-btn"
            title="Preview Only (Ctrl+3)"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Preview</span>
          </button>
          <button
            @click="viewMode = 'wysiwyg'"
            :class="{ active: viewMode === 'wysiwyg' }"
            class="mode-btn"
            title="WYSIWYG Editor (Ctrl+4)"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            <span>WYSIWYG</span>
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <button
          @click="toggleScrollSync"
          :class="{ active: scrollSyncEnabled }"
          class="icon-btn"
          title="Toggle Scroll Sync"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
        <button @click="decreaseFontSize" class="icon-btn" title="Decrease Font Size">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <span class="font-size-indicator">{{ fontScale }}%</span>
        <button @click="increaseFontSize" class="icon-btn" title="Increase Font Size">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Editor and Preview Container -->
    <div class="editor-container">
      <!-- Editor Pane -->
      <div
        v-show="viewMode === 'edit' || viewMode === 'split'"
        class="editor-pane"
        :style="{ fontSize: `${fontScale}%` }"
      >
        <div ref="editorRef" class="codemirror-wrapper" @scroll="handleEditorScroll"></div>
      </div>

      <!-- Preview Pane -->
      <div
        v-show="viewMode === 'preview' || viewMode === 'split'"
        ref="previewRef"
        class="preview-pane"
        :style="{ fontSize: `${fontScale}%` }"
        @scroll="handlePreviewScroll"
      >
        <CompactMessageRenderer
          v-if="modelValue"
          :content="modelValue"
          :mode="`markdown-editor-preview`"
        />
        <div v-else class="preview-empty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p>Preview will appear here</p>
        </div>
      </div>

      <!-- WYSIWYG Pane -->
      <div
        v-show="viewMode === 'wysiwyg'"
        class="wysiwyg-pane"
        :style="{ fontSize: `${fontScale}%` }"
      >
        <WysiwygEditor
          v-model="editableContent"
          :placeholder="placeholder"
          :font-scale="fontScale"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useCodeMirror } from './useCodeMirror'
import { useScrollSync } from './useScrollSync'
import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue'
import WysiwygEditor from './WysiwygEditor.vue'

interface Props {
  modelValue: string
  placeholder?: string
  readonly?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Share your thoughts, reflections, or details of your day...',
  readonly: false,
})

const emit = defineEmits<Emits>()

// View mode: 'edit', 'split', 'preview', or 'wysiwyg'
const viewMode = ref<'edit' | 'split' | 'preview' | 'wysiwyg'>('split')
const fontScale = ref(100)
const scrollSyncEnabled = ref(true)

// Editable content for WYSIWYG mode (synced with modelValue)
const editableContent = ref(props.modelValue)

// Refs
const editorRef = ref<HTMLElement | null>(null)
const previewRef = ref<HTMLElement | null>(null)

// Initialize CodeMirror
const {
  editorRef: codeMirrorRef,
  view: codeMirrorView,
  getValue,
  setValue,
  focus,
} = useCodeMirror({
  initialValue: props.modelValue,
  placeholder: props.placeholder,
  readonly: props.readonly,
  onChange: (value) => {
    emit('update:modelValue', value)
  },
})

// Assign the editor ref from useCodeMirror to our template ref
watch(editorRef, (newVal) => {
  if (newVal) {
    codeMirrorRef.value = newVal
  }
})

// Initialize scroll sync
const { syncEditorToPreview, syncPreviewToEditor, updateLineMapping, setEnabled, isEnabled } =
  useScrollSync({
    smoothScroll: true,
    scrollDuration: 0.3,
    debounceDelay: 150,
    enabled: scrollSyncEnabled.value,
  })

// Watch for content changes to update line mappings
watch(
  () => props.modelValue,
  async (newValue) => {
    if (newValue && previewRef.value) {
      await nextTick()
      updateLineMapping(newValue, previewRef.value)
    }
    // Sync with WYSIWYG editor content
    if (editableContent.value !== newValue) {
      editableContent.value = newValue
    }
  }
)

// Watch WYSIWYG content changes and emit to parent
watch(editableContent, (newValue) => {
  if (newValue !== props.modelValue) {
    emit('update:modelValue', newValue)
  }
})

// Watch for view mode changes and restore scroll position
watch(viewMode, (newMode) => {
  // Save to localStorage for persistence
  localStorage.setItem('markdown-editor-view-mode', newMode)

  // Focus editor when switching to edit or split mode
  if ((newMode === 'edit' || newMode === 'split') && codeMirrorView.value) {
    nextTick(() => {
      focus()
    })
  }
})

// Watch for scroll sync toggle
watch(scrollSyncEnabled, (enabled) => {
  setEnabled(enabled)
  localStorage.setItem('markdown-editor-scroll-sync', String(enabled))
})

// Handle editor scroll
function handleEditorScroll(event: Event) {
  if (!scrollSyncEnabled.value || viewMode.value !== 'split') return

  const target = event.target as HTMLElement
  const scrollTop = target.scrollTop
  const scrollHeight = target.scrollHeight
  const clientHeight = target.clientHeight

  syncEditorToPreview(scrollTop, clientHeight)
}

// Handle preview scroll
function handlePreviewScroll(event: Event) {
  if (!scrollSyncEnabled.value || viewMode.value !== 'split') return

  const target = event.target as HTMLElement
  const scrollTop = target.scrollTop
  const scrollHeight = target.scrollHeight
  const clientHeight = target.clientHeight

  syncPreviewToEditor(scrollTop, clientHeight)
}

// Toggle scroll sync
function toggleScrollSync() {
  scrollSyncEnabled.value = !scrollSyncEnabled.value
}

// Font size controls
function increaseFontSize() {
  if (fontScale.value < 200) {
    fontScale.value += 10
    localStorage.setItem('markdown-editor-font-scale', String(fontScale.value))
  }
}

function decreaseFontSize() {
  if (fontScale.value > 60) {
    fontScale.value -= 10
    localStorage.setItem('markdown-editor-font-scale', String(fontScale.value))
  }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event: KeyboardEvent) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modKey = isMac ? event.metaKey : event.ctrlKey

  if (!modKey) return

  // Cmd/Ctrl + 1: Edit mode
  if (event.key === '1') {
    event.preventDefault()
    viewMode.value = 'edit'
  }
  // Cmd/Ctrl + 2: Split mode
  else if (event.key === '2') {
    event.preventDefault()
    viewMode.value = 'split'
  }
  // Cmd/Ctrl + 3: Preview mode
  else if (event.key === '3') {
    event.preventDefault()
    viewMode.value = 'preview'
  }
  // Cmd/Ctrl + 4: WYSIWYG mode
  else if (event.key === '4') {
    event.preventDefault()
    viewMode.value = 'wysiwyg'
  }
  // Cmd/Ctrl + +: Increase font size
  else if (event.key === '=' || event.key === '+') {
    event.preventDefault()
    increaseFontSize()
  }
  // Cmd/Ctrl + -: Decrease font size
  else if (event.key === '-') {
    event.preventDefault()
    decreaseFontSize()
  }
}

// Load preferences from localStorage on mount
onMounted(() => {
  const savedViewMode = localStorage.getItem('markdown-editor-view-mode')
  if (savedViewMode === 'edit' || savedViewMode === 'split' || savedViewMode === 'preview' || savedViewMode === 'wysiwyg') {
    viewMode.value = savedViewMode
  }

  const savedScrollSync = localStorage.getItem('markdown-editor-scroll-sync')
  if (savedScrollSync !== null) {
    scrollSyncEnabled.value = savedScrollSync === 'true'
  }

  const savedFontScale = localStorage.getItem('markdown-editor-font-scale')
  if (savedFontScale) {
    const scale = parseInt(savedFontScale, 10)
    if (scale >= 60 && scale <= 200) {
      fontScale.value = scale
    }
  }

  // Initial line mapping
  if (props.modelValue && previewRef.value) {
    nextTick(() => {
      updateLineMapping(props.modelValue, previewRef.value!)
    })
  }

  // Add keyboard shortcuts listener
  window.addEventListener('keydown', handleKeyboardShortcuts)
})

// Cleanup on unmount
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts)
})

// Expose methods for parent component
defineExpose({
  focus,
  getValue,
  setValue,
})
</script>

<style lang="scss" scoped>
.markdown-editor {
  @apply flex flex-col h-full;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  @apply flex items-center justify-between px-3 py-2 border-b shrink-0;
  background-color: var(--color-bg-tertiary);
  border-bottom-color: var(--color-border-primary);
  min-height: 48px;
}

.toolbar-left,
.toolbar-right {
  @apply flex items-center gap-2;
}

.view-mode-toggle {
  @apply flex items-center gap-1 p-1 rounded-md;
  background-color: var(--color-bg-secondary);
}

.mode-btn {
  @apply flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all;
  color: var(--color-text-secondary);
  background-color: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    color: var(--color-text-primary);
    background-color: var(--color-bg-tertiary);
  }

  &.active {
    color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
    background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
  }

  .icon {
    @apply w-4 h-4;
    stroke-width: 2;
  }

  span {
    @apply hidden sm:inline;
  }
}

.icon-btn {
  @apply p-2 rounded transition-colors;
  color: var(--color-text-secondary);
  background-color: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    color: var(--color-text-primary);
    background-color: var(--color-bg-tertiary);
  }

  &.active {
    color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
    background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
  }

  .icon {
    @apply w-4 h-4;
    stroke-width: 2;
  }
}

.font-size-indicator {
  @apply text-xs font-mono text-center min-w-[3rem];
  color: var(--color-text-muted);
}

.editor-container {
  @apply flex flex-1 overflow-hidden;

  .markdown-editor.is-split-view & {
    @apply grid;
    grid-template-columns: 1fr 1fr;
  }
}

.editor-pane,
.preview-pane {
  @apply flex-1 overflow-y-auto;
  position: relative;
}

.editor-pane {
  border-right: 1px solid var(--color-border-primary);

  .markdown-editor.is-split-view & {
    border-right: 1px solid var(--color-border-primary);
  }

  .markdown-editor:not(.is-split-view) & {
    border-right: none;
  }
}

.codemirror-wrapper {
  @apply h-full w-full;
}

.preview-pane {
  @apply p-4;
  background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 1%), 0.5);
}

.wysiwyg-pane {
  @apply flex-1 overflow-y-auto;
  position: relative;
}

.preview-empty {
  @apply flex flex-col items-center justify-center h-full;
  color: var(--color-text-muted);
  opacity: 0.5;

  .empty-icon {
    @apply w-16 h-16 mb-4;
    stroke-width: 1.5;
  }

  p {
    @apply text-sm;
  }
}

// Mobile responsive
@media (max-width: 768px) {
  .markdown-editor.is-split-view .editor-container {
    @apply flex flex-col;
    grid-template-columns: none;
  }

  .editor-pane {
    @apply border-r-0 border-b;
    border-bottom-color: var(--color-border-primary);
    max-height: 50vh;
  }

  .mode-btn span {
    @apply hidden;
  }
}
</style>
