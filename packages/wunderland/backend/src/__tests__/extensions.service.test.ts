import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listExtensions,
  listAvailableTools,
  loadExtensionsRegistry,
  invalidateRegistryCache,
} from '../integrations/agentos/extensions.service.js';

test('loadExtensionsRegistry returns a valid registry', async () => {
  invalidateRegistryCache();
  const reg = await loadExtensionsRegistry();
  assert.ok(reg);
  assert.equal(typeof reg.version, 'string');
  assert.ok(Array.isArray(reg.extensions.curated));
});

test('listExtensions includes curated Web Search extension', async () => {
  const exts = await listExtensions();
  assert.ok(Array.isArray(exts));
  const webSearch = exts.find(
    (e) => e.id === 'com.framers.research.web-search' || e.name.toLowerCase().includes('web search')
  );
  assert.ok(webSearch, 'Expected to find Web Search extension in registry');
  assert.equal(webSearch?.package, '@framers/agentos-ext-web-search');
  // Verify verification metadata passthrough
  assert.equal(webSearch?.verified, true);
  assert.ok(webSearch?.verifiedAt);
  assert.ok(webSearch?.verificationChecklistVersion);
});

test('listAvailableTools derives tools from registry entries', async () => {
  const tools = await listAvailableTools();
  assert.ok(Array.isArray(tools));
  // The curated web-search extension declares "web_search"
  const tool = tools.find((t) => t.id === 'web_search');
  assert.ok(tool, 'Expected to find web_search tool');
  assert.equal(tool?.extension, '@framers/agentos-ext-web-search');
});
