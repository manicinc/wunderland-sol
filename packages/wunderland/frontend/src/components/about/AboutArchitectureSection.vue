<script setup lang="ts">
import { ref, computed } from 'vue';
import AnimatedGlyph from '@/components/about/AnimatedGlyph.vue';
import DiagramViewer from '@/components/DiagramViewer.vue';
import { themeManager } from '@/theme/ThemeManager';

const diagrams = {
  systemOverview: `
    graph TD
      subgraph UserLayer["User Experience"]
        UI["Voice Chat UI"]
      end
      subgraph Intelligence["Orchestration & Intelligence Core"]
        Orchestrator["AgentOS Orchestrator"]
        GMI["Generalized Mind Instance"]
      end
      subgraph CoreServices["Core Services"]
        Persona["Persona Engine"]
        Memory["Memory Core"]
        Knowledge["Knowledge Interface (RAG)"]
        Tools["Tool & Function Executor"]
      end
      subgraph External["External Systems"]
        LLMs["LLM Providers"]
        APIs["External APIs & Services"]
        DataSources["User Data Sources"]
      end

      UI --> Orchestrator
      Orchestrator --> GMI
      GMI --> Persona
      GMI --> Memory
      GMI --> Knowledge
      GMI --> Tools
      GMI --> LLMs
      Knowledge --> DataSources
      Tools --> APIs

      classDef default fill:var(--color-bg-tertiary),stroke:var(--color-border-primary),color:var(--color-text-primary),rx:12,ry:12;
      classDef userLayer fill:var(--color-accent-primary),stroke:var(--color-accent-primary),color:#ffffff;
      classDef intelligence fill:var(--color-accent-secondary),stroke:var(--color-accent-secondary),color:#ffffff;
      classDef core fill:var(--color-bg-secondary),stroke:var(--color-border-primary),color:var(--color-text-primary);
      classDef external fill:var(--color-bg-secondary),stroke:var(--color-border-primary),color:var(--color-text-primary);

      class UI userLayer;
      class Orchestrator,GMI intelligence;
      class Persona,Memory,Knowledge,Tools core;
      class LLMs,APIs,DataSources external;
  `,
  dataFlow: `
    sequenceDiagram
      participant User
      participant Frontend as Frontend UI
      participant Orchestrator as AgentOS Orchestrator
      participant Knowledge as Knowledge Base (RAG)
      participant Model as LLM

      User->>+Frontend: Voice or text input
      Frontend->>+Orchestrator: Context-rich API call
      Orchestrator->>Orchestrator: Analyse intent & gather memory
      Orchestrator->>+Knowledge: Fetch supporting facts
      Knowledge-->>-Orchestrator: Ranked snippets
      Orchestrator->>Orchestrator: Compose adaptive prompt
      Orchestrator->>+Model: Submit prompt
      Model-->>-Orchestrator: Candidate response
      Orchestrator->>Orchestrator: Post-process & apply guardrails
      Orchestrator-->>-Frontend: Structured response payload
      Frontend-->>-User: Render text / play audio
  `,
  promptEngine: `
    graph LR
      subgraph Inputs["Signals"]
        UserInput["User Input"]
        SessionCtx["Session Context"]
      end
      subgraph Persona["Active Persona"]
        PersonaDef["Core Directives"]
        PersonaMem["Persona Memory"]
        PersonaStyle["Style Guide"]
      end
      subgraph Knowledge["Knowledge Context"]
        Docs["Retrieved Docs"]
        DBResults["Database Results"]
      end
      subgraph Tools["Tool Context"]
        ToolDefs["Registered Tools"]
      end
      Inputs --> QueryAnalyzer["Query Analyzer"]
      QueryAnalyzer --> PromptStrategist["Prompt Strategist"]
      Persona --> PromptStrategist
      Knowledge --> PromptStrategist
      Tools --> PromptStrategist
      PromptStrategist --> PromptAssembler["Prompt Assembler"]
      PromptAssembler --> FinalFormatter["Response Formatter"]
      FinalFormatter --> OptimizedPrompt["Optimized LLM Prompt"]
  `,
};

const isOpen = ref(false);
const isDarkMode = computed(() => themeManager.getCurrentTheme().value?.isDark || false);

const toggle = () => {
  isOpen.value = !isOpen.value;
};
</script>

<template>
  <section id="architecture" class="architecture-diagrams-about content-section-ephemeral">
    <button @click="toggle" class="expandable-header-button-about section-title-main --expandable" type="button">
      <span class="expandable-title-text">
        <AnimatedGlyph name="code" class="section-title-icon" :size="40" />
        AgentOS Technical Architecture
      </span>
      <AnimatedGlyph name="chevron" class="chevron-indicator-about --section-title" :class="{ rotated: isOpen }" :size="24" />
    </button>
    <div class="expandable-content-wrapper-about" :class="{ open: isOpen }">
      <div class="diagrams-grid-about">
        <div class="diagram-card-about card-glass-interactive">
          <h4 class="diagram-card-title">System Overview</h4>
          <p class="diagram-card-description">From the interface through the AgentOS core, see how every service links together.</p>
          <DiagramViewer :diagramCode="diagrams.systemOverview" diagramType="mermaid" :is-dark-mode="isDarkMode" class="diagram-viewer-about" />
        </div>
        <div class="diagram-card-about card-glass-interactive">
          <h4 class="diagram-card-title">Data Flow Architecture</h4>
          <p class="diagram-card-description">Track the journey for each request, including memory lookups and guardrail steps.</p>
          <DiagramViewer :diagramCode="diagrams.dataFlow" diagramType="mermaid" :is-dark-mode="isDarkMode" class="diagram-viewer-about" />
        </div>
        <div class="diagram-card-about card-glass-interactive">
          <h4 class="diagram-card-title">Adaptive Prompt Engine</h4>
          <p class="diagram-card-description">Understand how inputs, personas, tools, and knowledge merge into a single prompt.</p>
          <DiagramViewer :diagramCode="diagrams.promptEngine" diagramType="mermaid" :is-dark-mode="isDarkMode" class="diagram-viewer-about" />
        </div>
      </div>
    </div>
  </section>
</template>
