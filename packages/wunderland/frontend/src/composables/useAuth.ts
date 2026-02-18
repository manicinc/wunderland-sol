// File: frontend/src/composables/useAuth.ts
/**
 * @file useAuth.ts
 * @version 1.3.0
 * @description Auth composable supporting global passphrase JWTs, Supabase sessions, and demo usage tracking.
 */
import { ref, onMounted, readonly, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { AUTH_TOKEN_KEY } from '@/router';
import { api, authAPI, rateLimitAPI } from '@/utils/api';
import { useStorage } from '@vueuse/core';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

import { useChatStore } from '@/store/chat.store';
import { useCostStore } from '@/store/cost.store';
import { useAgentStore } from '@/store/agent.store';
import { useUiStore } from '@/store/ui.store';

type Provider = 'google' | 'github' | 'apple' | string;

const SESSION_USER_ID_KEY = 'vcaSessionUserId';
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabaseClient: SupabaseClient | null = supabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const isAuthenticatedGlobal = ref(false);
const authTokenGlobal = ref<string | null>(null);
const userGlobal = ref<any | null>(null);
const supabaseSessionGlobal = ref<Session | null>(null);
const demoUsage = ref<{ tier: string; used: number; remaining: number; limit: number; resetAt: string | Date | null } | null>(null);

const localToken = useStorage<string | null>(AUTH_TOKEN_KEY, null, localStorage);
const sessionToken = useStorage<string | null>(AUTH_TOKEN_KEY, null, sessionStorage);
const sessionUserIdGlobal = ref<string | null>(null);
const storedSessionUserId = useStorage<string | null>(SESSION_USER_ID_KEY, null, sessionStorage);

const setAuthHeader = (token: string | null): void => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

const setUser = (user: any | null): void => {
  userGlobal.value = user ? { ...user } : null;
};

const checkAuthStatus = (): boolean => {
  let token: string | null = null;
  const supabaseToken = supabaseSessionGlobal.value?.access_token ?? null;
  if (supabaseToken) {
    token = supabaseToken;
  } else if (typeof window !== 'undefined') {
    const tokenFromLocal = localStorage.getItem(AUTH_TOKEN_KEY);
    const tokenFromSession = sessionStorage.getItem(AUTH_TOKEN_KEY);
    token = tokenFromLocal || tokenFromSession;
  }

  setAuthHeader(token);
  authTokenGlobal.value = token;
  isAuthenticatedGlobal.value = Boolean(token);
  if (!token) {
    setUser(null);
  }
  return isAuthenticatedGlobal.value;
};

function generateSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  // Minimal fallback UUID (not RFC-perfect but stable enough for session ids)
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

const getOrGenerateSessionUserId = (): string => {
  if (storedSessionUserId.value) {
    sessionUserIdGlobal.value = storedSessionUserId.value;
    return storedSessionUserId.value;
  }
  const newId = generateSessionId();
  storedSessionUserId.value = newId;
  sessionUserIdGlobal.value = newId;
  console.log('[Auth/Session] Generated new session User ID:', newId);
  return newId;
};

const refreshUser = async (): Promise<any | null> => {
  try {
    const { data } = await authAPI.checkStatus();
    if (data?.user) {
      setUser({ ...data.user, authenticated: true });
      return userGlobal.value;
    }
    setUser(null);
    return null;
  } catch (error: any) {
    if (error?.response?.status === 401) {
      setUser(null);
    }
    return null;
  }
};

const refreshDemoUsage = async (): Promise<void> => {
  if (isAuthenticatedGlobal.value) {
    demoUsage.value = null;
    return;
  }
  try {
    const { data } = await rateLimitAPI.getStatus();
    demoUsage.value = data;
  } catch (error) {
    demoUsage.value = null;
  }
};

let supabaseListenerRegistered = false;

const applySupabaseSession = (session: Session | null): void => {
  supabaseSessionGlobal.value = session;

  if (session?.access_token) {
    const token = session.access_token;
    sessionToken.value = token;
    authTokenGlobal.value = token;
    isAuthenticatedGlobal.value = true;
    setAuthHeader(token);
    demoUsage.value = null;
  } else {
    sessionToken.value = null;
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    if (!localToken.value) {
      authTokenGlobal.value = null;
      isAuthenticatedGlobal.value = false;
      setAuthHeader(null);
      void refreshDemoUsage();
    } else {
      const fallbackToken = localToken.value;
      if (fallbackToken) {
        authTokenGlobal.value = fallbackToken;
        isAuthenticatedGlobal.value = true;
        setAuthHeader(fallbackToken);
      }
    }
  }
};

const registerSupabaseListener = (): void => {
  if (!supabaseClient || supabaseListenerRegistered || typeof window === 'undefined') {
    return;
  }

  supabaseListenerRegistered = true;

  supabaseClient.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) {
        console.error('[useAuth] Failed to load Supabase session:', error);
        return;
      }
      applySupabaseSession(data.session);
      if (data.session?.access_token) {
        void refreshUser();
      }
    })
    .catch((err) => {
      console.error('[useAuth] Unexpected Supabase session error:', err);
    });

  const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
    applySupabaseSession(session);
    if (session?.access_token) {
      void refreshUser();
    } else {
      setUser(null);
    }
  });

  // Ensure we clean up if the page is reloaded to avoid duplicate listeners.
  if (data?.subscription) {
    window.addEventListener(
      'beforeunload',
      () => {
        data.subscription.unsubscribe();
        supabaseListenerRegistered = false;
      },
      { once: true }
    );
  }
};

