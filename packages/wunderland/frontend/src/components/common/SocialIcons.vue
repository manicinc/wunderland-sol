<script setup lang="ts">
import { computed } from 'vue';
import { socialLinks, type SocialLink } from '@/utils/socialLinks';

interface Props {
  size?: number;
  variant?: 'default' | 'footer' | 'hero';
  showLabels?: boolean;
  links?: SocialLink[];
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  variant: 'default',
  showLabels: false,
  links: () => socialLinks
});

const iconSize = computed(() => `${props.size}px`);

const containerClass = computed(() => {
  return [
    'social-icons',
    `social-icons--${props.variant}`,
    {
      'social-icons--with-labels': props.showLabels
    }
  ];
});
</script>

<template>
  <div :class="containerClass">
    <a
      v-for="link in props.links"
      :key="link.name"
      :href="link.url"
      :aria-label="link.ariaLabel"
      class="social-icon-link"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="social-icon-wrapper">
        <!-- GitHub -->
        <svg
          v-if="link.icon === 'github'"
          :width="iconSize"
          :height="iconSize"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="social-icon"
        >
          <path
            d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
            fill="currentColor"
          />
        </svg>

        <!-- Twitter/X -->
        <svg
          v-else-if="link.icon === 'twitter'"
          :width="iconSize"
          :height="iconSize"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="social-icon"
        >
          <path
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            fill="currentColor"
          />
        </svg>

        <!-- LinkedIn -->
        <svg
          v-else-if="link.icon === 'linkedin'"
          :width="iconSize"
          :height="iconSize"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="social-icon"
        >
          <path
            d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
            fill="currentColor"
          />
        </svg>

        <!-- Discord -->
        <svg
          v-else-if="link.icon === 'discord'"
          :width="iconSize"
          :height="iconSize"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="social-icon"
        >
          <path
            d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
            fill="currentColor"
          />
        </svg>

        <!-- Email -->
        <svg
          v-else-if="link.icon === 'email'"
          :width="iconSize"
          :height="iconSize"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="social-icon"
        >
          <path
            d="M3 4a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2H3zm0 2h18l-9 6-9-6zm0 2.236l8.293 5.528a2 2 0 002.414 0L21 8.236V18H3V8.236z"
            fill="currentColor"
            stroke="currentColor"
            stroke-width="0.5"
            stroke-linejoin="round"
          />
        </svg>

        <!-- Default icon fallback -->
        <svg
          v-else
          :width="iconSize"
          :height="iconSize"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="social-icon"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </span>
      <span v-if="props.showLabels" class="social-icon-label">{{ link.name }}</span>
    </a>
  </div>
</template>

<style scoped lang="scss">
.social-icons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;

  &--footer {
    gap: 1rem;
  }

  &--hero {
    gap: 1.25rem;
    justify-content: center;
    margin-top: 1.5rem;
  }

  &--with-labels {
    .social-icon-link {
      gap: 0.5rem;
    }
  }
}

.social-icon-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: hsla(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l), 0.7);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
    transform: translateY(-2px);

    .social-icon-wrapper {
      &::after {
        opacity: 1;
        transform: scale(1.2);
      }
    }

    .social-icon {
      filter: drop-shadow(0 4px 12px hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.3));
    }
  }

  &:focus-visible {
    outline: 2px solid hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
    outline-offset: 2px;
    border-radius: 0.25rem;
  }
}

.social-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;

  &::after {
    content: '';
    position: absolute;
    inset: -4px;
    background: radial-gradient(
      circle,
      hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.15),
      transparent 70%
    );
    border-radius: 50%;
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
  }
}

.social-icon {
  transition: all 0.3s ease;
  will-change: transform, filter;
}

.social-icon-label {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0.9;
  transition: opacity 0.3s ease;

  .social-icon-link:hover & {
    opacity: 1;
  }
}

// Variant-specific styles
.social-icons--footer {
  .social-icon-wrapper {
    width: 2rem;
    height: 2rem;
  }

  .social-icon-link {
    opacity: 0.8;

    &:hover {
      opacity: 1;
    }
  }
}

.social-icons--hero {
  .social-icon-wrapper {
    width: 3rem;
    height: 3rem;
  }

  .social-icon-link {
    padding: 0.5rem;
    background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.3);
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
    border: 1px solid hsla(var(--color-border-h), var(--color-border-s), var(--color-border-l), 0.2);

    &:hover {
      background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.5);
      border-color: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.3);
    }
  }
}

// Animation for entrance
@keyframes socialIconEntrance {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.social-icons--hero .social-icon-link {
  animation: socialIconEntrance 0.6s ease backwards;

  @for $i from 1 through 5 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.1}s;
    }
  }
}

// Dark theme adjustments
@media (prefers-color-scheme: dark) {
  .social-icon-link {
    color: hsla(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l), 0.8);
  }
}
</style>