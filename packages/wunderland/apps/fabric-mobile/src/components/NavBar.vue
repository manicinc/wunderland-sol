<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const navItems = [
  { name: 'Home', path: '/', icon: 'home' },
  { name: 'Search', path: '/search', icon: 'search' },
  { name: 'Settings', path: '/settings', icon: 'settings' },
];

const currentPath = computed(() => route.path);
</script>

<template>
  <nav class="navbar">
    <router-link
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="nav-item"
      :class="{ active: currentPath === item.path }"
    >
      <span class="nav-icon">{{ item.icon === 'home' ? '🏠' : item.icon === 'search' ? '🔍' : '⚙️' }}</span>
      <span class="nav-label">{{ item.name }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 16px calc(8px + var(--safe-area-inset-bottom, 0px)) 16px;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(64, 224, 208, 0.1);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  text-decoration: none;
  color: rgba(229, 229, 229, 0.6);
  transition: all 0.2s ease;
  border-radius: 12px;
}

.nav-item.active {
  color: #40e0d0;
  background: rgba(64, 224, 208, 0.1);
}

.nav-icon {
  font-size: 20px;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
}
</style>
