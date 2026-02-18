<script setup lang="ts">
import { ref } from 'vue';
import AnimatedGlyph from '@/components/about/AnimatedGlyph.vue';

type RoadmapStatus = 'Idea' | 'Planned' | 'In Progress' | 'Beta' | 'Completed';

interface RoadmapFeature {
  name: string;
  status: RoadmapStatus;
  description?: string;
}

interface RoadmapQuarter {
  id: string;
  quarter: string;
  year: number;
  themeTitle: string;
  features: RoadmapFeature[];
}

const roadmapItems = ref<RoadmapQuarter[]>([
  {
    id: 'q2-2025',
    quarter: 'Q2',
    year: 2025,
    themeTitle: 'Shared Memory & Collaboration',
    features: [
      { name: 'Workspace Memory Handoff', status: 'In Progress', description: 'Carry context between teammates with opt-in persistence.' },
      { name: 'Live Session Co-Pilot', status: 'Beta', description: 'Invite collaborators to hear, comment, and steer a shared conversation.' },
    ],
  },
  {
    id: 'q3-2025',
    quarter: 'Q3',
    year: 2025,
    themeTitle: 'Enhanced Context & Personalisation',
    features: [
      { name: 'Proactive Suggestion Engine v1', status: 'Planned', description: 'Surface follow-up prompts and actions before you ask.' },
      { name: 'User Document Integration', status: 'Planned', description: 'Connect private knowledge bases, notes, and repos.' },
    ],
  },
  {
    id: 'q4-2025',
    quarter: 'Q4',
    year: 2025,
    themeTitle: 'Richer Interactions & Outputs',
    features: [
      { name: 'Image & Media Comprehension', status: 'Idea', description: 'Reference screenshots and whiteboards during conversations.' },
      { name: 'Structured Canvas Export', status: 'Planned', description: 'Generate briefs, tickets, and docs with live syncing.' },
    ],
  },
]);
</script>

<template>
  <section id="roadmap" class="roadmap-section-about content-section-ephemeral">
    <h3 class="section-title-main">
      <AnimatedGlyph name="map" class="section-title-icon" :size="38" />
      Product Roadmap
    </h3>
    <div class="roadmap-timeline-container-about">
      <div
        v-for="(item, index) in roadmapItems"
        :key="item.id"
        class="roadmap-item-container-about"
        :class="{ 'align-right': index % 2 !== 0 }"
      >
        <div class="roadmap-item-dot"></div>
        <div class="roadmap-item-line"></div>
        <div class="roadmap-item-content-card card-neo-subtle">
          <h4 class="roadmap-quarter-title">{{ item.quarter }} {{ item.year }}</h4>
          <p class="roadmap-quarter-theme">{{ item.themeTitle }}</p>
          <ul class="roadmap-features-list">
            <li v-for="feature in item.features" :key="feature.name" class="roadmap-feature-item">
              <strong class="feature-name-roadmap">{{ feature.name }}</strong>
              <span class="status-badge-roadmap" :class="`status-${feature.status.toLowerCase().replace(/\\s+/g, '-')}`">
                {{ feature.status }}
              </span>
              <p v-if="feature.description" class="feature-description-roadmap">{{ feature.description }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
