<template>
  <div class="wysiwyg-editor" :style="{ fontSize: `${fontScale}%` }">
    <div v-if="editor" class="wysiwyg-toolbar">
      <!-- Formatting Buttons -->
      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ active: editor.isActive('bold') }"
          class="toolbar-btn"
          title="Bold (Cmd+B)"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          </svg>
        </button>
        <button
          @click="editor.chain().focus().toggleItalic().run()"
          :class="{ active: editor.isActive('italic') }"
          class="toolbar-btn"
          title="Italic (Cmd+I)"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </button>
        <button
          @click="editor.chain().focus().toggleStrike().run()"
          :class="{ active: editor.isActive('strike') }"
          class="toolbar-btn"
          title="Strikethrough"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.9h.2m8.2 3.7c.3.4.4.8.4 1.3 0 2.9-2.7 3.6-5.3 3.6-2.3 0-4.4-.3-6.2-.9M4 11.5h16" />
          </svg>
        </button>
        <button
          @click="editor.chain().focus().toggleCode().run()"
          :class="{ active: editor.isActive('code') }"
          class="toolbar-btn"
          title="Inline Code (Cmd+E)"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Heading Buttons -->
      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          :class="{ active: editor.isActive('heading', { level: 1 }) }"
          class="toolbar-btn"
          title="Heading 1"
        >
          H1
        </button>
        <button
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          :class="{ active: editor.isActive('heading', { level: 2 }) }"
          class="toolbar-btn"
          title="Heading 2"
        >
          H2
        </button>
        <button
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          :class="{ active: editor.isActive('heading', { level: 3 }) }"
          class="toolbar-btn"
          title="Heading 3"
        >
          H3
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- List Buttons -->
      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ active: editor.isActive('bulletList') }"
          class="toolbar-btn"
          title="Bullet List"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          :class="{ active: editor.isActive('orderedList') }"
          class="toolbar-btn"
          title="Numbered List"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
        </button>
        <button
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="{ active: editor.isActive('blockquote') }"
          class="toolbar-btn"
          title="Blockquote"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </button>
        <button
          @click="editor.chain().focus().toggleCodeBlock().run()"
          :class="{ active: editor.isActive('codeBlock') }"
          class="toolbar-btn"
          title="Code Block"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <path d="M8 9l3 3-3 3" />
            <line x1="13" y1="15" x2="16" y2="15" />
          </svg>
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Utility Buttons -->
      <div class="toolbar-group">
        <button
          @click="editor.chain().focus().setHorizontalRule().run()"
          class="toolbar-btn"
          title="Horizontal Rule"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </button>
        <button
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="toolbar-btn"
          title="Undo (Cmd+Z)"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
        </button>
        <button
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="toolbar-btn"
          title="Redo (Cmd+Shift+Z)"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
          </svg>
        </button>
      </div>
    </div>

    <editor-content :editor="editor" class="wysiwyg-content" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'

interface Props {
  modelValue: string
  placeholder?: string
  fontScale?: number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Start writing...',
  fontScale: 100,
})

const emit = defineEmits<Emits>()

// Initialize Tiptap editor
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
    }),
    Markdown.configure({
      html: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose-base diary-prose-theme max-w-none focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    const markdown = editor.storage.markdown.getMarkdown()
    emit('update:modelValue', markdown)
  },
})

// Watch for external content changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value) {
      const currentMarkdown = editor.value.storage.markdown.getMarkdown()
      if (newValue !== currentMarkdown) {
        editor.value.commands.setContent(newValue)
      }
    }
  }
)

// Cleanup
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

// Expose editor for parent component
defineExpose({
  editor,
})
</script>

<style lang="scss" scoped>
.wysiwyg-editor {
  @apply flex flex-col h-full;
  background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), var(--diary-bg-l), 0.98);
}

.wysiwyg-toolbar {
  @apply flex flex-wrap items-center gap-1 px-3 py-2 border-b shrink-0;
  background-color: var(--color-bg-tertiary);
  border-bottom-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.15);
  min-height: 48px;
}

.toolbar-group {
  @apply flex items-center gap-0.5;
}

.toolbar-separator {
  @apply w-px h-6 mx-1;
  background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
}

.toolbar-btn {
  @apply flex items-center justify-center w-8 h-8 rounded transition-all text-sm font-semibold;
  color: var(--color-text-secondary);
  background-color: transparent;
  border: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--color-text-primary);
    background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1);
  }

  &.active {
    color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
    background-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.15);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .icon {
    @apply w-4 h-4;
    stroke-width: 2;
  }
}

.wysiwyg-content {
  @apply flex-1 overflow-y-auto p-4;

  :deep(.ProseMirror) {
    min-height: 100%;
    outline: none;

    // Diary prose theme styling
    h1, h2, h3, h4, h5, h6 {
      color: hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 10%));
      @apply mt-4 mb-2 font-semibold;
    }

    h1 { @apply text-2xl; }
    h2 { @apply text-xl; }
    h3 { @apply text-lg; }
    h4 { @apply text-base; }

    p {
      @apply mb-3 leading-relaxed;
      color: var(--color-text-primary);
    }

    ul, ol {
      @apply pl-6 my-3 space-y-1;
    }

    li {
      color: var(--color-text-primary);
    }

    code {
      background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 5%), 0.8);
      @apply px-1.5 py-0.5 rounded text-sm font-mono;
      color: var(--color-text-accent, var(--color-text-primary));
    }

    pre {
      @apply my-3 rounded-md p-4;
      background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) - 2%), 0.8);

      code {
        @apply block whitespace-pre-wrap text-sm;
        background: none;
        padding: 0;
      }
    }

    blockquote {
      @apply border-l-4 pl-4 italic my-3;
      border-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
      color: var(--color-text-secondary);
    }

    hr {
      @apply my-6;
      border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.3);
    }

    a {
      color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
      @apply underline hover:opacity-80;
    }

    // Placeholder
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--color-text-muted);
      opacity: 0.6;
      pointer-events: none;
      height: 0;
    }
  }
}

// Mobile adjustments
@media (max-width: 640px) {
  .wysiwyg-toolbar {
    @apply px-2 py-1.5;
  }

  .toolbar-btn {
    @apply w-7 h-7;
  }
}
</style>
