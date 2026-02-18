/**
 * @file MobileNavPanel.vue
 * @version 3.1.0
 *
 * @description
 *  Super-clean mobile drawer with futuristic animations: **only** links you requested
 *   – Explore Assistants, App Settings, About VCA, Login/Logout –  
 *
 * @props
 *  @prop {boolean}  isOpen
 *  @prop {boolean}  isUserListening
 *  @prop {boolean}  isAiStateActive
 *  @prop {boolean}  isAuthenticated
 *
 * @emits
 *  close-panel, open-agent-hub, logout
 */

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useUiStore } from '@/store/ui.store';
import { themeManager } from '@/theme/ThemeManager';
import AnimatedLogo from '@/components/ui/AnimatedLogo.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

/* ─ Icons ─ */
import {
  XMarkIcon, Squares2X2Icon, Cog8ToothIcon, InformationCircleIcon,
  ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon,
} from '@heroicons/vue/24/outline';

/* ─ Props / emits ─ */
const props = defineProps({
  isOpen             : { type: Boolean, required: true },
  isUserListening    : { type: Boolean, default: false },
  isAiStateActive    : { type: Boolean, default: false },
  isAuthenticated    : { type: Boolean, required: true },
});
const emit = defineEmits<{
  (e:'close-panel'): void;
  (e:'open-agent-hub'): void;
  (e:'logout'): void;
}>();

/* ─ store & theme selection ─ */
const uiStore = useUiStore();
const { t } = useI18n();
const route = useRoute();
const selectedThemeId = ref(uiStore.currentThemeId);
const onThemeChange = () => uiStore.setTheme(selectedThemeId.value);

/* helper */
const closeAndNavigate = () => emit('close-panel');
</script>

<template>
  <Transition name="mobile-nav-futuristic">
    <nav v-if="isOpen" class="mobile-nav-panel-ephemeral" role="dialog" aria-modal="true">
      <!-- ▸ HEADER -->
      <div class="mobile-nav-header-ephemeral">
        <RouterLink to="/" class="animated-logo-link" @click="closeAndNavigate">
          <AnimatedLogo
            app-name-main="VCA" app-name-subtitle="Assistant" :is-mobile-context="true"
            :is-user-listening="isUserListening"
            :is-ai-speaking-or-processing="isAiStateActive"
          />
        </RouterLink>
        <button class="mobile-nav-close-button btn btn-ghost-ephemeral btn-icon-ephemeral"
                aria-label="Close menu" @click="emit('close-panel')">
          <XMarkIcon class="icon-base"/>
        </button>
      </div>

      <!-- ▸ CONTENT -->
      <div class="mobile-nav-content-ephemeral custom-scrollbar-thin-ephemeral">
        <!-- LINKS -->
        <button class="mobile-nav-item-ephemeral group prominent-action"
                @click="emit('open-agent-hub'); closeAndNavigate();">
          <Squares2X2Icon class="nav-item-icon"/>
          <span class="nav-item-text">{{ t('navigation.exploreAssistants') }}</span>
        </button>

        <RouterLink :to="`/${$route.params.locale || 'en-US'}/settings`" class="mobile-nav-item-ephemeral group" @click="closeAndNavigate">
          <Cog8ToothIcon class="nav-item-icon"/>
          <span class="nav-item-text">{{ t('common.settings') }}</span>
        </RouterLink>

        <RouterLink :to="`/${$route.params.locale || 'en-US'}/about`" class="mobile-nav-item-ephemeral group" @click="closeAndNavigate">
          <InformationCircleIcon class="nav-item-icon"/>
          <span class="nav-item-text">{{ t('common.about') }}</span>
        </RouterLink>

        <!-- LANGUAGE SWITCHER -->
        <div class="language-section">
          <label class="section-label">{{ t('common.language') }}:</label>
          <LanguageSwitcher class="mobile-lang-switcher" />
        </div>

        <!-- THEME DROPDOWN -->
        <label class="theme-dropdown-label">{{ t('common.theme') }}:
          <select class="theme-dropdown-select" v-model="selectedThemeId" @change="onThemeChange">
            <option v-for="t in themeManager.getAvailableThemes()" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </label>

        <!-- AUTH-AWARE LOGIN / LOGOUT -->
        <template v-if="isAuthenticated">
          <button class="mobile-nav-item-ephemeral group logout-item"
                  @click="emit('logout'); closeAndNavigate();">
            <ArrowRightOnRectangleIcon class="nav-item-icon"/>
            <span class="nav-item-text">{{ t('common.logout') }}</span>
          </button>
        </template>
        <template v-else>
          <RouterLink :to="`/${$route.params.locale || 'en-US'}/login`" class="mobile-nav-item-ephemeral group prominent-action"
                      @click="closeAndNavigate">
            <ArrowLeftOnRectangleIcon class="nav-item-icon"/>
            <span class="nav-item-text">{{ t('common.login') }} / {{ t('common.register') }}</span>
          </RouterLink>
        </template>
      </div>
    </nav>
  </Transition>
</template>

<style lang="scss" scoped>
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   FUTURISTIC ENTRANCE ANIMATION
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */

