import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BaseTransport,
  TransportError,
  TransportErrorCodes,
  type TransportOptions,
  type TransportState,
  type TransportEventType,
  type SyncTransport,
} from '../src/features/sync/transport/transport';
import type { SyncMessage } from '../src/features/sync/protocol/messages';
import { createHeartbeat } from '../src/features/sync/protocol/messages';

/**
 * Concrete implementation of BaseTransport for testing.
 */
class TestTransport extends BaseTransport {
  readonly type = 'custom' as const;

  public connectImpl = vi.fn().mockResolvedValue(undefined);
  public disconnectImpl = vi.fn().mockResolvedValue(undefined);
  public sendImpl = vi.fn().mockResolvedValue(undefined);
  public requestImpl = vi.fn().mockResolvedValue(createHeartbeat('device-1', 1));

  async connect(): Promise<void> {
    this.checkDisposed();
    this.setState('connecting');
    await this.connectImpl();
    this.setState('connected');
    this._stats.connectedAt = Date.now();
    this.emit('connected', { timestamp: Date.now() });
  }

  async disconnect(reason?: string): Promise<void> {
    await this.disconnectImpl();
    this.setState('disconnected');
    this.emit('disconnected', { reason: reason ?? 'manual', wasClean: true });
  }

  async send(message: SyncMessage): Promise<void> {
    this.checkDisposed();
    await this.sendImpl(message);
    this._stats.messagesSent++;
    this._stats.bytesSent += JSON.stringify(message).length;
  }

  async request(message: SyncMessage, timeout?: number): Promise<SyncMessage> {
    this.checkDisposed();
    const response = await this.requestImpl(message, timeout);
    this._stats.messagesSent++;
    this._stats.messagesReceived++;
    return response;
  }

  // Expose protected methods for testing
  public testEmit<T extends TransportEventType>(
    event: T,
    data: Parameters<SyncTransport['on']>[1] extends (d: infer D) => void ? D : never
  ): void {
    this.emit(event, data as never);
  }

  public testSetState(state: TransportState): void {
    this.setState(state);
  }

  public testCheckDisposed(): void {
    this.checkDisposed();
  }

  public testCalculateReconnectDelay(attempt: number): number {
    return this.calculateReconnectDelay(attempt);
  }

  public getOptions(): Required<TransportOptions> {
    return this._options;
  }
}

