// File: frontend/src/components/DiagramViewer.vue
/**
 * @file DiagramViewer.vue
 * @description Component to render Mermaid diagrams with caching, dynamic theming,
 * and SVG export, aligning with the "Ephemeral Harmony" design system.
 *
 * @component DiagramViewer
 * @props {string} diagramCode - The Mermaid code string to render.
 * @props {'mermaid'} diagramType - The type of diagram (currently supports 'mermaid').
 *
 * @version 2.2.0 - Refined error handling, SVG export, and added JSDoc for clarity.
 * Ensures strong thematic integration points for SCSS.
 */
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed, type Ref as VueRef } from 'vue';
import mermaid from 'mermaid';
import localforage from 'localforage'; // For client-side caching of rendered SVGs
import { themeManager } from '@/theme/ThemeManager'; // Global theme manager

/**
 * @props DiagramViewer
 */
const props = defineProps<{
  /** The Mermaid diagram code string. */
  diagramCode: string;
  /** The type of diagram. Currently, only 'mermaid' is fully supported. */
  diagramType: 'mermaid'; // Can be expanded later, e.g., 'plantuml', 'graphviz'
}>();

/** Ref for the HTML element that will contain the rendered Mermaid diagram. */
const mermaidContainer = ref<HTMLElement | null>(null);
/** @type {VueRef<boolean>} Indicates if the diagram is currently being rendered or fetched from cache. */
const isLoading = ref(false);
/** @type {VueRef<string>} Stores any error message that occurs during rendering. */
const renderError = ref('');
/** @type {VueRef<boolean>} Tracks if the component is currently mounted in the DOM. */
const isComponentMounted = ref(false);

/**
 * @computed currentMermaidTheme
 * @description Determines the appropriate Mermaid theme ('dark' or 'neutral') based on the global application theme.
 * @returns {'dark' | 'neutral'}
 */
const currentMermaidTheme = computed<'dark' | 'neutral'>(() => {
  const theme = themeManager.getCurrentTheme().value;
  // Mermaid themes: 'default' (similar to 'neutral'), 'dark', 'neutral', 'forest'.
  // 'neutral' tends to be a safe bet for light themes if 'default' has issues.
  return theme?.isDark ? 'dark' : 'neutral';
});

/**
 * @computed hasRenderedMermaidContent
 * @description Checks if the mermaid container has actual SVG content rendered.
 * Used to conditionally show actions like 'Save Diagram'.
 * @returns {boolean}
 */
const hasRenderedMermaidContent = computed<boolean>(() => {
  return mermaidContainer.value?.querySelector('svg') instanceof SVGElement;
});

/**
 * Generates a simple hash from a string for cache keys or unique IDs.
 * Not cryptographically secure, but sufficient for this purpose.
 * @param {string} str - The input string.
 * @returns {string} A short hash string.
 */
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return 'h0';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Ensure positive, then take last 8 chars of base36 for brevity
  return 'h' + (hash >>> 0).toString(36).slice(-8);
}

/**
 * Renders the diagram. Fetches from cache if available, otherwise renders using Mermaid
 * and caches the result. Handles loading states and errors.
 * @async
 */
