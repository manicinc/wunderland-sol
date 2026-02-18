// File: frontend/src/utils/constants.ts
/**
 * @file constants.ts
 * @description Defines application-wide constants for the frontend.
 * This file centralizes constant values to improve maintainability and reduce magic strings/numbers.
 */

/**
 * The key used for storing the authentication token in localStorage or sessionStorage.
 * @type {string}
 */
export const AUTH_TOKEN_KEY: string = 'vcaAuthToken';

/**
 * Default number of individual messages (user + assistant pairs count as 2) to keep in chat history.
 * Aligns with a common default of 10 pairs.
 * @type {number}
 */
export const DEFAULT_CHAT_HISTORY_MESSAGES: number = 20;

/**
 * Maximum number of individual messages a user can configure for chat history.
 * @type {number}
 */
export const MAX_CHAT_HISTORY_MESSAGES_CONFIGURABLE: number = 200;

// Add other frontend-specific, non-sensitive constants here
// e.g., default UI settings, debounce times, specific UI element IDs if absolutely necessary.