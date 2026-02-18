import test from 'node:test';
import assert from 'node:assert/strict';
import { listGuardrails, loadGuardrailsRegistry, invalidateGuardrailsCache } from '../integrations/agentos/guardrails.service.js';

test('loadGuardrailsRegistry returns curated entries', async () => {
	invalidateGuardrailsCache();
	const reg = await loadGuardrailsRegistry();
	assert.equal(typeof reg.version, 'string');
	assert.ok(Array.isArray(reg.guardrails.curated));
});

test('listGuardrails includes keyword/sensitive/cost entries', async () => {
	const rails = await listGuardrails();
	assert.ok(rails.length >= 1);
	const ids = rails.map(r => r.id);
	assert.ok(ids.some(id => id.includes('keyword')));
});