const renderDiagram = async () => {
  if (!isComponentMounted.value) {
    // console.warn("DiagramViewer: Attempted to render before component is mounted.");
    return;
  }

  if (props.diagramType !== 'mermaid') {
    isLoading.value = false;
    renderError.value = `Diagram type "${props.diagramType}" is not supported. Only 'mermaid' is available.`;
    if (mermaidContainer.value) mermaidContainer.value.innerHTML = '';
    return;
  }

  if (!props.diagramCode || props.diagramCode.trim() === '') {
    isLoading.value = false;
    renderError.value = 'Diagram code is empty. Nothing to render.';
    if (mermaidContainer.value) mermaidContainer.value.innerHTML = '';
    return;
  }

  isLoading.value = true;
  renderError.value = '';
  await nextTick(); // Ensure DOM is ready for container access

  if (!mermaidContainer.value) {
    renderError.value = "Diagram container DOM element not found. Rendering aborted.";
    console.error("DiagramViewer: mermaidContainer ref is null after nextTick.");
    isLoading.value = false;
    return;
  }
  mermaidContainer.value.innerHTML = ''; // Clear previous diagram before rendering new one

  try {
    const diagramId = `mermaid-diag-${simpleHash(props.diagramCode.slice(0, 50) + Date.now() + Math.random())}`; // More unique ID
    const cacheKey = `diagram-cache-${simpleHash(props.diagramCode + currentMermaidTheme.value + "v2.2")}`; // Theme and version influence cache

    const cachedSvg = await localforage.getItem<string>(cacheKey);
    if (cachedSvg) {
      // console.log(`[DiagramViewer] Rendering diagram ${diagramId} from cache (key: ${cacheKey})`);
      mermaidContainer.value.innerHTML = cachedSvg;
      // Note: bindFunctions might be needed for cached interactive diagrams.
      // For simplicity, cached SVGs are treated as static displays here.
      // If interactivity from cache is needed, the caching mechanism would need to be more complex.
      isLoading.value = false;
      return;
    }
    // console.log(`[DiagramViewer] Rendering diagram ${diagramId} with Mermaid (cache miss for key: ${cacheKey})`);

    mermaid.initialize({
      startOnLoad: false,
      theme: currentMermaidTheme.value,
      securityLevel: 'loose', // Consider 'strict' or 'sandbox' if diagram code source is less trusted.
      fontSize: 14,
      // @ts-expect-error 'suppressErrorRendering' is a valid runtime option for Mermaid,
      // but might not be present in all TypeScript definition versions.
      suppressErrorRendering: true, // Prevents Mermaid from injecting its own error message into the DOM.
      flowchart: { htmlLabels: true, useMaxWidth: true },
      sequence: { showSequenceNumbers: true, useMaxWidth: true },
      gantt: { useMaxWidth: true },
      // Potentially add more theme variables here if supported by Mermaid version
      // themeVariables: {
      //   primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--color-accent-primary').trim(),
      //   // ... other theme vars
      // }
    });

    if (!props.diagramCode.trim()) { // Should have been caught earlier, but defensive check
        throw new Error("Cannot render an empty or whitespace-only diagram string.");
    }

    const { svg, bindFunctions } = await mermaid.render(diagramId, props.diagramCode.trim());

    if (mermaidContainer.value) { // Re-check ref in case component unmounted during async render
      mermaidContainer.value.innerHTML = svg;
      if (bindFunctions) {
        bindFunctions(mermaidContainer.value); // Apply interactivity (e.g., clickable nodes)
      }
      try {
        await localforage.setItem(cacheKey, svg); // Cache the newly rendered SVG
      } catch (cacheError) {
        console.warn("DiagramViewer: Failed to cache rendered SVG.", cacheError);
      }
    } else {
        console.warn("DiagramViewer: Mermaid container became unavailable during async rendering. SVG not appended.");
    }

  } catch (error: any) {
    console.error('DiagramViewer: Error rendering Mermaid diagram:', error);
    let errorMessage = 'Failed to render diagram. Please check the diagram code and console for details.';
    if (error instanceof Error && error.message) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    // Mermaid often includes detailed error info in a 'str' property or directly in message
    if (error && typeof error.str === 'string' && error.str.length > 0 && error.str !== "Diagrams syntax error") {
        errorMessage = error.str; // Prefer Mermaid's specific error string
    } else if (error && error.message && error.message.includes("render")) {
        // Generic fallback if specific string not found but message indicates render issue
        errorMessage = `Mermaid rendering issue: ${error.message}`;
    }
    renderError.value = errorMessage;
    if (mermaidContainer.value) mermaidContainer.value.innerHTML = ''; // Clear container on error
  } finally {
    isLoading.value = false;
  }
};

/**
 * Triggers a download of the currently rendered Mermaid diagram as an SVG file.
 */
