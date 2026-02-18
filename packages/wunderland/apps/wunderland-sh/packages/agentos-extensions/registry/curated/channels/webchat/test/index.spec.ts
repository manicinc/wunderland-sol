/**
 * Unit tests for the WebChat channel extension factory.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExtensionPack } from '../src/index';

describe('createExtensionPack', () => {
  it('should create a pack with the correct name', () => {
    const pack = createExtensionPack({ options: {} } as any);
    expect(pack.name).toBe('@framers/agentos-ext-channel-webchat');
  });

  it('should include exactly 2 descriptors (1 tool + 1 messaging-channel)', () => {
    const pack = createExtensionPack({ options: {} } as any);

    expect(pack.descriptors).toHaveLength(2);

    const tools = pack.descriptors.filter((d) => d.kind === 'tool');
    const channels = pack.descriptors.filter((d) => d.kind === 'messaging-channel');

    expect(tools).toHaveLength(1);
    expect(channels).toHaveLength(1);
  });

  it('should have tool descriptor with id webchatChannelSendMessage', () => {
    const pack = createExtensionPack({ options: {} } as any);

    const tool = pack.descriptors.find((d) => d.kind === 'tool');
    expect(tool).toBeDefined();
    expect(tool!.id).toBe('webchatChannelSendMessage');
  });

  it('should have channel descriptor with id webchatChannel', () => {
    const pack = createExtensionPack({ options: {} } as any);

    const channel = pack.descriptors.find((d) => d.kind === 'messaging-channel');
    expect(channel).toBeDefined();
    expect(channel!.id).toBe('webchatChannel');
  });

  it('should not require secrets resolution', () => {
    // No secrets, no env vars — should not throw
    expect(() => createExtensionPack({ options: {} } as any)).not.toThrow();
  });

  it('should apply custom priority to all descriptors', () => {
    const pack = createExtensionPack({
      options: { priority: 99 },
    } as any);

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(99);
    }
  });

  it('should default priority to 50', () => {
    const pack = createExtensionPack({ options: {} } as any);

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(50);
    }
  });

  it('should have onActivate lifecycle hook', () => {
    const pack = createExtensionPack({ options: {} } as any);
    expect(typeof pack.onActivate).toBe('function');
  });

  it('should have onDeactivate lifecycle hook', () => {
    const pack = createExtensionPack({ options: {} } as any);
    expect(typeof pack.onDeactivate).toBe('function');
  });

  it('should activate and deactivate without errors', async () => {
    const pack = createExtensionPack({ options: {} } as any);
    await pack.onActivate!();
    await pack.onDeactivate!();
  });

  it('should wire onSend callback from options to the service', async () => {
    const onSend = vi.fn();
    const pack = createExtensionPack({
      options: { onSend },
    } as any);

    // After activation the service should be running and the onSend callback
    // should be reachable. We trigger it by sending via the tool descriptor.
    await pack.onActivate!();

    // Get the tool payload and execute it to trigger the onSend bridge.
    const toolDescriptor = pack.descriptors.find((d) => d.kind === 'tool');
    const tool = toolDescriptor!.payload as any;
    await tool.execute({ conversationId: 'conv-1', text: 'ping' }, {} as any);

    expect(onSend).toHaveBeenCalledWith('conv-1', 'ping', undefined);

    await pack.onDeactivate!();
  });

  it('should work without onSend in options', async () => {
    const pack = createExtensionPack({ options: {} } as any);
    await pack.onActivate!();

    // Sending without onSend should silently no-op, not throw
    const toolDescriptor = pack.descriptors.find((d) => d.kind === 'tool');
    const tool = toolDescriptor!.payload as any;
    const result = await tool.execute({ conversationId: 'conv-1', text: 'ping' }, {} as any);
    expect(result.success).toBe(true);

    await pack.onDeactivate!();
  });

  it('should handle undefined options gracefully', () => {
    const pack = createExtensionPack({} as any);
    expect(pack.name).toBe('@framers/agentos-ext-channel-webchat');
    expect(pack.descriptors).toHaveLength(2);
  });
});
