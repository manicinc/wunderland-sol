/**
 * Plugin Loader Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginLoader } from '../src/loader/PluginLoader';
import type { PluginManifest } from '../src/types';

describe('PluginLoader', () => {
  let loader: PluginLoader;

  const mockManifest: PluginManifest = {
    id: 'com.test.mock-plugin',
    name: 'Mock Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: { name: 'Test Author' },
    type: 'codex',
    category: 'indexer',
    compatibility: {},
    main: 'index.js',
  };

  beforeEach(() => {
    loader = new PluginLoader({
      securityScan: false,
      sandbox: false,
    });
  });

  describe('constructor', () => {
    it('should create loader with default config', () => {
      const defaultLoader = new PluginLoader();
      expect(defaultLoader).toBeDefined();
    });

    it('should accept custom config', () => {
      const customLoader = new PluginLoader({
        maxConcurrent: 5,
        timeout: 10000,
      });
      expect(customLoader).toBeDefined();
    });
  });

  describe('isLoaded', () => {
    it('should return false for non-loaded plugin', () => {
      expect(loader.isLoaded('non-existent')).toBe(false);
    });
  });

  describe('getPlugin', () => {
    it('should return undefined for non-loaded plugin', () => {
      expect(loader.getPlugin('non-existent')).toBeUndefined();
    });
  });

  describe('getAllLoaded', () => {
    it('should return empty array initially', () => {
      expect(loader.getAllLoaded()).toEqual([]);
    });
  });

  describe('registerLazy', () => {
    it('should return a function', () => {
      const lazyLoad = loader.registerLazy(mockManifest);
      expect(typeof lazyLoad).toBe('function');
    });
  });

  describe('checkCompatibility', () => {
    it('should check manifest compatibility', async () => {
      const result = await loader.checkCompatibility(mockManifest);
      expect(result).toHaveProperty('compatible');
      expect(result).toHaveProperty('issues');
    });
  });
});

