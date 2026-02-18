<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AnimatedGlyph from '@/components/about/AnimatedGlyph.vue';

interface MissionItem {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  iconName: 'rocket' | 'people' | 'prism' | 'lightbulb';
  accentVar: string;
  gradient: string;
}

const missionItems = ref<MissionItem[]>([
  {
    title: 'The Framers Collective',
    subtitle: 'Building AGI-Ready Tools',
    description:
      'We are The Framers - AI/NLP engineers, game designers, and product architects creating next-generation open source technology as the world shifts towards AGI.',
    features: [
      'Cross-disciplinary expertise',
      'Human-centered AI design',
      'Frame.dev innovation lab',
      'AGI-aligned architectures',
    ],
    iconName: 'rocket',
    accentVar: '--color-accent-primary',
    gradient: 'linear-gradient(135deg, hsla(335, 80%, 72%, 0.2), hsla(345, 75%, 80%, 0.1))',
  },
  {
    title: 'Open Source Excellence',
    subtitle: 'Transparency & Collaboration',
    description:
      'Every line of code we write is open, auditable, and extensible. We believe the path to beneficial AGI requires radical transparency and global collaboration.',
    features: [
      'MIT licensed everything',
      'Public development process',
      'Community-driven features',
      'No vendor lock-in',
    ],
    iconName: 'people',
    accentVar: '--color-accent-secondary',
    gradient: 'linear-gradient(135deg, hsla(260, 75%, 78%, 0.2), hsla(270, 85%, 65%, 0.1))',
  },
  {
    title: 'AGI-Ready Infrastructure',
    subtitle: "Built for What's Coming",
    description:
      "Our tools are designed not just for today's AI, but for the superintelligent systems of tomorrow. Scalable, modular, and ready for the intelligence explosion.",
    features: [
      'Multi-agent orchestration',
      'Distributed memory systems',
      'Real-time streaming architecture',
      'Persona-based intelligence',
    ],
    iconName: 'prism',
    accentVar: '--color-info',
    gradient: 'linear-gradient(135deg, hsla(180, 95%, 60%, 0.2), hsla(200, 70%, 94%, 0.1))',
  },
]);

const sectionRef = ref<HTMLElement | null>(null);
const cardsVisible = ref(false);

onMounted(() => {
  if (typeof window === 'undefined' || !sectionRef.value) {
    cardsVisible.value = true;
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      const entry = entries[0];
      if (entry?.isIntersecting) {
        cardsVisible.value = true;
        observer.disconnect();
      }
    },
    { threshold: 0.2 }
  );

  observer.observe(sectionRef.value);
});
</script>

<template>
  <section ref="sectionRef" id="mission" class="mission-section-enhanced content-section-ephemeral">
    <div class="mission-header">
      <h3 class="section-title-main mission-title">
        <AnimatedGlyph name="lightbulb" class="section-title-icon mission-icon-glow" :size="44" />
        Our Mission
      </h3>
      <p class="mission-tagline">
        As The Framers, we're building the infrastructure for a world where artificial general
        intelligence enhances human potential. Through Frame.dev and our open source projects, we're
        creating tools that bridge today's AI capabilities with tomorrow's AGI reality.
      </p>
    </div>

    <div class="mission-grid-enhanced" :class="{ 'cards-visible': cardsVisible }">
      <article
        v-for="(item, index) in missionItems"
        :key="item.title"
        class="mission-card-enhanced"
        :style="{
          '--card-gradient': item.gradient,
          '--card-accent': `hsl(var(${item.accentVar}-h), var(${item.accentVar}-s), var(${item.accentVar}-l))`,
          '--stagger-delay': `${index * 150}ms`,
        }"
      >
        <div class="mission-card-header">
          <div class="mission-icon-container">
            <div class="mission-icon-bg"></div>
            <AnimatedGlyph :name="item.iconName" class="mission-card-icon" :size="48" />
          </div>
          <div class="mission-card-titles">
            <h4 class="mission-card-title">{{ item.title }}</h4>
            <span class="mission-card-subtitle">{{ item.subtitle }}</span>
          </div>
        </div>

        <p class="mission-card-description">{{ item.description }}</p>

        <ul class="mission-features-list">
          <li v-for="feature in item.features" :key="feature" class="mission-feature-item">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              class="feature-check-icon"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>{{ feature }}</span>
          </li>
        </ul>

        <div class="mission-card-glow"></div>
      </article>
    </div>

    <!-- Decorative background elements -->
    <div class="mission-bg-decoration">
      <svg
        class="mission-bg-svg"
        viewBox="0 0 800 400"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mission-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color: hsla(335, 80%, 72%, 0.1)" />
            <stop offset="100%" style="stop-color: hsla(345, 75%, 80%, 0.05)" />
          </linearGradient>
          <filter id="mission-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>
        <path
          d="M0,100 Q200,50 400,100 T800,100 L800,400 L0,400 Z"
          fill="url(#mission-gradient-1)"
          filter="url(#mission-blur)"
        />
      </svg>
    </div>
  </section>
</template>

<style scoped lang="scss">
.mission-section-enhanced {
  position: relative;
  padding: 4rem 1rem;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 6rem 2rem;
  }
}

