import { defineStore } from 'pinia';
import { ref, onMounted as vueOnMounted, onBeforeUnmount as vueOnBeforeUnmount } from 'vue';

export const useConnectivityStore = defineStore('connectivity', () => {
  const isOnline = ref<boolean>(typeof window !== 'undefined' ? window.navigator.onLine : true);

  function setOnline(next: boolean): void {
    isOnline.value = next;
  }

  function initialize(): void {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Pinia store lifecycle helpers when used inside components
    try {
      vueOnMounted(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
      });
      vueOnBeforeUnmount(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      });
    } catch {
      // no-op when not in component setup context
    }
  }

  return { isOnline, initialize, setOnline };
});


