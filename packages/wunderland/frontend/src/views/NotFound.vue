// File: frontend/src/views/NotFound.vue
<template>
  <div class="not-found-page flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-gray-200 dark:from-slate-900 dark:to-gray-800 text-center p-6">
    <div class="icon-container mb-8">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-32 h-32 text-primary-400 dark:text-primary-400 opacity-50">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    </div>
    <h1 class="text-6xl font-extrabold text-primary-600 dark:text-primary-400 mb-4">404</h1>
    <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-6">Oops! Page Not Found.</h2>
    <p class="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
      The page you are looking for might have been removed, had its name changed,
      or is temporarily unavailable.
    </p>
    <router-link
      to="/"
      class="btn btn-primary px-8 py-3 text-lg rounded-lg shadow-lg hover:shadow-primary-500/50 transition-all duration-300 ease-in-out transform hover:scale-105"
    >
      Go to Homepage
    </router-link>
  </div>
</template>

<script setup lang="ts">
// No specific script needed for this simple 404 page
</script>

<style scoped>
.icon-container svg {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-15px);
  }
}
</style>