/**
 * @file onboarding.store.ts
 * @description Tracks subscriber onboarding state (guided tour + tutorial panel visibility).
 */
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useStorage } from '@vueuse/core';

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | 'unknown';

export const useOnboardingStore = defineStore('onboarding', () => {
  const hasCompletedSubscriberTour = useStorage<boolean>('vca-subscriber-tour-complete', false);
  const tutorialPanelDismissed = useStorage<boolean>('vca-tutorial-panel-dismissed', false);
  const lastKnownSubscriptionStatus = useStorage<SubscriptionStatus>('vca-last-subscription-status', 'unknown');

  const shouldShowTutorialPanel = computed<boolean>(() => !tutorialPanelDismissed.value);
  const subscriberTourCompleted = computed<boolean>(() => hasCompletedSubscriberTour.value);

  const normalizeStatus = (status?: string | null): SubscriptionStatus => {
    if (!status) {
      return 'none';
    }
    const normalized = status.toLowerCase();
    if (normalized === 'active' || normalized === 'trialing' || normalized === 'past_due' || normalized === 'canceled') {
      return normalized as SubscriptionStatus;
    }
    return 'none';
  };

  function markSubscriberTourComplete(): void {
    hasCompletedSubscriberTour.value = true;
  }

  function resetSubscriberTour(): void {
    hasCompletedSubscriberTour.value = false;
  }

  function dismissTutorialPanel(): void {
    tutorialPanelDismissed.value = true;
  }

  function restoreTutorialPanel(): void {
    tutorialPanelDismissed.value = false;
  }

  /**
   * Records the latest subscription status and returns true if the guided tour
   * should be surfaced (e.g., user just became active or has never seen the tour).
   */
  function handleSubscriptionStatus(status?: string | null): boolean {
    const normalized = normalizeStatus(status);
    const previous = lastKnownSubscriptionStatus.value;
    lastKnownSubscriptionStatus.value = normalized;

    if (normalized === 'active' && !hasCompletedSubscriberTour.value) {
      if (previous !== 'active') {
        return true;
      }
      // Still active but previous unknown/none (e.g., first app load)
      if (previous === 'unknown' || previous === 'none') {
        return true;
      }
    }
    return false;
  }

  return {
    subscriberTourCompleted,
    shouldShowTutorialPanel,
    markSubscriberTourComplete,
    resetSubscriberTour,
    dismissTutorialPanel,
    restoreTutorialPanel,
    handleSubscriptionStatus,
  };
});