describe('BaseTransport', () => {
  let transport: TestTransport;
  const defaultOptions: TransportOptions = {
    endpoint: 'https://sync.example.com',
  };

  beforeEach(() => {
    transport = new TestTransport(defaultOptions);
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const options = transport.getOptions();

      expect(options.endpoint).toBe('https://sync.example.com');
      expect(options.authToken).toBe('');
      expect(options.headers).toEqual({});
      expect(options.connectionTimeout).toBe(10000);
      expect(options.requestTimeout).toBe(30000);
      expect(options.autoReconnect).toBe(true);
      expect(options.reconnectDelay).toBe(1000);
      expect(options.maxReconnectDelay).toBe(30000);
      expect(options.maxReconnectAttempts).toBe(0);
      expect(options.heartbeatInterval).toBe(30000);
      expect(options.compression).toBe(true);
    });

    it('should accept custom options', () => {
      const customTransport = new TestTransport({
        endpoint: 'wss://custom.example.com',
        authToken: 'secret-token',
        headers: { 'X-Custom': 'header' },
        connectionTimeout: 5000,
        requestTimeout: 15000,
        autoReconnect: false,
        reconnectDelay: 2000,
        maxReconnectDelay: 60000,
        maxReconnectAttempts: 5,
        heartbeatInterval: 60000,
        compression: false,
      });

      const options = customTransport.getOptions();

      expect(options.endpoint).toBe('wss://custom.example.com');
      expect(options.authToken).toBe('secret-token');
      expect(options.headers).toEqual({ 'X-Custom': 'header' });
      expect(options.connectionTimeout).toBe(5000);
      expect(options.requestTimeout).toBe(15000);
      expect(options.autoReconnect).toBe(false);
      expect(options.reconnectDelay).toBe(2000);
      expect(options.maxReconnectDelay).toBe(60000);
      expect(options.maxReconnectAttempts).toBe(5);
      expect(options.heartbeatInterval).toBe(60000);
      expect(options.compression).toBe(false);
    });

    it('should initialize stats', () => {
      const stats = transport.getStats();

      expect(stats.state).toBe('disconnected');
      expect(stats.messagesSent).toBe(0);
      expect(stats.messagesReceived).toBe(0);
      expect(stats.bytesSent).toBe(0);
      expect(stats.bytesReceived).toBe(0);
      expect(stats.reconnectAttempts).toBe(0);
    });
  });

  describe('state', () => {
    it('should return current state', () => {
      expect(transport.state).toBe('disconnected');
    });
  });

  describe('isConnected', () => {
    it('should return false when disconnected', () => {
      expect(transport.isConnected).toBe(false);
    });

    it('should return true when connected', async () => {
      await transport.connect();
      expect(transport.isConnected).toBe(true);
    });

    it('should return false when connecting', () => {
      transport.testSetState('connecting');
      expect(transport.isConnected).toBe(false);
    });
  });

  describe('connect', () => {
    it('should call connect implementation', async () => {
      await transport.connect();
      expect(transport.connectImpl).toHaveBeenCalled();
    });

    it('should update state to connected', async () => {
      await transport.connect();
      expect(transport.state).toBe('connected');
    });

    it('should emit connected event', async () => {
      const listener = vi.fn();
      transport.on('connected', listener);

      await transport.connect();

      expect(listener).toHaveBeenCalledWith({
        timestamp: expect.any(Number),
      });
    });

    it('should throw if disposed', async () => {
      await transport.dispose();

      await expect(transport.connect()).rejects.toThrow(TransportError);
    });
  });

  describe('disconnect', () => {
    it('should call disconnect implementation', async () => {
      await transport.connect();
      await transport.disconnect('test');

      expect(transport.disconnectImpl).toHaveBeenCalled();
    });

    it('should update state to disconnected', async () => {
      await transport.connect();
      await transport.disconnect();

      expect(transport.state).toBe('disconnected');
    });

    it('should emit disconnected event', async () => {
      const listener = vi.fn();
      transport.on('disconnected', listener);

      await transport.connect();
      await transport.disconnect('test reason');

      expect(listener).toHaveBeenCalledWith({
        reason: 'test reason',
        wasClean: true,
      });
    });
  });

  describe('send', () => {
    it('should call send implementation', async () => {
      const message = createHeartbeat('device-1', 1);
      await transport.send(message);

      expect(transport.sendImpl).toHaveBeenCalledWith(message);
    });

    it('should update stats', async () => {
      const message = createHeartbeat('device-1', 1);
      await transport.send(message);

      const stats = transport.getStats();
      expect(stats.messagesSent).toBe(1);
      expect(stats.bytesSent).toBeGreaterThan(0);
    });

    it('should throw if disposed', async () => {
      await transport.dispose();

      await expect(
        transport.send(createHeartbeat('device-1', 1))
      ).rejects.toThrow(TransportError);
    });
  });

  describe('request', () => {
    it('should call request implementation', async () => {
      const message = createHeartbeat('device-1', 1);
      await transport.request(message);

      expect(transport.requestImpl).toHaveBeenCalledWith(message, undefined);
    });

    it('should pass timeout to implementation', async () => {
      const message = createHeartbeat('device-1', 1);
      await transport.request(message, 5000);

      expect(transport.requestImpl).toHaveBeenCalledWith(message, 5000);
    });

    it('should return response message', async () => {
      const message = createHeartbeat('device-1', 1);
      const response = await transport.request(message);

      expect(response.type).toBe('heartbeat');
    });

    it('should update stats', async () => {
      const message = createHeartbeat('device-1', 1);
      await transport.request(message);

      const stats = transport.getStats();
      expect(stats.messagesSent).toBe(1);
      expect(stats.messagesReceived).toBe(1);
    });
  });

  describe('on', () => {
    it('should register event listener', () => {
      const listener = vi.fn();
      transport.on('connected', listener);

      transport.testEmit('connected', { timestamp: Date.now() });

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = transport.on('connected', listener);

      unsubscribe();
      transport.testEmit('connected', { timestamp: Date.now() });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      transport.on('connected', listener1);
      transport.on('connected', listener2);

      transport.testEmit('connected', { timestamp: Date.now() });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire listener once', () => {
      const listener = vi.fn();
      transport.once('connected', listener);

      transport.testEmit('connected', { timestamp: Date.now() });
      transport.testEmit('connected', { timestamp: Date.now() });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = transport.once('connected', listener);

      unsubscribe();
      transport.testEmit('connected', { timestamp: Date.now() });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return current stats', () => {
      const stats = transport.getStats();

      expect(stats).toEqual({
        state: 'disconnected',
        messagesSent: 0,
        messagesReceived: 0,
        bytesSent: 0,
        bytesReceived: 0,
        reconnectAttempts: 0,
      });
    });

    it('should return copy of stats', () => {
      const stats1 = transport.getStats();
      const stats2 = transport.getStats();

      expect(stats1).not.toBe(stats2);
    });
  });

  describe('dispose', () => {
    it('should call disconnect', async () => {
      await transport.connect();
      await transport.dispose();

      expect(transport.disconnectImpl).toHaveBeenCalled();
    });

    it('should clear listeners', async () => {
      const listener = vi.fn();
      transport.on('connected', listener);

      await transport.dispose();

      // Directly emit - listener should not be called
      transport.testEmit('connected', { timestamp: Date.now() });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should not dispose twice', async () => {
      await transport.dispose();
      await transport.dispose();

      expect(transport.disconnectImpl).toHaveBeenCalledTimes(1);
    });
  });

  describe('setState', () => {
    it('should update state', () => {
      transport.testSetState('connecting');
      expect(transport.state).toBe('connecting');
    });

    it('should emit stateChange event', () => {
      const listener = vi.fn();
      transport.on('stateChange', listener);

      transport.testSetState('connecting');

      expect(listener).toHaveBeenCalledWith({
        previousState: 'disconnected',
        currentState: 'connecting',
      });
    });

    it('should not emit if state unchanged', () => {
      const listener = vi.fn();
      transport.on('stateChange', listener);

      transport.testSetState('disconnected');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('checkDisposed', () => {
    it('should not throw when not disposed', () => {
      expect(() => transport.testCheckDisposed()).not.toThrow();
    });

    it('should throw TransportError when disposed', async () => {
      await transport.dispose();

      expect(() => transport.testCheckDisposed()).toThrow(TransportError);
    });
  });

  describe('calculateReconnectDelay', () => {
    it('should return initial delay for first attempt', () => {
      const delay = transport.testCalculateReconnectDelay(1);

      // Base delay is 1000, with ±20% jitter
      expect(delay).toBeGreaterThanOrEqual(800);
      expect(delay).toBeLessThanOrEqual(1200);
    });

    it('should increase delay exponentially', () => {
      const delay1 = transport.testCalculateReconnectDelay(1);
      const delay2 = transport.testCalculateReconnectDelay(2);
      const delay3 = transport.testCalculateReconnectDelay(3);

      // Each attempt roughly doubles (with jitter)
      expect(delay2).toBeGreaterThan(delay1 * 0.8);
      expect(delay3).toBeGreaterThan(delay2 * 0.8);
    });

    it('should cap at maxReconnectDelay', () => {
      const delay = transport.testCalculateReconnectDelay(100);

      // Max delay is 30000, with ±20% jitter
      expect(delay).toBeLessThanOrEqual(36000);
    });
  });
});

describe('TransportError', () => {
  describe('constructor', () => {
    it('should create error with message and code', () => {
      const error = new TransportError('Connection failed', 'CONNECTION_FAILED');

      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('CONNECTION_FAILED');
      expect(error.name).toBe('TransportError');
      expect(error.recoverable).toBe(false);
    });

    it('should accept recoverable option', () => {
      const error = new TransportError(
        'Timeout',
        'REQUEST_TIMEOUT',
        { recoverable: true }
      );

      expect(error.recoverable).toBe(true);
    });

    it('should accept cause option', () => {
      const cause = new Error('Original error');
      const error = new TransportError(
        'Wrapped error',
        'NETWORK_ERROR',
        { cause }
      );

      expect(error.cause).toBe(cause);
    });
  });
});

describe('TransportErrorCodes', () => {
  it('should define standard error codes', () => {
    expect(TransportErrorCodes.CONNECTION_FAILED).toBe('CONNECTION_FAILED');
    expect(TransportErrorCodes.CONNECTION_TIMEOUT).toBe('CONNECTION_TIMEOUT');
    expect(TransportErrorCodes.AUTH_FAILED).toBe('AUTH_FAILED');
    expect(TransportErrorCodes.REQUEST_TIMEOUT).toBe('REQUEST_TIMEOUT');
    expect(TransportErrorCodes.SEND_FAILED).toBe('SEND_FAILED');
    expect(TransportErrorCodes.SERVER_ERROR).toBe('SERVER_ERROR');
    expect(TransportErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(TransportErrorCodes.PROTOCOL_ERROR).toBe('PROTOCOL_ERROR');
    expect(TransportErrorCodes.DISPOSED).toBe('DISPOSED');
  });
});