export function useAuth() {
  const router = useRouter();
  const route = useRoute();

  if (typeof window !== 'undefined') {
    if (!isAuthenticatedGlobal.value && !authTokenGlobal.value) {
      checkAuthStatus();
    }
    if (!sessionUserIdGlobal.value) {
      sessionUserIdGlobal.value = getOrGenerateSessionUserId();
    }
  }

  if (supabaseEnabled) {
    registerSupabaseListener();
  }

  const login = (token: string, rememberMe: boolean, userOrOptions?: any): void => {
    const options: { user?: any; tokenProvider?: string } =
      userOrOptions && typeof userOrOptions === 'object' && !Array.isArray(userOrOptions) && ('user' in userOrOptions || 'tokenProvider' in userOrOptions)
        ? userOrOptions
        : { user: userOrOptions };

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(AUTH_TOKEN_KEY, token);
    if (rememberMe) {
      localToken.value = token;
      sessionToken.value = null;
    } else {
      sessionToken.value = token;
      localToken.value = null;
    }
    checkAuthStatus();
    getOrGenerateSessionUserId();
    if (options.user) {
      const derivedProvider = options.tokenProvider ?? options.user.tokenProvider ?? 'global';
      setUser({ ...options.user, authenticated: true, tokenProvider: derivedProvider });
    }
  };

  const loginWithOAuth = async (provider: Provider, redirectTo?: string): Promise<void> => {
    if (!supabaseClient) {
      throw new Error('Supabase authentication is not configured.');
    }
    await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || window.location.href,
      },
    });
  };

  const loginWithSupabasePassword = async (email: string, password: string): Promise<void> => {
    if (!supabaseClient) {
      throw new Error('Supabase authentication is not configured.');
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    if (data?.session) {
      applySupabaseSession(data.session);
      await refreshUser();
    }
  };

  const logout = async (redirectTo: string = '/login', forceReloadPage: boolean = true): Promise<void> => {
    const chatStoreInstance = useChatStore();
    const costStoreInstance = useCostStore();
    const agentStoreInstance = useAgentStore();
    const uiStoreInstance = useUiStore();

    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('[useAuth] Backend logout call failed, proceeding with frontend logout:', error);
    }

    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (error) {
        console.warn('[useAuth] Supabase signOut failed:', error);
      }
    }

    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localToken.value = null;
    sessionToken.value = null;
    authTokenGlobal.value = null;
    isAuthenticatedGlobal.value = false;
    supabaseSessionGlobal.value = null;
    setAuthHeader(null);

    sessionStorage.removeItem(SESSION_USER_ID_KEY);
    storedSessionUserId.value = null;
    sessionUserIdGlobal.value = null;
    setUser(null);

    try {
      chatStoreInstance.$reset();
      costStoreInstance.$reset();
      agentStoreInstance.$reset();
      uiStoreInstance.$reset();
    } catch (storeResetError) {
      console.error('[useAuth] Error resetting stores during logout:', storeResetError);
    }

    if (redirectTo) {
      const currentPath = window.location.pathname;
      if (currentPath === redirectTo && forceReloadPage) {
        window.location.assign(redirectTo);
      } else {
        router.push(redirectTo).then(() => {
          if (window.location.pathname === redirectTo && forceReloadPage) {
            window.location.reload();
          }
        }).catch(err => {
          console.error(`[useAuth] Router push to ${redirectTo} failed after logout. Forcing navigation. Error:`, err);
          window.location.href = redirectTo;
        });
      }
    } else if (forceReloadPage) {
      window.location.reload();
    }
    demoUsage.value = null;
    if (!isAuthenticatedGlobal.value) {
      await refreshDemoUsage();
    }
  };

  watch([localToken, sessionToken], () => {
    const authed = checkAuthStatus();
    if (authed) {
      void refreshUser();
    } else {
      void refreshDemoUsage();
    }
  }, { deep: true });

  watch(isAuthenticatedGlobal, (authed) => {
    if (!authed) {
      void refreshDemoUsage();
    } else {
      demoUsage.value = null;
    }
  });

  watch(storedSessionUserId, (newVal) => {
    if (newVal) {
      sessionUserIdGlobal.value = newVal;
    } else {
      sessionUserIdGlobal.value = getOrGenerateSessionUserId();
    }
  });

  onMounted(() => {
    const authed = checkAuthStatus();
    sessionUserIdGlobal.value = getOrGenerateSessionUserId();
    if (authed) {
      void refreshUser();
    } else {
      void refreshDemoUsage();
    }
  });

  const currentSessionUserId = computed(() => {
    if (!sessionUserIdGlobal.value) {
      return getOrGenerateSessionUserId();
    }
    return sessionUserIdGlobal.value;
  });

  return {
    isAuthenticated: readonly(isAuthenticatedGlobal),
    currentToken: readonly(authTokenGlobal),
    user: readonly(userGlobal),
    sessionUserId: currentSessionUserId,
    demoUsage: readonly(demoUsage),
    supabaseEnabled,
    supabaseClient,
    login,
    loginWithOAuth,
    loginWithSupabasePassword,
    logout,
    checkAuthStatus,
    refreshUser,
    refreshDemoUsage,
    getOrGenerateSessionUserId,
  };
}

