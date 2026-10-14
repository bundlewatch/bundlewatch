import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('every literal application route is reachable through the API Gateway allowlist', async () => {
  const app = await readFile(new URL('../../src/app.ts', import.meta.url), 'utf8');
  const template = await readFile(new URL('../../template.yaml', import.meta.url), 'utf8');
  // Check the contract across the two layers, including new application routes.
  // Parameterized routes are exercised by the deployed smoke checks separately.
  const routes = [...app.matchAll(/method: '(GET|POST)',\s+path: '([^']+)'/g)];
  assert.ok(routes.length > 0, 'No application routes found');
  for (const [, method, path] of routes) {
    const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const verb of method === 'GET' ? ['GET', 'HEAD'] : [method]) {
      assert.match(
        template,
        new RegExp(`Path: ['"]?${escaped}['"]?,?\\s+Method: ${verb}\\b`),
        `${verb} ${path} missing from SAM`,
      );
    }
  }
});