.mission-header {
  text-align: center;
  margin-bottom: 4rem;
  position: relative;
  z-index: 2;
}

.mission-title {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  position: relative;
}

.mission-icon-glow {
  animation: iconGlow 3s ease-in-out infinite;
}

@keyframes iconGlow {
  0%,
  100% {
    filter: drop-shadow(
      0 0 10px
        hsla(
          var(--color-accent-primary-h),
          var(--color-accent-primary-s),
          var(--color-accent-primary-l),
          0.5
        )
    );
  }
  50% {
    filter: drop-shadow(
      0 0 20px
        hsla(
          var(--color-accent-primary-h),
          var(--color-accent-primary-s),
          var(--color-accent-primary-l),
          0.8
        )
    );
  }
}

.mission-tagline {
  max-width: 800px;
  margin: 0 auto;
  font-size: 1.125rem;
  line-height: 1.7;
  color: hsla(
    var(--color-text-secondary-h),
    var(--color-text-secondary-s),
    var(--color-text-secondary-l),
    0.9
  );
  font-weight: 400;
}

.mission-grid-enhanced {
  display: grid;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 2;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 2.5rem;
  }
}

.mission-card-enhanced {
  position: relative;
  background: linear-gradient(
    135deg,
    hsla(
      var(--color-bg-secondary-h),
      var(--color-bg-secondary-s),
      var(--color-bg-secondary-l),
      0.6
    ),
    hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.3)
  );
  backdrop-filter: blur(20px);
  border-radius: 1.25rem;
  padding: 2rem;
  border: 1px solid hsla(var(--color-border-h), var(--color-border-s), var(--color-border-l), 0.3);
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: var(--stagger-delay);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--card-gradient);
    opacity: 0.3;
    transition: opacity 0.4s ease;
  }

  .cards-visible & {
    opacity: 1;
    transform: translateY(0);
  }

  &:hover {
    transform: translateY(-5px);
    border-color: var(--card-accent);

    &::before {
      opacity: 0.5;
    }

    .mission-icon-bg {
      transform: scale(1.1) rotate(10deg);
    }

    .mission-card-glow {
      opacity: 1;
    }
  }
}

.mission-card-header {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
  position: relative;
}

.mission-icon-container {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
}

.mission-icon-bg {
  position: absolute;
  inset: -8px;
  background: radial-gradient(circle, var(--card-accent), transparent 70%);
  opacity: 0.2;
  border-radius: 50%;
  filter: blur(8px);
  transition: transform 0.4s ease;
}

.mission-card-icon {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 12px;
  background: linear-gradient(
    135deg,
    hsla(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l), 0.8),
    hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.6)
  );
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--card-accent);
  border: 1px solid hsla(var(--color-border-h), var(--color-border-s), var(--color-border-l), 0.2);
}

.mission-card-titles {
  flex: 1;
  padding-top: 0.25rem;
}

.mission-card-title {
  font-size: 1.375rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  line-height: 1.3;
  background: linear-gradient(
    135deg,
    hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l)),
    var(--card-accent)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mission-card-subtitle {
  font-size: 0.875rem;
  color: var(--card-accent);
  font-weight: 500;
  opacity: 0.9;
}

.mission-card-description {
  margin-bottom: 1.75rem;
  line-height: 1.6;
  color: hsla(
    var(--color-text-secondary-h),
    var(--color-text-secondary-s),
    var(--color-text-secondary-l),
    0.95
  );
  font-size: 0.975rem;
  position: relative;
}

.mission-features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  position: relative;
}

.mission-feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: hsla(
    var(--color-text-secondary-h),
    var(--color-text-secondary-s),
    var(--color-text-secondary-l),
    0.85
  );
  transition: color 0.3s ease;

  &:hover {
    color: hsl(
      var(--color-text-primary-h),
      var(--color-text-primary-s),
      var(--color-text-primary-l)
    );

    .feature-check-icon {
      color: var(--card-accent);
      transform: scale(1.2);
    }
  }
}

.feature-check-icon {
  flex-shrink: 0;
  color: var(--card-accent);
  opacity: 0.8;
  transition: all 0.3s ease;
}

.mission-card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, var(--card-accent), transparent 40%);
  opacity: 0;
  filter: blur(40px);
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.mission-bg-decoration {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
}

.mission-bg-svg {
  width: 100%;
  height: 100%;
}

// Mobile optimizations
@media (max-width: 768px) {
  .mission-card-enhanced {
    padding: 1.5rem;
  }

  .mission-card-title {
    font-size: 1.125rem;
  }

  .mission-icon-container {
    width: 60px;
    height: 60px;
  }

  .mission-card-icon {
    padding: 10px;
  }
}

// Dark theme enhancements
@media (prefers-color-scheme: dark) {
  .mission-card-enhanced {
    background: linear-gradient(
      135deg,
      hsla(
        var(--color-bg-secondary-h),
        var(--color-bg-secondary-s),
        calc(var(--color-bg-secondary-l) + 5%),
        0.7
      ),
      hsla(
        var(--color-bg-secondary-h),
        var(--color-bg-secondary-s),
        var(--color-bg-secondary-l),
        0.4
      )
    );
  }
}
</style>
