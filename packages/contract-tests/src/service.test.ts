// oxlint-disable no-await-in-loop -- Isolation tests observe shared state between sequential requests.
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';

import { createApp } from '@bundlewatch/service/app.ts';
import { MemoryBaselineStore } from '@bundlewatch/service/stores/baseline-store.ts';
import { MemoryResultsStore } from '@bundlewatch/service/stores/results-store.ts';

import { createProject, LEGACY_CLIS, runCli, startWorld, type World } from './harness.ts';

// Both CLIs against the new service, in memory: 0.4.2 must keep working with
// it for as long as people pin it, and the new CLI must get short links.

type Listener = (request: IncomingMessage, response: ServerResponse) => Promise<void> | void;

const listen = async (listener: Listener): Promise<{ url: string; close: () => Promise<void> }> => {
  const server = createServer(listener);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
};

let strictUnavailable = false;
let world: World;
let github: Awaited<ReturnType<typeof listen>>;
let service: Awaited<ReturnType<typeof listen>>;
const baselineStore = new MemoryBaselineStore();
const resultsStore = new MemoryResultsStore();

before(async () => {
  world = await startWorld();

  // What the service asks GitHub: the token may push to owner/repo.
  github = await listen((request, response) => {
    const path = request.url ?? '';
    if (strictUnavailable && path === '/repos/owner/repo') {
      response.writeHead(503);
      response.end('{}');
      return;
    }
    const body =
      path === '/repos/owner/repo'
        ? { permissions: { push: true } }
        : path.startsWith('/repos/owner/repo/statuses/')
          ? []
          : undefined;
    response.writeHead(body ? 200 : 404, {
      'content-type': 'application/json',
    });
    response.end(JSON.stringify(body ?? { message: 'Not Found' }));
  });

  const app = createApp({
    baselineStore,
    resultsStore,
    config: { githubApiUrl: github.url },
    logger: { error: () => {}, warn: () => {} },
  });
  service = await listen(async (incoming, outgoing) => {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) chunks.push(chunk as Buffer);
    const hasBody = incoming.method !== 'GET' && incoming.method !== 'HEAD';
    const response = await app(
      new Request(`http://${incoming.headers.host}${incoming.url}`, {
        method: incoming.method ?? 'GET',
        headers: incoming.headers as Record<string, string>,
        body: hasBody ? Buffer.concat(chunks) : undefined,
      }),
    );
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
});

after(async () => {
  await Promise.all([world.close(), github.close(), service.close()]);
});

const env = (branch: string): Record<string, string> => ({
  CI: 'true',
  CI_REPO_OWNER: 'owner',
  CI_REPO_NAME: 'repo',
  CI_COMMIT_SHA: 'abc123',
  CI_BRANCH: branch,
  CI_BRANCH_BASE: 'master',
  BUNDLEWATCH_GITHUB_TOKEN: 'token',
});

const project = (files: object[]): string =>
  createProject({
    'package.json': JSON.stringify({
      bundlewatch: { files, bundlewatchServiceHost: service.url },
    }),
  });

/** The link the last run put on its final GitHub status, as sent. */
const lastStatusLink = (): string => {
  const status = world.captured
    .filter((request) => request.target === 'github')
    .map((request) => request.body as { target_url?: string })
    .findLast((body) => body.target_url);
  assert.ok(status?.target_url, 'no status with a link');
  return status.target_url;
};

for (const version of Object.keys(LEGACY_CLIS)) {
  describe(`bundlewatch ${version} against the new service`, () => {
    test('saves a baseline, compares with it, and its links render', async () => {
      const cwd = project([{ path: './images/*.jpg', maxSize: '1MB' }]);

      const saved = await runCli(version, world, cwd, [], env('master'));
      assert.equal(saved.status, 0);
      assert.ok(saved.stdout.includes('[INFO] Saving results'));
      assert.ok(
        !saved.stderr.some((line) => line.includes('Unable to save')),
        saved.stderr.join('\n'),
      );

      const compared = await runCli(version, world, cwd, [], env('feature'));
      assert.equal(compared.status, 0);
      assert.ok(
        !compared.stderr.some((line) => line.includes('Unable to fetch')),
        compared.stderr.join('\n'),
      );
      assert.ok(
        compared.stdout.some((line) => line.includes('(no difference) (gzip)')),
        compared.stdout.join('\n'),
      );

      const link = lastStatusLink();
      assert.ok(link.startsWith(`${service.url}/results?d=`));
      const page = await fetch(link);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /test-file-1\.jpg/);
    });

    test('links with an unlimited maxSize render (0.x services rejected them)', async () => {
      const cwd = project([{ path: './images/test-file-1.jpg' }]);
      await runCli(version, world, cwd, [], env('feature'));
      const link = lastStatusLink();
      assert.match(decodeURIComponent(link), /Infinity/);
      const page = await fetch(link);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /no limit/i);
    });
  });
}

