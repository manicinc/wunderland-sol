<script setup lang="ts">
import { ref, reactive } from 'vue';
import AnimatedGlyph from '@/components/about/AnimatedGlyph.vue';

interface AgentOsComponentItem {
  name: string;
  iconName: 'spark' | 'people' | 'layers' | 'orbit' | 'academic' | 'wave' | 'code' | 'map' | 'shield' | 'lightbulb';
  description: string;
}

const agentOsComponents = ref<AgentOsComponentItem[]>([
  { name: 'Adaptive Context Engine', iconName: 'spark', description: 'Dynamically reads the full conversation, live metadata, and tool history to keep every reply grounded.' },
  { name: 'Dynamic Persona Manager', iconName: 'people', description: 'Keeps tone, priorities, and safety aligned to the selected assistant profile without losing flexibility.' },
  { name: 'Multi-Layered Memory Core', iconName: 'layers', description: 'Combines short-term buffers, semantic recall, and long-term summaries for continuity across sessions.' },
  { name: 'LLM Orchestration & Failover', iconName: 'orbit', description: 'Routes each request to the best model, handles fallbacks, and balances cost vs. latency automatically.' },
  { name: 'Knowledge Synthesis (RAG+)', iconName: 'academic', description: 'Blends Retrieval-Augmented Generation with structured context packs for grounded answers.' },
  { name: 'Realtime Voice I/O Pipeline', iconName: 'wave', description: 'Streams speech recognition and TTS with minimal lag, working online or with local fallbacks.' },
  { name: 'Extensible Tool Integration Bus', iconName: 'code', description: 'Connects custom functions, APIs, and automations using a consistent capability schema.' },
  { name: 'Proactive Goal & Task Planner', iconName: 'map', description: 'Tracks state, suggests next steps, and orchestrates tool calls to keep momentum.' },
  { name: 'Guardrail & Safety System', iconName: 'shield', description: 'Agents "change their mind" mid-stream via policy checks. Supports keyword filters, LLM reasoning, cost ceilings, and human escalation.' },
  { name: 'Extension & Guardrail Marketplace', iconName: 'plug', description: 'Community registry with free CI/CD. Install curated tools (search, Telegram) and safety policies via npm.' },
  { name: 'User Preference & Learning Module', iconName: 'lightbulb', description: 'Learns stylistic cues and preferences to deliver more personal, on-brand deliverables.' },
]);

type SectionKey = 'philosophy' | 'components';
const openSections = reactive<Record<SectionKey, boolean>>({
  philosophy: true,
  components: false,
});

const toggleSection = (sectionKey: SectionKey): void => {
  openSections[sectionKey] = !openSections[sectionKey];
};
</script>

<template>
  <section id="agentos" class="agentos-deep-dive-about content-section-ephemeral">
    <h3 class="section-title-main">
      <AnimatedGlyph name="cube" class="section-title-icon" :size="40" />
      Deep Dive into AgentOS
    </h3>
    <div class="expandable-sections-container">
      <div class="expandable-section-card-about card-glass-interactive">
        <button @click="toggleSection('philosophy')" class="expandable-header-button-about" type="button">
          <span class="expandable-title-text">
            <AnimatedGlyph name="academic" class="expandable-title-icon" :size="30" />
            Foundation &amp; Philosophy
          </span>
          <AnimatedGlyph name="chevron" class="chevron-indicator-about" :class="{ rotated: openSections.philosophy }" :size="22" />
        </button>
        <div class="expandable-content-wrapper-about" :class="{ open: openSections.philosophy }">
          <div class="prose-enhanced-about">
            <h4>Beyond static AI: the adaptive intelligence loop</h4>
            <p>
              Traditional assistants treat interactions as a straight line: <strong>input -&gt; fixed processing -&gt; output</strong>.
              AgentOS operates as a loop that never stops learning:
              <strong>context -&gt; adaptation -&gt; personalised intelligence -&gt; action -&gt; feedback -&gt; refined context</strong>.
            </p>
            <h5>Core principles</h5>
            <ul>
              <li><strong>Context is king:</strong> Tasks, tone, and artifacts are blended into a true working memory.</li>
              <li><strong>Personas as cognitive frameworks:</strong> Assistants can swap directives without losing alignment.</li>
              <li><strong>Memory fuels continuity:</strong> Layered storage balances short bursts with long-running projects.</li>
              <li><strong>Safety is built-in:</strong> Guardrails and audit trails tame powerful tools.</li>
            </ul>
            <p class="italic opacity-80">
              The AgentOS Generalized Mind Instance (GMI) is the orchestrator that turns these principles into coordinated behaviour.
            </p>
          </div>
        </div>
      </div>

      <div class="expandable-section-card-about card-glass-interactive">
        <button @click="toggleSection('components')" class="expandable-header-button-about" type="button">
          <span class="expandable-title-text">
            <AnimatedGlyph name="sliders" class="expandable-title-icon" :size="30" />
            Core system components
          </span>
          <AnimatedGlyph name="chevron" class="chevron-indicator-about" :class="{ rotated: openSections.components }" :size="22" />
        </button>
        <div class="expandable-content-wrapper-about" :class="{ open: openSections.components }">
          <p class="mb-4 text-lg">AgentOS is modular at every layer, so you can mix, match, or extend capabilities as the product evolves.</p>
          <div class="components-grid-about">
            <div v-for="item in agentOsComponents" :key="item.name" class="component-item-card-about card-neo-subtle">
              <AnimatedGlyph :name="item.iconName" class="component-item-icon" :size="40" />
              <h5 class="component-item-name">{{ item.name }}</h5>
              <p class="component-item-description">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
