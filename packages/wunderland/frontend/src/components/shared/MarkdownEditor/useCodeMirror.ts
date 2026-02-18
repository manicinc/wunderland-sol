/**
 * @file useCodeMirror.ts
 * @description Vue 3 composable for CodeMirror 6 integration
 * Provides markdown editing with syntax highlighting and custom theming
 * @version 1.0.0
 */

import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue';
import { EditorView, keymap, placeholder as placeholderExt } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { getEditorStyles } from './markdownTheme';

export interface UseCodeMirrorOptions {
  /** Initial markdown content */
  initialValue?: string;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Whether the editor is readonly */
  readonly?: boolean;
  /** Additional CodeMirror extensions */
  extensions?: Extension[];
  /** Callback when content changes */
  onChange?: (value: string) => void;
  /** Callback when editor is ready */
  onReady?: (view: EditorView) => void;
}

export interface UseCodeMirrorReturn {
  /** The editor container element ref */
  editorRef: Ref<HTMLElement | null>;
  /** The CodeMirror EditorView instance */
  view: Ref<EditorView | null>;
  /** Get the current editor content */
  getValue: () => string;
  /** Set the editor content programmatically */
  setValue: (value: string) => void;
  /** Focus the editor */
  focus: () => void;
  /** Destroy the editor instance */
  destroy: () => void;
  /** Get the current cursor position */
  getCursorPosition: () => { line: number; ch: number };
  /** Set the cursor position */
  setCursorPosition: (line: number, ch: number) => void;
}

/**
 * Composable for integrating CodeMirror 6 with Vue 3
 * Provides full markdown editing capabilities with syntax highlighting
 */
export function useCodeMirror(options: UseCodeMirrorOptions = {}): UseCodeMirrorReturn {
  const {
    initialValue = '',
    placeholder = 'Start typing your markdown...',
    readonly = false,
    extensions = [],
    onChange,
    onReady,
  } = options;

  const editorRef = ref<HTMLElement | null>(null);
  const view = ref<EditorView | null>(null);

  /**
   * Create base extensions for markdown editing
   */
  function createBaseExtensions(): Extension[] {
    return [
      // Line numbers and gutters
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      foldGutter(),

      // History (undo/redo)
      history(),

      // Markdown language support
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        addKeymap: true,
      }),

      // Syntax highlighting
      syntaxHighlighting(defaultHighlightStyle),
      bracketMatching(),

      // Auto-close brackets and quotes
      closeBrackets(),

      // Custom theme
      getEditorStyles(),

      // Placeholder
      placeholderExt(placeholder),

      // Readonly mode
      EditorView.editable.of(!readonly),
      EditorState.readOnly.of(readonly),

      // Keymaps
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, ...closeBracketsKeymap]),

      // Update listener for onChange callback
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      }),

      // Custom extensions
      ...extensions,
    ];
  }

  /**
   * Initialize the CodeMirror editor
   */
  function initializeEditor() {
    if (!editorRef.value) {
      console.warn('useCodeMirror: editorRef is not set');
      return;
    }

    // Create the editor state
    const startState = EditorState.create({
      doc: initialValue,
      extensions: createBaseExtensions(),
    });

    // Create the editor view
    view.value = new EditorView({
      state: startState,
      parent: editorRef.value,
    });

    // Call onReady callback
    if (onReady && view.value) {
      onReady(view.value);
    }
  }

  /**
   * Get the current editor content
   */
  function getValue(): string {
    if (!view.value) return '';
    return view.value.state.doc.toString();
  }

  /**
   * Set the editor content programmatically
   */
  function setValue(value: string) {
    if (!view.value) return;

    const transaction = view.value.state.update({
      changes: {
        from: 0,
        to: view.value.state.doc.length,
        insert: value,
      },
    });

    view.value.dispatch(transaction);
  }

  /**
   * Focus the editor
   */
  function focus() {
    if (view.value) {
      view.value.focus();
    }
  }

  /**
   * Destroy the editor instance
   */
  function destroy() {
    if (view.value) {
      view.value.destroy();
      view.value = null;
    }
  }

  /**
   * Get the current cursor position
   */
  function getCursorPosition(): { line: number; ch: number } {
    if (!view.value) return { line: 0, ch: 0 };

    const pos = view.value.state.selection.main.head;
    const line = view.value.state.doc.lineAt(pos);

    return {
      line: line.number - 1, // 0-indexed
      ch: pos - line.from,
    };
  }

  /**
   * Set the cursor position
   */
  function setCursorPosition(line: number, ch: number) {
    if (!view.value) return;

    try {
      const lineObj = view.value.state.doc.line(line + 1); // 1-indexed
      const pos = Math.min(lineObj.from + ch, lineObj.to);

      view.value.dispatch({
        selection: { anchor: pos, head: pos },
        scrollIntoView: true,
      });
    } catch (error) {
      console.warn('useCodeMirror: Invalid cursor position', { line, ch, error });
    }
  }

  // Initialize editor on mount
  onMounted(() => {
    initializeEditor();
  });

  // Cleanup on unmount
  onBeforeUnmount(() => {
    destroy();
  });

  return {
    editorRef,
    view,
    getValue,
    setValue,
    focus,
    destroy,
    getCursorPosition,
    setCursorPosition,
  };
}
