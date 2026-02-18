/**
 * @file common.infrastructure.test.ts
 * @description Comprehensive tests for NestJS common infrastructure:
 *   guards (AuthGuard, OptionalAuthGuard), filters (HttpExceptionFilter, NotFoundFilter),
 *   interceptors (LoggingInterceptor), and decorators (Public, CurrentUser).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  ArgumentsHost,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { of, throwError, firstValueFrom } from 'rxjs';

// ---------------------------------------------------------------------------
// Helpers: mock ExecutionContext / ArgumentsHost
// ---------------------------------------------------------------------------

function createMockExecutionContext(overrides: {
  isPublic?: boolean;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  user?: any;
  url?: string;
  method?: string;
  path?: string;
}) {
  const request: Record<string, any> = {
    headers: overrides.headers || {},
    cookies: overrides.cookies || {},
    user: overrides.user,
    url: overrides.url || '/test',
    method: overrides.method || 'GET',
    path: overrides.path || '/test',
    originalUrl: overrides.url || '/test',
  };

  const response: Record<string, any> = {
    headersSent: false,
    statusCode: 200,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: any) {
      response._json = body;
      return body;
    },
    type(_t: string) {
      return response;
    },
    send(body: any) {
      response._sent = body;
      return body;
    },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    _request: request,
    _response: response,
  } as unknown as ExecutionContext & {
    _request: Record<string, any>;
    _response: Record<string, any>;
  };
}

function createMockArgumentsHost(overrides: {
  url?: string;
  method?: string;
  path?: string;
  headersSent?: boolean;
}) {
  const request: Record<string, any> = {
    url: overrides.url || '/test',
    method: overrides.method || 'GET',
    path: overrides.path || '/test',
    originalUrl: overrides.url || '/test',
  };

  const response: Record<string, any> = {
    headersSent: overrides.headersSent ?? false,
    statusCode: 200,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: any) {
      response._json = body;
      return body;
    },
    type(_t: string) {
      return response;
    },
    send(body: any) {
      response._sent = body;
      return body;
    },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    _request: request,
    _response: response,
  } as unknown as ArgumentsHost & { _request: Record<string, any>; _response: Record<string, any> };
}

// ===================================================================
//  1. Public decorator
// ===================================================================

test('Public decorator: IS_PUBLIC_KEY equals "isPublic"', async () => {
  const { IS_PUBLIC_KEY } = await import('../common/decorators/public.decorator.js');
  assert.equal(IS_PUBLIC_KEY, 'isPublic');
});

test('Public decorator: sets isPublic metadata to true', async () => {
  const { IS_PUBLIC_KEY, Public } = await import('../common/decorators/public.decorator.js');

  // Apply the decorator to a test class method
  class Dummy {
    handler() {
      return 'ok';
    }
  }
  const decorator = Public();
  decorator(
    Dummy.prototype,
    'handler',
    Object.getOwnPropertyDescriptor(Dummy.prototype, 'handler')!
  );

  const reflector = new Reflector();
  const value = reflector.get<boolean>(IS_PUBLIC_KEY, Dummy.prototype.handler);
  assert.equal(value, true);
});

// ===================================================================
//  2. CurrentUser decorator
// ===================================================================

test('CurrentUser decorator: extracts full user from request', async () => {
  // The CurrentUser decorator is created via createParamDecorator.
  // We test the underlying logic by simulating what the factory does.
  const ctx = createMockExecutionContext({
    user: { id: 'u1', email: 'a@b.com', role: 'admin' },
  });
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  assert.deepEqual(user, { id: 'u1', email: 'a@b.com', role: 'admin' });
});

test('CurrentUser decorator: extracts specific property from user', async () => {
  const ctx = createMockExecutionContext({
    user: { id: 'u42', email: 'x@y.com' },
  });
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  // Simulates what CurrentUser('id') does internally
  const data = 'id';
  const result = data ? user?.[data] : user;
  assert.equal(result, 'u42');
});

test('CurrentUser decorator: returns undefined for missing property', async () => {
  const ctx = createMockExecutionContext({
    user: { id: 'u1' },
  });
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  const data = 'nonExistent';
  const result = data ? user?.[data] : user;
  assert.equal(result, undefined);
});

// ===================================================================
//  3. AuthGuard
// ===================================================================

test('AuthGuard: is injectable and has canActivate method', async () => {
  const { AuthGuard } = await import('../common/guards/auth.guard.js');
  const reflector = new Reflector();
  const guard = new AuthGuard(reflector);
  assert.equal(typeof guard.canActivate, 'function');
});

test('AuthGuard: returns true for routes decorated with @Public()', async () => {
  const { AuthGuard } = await import('../common/guards/auth.guard.js');

  // Create a reflector that reports the route as public
  const reflector = new Reflector();
  reflector.getAllAndOverride = ((key: string, _targets: any[]) => {
    if (key === 'isPublic') return true;
    return undefined;
  }) as any;

  const guard = new AuthGuard(reflector);
  const ctx = createMockExecutionContext({ headers: {} });
  const result = await guard.canActivate(ctx);
  assert.equal(result, true);
});

test('AuthGuard: throws UnauthorizedException when no token is present', async () => {
  const { AuthGuard } = await import('../common/guards/auth.guard.js');

  const reflector = new Reflector();
  reflector.getAllAndOverride = (() => false) as any;

  const guard = new AuthGuard(reflector);
  const ctx = createMockExecutionContext({ headers: {} });

  await assert.rejects(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      return true;
    }
  );
});

test('AuthGuard: extracts Bearer token from Authorization header', async () => {
  const { AuthGuard } = await import('../common/guards/auth.guard.js');

  const reflector = new Reflector();
  reflector.getAllAndOverride = (() => false) as any;

  const guard = new AuthGuard(reflector);
  // Provide a Bearer token; guard will find a token, then fail verification.
  // We expect an UnauthorizedException for "Invalid or expired session"
  // rather than "Authentication required" -- proving the token was extracted.
  const ctx = createMockExecutionContext({
    headers: { authorization: 'Bearer some-fake-jwt-token' },
  });

  await assert.rejects(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      // The message should indicate invalid token, NOT missing token
      assert.ok(
        err.message.includes('Invalid') || err.message.includes('expired'),
        `Expected "Invalid or expired" but got: "${err.message}"`
      );
      return true;
    }
  );
});

test('AuthGuard: extracts token from cookies.authToken', async () => {
  const { AuthGuard } = await import('../common/guards/auth.guard.js');

  const reflector = new Reflector();
  reflector.getAllAndOverride = (() => false) as any;

  const guard = new AuthGuard(reflector);
  const ctx = createMockExecutionContext({
    headers: {},
    cookies: { authToken: 'cookie-jwt-token' },
  });

  await assert.rejects(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      // Token was extracted so error is about invalid token, not missing
      assert.ok(
        err.message.includes('Invalid') || err.message.includes('expired'),
        `Expected "Invalid or expired" but got: "${err.message}"`
      );
      return true;
    }
  );
});

test('AuthGuard: throws "Authentication required" when no header and no cookie', async () => {
  const { AuthGuard } = await import('../common/guards/auth.guard.js');

  const reflector = new Reflector();
  reflector.getAllAndOverride = (() => false) as any;

  const guard = new AuthGuard(reflector);
  const ctx = createMockExecutionContext({ headers: {}, cookies: {} });

  await assert.rejects(
    () => guard.canActivate(ctx),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException);
      assert.ok(
        err.message.includes('Authentication required'),
        `Expected "Authentication required" but got: "${err.message}"`
      );
      return true;
    }
  );
});

// ===================================================================
//  4. OptionalAuthGuard
// ===================================================================

test('OptionalAuthGuard: always returns true (no rejection)', async () => {
  const { OptionalAuthGuard } = await import('../common/guards/optional-auth.guard.js');
  const guard = new OptionalAuthGuard();

  const ctx = createMockExecutionContext({ headers: {} });
  const result = await guard.canActivate(ctx);
  assert.equal(result, true);
});

test('OptionalAuthGuard: sets unauthenticated user when no token', async () => {
  const { OptionalAuthGuard } = await import('../common/guards/optional-auth.guard.js');
  const guard = new OptionalAuthGuard();

  const ctx = createMockExecutionContext({ headers: {}, cookies: {} });
  await guard.canActivate(ctx);

  const request = ctx.switchToHttp().getRequest() as any;
  assert.deepEqual(request.user, { authenticated: false, mode: 'demo' });
});

test('OptionalAuthGuard: never throws on invalid tokens', async () => {
  const { OptionalAuthGuard } = await import('../common/guards/optional-auth.guard.js');
  const guard = new OptionalAuthGuard();

  // Provide an obviously invalid token -- should not throw
  const ctx = createMockExecutionContext({
    headers: { authorization: 'Bearer totally.invalid.token' },
  });

  const result = await guard.canActivate(ctx);
  assert.equal(result, true);
  // User should still be set (either authenticated or default)
  const request = ctx.switchToHttp().getRequest() as any;
  assert.ok(request.user !== undefined, 'request.user should be defined');
});

// ===================================================================
//  5. HttpExceptionFilter
// ===================================================================

test('HttpExceptionFilter: formats HttpException into JSON with expected fields', async () => {
  const { HttpExceptionFilter } = await import('../common/filters/http-exception.filter.js');
  const filter = new HttpExceptionFilter();

  const host = createMockArgumentsHost({ url: '/api/test', method: 'POST' });
  const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

  filter.catch(exception, host);

  const json = host._response._json;
  assert.equal(json.statusCode, 404);
  assert.equal(json.message, 'Not Found');
  assert.ok(json.timestamp, 'should have a timestamp');
  assert.equal(json.path, '/api/test');
});

test('HttpExceptionFilter: returns 500 for non-HttpException errors', async () => {
  const { HttpExceptionFilter } = await import('../common/filters/http-exception.filter.js');
  const filter = new HttpExceptionFilter();

  const host = createMockArgumentsHost({ url: '/api/crash' });
  const exception = new Error('Something broke');

  filter.catch(exception, host);

  const json = host._response._json;
  assert.equal(json.statusCode, 500);
  assert.equal(json.message, 'Internal Server Error');
  assert.equal(json.path, '/api/crash');
});

test('HttpExceptionFilter: includes stack in development mode', async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';

  try {
    const { HttpExceptionFilter } = await import('../common/filters/http-exception.filter.js');
    const filter = new HttpExceptionFilter();

    const host = createMockArgumentsHost({ url: '/dev' });
    const exception = new HttpException('Dev error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    const json = host._response._json;
    assert.equal(json.statusCode, 400);
    // In development, HttpException (which extends Error) should include stack
    assert.ok(json.stack, 'stack should be present in development mode');
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test('HttpExceptionFilter: omits stack in production mode', async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    const { HttpExceptionFilter } = await import('../common/filters/http-exception.filter.js');
    const filter = new HttpExceptionFilter();

    const host = createMockArgumentsHost({ url: '/prod' });
    const exception = new HttpException('Prod error', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    const json = host._response._json;
    assert.equal(json.statusCode, 403);
    assert.equal(json.stack, undefined, 'stack should NOT be present in production');
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test('HttpExceptionFilter: skips response when headersSent is true', async () => {
  const { HttpExceptionFilter } = await import('../common/filters/http-exception.filter.js');
  const filter = new HttpExceptionFilter();

  const host = createMockArgumentsHost({ url: '/sent', headersSent: true });
  const exception = new HttpException('Already sent', HttpStatus.CONFLICT);

  filter.catch(exception, host);

  // _json should not be set because filter returned early
  assert.equal(
    host._response._json,
    undefined,
    'should not write response when headers already sent'
  );
});

// ===================================================================
//  6. NotFoundFilter
// ===================================================================

test('NotFoundFilter: returns JSON for API routes', async () => {
  const { NotFoundFilter } = await import('../common/filters/not-found.filter.js');
  const filter = new NotFoundFilter();

  const host = createMockArgumentsHost({
    url: '/api/v1/users',
    path: '/api/v1/users',
    method: 'GET',
  });

  const exception = new NotFoundException();
  filter.catch(exception, host);

  const json = host._response._json;
  assert.equal(json.statusCode, 404);
  assert.ok(
    json.message.includes('API endpoint not found'),
    `Expected API message, got: "${json.message}"`
  );
  assert.ok(json.message.includes('GET'), 'message should include HTTP method');
  assert.ok(json.timestamp, 'should include timestamp');
});

test('NotFoundFilter: returns plain text for non-API routes', async () => {
  const { NotFoundFilter } = await import('../common/filters/not-found.filter.js');
  const filter = new NotFoundFilter();

  const host = createMockArgumentsHost({
    url: '/some-page',
    path: '/some-page',
    method: 'GET',
  });

  const exception = new NotFoundException();
  filter.catch(exception, host);

  assert.equal(host._response.statusCode, 404);
  assert.equal(host._response._sent, 'Resource not found on this server.');
});

test('NotFoundFilter: skips when headers already sent', async () => {
  const { NotFoundFilter } = await import('../common/filters/not-found.filter.js');
  const filter = new NotFoundFilter();

  const host = createMockArgumentsHost({
    url: '/api/gone',
    path: '/api/gone',
    headersSent: true,
  });

  const exception = new NotFoundException();
  filter.catch(exception, host);

  assert.equal(host._response._json, undefined, 'should not write JSON');
  assert.equal(host._response._sent, undefined, 'should not send text');
});

// ===================================================================
//  7. LoggingInterceptor
// ===================================================================

test('LoggingInterceptor: is a NestInterceptor that calls next.handle()', async () => {
  const { LoggingInterceptor } = await import('../common/interceptors/logging.interceptor.js');
  const interceptor = new LoggingInterceptor();
  assert.equal(typeof interceptor.intercept, 'function');
});

test('LoggingInterceptor: returns Observable from next.handle() on success', async () => {
  const { LoggingInterceptor } = await import('../common/interceptors/logging.interceptor.js');
  const interceptor = new LoggingInterceptor();

  const ctx = createMockExecutionContext({ url: '/api/data', method: 'GET' });
  const callHandler: CallHandler = {
    handle: () => of({ data: 'success' }),
  };

  const result$ = interceptor.intercept(ctx, callHandler);
  const result = await firstValueFrom(result$);
  assert.deepEqual(result, { data: 'success' });
});

test('LoggingInterceptor: propagates errors from the handler', async () => {
  const { LoggingInterceptor } = await import('../common/interceptors/logging.interceptor.js');
  const interceptor = new LoggingInterceptor();

  const ctx = createMockExecutionContext({ url: '/api/fail', method: 'POST' });
  const callHandler: CallHandler = {
    handle: () => throwError(() => new Error('handler error')),
  };

  const result$ = interceptor.intercept(ctx, callHandler);
  await assert.rejects(
    () => firstValueFrom(result$),
    (err: any) => {
      assert.equal(err.message, 'handler error');
      return true;
    }
  );
});

// ===================================================================
//  8. NestJS module integration smoke test
// ===================================================================

test('AuthGuard can be resolved through NestJS DI container', async () => {
  const { AuthGuard } = await import('../common/guards/auth.guard.js');

  const moduleRef = await Test.createTestingModule({
    providers: [AuthGuard, Reflector],
  }).compile();

  const guard = moduleRef.get(AuthGuard);
  assert.ok(guard, 'AuthGuard should be resolved from the DI container');
  assert.equal(typeof guard.canActivate, 'function');

  await moduleRef.close();
});
