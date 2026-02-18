/// <reference types="vite/client" />

declare const __FABRIC_VERSION__: string;

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