@keyframes holographicMaterialize {
  0% {
    transform: scale(0.7) rotateY(30deg);
    opacity: 0;
    filter: blur(8px) hue-rotate(180deg);
  }
  50% {
    transform: scale(1.02) rotateY(-5deg);
    opacity: 0.8;
    filter: blur(2px) hue-rotate(90deg);
  }
  100% {
    transform: scale(1) rotateY(0deg);
    opacity: 1;
    filter: blur(0px) hue-rotate(0deg);
  }
}

@keyframes digitalGridScan {
  0% {
    background-position: -100% 0;
    opacity: 0;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    background-position: 100% 0;
    opacity: 0;
  }
}

@keyframes glitchFlicker {
  0%, 90%, 100% { opacity: 1; }
  5% { opacity: 0.8; transform: translateX(1px); }
  10% { opacity: 1; transform: translateX(-1px); }
  15% { opacity: 0.9; transform: translateX(0); }
}

.mobile-nav-futuristic-enter-active {
  animation: holographicMaterialize 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.1) 25%,
      hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.2) 50%,
      hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.1) 75%,
      transparent 100%
    );
    animation: digitalGridScan 0.8s ease-out;
    pointer-events: none;
    z-index: -1;
  }
  
  .mobile-nav-item-ephemeral {
    animation: glitchFlicker 0.8s ease-out;
    animation-delay: calc(var(--item-index, 0) * 0.1s);
  }
}

.mobile-nav-futuristic-leave-active {
  transition: all 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19);
}

.mobile-nav-futuristic-enter-from {
  transform: scale(0.7) rotateY(30deg);
  opacity: 0;
  filter: blur(8px);
}

.mobile-nav-futuristic-leave-to {
  transform: scale(0.95) rotateY(-10deg);
  opacity: 0;
  filter: blur(4px);
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   LAYOUT FIXES FOR ICONS AND TEXT ON SAME LINE
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */

.mobile-nav-item-ephemeral {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  width: 100% !important;
  padding: 0.875rem 1rem !important;
  text-align: left !important;
  text-decoration: none !important;
  border-radius: 0.5rem !important;
  transition: all 0.2s ease-in-out !important;
  white-space: nowrap !important;
  flex-wrap: nowrap !important;
  
  /* Ensure proper baseline alignment */
  justify-content: flex-start !important;
  
  /* Style index for staggered animation */
  &:nth-child(1) { --item-index: 1; }
  &:nth-child(2) { --item-index: 2; }
  &:nth-child(3) { --item-index: 3; }
  &:nth-child(4) { --item-index: 4; }
  &:nth-child(5) { --item-index: 5; }
  &:nth-child(6) { --item-index: 6; }
  
  &:hover, &:focus {
    background-color: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.1) !important;
    transform: translateX(4px) !important;
    box-shadow: 0 4px 12px hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.2) !important;
  }
}

.nav-item-icon {
  width: 1.25rem !important;
  height: 1.25rem !important;
  flex-shrink: 0 !important;
  color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l)) !important;
  transition: all 0.2s ease-in-out !important;
}

.nav-item-text {
  flex: 1 !important;
  font-size: 0.95rem !important;
  font-weight: 500 !important;
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l)) !important;
  line-height: 1.2 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* Enhanced hover effects */
.mobile-nav-item-ephemeral:hover .nav-item-icon,
.mobile-nav-item-ephemeral:focus .nav-item-icon {
  transform: scale(1.1) !important;
  filter: drop-shadow(0 0 4px hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.6)) !important;
}

.mobile-nav-item-ephemeral:hover .nav-item-text,
.mobile-nav-item-ephemeral:focus .nav-item-text {
  color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l)) !important;
}

/* Special styling for prominent actions */
.prominent-action {
  background-color: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.08) !important;
  border: 1px solid hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.2) !important;
}

.logout-item:hover,
.logout-item:focus {
  background-color: hsla(var(--color-error-h), var(--color-error-s), var(--color-error-l), 0.1) !important;
  
  .nav-item-icon {
    color: hsl(var(--color-error-h), var(--color-error-s), var(--color-error-l)) !important;
  }
  
  .nav-item-text {
    color: hsl(var(--color-error-h), var(--color-error-s), var(--color-error-l)) !important;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   THEME DROPDOWN STYLING (ENHANCED)
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */

.language-section {
  margin: 1.5rem 0 0.75rem !important;
}

.section-label,
.theme-dropdown-label {
  display: block !important;
  margin: 1.5rem 0 0.75rem !important;
  font-weight: 600 !important;
  font-size: 0.9rem !important;
  color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l)) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
}

.mobile-lang-switcher {
  width: 100% !important;
  padding: 0.75rem 1rem !important;
  border-radius: 0.5rem !important;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.9) !important;
  border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.3) !important;
  transition: all 0.2s ease-in-out !important;

  &:focus-within {
    border-color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l)) !important;
    box-shadow: 0 0 0 3px hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.2) !important;
  }
}

.theme-dropdown-select {
  width: 100% !important;
  padding: 0.75rem 1rem !important;
  border-radius: 0.5rem !important;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.9) !important;
  border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.3) !important;
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l)) !important;
  font-size: 0.9rem !important;
  font-weight: 500 !important;
  transition: all 0.2s ease-in-out !important;
  
  &:focus {
    outline: none !important;
    border-color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l)) !important;
    box-shadow: 0 0 0 3px hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.2) !important;
    background: hsla(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l), 0.95) !important;
  }
}
</style>