import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App as CapApp } from '@capacitor/app';

import App from './App.vue';
import { initializeSqlite } from './capacitor/sqlite';
import { initializeMLEngine } from './ml/transformers';

// Routes
const routes = [
  { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
  { path: '/search', name: 'search', component: () => import('./views/SearchView.vue') },
  { path: '/strand/:id', name: 'strand', component: () => import('./views/StrandView.vue') },
  { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);

// Initialize native features
async function initializeApp() {
  try {
    // Initialize SQLite database
    await initializeSqlite();
    console.log('[FABRIC] SQLite initialized');

    // Initialize ML engine (lazy load models)
    initializeMLEngine();
    console.log('[FABRIC] ML engine ready for lazy loading');

    // Configure status bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a0f' });

    // Configure keyboard
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
    });

    // Handle back button
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        router.back();
      } else {
        CapApp.exitApp();
      }
    });

    // Hide splash screen
    await SplashScreen.hide();
  } catch (error) {
    console.error('[FABRIC] Initialization error:', error);
    // Still hide splash screen on error
    await SplashScreen.hide().catch(() => {});
  }
}

// Mount app
app.mount('#app');

// Initialize after mount
initializeApp();
