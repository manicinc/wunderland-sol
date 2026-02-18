// File: frontend/src/store/ui.store.ts
/**
 * @file ui.store.ts
 * @description Enhanced UI store with reactive state integration
 * Manages theme, preferences, and UI state in coordination with reactive store
 * @version 2.2.0
 */

import { defineStore } from 'pinia';
import { ref, computed, watch, readonly } from 'vue';
import { themeManager } from '@/theme/ThemeManager';
import { ThemeDefinition } from '@/theme/themes.config';
import { useReactiveStore } from './reactive.store';
import type { AppState, MoodState } from './reactive.store';

export interface UIPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  soundEnabled: boolean;
  autoTheme: boolean;
  compactMode: boolean;
  showTranscriptions: boolean;
  enableParticles: boolean;
  enableNeuralEffects: boolean;
}

export interface UINotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface UIModal {
  id: string;
  component: string;
  props?: Record<string, any>;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closable?: boolean;
  onClose?: () => void;
}

export type ScreenSize = 'small' | 'medium' | 'large' | 'xlarge';

// Theme-specific reactive state configurations
const THEME_REACTIVE_CONFIGS: Record<string, Partial<{
  preferredStates: AppState[];
  moodModifiers: Partial<Record<MoodState, number>>;
  effectIntensity: number;
  particleMultiplier: number;
}>> = {
  'sakura-sunset': {
    preferredStates: ['idle', 'listening', 'responding'],
    moodModifiers: { warm: 1.2, calm: 1.1 },
    effectIntensity: 0.8,
    particleMultiplier: 1.2,
  },
  'twilight-neo': {
    preferredStates: ['thinking', 'processing', 'responding'],
    moodModifiers: { excited: 1.3, curious: 1.2 },
    effectIntensity: 1.0,
    particleMultiplier: 1.5,
  },
  'aurora-daybreak': {
    preferredStates: ['listening', 'speaking'],
    moodModifiers: { engaged: 1.2, warm: 1.1 },
    effectIntensity: 0.7,
    particleMultiplier: 1.0,
  },
  'warm-embrace': {
    preferredStates: ['idle', 'speaking'],
    moodModifiers: { warm: 1.5, calm: 1.3 },
    effectIntensity: 0.6,
    particleMultiplier: 0.8,
  },
  'terminus-dark': {
    preferredStates: ['thinking', 'transcribing'],
    moodModifiers: { focused: 1.3, contemplative: 1.2 },
    effectIntensity: 0.9,
    particleMultiplier: 0.6,
  },
  'terminus-light': {
    preferredStates: ['thinking', 'transcribing'],
    moodModifiers: { focused: 1.2, attentive: 1.1 },
    effectIntensity: 0.7,
    particleMultiplier: 0.5,
  },
};

