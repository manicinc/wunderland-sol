<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AnimatedGlyph from '@/components/about/AnimatedGlyph.vue';
import SocialIcons from '@/components/common/SocialIcons.vue';
import { getPrimarySocialLinks } from '@/utils/socialLinks';

const props = defineProps<{
  logoSrc: string;
  showGuestBadge?: boolean;
}>();

const route = useRoute();
const { t } = useI18n();
const localeSegment = computed(() => (route.params.locale as string) || 'en');
const primaryLinks = getPrimarySocialLinks();

const sectionRef = ref<HTMLElement | null>(null);
const isInView = ref(false);

let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (typeof window === 'undefined' || !sectionRef.value) {
    isInView.value = true;
    return;
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          isInView.value = true;
          observer?.disconnect();
          observer = null;
        }
      },
      {
        threshold: 0.35,
      }
    );

    observer.observe(sectionRef.value);
  } else {
    isInView.value = true;
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <section
    ref="sectionRef"
    class="hero-section-about card-glass-interactive card-glass-interactive--hero"
    :class="{ 'hero-in-view': isInView }"
  >
    <div v-if="props.showGuestBadge" class="guest-pill-ephemeral hero-guest-pill hero-animated" style="--stagger: 0ms">
      <AnimatedGlyph name="spark" class="guest-pill-icon" :size="18" aria-hidden="true" />
      <span class="guest-pill-text">{{ t('common.guestDemoMode') }}</span>
    </div>

    <div class="hero-logo-wrapper hero-animated" style="--stagger: 100ms">
      <img :src="props.logoSrc" alt="AgentOS Logo" class="hero-logo-main spinning-glow-logo" />
    </div>

    <h2 class="hero-main-title hero-animated" style="--stagger: 220ms">
      The future is a <span class="future-emphasis">conversation.</span>
    </h2>

    <p class="hero-sub-title hero-animated" style="--stagger: 320ms">
      <strong>
        Harmonise speech, context, and memory across every session.
      </strong>
    </p>
    <p class="hero-sub-title hero-animated" style="--stagger: 420ms">
      Voice Chat Assistant, built on the open-source
      <strong class="highlight-text">
        <a href="https://github.com/wearetheframers/agentos" target="_blank" rel="noopener noreferrer">AgentOS</a>
      </strong>
      platform, delivers an adaptive companion that listens, reasons, and evolves alongside your workflow.
      <br />
      <strong class="highlight-text">
        Questions? Reach us at
        <a href="mailto:team@vca.chat" class="footer-link">team@vca.chat</a>.
      </strong>
    </p>

    <RouterLink
      :to="{ name: 'RegisterAccount', params: { locale: localeSegment } }"
      class="btn btn-primary-ephemeral btn-lg hero-cta-button hover:text-white hero-animated"
      style="--stagger: 520ms"
    >
      {{ t('register.actions.continue') }}
    </RouterLink>

    <div class="hero-social-section hero-animated" style="--stagger: 620ms">
      <SocialIcons :links="primaryLinks" variant="hero" />
    </div>
  </section>
</template>

<style scoped>
.hero-section-about {
  position: relative;
  overflow: hidden;
}

.hero-animated {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s ease, transform 0.7s ease;
  transition-delay: var(--stagger, 0ms);
  will-change: opacity, transform;
}

.hero-in-view .hero-animated {
  opacity: 1;
  transform: translateY(0);
}

.hero-logo-wrapper::after {
  content: '';
  position: absolute;
  inset: -20%;
  background: radial-gradient(ellipse at center, rgba(255, 94, 247, 0.18), transparent 55%);
  animation: heroGlow 8s ease-in-out infinite alternate;
  pointer-events: none;
}

.hero-main-title {
  position: relative;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  line-height: 1.1;
  text-align: center;
  margin-bottom: 0.75rem;
}

.future-emphasis {
  position: relative;
  display: inline-block;
  padding-inline: 0.1em;
  color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), calc(var(--color-accent-primary-l) + 6%));
  text-shadow: 0 0.08em 0.45em rgba(255, 94, 247, 0.25);
  border-bottom: 0.18em solid hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.35);
  border-radius: 0;
  background-image: linear-gradient(to top, hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.12), transparent 55%);
}

.hero-sub-title {
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.hero-cta-button {
  margin-top: 1.25rem;
  padding-inline: 1.75rem;
  letter-spacing: 0.01em;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hero-cta-button::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.18), transparent);
  transform: translateX(-120%);
  transition: transform 0.5s ease;
}

.hero-cta-button:hover::after {
  transform: translateX(0);
}

.hero-cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(255, 94, 247, 0.25);
}

@keyframes heroGlow {
  from {
    transform: scale(0.95);
    opacity: 0.65;
  }
  to {
    transform: scale(1.12) rotate(2deg);
    opacity: 1;
  }
}

@keyframes shimmer {
  from {
    transform: translateX(-10%);
  }
  to {
    transform: translateX(10%);
  }
}
</style>
