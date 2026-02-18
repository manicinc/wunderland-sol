import { defineStore } from 'pinia';

interface AccountPayload {
  email: string;
  password: string;
  acceptTerms: boolean;
}

interface PlanPayload {
  planId: string;
}

interface CheckoutDraftPayload {
  planId: string;
  checkoutId?: string;
  checkoutUrl?: string;
}

type CheckoutStatus = 'idle' | 'created' | 'pending' | 'paid' | 'complete' | 'failed' | 'expired';

interface RegistrationState {
  account: {
    email: string;
    password: string;
    acceptTerms: boolean;
  };
  plan: {
    planId: string | null;
  };
  authToken: string | null;
  checkout: {
    checkoutId: string | null;
    status: CheckoutStatus;
    url: string | null;
  };
}

function loadPersistedState(): RegistrationState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('vca-registration');
    return raw ? (JSON.parse(raw) as RegistrationState) : null;
  } catch {
    return null;
  }
}

function persistState(state: RegistrationState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('vca-registration', JSON.stringify(state));
  } catch (error) {
    console.warn('[registration.store] failed to persist state', error);
  }
}

const cloneState = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const initialState: RegistrationState = {
  account: {
    email: '',
    password: '',
    acceptTerms: false,
  },
  plan: {
    planId: null,
  },
  authToken: null,
  checkout: {
    checkoutId: null,
    status: 'idle',
    url: null,
  },
};

/**
 * Pinia store that persists the multi-step registration flow.
 * Values are serialised into sessionStorage so a refresh during checkout
 * does not force the visitor to restart the process.
 */
export const useRegistrationStore = defineStore('registration', {
  state: (): RegistrationState => loadPersistedState() ?? cloneState(initialState),

  getters: {
    isAccountComplete: (state) => Boolean(state.account.email && state.account.password),
    hasPlan: (state) => Boolean(state.plan.planId),
  },

  actions: {
    async setAccount(payload: AccountPayload) {
      this.account = {
        email: payload.email,
        password: payload.password,
        acceptTerms: payload.acceptTerms,
      };
      persistState(this.$state);
    },

    async setAuthToken(token: string | null) {
      this.authToken = token;
      persistState(this.$state);
    },

    async setPlan(payload: PlanPayload) {
      this.plan = { planId: payload.planId };
      this.checkout = { checkoutId: null, status: 'idle', url: null };
      persistState(this.$state);
    },

    /**
     * Cache the server-issued checkout id/url so we can resume polling after a reload.
     */
    async setCheckoutDraft(payload: CheckoutDraftPayload) {
      this.checkout.checkoutId = payload.checkoutId ?? null;
      this.checkout.status = 'pending';
      this.checkout.url = payload.checkoutUrl ?? null;
      persistState(this.$state);
    },

    /**
     * Update the locally cached checkout status (e.g. pending -> paid -> complete).
     */
    async updateCheckoutStatus(status: CheckoutStatus) {
      this.checkout.status = status;
      persistState(this.$state);
    },

    async markCheckoutComplete(checkoutId: string) {
      this.checkout = { checkoutId, status: 'complete', url: this.checkout.url };
      persistState(this.$state);
    },

    reset() {
      this.$state = cloneState(initialState);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('vca-registration');
      }
    },
  },
});