describe('the new CLI against the new service', () => {
  test('two applications compare against their own PR base branch and never save PR baselines', async () => {
    const filePath = './images/test-file-1.jpg';
    for (const [index, prefix] of [undefined, 'storefront', 'admin'].entries()) {
      for (const repoBranch of ['release/apps', 'master']) {
        await baselineStore.save({
          repo: 'owner/repo',
          repoBranch,
          ...(prefix === undefined ? {} : { prefix }),
          fileDetailsByPath: {
            [filePath]: {
              size: (index + 1) * (repoBranch === 'master' ? 100 : 1000),
              maxSize: null,
              compression: 'none',
            },
          },
        });
      }
    }
    for (const [index, prefix] of [undefined, 'storefront', 'admin'].entries()) {
      const fields = prefix === undefined ? {} : { prefix };
      const cwd = createProject({
        'bundlewatch.config.mjs': `export default ${JSON.stringify({
          ...fields,
          files: [{ path: filePath }],
          defaultCompression: 'none',
          bundlewatchServiceHost: service.url,
        })}`,
      });
      const outcome = await runCli('new', world, cwd, [], {
        ...env('master'),
        CI_EVENT: 'pull_request',
        CI_BRANCH_BASE: 'release/apps',
      });
      assert.equal(outcome.status, 0, outcome.stderr.join('\n'));
      const statuses = world.captured
        .filter(({ target }) => target === 'github')
        .map(({ body }) => body as { context: string; state: string });
      const expectedContext = prefix === undefined ? 'bundlewatch' : `${prefix}/bundlewatch`;
      assert.deepEqual(
        statuses.map(({ context, state }) => [state, context]),
        [
          ['pending', expectedContext],
          ['success', expectedContext],
        ],
      );
      const id = new URL(lastStatusLink()).pathname.split('/').at(-1)!;
      const result = await resultsStore.get(id);
      assert.equal(result?.payload.details.prefix, prefix);
      assert.equal(result?.payload.details.repoBranchBase, 'release/apps');
      assert.equal(result?.payload.results.fullResults[0]?.baseBranchSize, (index + 1) * 1000);
      assert.equal(result?.payload.results.fullResults[0]?.filePath, filePath);
    }
    for (const [index, prefix] of [undefined, 'storefront', 'admin'].entries()) {
      const base = await baselineStore.get('owner/repo', 'release/apps', prefix);
      const head = await baselineStore.get('owner/repo', 'master', prefix);
      assert.equal(
        (base?.fileDetailsByPath?.[filePath] as { size: number } | undefined)?.size,
        (index + 1) * 1000,
      );
      assert.equal(
        (head?.fileDetailsByPath?.[filePath] as { size: number } | undefined)?.size,
        (index + 1) * 100,
      );
    }
  });

  test('prefixed tracked builds save independent baselines and report per-file failures', async () => {
    const filePath = './images/test-file-1.jpg';
    const legacy = await baselineStore.get('owner/repo', 'master');
    for (const [prefix, compression] of [
      ['storefront', 'gzip'],
      ['admin', 'none'],
    ]) {
      const cwd = createProject({
        'package.json': JSON.stringify({
          bundlewatch: {
            prefix,
            files: [{ path: filePath, maxSize: 1 }],
            defaultCompression: compression,
            bundlewatchServiceHost: service.url,
          },
        }),
      });
      const outcome = await runCli('new', world, cwd, [], env('master'));
      assert.equal(outcome.status, 1);
      const statuses = world.captured
        .filter(({ target }) => target === 'github')
        .map(({ body }) => body as { context: string; state: string });
      assert.deepEqual(
        statuses.map(({ context, state }) => [state, context]),
        [
          ['pending', `${prefix}/bundlewatch`],
          ['failure', `${prefix}/bundlewatch`],
          ['failure', `${prefix}/bundlewatch ${filePath}`],
        ],
      );
    }
    const storefront = await baselineStore.get('owner/repo', 'master', 'storefront');
    const admin = await baselineStore.get('owner/repo', 'master', 'admin');
    assert.equal(
      (storefront?.fileDetailsByPath?.[filePath] as { size: number } | undefined)?.size,
      38995,
    );
    assert.equal(
      (admin?.fileDetailsByPath?.[filePath] as { size: number } | undefined)?.size,
      38962,
    );
    assert.deepEqual(await baselineStore.get('owner/repo', 'master'), legacy);
  });
  test('gets a short link that renders the results', async () => {
    const cwd = project([{ path: './images/*.jpg', maxSize: '1MB' }]);
    const outcome = await runCli('new', world, cwd, [], env('feature'));
    assert.equal(outcome.status, 0);

    const link = lastStatusLink();
    assert.match(link, new RegExp(`^${service.url}/r/[0-9A-Za-z]{22}$`));
    assert.ok(outcome.stdout.includes(`Result breakdown at: ${link}`));
    const page = await fetch(link);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /test-file-2\.jpg/);
  });
});

for (const version of Object.keys(LEGACY_CLIS)) {
  test(`${version} saves in report mode while the strict GitHub endpoint is unavailable`, async () => {
    strictUnavailable = true;
    try {
      const cwd = project([{ path: './images/test-file-1.jpg', maxSize: '1MB' }]);
      const outcome = await runCli(version, world, cwd, [], env('master'));
      assert.equal(outcome.status, 0);
      assert.ok(outcome.stdout.includes('[INFO] Saving results'));
      assert.ok(
        !outcome.stderr.some((line) => line.includes('Unable to save')),
        outcome.stderr.join('\n'),
      );
      const compared = await runCli(version, world, cwd, [], env('feature'));
      assert.ok(compared.stdout.some((line) => line.includes('(no difference) (gzip)')));
    } finally {
      strictUnavailable = false;
    }
  });
}