const saveDiagram = () => {
  if (!mermaidContainer.value || props.diagramType !== 'mermaid' || !hasRenderedMermaidContent.value) {
    console.warn('DiagramViewer: Conditions not met for saving diagram.');
    renderError.value = "No valid diagram content available to save.";
    return;
  }
  const svgElement = mermaidContainer.value.querySelector('svg');
  if (!svgElement) {
    console.warn('DiagramViewer: No SVG element found within the rendered diagram to save.');
    renderError.value = "Could not find SVG content to save.";
    return;
  }

  // Ensure xmlns attribute is present for proper SVG rendering as standalone file
  if (!svgElement.getAttribute('xmlns')) {
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  // Create a clone to modify for export (e.g., add background) without affecting the displayed one.
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

  // Add a theme-aware background rectangle to the cloned SVG for better standalone viewing
  const currentTheme = themeManager.getCurrentTheme().value;
  const bodyComputedStyle = getComputedStyle(document.body); // Use body for more reliable fallback if rootElement vars not set

  let bgColor = 'white'; // Default for light themes or if theme var fails
  if (currentTheme?.isDark) {
    // Try to get themed background, fallback to a dark color
    bgColor = bodyComputedStyle.getPropertyValue('--color-bg-primary').trim() || // From current theme context
              getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary').trim() || // Global fallback
              '#1e1e2f'; // Hardcoded dark fallback
  } else {
     bgColor = bodyComputedStyle.getPropertyValue('--color-bg-primary').trim() ||
               getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary').trim() ||
               '#ffffff';
  }

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', bgColor);
  svgClone.prepend(bgRect); // Add as the first child, effectively a background layer

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgClone);

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diagram-${simpleHash(props.diagramCode.slice(0,30) + props.diagramType)}.svg`; // Include type in hash for safety
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Lifecycle Hooks & Watchers ---
onMounted(() => {
  isComponentMounted.value = true;
  if (props.diagramCode && props.diagramType === 'mermaid') {
    renderDiagram();
  } else if (!props.diagramCode && props.diagramType === 'mermaid') {
    renderError.value = "No diagram code provided on mount.";
  }
});

onBeforeUnmount(() => {
  isComponentMounted.value = false;
  // Potentially cancel any ongoing rendering or async operations if necessary
});

watch(
  [() => props.diagramCode, () => props.diagramType, currentMermaidTheme],
  ([newCode, newType, newTheme], [oldCode, oldType, oldTheme]) => {
    if (!isComponentMounted.value) return; // Don't render if not mounted

    const codeChanged = newCode !== oldCode;
    const typeChanged = newType !== oldType;
    const themeChanged = newTheme !== oldTheme;

    if (codeChanged || typeChanged || themeChanged) {
      // console.log(`[DiagramViewer] Re-rendering: CodeChanged: ${codeChanged}, TypeChanged: ${typeChanged}, ThemeChanged: ${themeChanged}`);
      renderDiagram();
    }
  },
  { deep: false } // props are objects, but we watch specific primitive properties or computed refs
);

</script>

<template>
  <div class="diagram-viewer-wrapper-ephemeral" role="figure" :aria-label="`Diagram: ${diagramType}`">
    <div v-if="isLoading" class="loading-indicator-ephemeral" role="status">
      <div class="spinner-ephemeral"></div>
      <p class="loading-text">Rendering Diagram...</p>
    </div>

    <div v-else-if="renderError" class="render-error-ephemeral" role="alert">
      <p class="error-title">Diagram Rendering Error</p>
      <p class="error-message">{{ renderError }}</p>
      <details v-if="diagramCode" class="error-code-block-details">
        <summary class="error-code-summary">Show Diagram Code</summary>
        <pre class="error-code-block-content"><code :class="`language-${diagramType === 'mermaid' ? 'mermaid' : 'plaintext'}`">{{ diagramCode }}</code></pre>
      </details>
    </div>

    <div v-else class="diagram-content-host">
      <div
        v-if="diagramType === 'mermaid'"
        ref="mermaidContainer"
        class="mermaid-diagram-container-ephemeral"
        :data-theme="currentMermaidTheme"
      >
        <p v-if="!hasRenderedMermaidContent && !diagramCode?.trim()" class="status-text-ephemeral">
          No diagram code provided.
        </p>
        <p v-else-if="!hasRenderedMermaidContent && diagramCode?.trim()" class="status-text-ephemeral">
          Ready to render diagram.
        </p>
        </div>

      <div v-else-if="diagramCode && diagramType !== 'mermaid'" class="unsupported-diagram-ephemeral">
        <p class="unsupported-title">Diagram Type '{{ diagramType }}' Not Visually Supported</p>
        <p class="unsupported-message">Displaying raw code block instead:</p>
        <div class="error-code-block-details modern mt-2"> <pre class="error-code-block-content"><code :class="`language-${diagramType}`">{{ diagramCode }}</code></pre>
        </div>
      </div>

      <div v-else-if="!diagramCode && diagramType === 'mermaid'" class="status-text-ephemeral">
         Please provide Mermaid code to render a diagram.
       </div>
    </div>

    <div
      class="diagram-actions-ephemeral"
      v-if="!isLoading && !renderError && diagramType === 'mermaid' && hasRenderedMermaidContent"
    >
      <button @click="saveDiagram" class="btn btn-outline-ephemeral btn-sm-ephemeral save-diagram-button">
        Save as SVG
      </button>
    </div>
  </div>
</template>

<style lang="scss">
// Styles for DiagramViewer.vue should be in a dedicated SCSS file,
// e.g., frontend/src/styles/components/_diagram-viewer.scss.
// This ensures component-specific styles are co-located or easily found.

// Minimal structural styles for a self-contained example if no external SCSS is assumed.
// For production, these should be in a dedicated .scss file and use theme variables.

// import vars as var
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins; // For button styles, etc.
.diagram-viewer-wrapper-ephemeral {
  display: flex;
  flex-direction: column;
  position: relative; // For absolute positioning of overlays
  min-height: 200px; // Ensure it has some minimum height
  background-color: hsl(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l));
  border: 1px solid hsl(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l));
  border-radius: var.$radius-lg;
  overflow: hidden; // Ensure mermaid SVG doesn't overflow rounded corners
}

.loading-indicator-ephemeral,
.render-error-ephemeral,
.status-text-ephemeral,
.unsupported-diagram-ephemeral {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var.$spacing-lg;
  flex-grow: 1; // Takes up space if diagram not rendered
  color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
}

.loading-indicator-ephemeral {
  .spinner-ephemeral { /* Basic CSS Spinner */
    width: 36px; height: 36px;
    border: 4px solid hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.2);
    border-top-color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
    border-radius: 50%;
    animation: diagram-viewer-spin 0.8s linear infinite;
  }
  .loading-text {
    margin-top: var.$spacing-sm;
    font-size: var.$font-size-sm;
    color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  }
}
@keyframes diagram-viewer-spin { to { transform: rotate(360deg); } }

.render-error-ephemeral {
  color: hsl(var(--color-error-text-h), var(--color-error-text-s), var(--color-error-text-l));
  background-color: hsla(var(--color-error-h), var(--color-error-s), var(--color-error-l), 0.05);
  border: 1px dashed hsl(var(--color-error-h), var(--color-error-s), var(--color-error-l), 0.3);
  border-radius: var.$radius-md;
  margin: var.$spacing-md;

  .error-title {
    font-weight: 600;
    font-size: var.$font-size-base-default;
    color: hsl(var(--color-error-h), var(--color-error-s), calc(var(--color-error-l) - 10%));
    margin-bottom: var.$spacing-xs;
  }
  .error-message {
    font-size: var.$font-size-sm;
    margin-bottom: var.$spacing-sm;
    word-break: break-word;
  }
}

.error-code-block-details { // For <details> tag
  width: 100%;
  max-width: 600px; // Limit width of code display
  margin-top: var.$spacing-sm;
  border: 1px solid hsl(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.5);
  border-radius: var.$radius-sm;
  background-color: hsl(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l));

  .error-code-summary {
    padding: var.$spacing-xs var.$spacing-sm;
    cursor: pointer;
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
    font-size: var.$font-size-xs;
    font-weight: 500;
    &:hover {
      color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
    }
  }
  .error-code-block-content {
    padding: var.$spacing-sm;
    background-color: hsl(var(--color-bg-code-block-h), var(--color-bg-code-block-s), var(--color-bg-code-block-l), var(--color-bg-code-block-a));
    color: hsl(var(--color-text-code-block-h), var(--color-text-code-block-s), var(--color-text-code-block-l), var(--color-text-code-block-a));
    font-family: var.$font-family-mono;
    font-size: var.$font-size-xs;
    overflow-x: auto;
    max-height: 150px; // Scrollable if code is long
    border-top: 1px solid hsl(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.5);
    @include mixins.custom-scrollbar(
      '--color-accent-secondary', 0.4, 0.6,
      '--color-bg-code-block', 0.2,
      4px, var.$radius-xs
    );
  }
}


.diagram-content-host {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto; // Allow scrolling for very large diagrams
  padding: var.$spacing-sm;
  @include mixins.custom-scrollbar('--color-accent-interactive', 0.3, 0.5, '--color-bg-secondary', 0.1);
}

.mermaid-diagram-container-ephemeral {
  width: 100%;
  height: 100%; // Try to fill allocated space
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    max-width: 100%;
    max-height: 100%; // Ensure SVG scales down to fit container
    height: auto;   // Maintain aspect ratio
    display: block; // Remove extra space below SVG
    margin: auto;   // Center if SVG is smaller than container
  }
}

.unsupported-diagram-ephemeral {
  .unsupported-title {
    font-weight: 600;
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
    margin-bottom: var.$spacing-xs;
  }
  .unsupported-message {
    margin-bottom: var.$spacing-sm;
    font-size: var.$font-size-sm;
  }
  // Uses .error-code-block-details for styling the code block
}

.diagram-actions-ephemeral {
  padding: var.$spacing-xs var.$spacing-sm;
  border-top: 1px solid hsl(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.2);
  background-color: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), calc(var(--color-bg-secondary-l) + 3%), 0.7); // Slightly lighter than main bg
  display: flex;
  justify-content: flex-end; // Align button to the right
  flex-shrink: 0; // Prevent shrinking

  .save-diagram-button {
    // Should use global button styles/mixins, e.g.,
    // @include buttonsFile.btn;
    // @include buttonsFile.btn-outline-themed('--color-accent-interactive');
    // For now, basic styling:
    padding: var.$spacing-xs var.$spacing-md;
    font-size: var.$font-size-sm;
    background-color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
    color: hsl(var(--color-text-on-primary-h), var(--color-text-on-primary-s), var(--color-text-on-primary-l));
    border: 1px solid transparent;
    border-radius: var.$radius-md;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;

    &:hover {
      background-color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) - 5%));
    }
    &:active {
      transform: scale(0.98);
    }
  }
}
</style>