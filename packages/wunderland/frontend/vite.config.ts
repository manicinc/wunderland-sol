// File: frontend/vite.config.ts
/**
 * @file vite.config.ts
 * @description Vite configuration for the frontend application.
 * @version 1.1.1
 *
 * @notes
 * - v1.1.1: Added server.fs.allow to ensure Vite dev server can access ../prompts.
 * - v1.1.0: Added 'natural' to optimizeDeps.exclude.
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const projectRoot = path.resolve(__dirname, '..')
const promptsDir = path.resolve(projectRoot, 'prompts')
const docsDir = path.resolve(projectRoot, 'docs')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        transformAssetUrls: {
          // base: '/src', // Default behavior is usually fine. Re-evaluate if needed.
        },
        // compilerOptions for Transition/TransitionGroup usually not needed in Vue 3.
        // compilerOptions: {
        //   isCustomElement: tag => tag === 'TransitionGroup' || tag === 'transition'
        // }
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@docs': docsDir,
      'functions-js': path.resolve(__dirname, './node_modules/@supabase/functions-js'),
      // Optional: Alias for prompts if deep relative paths become cumbersome
      // '#prompts': path.resolve(__dirname, '../prompts') // Assumes prompts is sibling to frontend
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Your backend API
        changeOrigin: true,
      },
    },
    /**
     * @property fs.allow
     * @description Configure file system access for the Vite dev server.
     * Allows serving files from specified directories.
     * Crucial if dynamically importing files (like prompts) from outside the frontend root (e.g., project root).
     */
    fs: {
      allow: [
        // Allow serving files from the project root (where vite.config.js is, usually 'frontend')
        '.',
        // Allow serving files from the parent directory (which should be the main project root)
        // This is necessary for import.meta.glob('../../../../prompts/*.md') to work from within src/views
        promptsDir,
        docsDir,
      ],
    },
  },
  /**
   * @property optimizeDeps
   * @description Dependency pre-bundling options.
   */
  optimizeDeps: {
    exclude: [
      'natural', // Exclude 'natural' due to its conditional "cloudflare:sockets" import
                   // which causes issues during Vite's pre-bundling.
      // Add other problematic CJS dependencies here if they arise
    ],
    // include: ['string-similarity', 'stemmer'] // Optional: force pre-bundling of these if needed,
                                               // but usually not necessary for ESM-friendly libs.
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api', 'global-builtin', 'slash-div'],
      },
    },
  },
  build: {
    // Optional: If 'natural' or other CJS deps still cause issues in production build,
    // you might need to configure rollupOptions for commonjs plugin.
    // rollupOptions: {
    //   plugins: [
    //     // import commonjs from '@rollup/plugin-commonjs'; // npm i -D @rollup/plugin-commonjs
    //     // commonjs(),
    //   ],
    // },
  }
})
