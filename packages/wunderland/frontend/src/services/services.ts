// File: frontend/src/types/services.ts
/**
 * @file services.ts
 * @description Defines shared TypeScript interfaces and types for services used across the frontend.
 * This helps ensure type consistency and provides clear contracts for service interactions.
 */

/**
 * Defines the structure for a toast notification object.
 */
export interface ToastMessage {
  /** Unique identifier for the toast. */
  id: number;
  /** Type of the toast, influencing its appearance and icon. */
  type: 'success' | 'error' | 'info' | 'warning';
  /** The main title text of the toast. */
  title: string;
  /** Optional detailed message for the toast. */
  message?: string;
  /** Duration in milliseconds for how long the toast should be visible. 0 means persistent until dismissed. */
  duration?: number;
}

/**
 * Interface for a toast service, typically provided via Vue's provide/inject mechanism.
 */
export interface ToastService {
  /**
   * Adds a new toast notification.
   * @param {Omit<ToastMessage, 'id'>} toastDetails - The details of the toast to add.
   * @returns {number} The ID of the newly added toast.
   */
  add: (toastDetails: Omit<ToastMessage, 'id'>) => number;
  /**
   * Removes a toast notification by its ID.
   * @param {number} id - The ID of the toast to remove.
   */
  remove: (id: number) => void;
}

/**
 * Interface for the global loading indicator service.
 */
export interface LoadingService {
  /** Shows the global loading indicator. */
  show: () => void;
  /** Hides the global loading indicator. */
  hide: () => void;
  /** A readonly ref indicating if the loader is currently active. */
  isLoading: Readonly<import('vue').Ref<boolean>>;
}

/**
 * Represents a generic selectable option, often used in dropdowns.
 */
export interface SelectOption<T = string> {
  /** The display label for the option. */
  label: string;
  /** The actual value of the option. */
  value: T;
  /** Optional icon or emoji to display alongside the label. */
  icon?: string;
  /** Optional description for the option. */
  description?: string;
  /** Optional CSS class for styling the icon container. */
  iconClassBase?: string;
}

/**
 * Describes the structure of an AI agent definition for dynamic loading.
 */
export interface AgentDefinition {
  /** Unique identifier for the agent. */
  id: string;
  /** User-friendly label for the agent. */
  label: string;
  /** Vue component representing the agent's icon. */
  icon: any; // Consider using `import('vue').Component` if all icons are Vue components
  /** CSS class for styling the agent's icon. */
  iconClass: string;
  /** The Vue component that implements the agent's UI. */
  component: any; // Consider `AsyncComponent` or `Component` from 'vue'
  /** A short description of the agent's purpose. */
  description: string;
  /** The mode identifier to be sent to the backend chat API. */
  promptMode: string;
}

// Add other shared types as they become necessary