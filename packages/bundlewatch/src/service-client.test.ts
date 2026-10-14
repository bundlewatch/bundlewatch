// oxlint-disable no-await-in-loop -- Isolation tests observe shared state between sequential requests.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodeResultsData } from '@bundlewatch/core';

import { logger } from './logger.ts';
import { ServiceClient } from './service-client.ts';
import { startFakeServer } from './test-helpers.ts';

const ci = {
  repoOwner: 'o',
  repoName: 'r',
  commitSha: 'abc',
  githubAccessToken: 'token',
  repoCurrentBranch: 'main',
  repoBranchBase: 'main',
  trackBranches: ['main'],
  isPullRequest: false,
};

const files = {
  'a.js': { size: 123, maxSize: 200, compression: 'gzip' as const },
};

for (const prefix of ['storefront', 'admin']) {
  test(`${prefix}: confirms support before lookups and saves, and carries results metadata`, async (t) => {
    const server = await startFakeServer({
      'POST /capabilities': () => ({ status: 200, body: { baselinePrefix: 1 } }),
      'POST /store/prefixed/lookup': () => ({
        status: 200,
        body: { prefix, fileDetailsByPath: files },
      }),
      'POST /store/prefixed': () => ({ status: 200, body: { prefix } }),
    });
    t.after(() => server.close());
    const client = new ServiceClient({ bundlewatchServiceHost: server.url, ci, prefix });
    assert.deepEqual(await client.getBaseline(), files);
    await client.saveBaseline(files);
    const url = await client.getResultsUrl({ status: 'pass', summary: 'ok', fullResults: [] });
    assert.ok(url);
    assert.deepEqual(
      server.requests.map(({ path }) => path),
      ['/capabilities', '/store/prefixed/lookup', '/store/prefixed', '/results'],
    );
    assert.deepEqual(server.requests[0]?.body, {}, 'probe contains no GitHub credentials');
    for (const request of server.requests.slice(1)) {
      assert.equal((request.body as { prefix: string }).prefix, prefix);
    }
    assert.equal(
      (server.requests[3]!.body as { payload: { details: { prefix: string } } }).payload.details
        .prefix,
      prefix,
    );
    assert.equal(
      (
        decodeResultsData(new URL(url).searchParams.get('d') ?? '') as {
          details: { prefix: string };
        }
      ).details.prefix,
      prefix,
    );
  });
}

for (const response of [
  { status: 404 },
  { status: 405 },
  { status: 500 },
  { status: 200, body: {} },
  { status: 200, body: null },
  { status: 200, body: { baselinePrefix: true } },
  { status: 200, body: { baselinePrefix: '1' } },
  { status: 200, body: { baselinePrefix: 2 } },
]) {
  test(`unsupported service ${JSON.stringify(response)} cannot access any baseline`, async (t) => {
    // Deliberately accepts and ignores unknown fields, like a permissive old service.
    const server = await startFakeServer({
      'POST /capabilities': () => response,
      'POST *': () => ({ status: 200, body: { fileDetailsByPath: files } }),
    });
    t.after(() => server.close());
    for (const operation of ['getBaseline', 'saveBaseline'] as const) {
      const client = new ServiceClient({
        bundlewatchServiceHost: server.url.replace('://', '://user:password@'),
        ci,
        prefix: 'storefront',
      });
      await assert.rejects(client[operation](files), (error: Error) => {
        assert.match(error.message, /Cannot confirm prefix support.*storefront/);
        assert.match(error.message, /Deploy a service.*POST \/capabilities/);
        assert.doesNotMatch(error.message, /user:password/);
        return true;
      });
    }
    assert.deepEqual(
      server.requests.map(({ path }) => path),
      ['/capabilities', '/capabilities'],
    );
  });
}

test('invalid prefixes are rejected before requests, and disabled services do not probe', async () => {
  for (const prefix of ['', null, 'a/b', 'Storefront', 'a\n']) {
    assert.throws(
      () =>
        new ServiceClient({
          bundlewatchServiceHost: 'https://unused.test',
          ci,
          prefix: prefix as string,
        }),
      /prefix must be/,
    );
  }
  const client = new ServiceClient({ bundlewatchServiceHost: null, ci, prefix: 'storefront' });
  assert.deepEqual(await client.getBaseline(), {});
  await client.saveBaseline(files);
  assert.equal(
    await client.getResultsUrl({ status: 'pass', summary: 'ok', fullResults: [] }),
    undefined,
  );
});

