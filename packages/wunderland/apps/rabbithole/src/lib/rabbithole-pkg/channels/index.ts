/**
 * @fileoverview Channel module exports for RabbitHole
 * @module @framers/rabbithole/channels
 */

// Types and interfaces
export * from './IChannelAdapter.js';

// Base adapter
export { BaseChannelAdapter } from './BaseChannelAdapter.js';

// Platform-specific adapters
export * from './adapters/index.js';
