// File: frontend/src/services/localStorage.service.ts
/**
 * @file localStorage.service.ts
 * @description Provides a generic and robust interface for interacting with local storage,
 * using localForage as the underlying engine. Supports namespacing for data isolation.
 * @version 1.0.0
 */

import localforage from 'localforage';

/**
 * @interface IStorageService
 * @description Defines the contract for a generic key-value storage service.
 */
export interface IStorageService {
  /**
   * Retrieves an item from storage by its key within a given namespace.
   * @template T The expected type of the stored item.
   * @param {string} namespace - The namespace for the item (e.g., 'diary', 'storyteller').
   * @param {string} key - The key of the item to retrieve.
   * @returns {Promise<T | null>} The retrieved item, or null if not found or an error occurs.
   */
  getItem<T>(namespace: string, key: string): Promise<T | null>;

  /**
   * Stores an item in storage under a key within a given namespace.
   * @param {string} namespace - The namespace for the item.
   * @param {string} key - The key under which to store the item.
   * @param {any} value - The value to store. Can be any type supported by localForage.
   * @returns {Promise<void>} A promise that resolves when the item is stored.
   * @throws {Error} If storing the item fails.
   */
  setItem(namespace: string, key: string, value: any): Promise<void>;

  /**
   * Removes an item from storage by its key within a given namespace.
   * @param {string} namespace - The namespace for the item.
   * @param {string} key - The key of the item to remove.
   * @returns {Promise<void>} A promise that resolves when the item is removed.
   */
  removeItem(namespace: string, key: string): Promise<void>;

  /**
   * Retrieves all items within a given namespace.
   * @template T The expected type of items in the namespace.
   * @param {string} namespace - The namespace to retrieve items from.
   * @returns {Promise<Record<string, T>>} A record of all items in the namespace.
   */
  getAllItemsInNamespace<T>(namespace: string): Promise<Record<string, T>>;

  /**
   * Clears all items within a specific namespace.
   * @param {string} namespace - The namespace to clear.
   * @returns {Promise<void>} A promise that resolves when the namespace is cleared.
   */
  clearNamespace(namespace: string): Promise<void>;

  /**
   * Clears all data managed by this localForage instance. Use with caution.
   * @returns {Promise<void>} A promise that resolves when all storage is cleared.
   */
  clearAllStorage(): Promise<void>;
}

/**
 * @class LocalStorageService
 * @implements IStorageService
 * @description Concrete implementation of IStorageService using localForage.
 */
class LocalStorageService implements IStorageService {
  private store: LocalForage;
  private readonly mainStorageKey = 'VCA_AppLocalStorage_v1'; // A single key to hold an object of namespaces

  constructor(instanceName: string = 'VCA_AppStore', storeDescription: string = 'Main application storage for VCA features.') {
    this.store = localforage.createInstance({
      name: instanceName,
      storeName: 'app_data_store', // Single store for all namespaced data
      description: storeDescription,
    });
    console.log(`[LocalStorageService] Initialized with localForage instance: ${instanceName}`);
  }

  /**
   * Gets the namespaced key.
   * @private
   * @param {string} namespace - The namespace.
   * @param {string} key - The original key.
   * @returns {string} The namespaced key.
   */
  private getNamespacedKey(namespace: string, key: string): string {
    // This approach uses a single top-level key in localForage that stores an object.
    // Each property in this object is a namespace, which itself is an object of key-value pairs.
    // This is simpler than managing many localForage keys directly.
    return `${namespace}:${key}`; // Or, if using one big object under mainStorageKey:
    // The methods below would then fetch the main object, modify the namespace, and save it back.
    // For simplicity and directness with localForage's key-value nature,
    // namespaced keys are often just prefixes.
    // However, to use clearNamespace effectively without iterating all keys,
    // storing namespaces as objects under a single root key is better. Let's adapt for that.
    // This means `getItem`, `setItem`, `removeItem` will operate on a sub-object.
    // For this implementation, we will keep it simple: each namespace becomes a separate top-level key in localforage.
    // A truly generic plugin might abstract this more.
    // For the requirement of "clearAllItemsForNamespace", it's easier if a namespace is one item.
    return namespace; // The key in localforage will be the namespace itself.
  }


  async getItem<T>(namespace: string, key: string): Promise<T | null> {
    const namespaceKey = this.getNamespacedKey(namespace, key); // In this model, namespace IS the key
    try {
      const namespacedData = await this.store.getItem<Record<string, T>>(namespace);
      if (namespacedData && typeof namespacedData === 'object' && key in namespacedData) {
        return namespacedData[key] as T;
      }
      return null;
    } catch (error) {
      console.error(`[LocalStorageService] Error getting item '${key}' from namespace '${namespace}':`, error);
      return null;
    }
  }

  async setItem(namespace: string, key: string, value: any): Promise<void> {
    const namespaceKey = this.getNamespacedKey(namespace, key); // Namespace is the key
    try {
      let namespacedData = await this.store.getItem<Record<string, any>>(namespace) || {};
      namespacedData[key] = value;
      await this.store.setItem(namespace, namespacedData);
      console.debug(`[LocalStorageService] Item '${key}' set in namespace '${namespace}'.`);
    } catch (error) {
      console.error(`[LocalStorageService] Error setting item '${key}' in namespace '${namespace}':`, error);
      throw new Error(`Failed to set item in local storage: ${(error as Error).message}`);
    }
  }

  async removeItem(namespace: string, key: string): Promise<void> {
    const namespaceKey = this.getNamespacedKey(namespace, key); // Namespace is the key
    try {
      let namespacedData = await this.store.getItem<Record<string, any>>(namespace);
      if (namespacedData && typeof namespacedData === 'object' && key in namespacedData) {
        delete namespacedData[key];
        await this.store.setItem(namespace, namespacedData);
        console.debug(`[LocalStorageService] Item '${key}' removed from namespace '${namespace}'.`);
      }
    } catch (error) {
      console.error(`[LocalStorageService] Error removing item '${key}' from namespace '${namespace}':`, error);
    }
  }

  async getAllItemsInNamespace<T>(namespace: string): Promise<Record<string, T>> {
    const namespaceKey = this.getNamespacedKey(namespace, ''); // Namespace is the key
    try {
      const namespacedData = await this.store.getItem<Record<string, T>>(namespace);
      return namespacedData || {};
    } catch (error) {
      console.error(`[LocalStorageService] Error getting all items from namespace '${namespace}':`, error);
      return {};
    }
  }
  async clearNamespace(namespace: string): Promise<void> {
    const namespaceKey = this.getNamespacedKey(namespace, ''); // Namespace is the key
    try {
      await this.store.removeItem(namespace);
      console.log(`[LocalStorageService] Namespace '${namespace}' cleared.`);
    } catch (error) {
      console.error(`[LocalStorageService] Error clearing namespace '${namespace}':`, error);
    }
  }

  async clearAllStorage(): Promise<void> {
    try {
      await this.store.clear(); // Clears all keys for this localForage instance
      console.log('[LocalStorageService] All app storage cleared.');
    } catch (error) {
      console.error('[LocalStorageService] Error clearing all storage:', error);
    }
  }
}

/**
 * Singleton instance of the LocalStorageService.
 * Other services (like DiaryService, future StorytellerService) should import and use this instance.
 */
export const localStorageService = new LocalStorageService();