export const useUiStore = defineStore('ui', () => {
  // Get reactive store instance
  const reactiveStore = useReactiveStore();
  
  // Theme state
  const _currentThemeId = ref<string>('sakura-sunset');
  const _currentTheme = ref<ThemeDefinition | null>(null);
  const _isThemeTransitioning = ref(false);
  
  // Screen size
  const _screenSize = ref<ScreenSize>('medium');
  const _screenWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const _screenHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 768);
  
  // Browser fullscreen state
  const _isBrowserFullscreenActive = ref(false);
  
  // UI preferences
  const _preferences = ref<UIPreferences>({
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    soundEnabled: true,
    autoTheme: true,
    compactMode: false,
    showTranscriptions: true,
    enableParticles: true,
    enableNeuralEffects: true,
  });
  
  // UI state
  const _notifications = ref<UINotification[]>([]);
  const _modals = ref<UIModal[]>([]);
  const _globalLoading = ref(false);
  const _sidebarCollapsed = ref(false);
  const _mobileMenuOpen = ref(false);
  const _commandPaletteOpen = ref(false);
  
  // Computed properties
  const currentThemeId = computed(() => _currentThemeId.value);
  const currentTheme = computed(() => _currentTheme.value);
  const isCurrentThemeDark = computed(() => _currentTheme.value?.isDark ?? true);
  const size = computed(() => _screenSize.value);
  const screenWidth = computed(() => _screenWidth.value);
  const screenHeight = computed(() => _screenHeight.value);
  const isBrowserFullscreenActive = computed(() => _isBrowserFullscreenActive.value);
  
  const isReducedMotionPreferred = computed(() => 
    _preferences.value.reducedMotion || 
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
  
  const effectiveParticleActivity = computed(() => 
    _preferences.value.enableParticles ? reactiveStore.particleActivity : 0
  );
  
  const effectiveNeuralActivity = computed(() => 
    _preferences.value.enableNeuralEffects ? reactiveStore.neuralActivity : 0
  );
  
  const fontSizeClass = computed(() => {
    const sizeMap = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };
    return sizeMap[_preferences.value.fontSize];
  });
  
  const themeReactiveConfig = computed(() => 
    THEME_REACTIVE_CONFIGS[_currentThemeId.value] || {}
  );
  
  // Update screen size based on width
  const updateScreenSize = () => {
    if (typeof window === 'undefined') return;
    
    _screenWidth.value = window.innerWidth;
    _screenHeight.value = window.innerHeight;
    
    if (_screenWidth.value < 640) {
      _screenSize.value = 'small';
    } else if (_screenWidth.value < 1024) {
      _screenSize.value = 'medium';
    } else if (_screenWidth.value < 1536) {
      _screenSize.value = 'large';
    } else {
      _screenSize.value = 'xlarge';
    }
  };
  
  // Initialize UI state
  const initializeUiState = async () => {
    // Update screen size
    updateScreenSize();
    
    // Setup resize listener
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateScreenSize);
      
      // Check fullscreen state
      const checkFullscreen = () => {
        _isBrowserFullscreenActive.value = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );
      };
      
      document.addEventListener('fullscreenchange', checkFullscreen);
      document.addEventListener('webkitfullscreenchange', checkFullscreen);
      document.addEventListener('mozfullscreenchange', checkFullscreen);
      document.addEventListener('MSFullscreenChange', checkFullscreen);
    }
    
    // Initialize theme
    await initializeTheme();
  };
  
  // Initialize theme
  const initializeTheme = async () => {
    _isThemeTransitioning.value = true;
    
    try {
      // Check for saved theme preference
      const savedThemeId = localStorage.getItem('vca-theme-id');
      const savedPreferences = localStorage.getItem('vca-ui-preferences');
      
      if (savedPreferences) {
        _preferences.value = { ..._preferences.value, ...JSON.parse(savedPreferences) };
      }
      
      // Initialize theme manager
      themeManager.initialize();
      
      // Determine initial theme
      let themeId = savedThemeId || _currentThemeId.value;
      
      // Auto theme based on time of day
      if (_preferences.value.autoTheme && !savedThemeId) {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) {
          themeId = 'aurora-daybreak'; // Morning
        } else if (hour >= 12 && hour < 17) {
          themeId = 'warm-embrace'; // Afternoon
        } else if (hour >= 17 && hour < 20) {
          themeId = 'twilight-neo'; // Evening
        } else {
          themeId = 'sakura-sunset'; // Night
        }
      }
      
      await setTheme(themeId, false); // Don't trigger reactive state on init
    } catch (error) {
      console.error('[UIStore] Failed to initialize theme:', error);
    } finally {
      _isThemeTransitioning.value = false;
    }
  };
  
  // Theme management
  const setTheme = async (themeId: string, triggerReactiveEffects: boolean = true) => {
    if (_currentThemeId.value === themeId && _currentTheme.value) return;
    
    _isThemeTransitioning.value = true;
    
    try {
      themeManager.setTheme(themeId);
      const currentThemeDef = themeManager.getCurrentTheme().value;
      
      if (currentThemeDef) {
        _currentThemeId.value = themeId;
        _currentTheme.value = currentThemeDef;
        
        // Save preference
        localStorage.setItem('vca-theme-id', themeId);
        
        // Apply theme-specific reactive configurations
        if (triggerReactiveEffects) {
          const config = themeReactiveConfig.value;
          
          // Adjust effect intensity
          if (config.effectIntensity) {
            const currentIntensity = reactiveStore.intensity;
            const targetIntensity = config.effectIntensity;
            reactiveStore.adjustIntensity(targetIntensity - currentIntensity);
          }
          
          // Trigger theme change effects
          reactiveStore.triggerGlowBurst(0.8, 800);
          reactiveStore.triggerRipple({ duration: 1200, intensity: 0.6, count: 2 });
          
          // Set mood based on theme
          if (themeId.includes('sakura') || themeId.includes('aurora')) {
            reactiveStore.setMoodState('warm');
          } else if (themeId.includes('twilight') || themeId.includes('neo')) {
            reactiveStore.setMoodState('excited');
          } else if (themeId.includes('terminus')) {
            reactiveStore.setMoodState('focused');
          } else if (themeId.includes('warm')) {
            reactiveStore.setMoodState('calm');
          }
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('[UIStore] Failed to set theme:', error);
      addNotification({
        type: 'error',
        title: 'Theme Change Failed',
        message: 'Could not apply the selected theme.',
      });
      return false;
    } finally {
      _isThemeTransitioning.value = false;
    }
  };

  /**
   * Toggle color mode between dark and light using the default theme IDs.
   * This preserves the design system's pairing of a default dark theme and a default light theme.
   */
  const toggleColorMode = async (): Promise<void> => {
    try {
      const target = isCurrentThemeDark.value ? 'light' : 'dark';
      // Let the theme manager pick the appropriate default for the mode
      themeManager.setThemeFlexible(target);
      const newThemeId = themeManager.getCurrentThemeId().value as string;
      // Reuse existing store update path for consistency and effects
      await setTheme(newThemeId);
    } catch (error) {
      console.error('[UIStore] Failed to toggle color mode:', error);
      addNotification({ type: 'error', title: 'Theme Toggle Failed', message: 'Could not switch color mode.' });
    }
  };
  
  // Browser fullscreen management
  const toggleBrowserFullscreen = async () => {
    if (!document.fullscreenEnabled && 
        !(document as any).webkitFullscreenEnabled && 
        !(document as any).mozFullScreenEnabled && 
        !(document as any).msFullscreenEnabled) {
      addNotification({
        type: 'warning',
        title: 'Fullscreen Not Supported',
        message: 'Your browser does not support fullscreen mode.',
      });
      return;
    }
    
    try {
      if (!_isBrowserFullscreenActive.value) {
        // Enter fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('[UIStore] Fullscreen toggle failed:', error);
      addNotification({
        type: 'error',
        title: 'Fullscreen Error',
        message: 'Could not toggle fullscreen mode.',
      });
    }
  };
  
  // Preference management
  const updatePreferences = (updates: Partial<UIPreferences>) => {
    _preferences.value = { ..._preferences.value, ...updates };
    
    // Save to localStorage
    localStorage.setItem('vca-ui-preferences', JSON.stringify(_preferences.value));
    
    // Apply preference-based effects
    if ('reducedMotion' in updates) {
      if (updates.reducedMotion) {
        reactiveStore.adjustIntensity(-0.5);
        reactiveStore.adjustPulseRate(-0.5);
      } else {
        reactiveStore.adjustIntensity(0.3);
        reactiveStore.adjustPulseRate(0.3);
      }
    }
    
    if ('enableParticles' in updates && !updates.enableParticles) {
      // Force particle activity to 0 by reducing intensity
      const currentIntensity = reactiveStore.intensity;
      if (currentIntensity > 0) {
        reactiveStore.adjustIntensity(-currentIntensity);
      }
    }
    
    if ('highContrast' in updates && updates.highContrast) {
      // Increase glow and contrast
      reactiveStore.triggerGlowBurst(1.0, 1000);
    }
  };
  
  // Notification management
  const addNotification = (notification: Omit<UINotification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const fullNotification: UINotification = {
      id,
      duration: 5000,
      ...notification,
    };
    
    _notifications.value.push(fullNotification);
    
    // Trigger reactive effect based on notification type
    switch (notification.type) {
      case 'success':
        reactiveStore.triggerPulse(0.7, 600);
        break;
      case 'error':
        reactiveStore.setMoodState('attentive');
        reactiveStore.triggerRipple({ duration: 800, intensity: 0.8 });
        break;
      case 'warning':
        reactiveStore.triggerGlowBurst(0.6, 500);
        break;
    }
    
    // Auto-remove after duration
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, fullNotification.duration);
    }
    
    return id;
  };
  
  const removeNotification = (id: string) => {
    const index = _notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      _notifications.value.splice(index, 1);
    }
  };
  
  const clearNotifications = () => {
    _notifications.value = [];
  };
  
  // Modal management
  const openModal = (modal: Omit<UIModal, 'id'>): string => {
    const id = `modal-${Date.now()}-${Math.random()}`;
    const fullModal: UIModal = {
      id,
      closable: true,
      size: 'medium',
      ...modal,
    };
    
    _modals.value.push(fullModal);
    
    // Trigger modal open effect
    reactiveStore.addEffect('shimmer');
    reactiveStore.triggerGlowBurst(0.5, 400);
    
    return id;
  };
  
  const closeModal = (id: string) => {
    const index = _modals.value.findIndex(m => m.id === id);
    if (index > -1) {
      const modal = _modals.value[index];
      modal.onClose?.();
      _modals.value.splice(index, 1);
      
      // Remove effect when last modal closes
      if (_modals.value.length === 0) {
        reactiveStore.removeEffect('shimmer');
      }
    }
  };
  
  const closeAllModals = () => {
    _modals.value.forEach(modal => modal.onClose?.());
    _modals.value = [];
    reactiveStore.removeEffect('shimmer');
  };
  
  // Global loading state
  const setGlobalLoading = (loading: boolean) => {
    _globalLoading.value = loading;
    
    if (loading) {
      reactiveStore.transitionToState('connecting');
    } else {
      reactiveStore.transitionToState('idle');
    }
  };
  
  // Sidebar state
  const toggleSidebar = () => {
    _sidebarCollapsed.value = !_sidebarCollapsed.value;
    reactiveStore.triggerRipple({ duration: 600, intensity: 0.4 });
  };
  
  // Mobile menu state
  const toggleMobileMenu = () => {
    _mobileMenuOpen.value = !_mobileMenuOpen.value;
    
    if (_mobileMenuOpen.value) {
      reactiveStore.addEffect('shimmer');
    } else {
      reactiveStore.removeEffect('shimmer');
    }
  };
  
  // Command palette
  const toggleCommandPalette = () => {
    _commandPaletteOpen.value = !_commandPaletteOpen.value;
    
    if (_commandPaletteOpen.value) {
      reactiveStore.addEffect('neural');
      reactiveStore.setMoodState('curious');
    } else {
      reactiveStore.removeEffect('neural');
    }
  };
  
  // Apply reactive state based on UI interactions
  const applyInteractionState = (interaction: string) => {
    switch (interaction) {
      case 'input-focus':
        reactiveStore.setMoodState('attentive');
        reactiveStore.triggerGlowBurst(0.6, 400);
        break;
      case 'button-click':
        reactiveStore.triggerPulse(0.7, 300);
        break;
      case 'navigation':
        reactiveStore.triggerRipple({ duration: 800, intensity: 0.5 });
        break;
      case 'form-submit':
        reactiveStore.transitionToState('responding');
        reactiveStore.setMoodState('engaged');
        break;
    }
  };
  
  // Watch for system preference changes
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', (e) => {
      if (e.matches) {
        updatePreferences({ reducedMotion: true });
      }
    });
    
    // Watch for system theme changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', (e) => {
      if (_preferences.value.autoTheme) {
        setTheme(e.matches ? 'sakura-sunset' : 'aurora-daybreak');
      }
    });
  }
  
  // Sync with reactive store state changes
  watch(() => reactiveStore.appState, (newState) => {
    // Apply theme-specific adjustments based on state
    const config = themeReactiveConfig.value;
    if (config.preferredStates?.includes(newState)) {
      reactiveStore.adjustIntensity(0.1);
    }
  });
  
  return {
    // Theme
    currentThemeId,
    currentTheme,
    isCurrentThemeDark,
    isThemeTransitioning: readonly(_isThemeTransitioning),
    
    // Screen
    size,
    screenWidth,
    screenHeight,
    isBrowserFullscreenActive,
    
    // Preferences
    preferences: readonly(_preferences),
    isReducedMotionPreferred,
    effectiveParticleActivity,
    effectiveNeuralActivity,
    fontSizeClass,
    
    // UI State
    notifications: readonly(_notifications),
    modals: readonly(_modals),
    globalLoading: readonly(_globalLoading),
    sidebarCollapsed: readonly(_sidebarCollapsed),
    mobileMenuOpen: readonly(_mobileMenuOpen),
    commandPaletteOpen: readonly(_commandPaletteOpen),
    
    // Actions
    initializeUiState,
    initializeTheme,
    setTheme,
    toggleColorMode,
    toggleBrowserFullscreen,
    updatePreferences,
    addNotification,
    removeNotification,
    clearNotifications,
    openModal,
    closeModal,
    closeAllModals,
    setGlobalLoading,
    toggleSidebar,
    toggleMobileMenu,
    toggleCommandPalette,
    applyInteractionState,
  };
});