for (const status of [403, 404, 405]) {
  test(`an older instance (${status}) after a successful probe cannot read or overwrite legacy baselines`, async (t) => {
    const server = await startFakeServer({
      'POST /capabilities': () => ({ status: 200, body: { baselinePrefix: 1 } }),
      'POST /store/prefixed*': () => ({ status }),
      // Only the legacy routes exist on this instance.
      'POST /store/lookup': () => ({ status: 200, body: { fileDetailsByPath: files } }),
      'POST /store': () => ({ status: 200, body: {} }),
    });
    t.after(() => server.close());
    const client = new ServiceClient({
      bundlewatchServiceHost: server.url,
      ci,
      prefix: 'storefront',
    });
    await assert.rejects(client.getBaseline(), /Cannot confirm prefix support/);
    await assert.rejects(client.saveBaseline(files), /Cannot confirm prefix support/);
    assert.deepEqual(
      server.requests.map(({ path }) => path),
      ['/capabilities', '/store/prefixed/lookup', '/store/prefixed'],
    );
  });
}

test('a missing prefixed baseline is empty, but a mismatched namespace stops the run', async (t) => {
  let prefix = 'storefront';
  const server = await startFakeServer({
    'POST /capabilities': () => ({ status: 200, body: { baselinePrefix: 1 } }),
    'POST /store/prefixed/lookup': () => ({ status: 404, body: { prefix } }),
  });
  t.after(() => server.close());
  const client = new ServiceClient({
    bundlewatchServiceHost: server.url,
    ci,
    prefix: 'storefront',
  });
  assert.deepEqual(await client.getBaseline(), {});
  prefix = 'admin';
  await assert.rejects(client.getBaseline(), /Cannot confirm prefix support/);
});

test('Basic-authenticated services accept lookups, saves and short links', async (t) => {
  const authorization = `Basic ${Buffer.from('us@er:p:ass').toString('base64')}`;
  const server = await startFakeServer({
    'POST *': (request) => {
      if (request.headers.authorization !== authorization) return { status: 401 };
      return {
        status: 200,
        body:
          request.path === '/store/lookup'
            ? { fileDetailsByPath: files }
            : { url: 'https://service.test/r/abc' },
      };
    },
  });
  t.after(() => server.close());
  const host = new URL(server.url);
  host.username = 'us%40er';
  host.password = 'p%3Aass';
  const client = new ServiceClient({
    bundlewatchServiceHost: host.href.replace(/\/$/, ''),
    ci,
  });
  assert.deepEqual(await client.getBaseline(), files);
  await client.saveBaseline(files);
  assert.equal(
    await client.getResultsUrl({
      status: 'pass',
      summary: 'ok',
      fullResults: [],
    }),
    'https://service.test/r/abc',
  );
  assert.deepEqual(
    server.requests.map((request) => request.path),
    ['/store/lookup', '/store', '/results'],
  );
  assert.ok(server.requests[1]);
  assert.deepEqual(
    (server.requests[1].body as { fileDetailsByPath: unknown }).fileDetailsByPath,
    files,
  );
});

test('long results links leave out Basic credentials', async (t) => {
  // A service older than 1.0: no short links.
  const server = await startFakeServer({});
  t.after(() => server.close());
  const client = new ServiceClient({
    bundlewatchServiceHost: server.url.replace('://', '://user:password@') + '/svc',
    ci,
  });
  const url = await client.getResultsUrl({ status: 'pass', summary: 'ok', fullResults: [] });
  assert.ok(url?.startsWith(`${server.url}/svc/results?d=`), url);
  assert.equal(server.requests[0]?.path, '/svc/results', 'the request still authenticates');
});

test('lookup failures redact Basic credentials from error and debug logs', async (t) => {
  const server = await startFakeServer({});
  t.after(() => server.close());
  const logs: unknown[] = [];
  t.mock.method(logger, 'error', (value: unknown) => logs.push(value));
  t.mock.method(logger, 'debug', (value: unknown) => logs.push(value));
  const client = new ServiceClient({
    bundlewatchServiceHost: server.url.replace('://', '://user:password@'),
    ci,
  });
  assert.deepEqual(await client.getBaseline(), {});
  assert.doesNotMatch(logs.map(String).join('\n'), /user|password/);
  assert.match(logs.map(String).join('\n'), /code=404/);
});
