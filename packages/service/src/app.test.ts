// oxlint-disable no-await-in-loop -- Isolation tests observe shared state between sequential requests.
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';

import {
  type AttributeValue,
  ConditionalCheckFailedException,
  type DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { createResultsPayload, createResultsUrl } from '@bundlewatch/core';

import { type AppConfig, type AppDeps, createApp } from './app.ts';
import { COPY_SCRIPT_HASH } from './pages/setup-github-page.ts';
import { PAGE_CSS } from './static/page-styles.ts';
import { MemoryBaselineStore } from './stores/baseline-store.ts';
import { DynamoResultsStore } from './stores/dynamodb-results-store.ts';
import { MemoryResultsStore } from './stores/results-store.ts';
import {
  type FakeGitHub,
  type FakeRoutes,
  startFakeGitHub,
  unreachableUrl,
} from './test-helpers/fake-github.ts';
import { CAPTURED_LINK_DATA, CLI_0X_LINK_DATA } from './test-helpers/results-links.ts';

const NOW = Date.UTC(2026, 9, 12);
const CREDENTIALS = {
  repoOwner: 'o',
  repoName: 'r',
  commitSha: 'abc',
  githubAccessToken: 'tok',
};
const ALLOWED: FakeRoutes = {
  'GET /repos/o/r': { body: { permissions: { push: true } } },
  'GET /repos/o/r/statuses/abc': { body: [] },
};
// Can read the repository, but not write to it.
const DENIED: FakeRoutes = {
  'GET /repos/o/r': { body: { permissions: { push: false } } },
  'GET /repos/o/r/statuses/abc': { body: [] },
};

let github: FakeGitHub;

before(async () => {
  github = await startFakeGitHub();
});
after(() => github.close());
beforeEach(() => github.reset(ALLOWED));

const setup = ({
  config,
  ...deps
}: Partial<Omit<AppDeps, 'config'>> & { config?: AppConfig } = {}) => {
  const baselineStore = new MemoryBaselineStore();
  const resultsStore = new MemoryResultsStore();
  const errors: unknown[][] = [];
  const warnings: string[] = [];
  let now = NOW;
  const app = createApp({
    baselineStore,
    resultsStore,
    logger: {
      error: (...args) => errors.push(args),
      warn: (message) => warnings.push(String(message)),
    },
    now: () => now,
    ...deps,
    // Most tests check the stricter rules; report mode has its own.
    config: {
      githubApiUrl: github.url,
      writeAuthorization: 'enforce',
      ...config,
    },
  });
  const call = (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    app(
      new Request(`https://service.test${path}`, {
        method,
        headers: {
          'content-type': 'application/json;charset=utf-8',
          ...headers,
        },
        body: body === undefined || typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );
  return {
    app,
    call,
    baselineStore,
    resultsStore,
    errors,
    warnings,
    setNow: (value: number) => {
      now = value;
    },
  };
};

// The response fields these tests read.
type Body = {
  id: string;
  url: string;
  error: unknown;
  errors: { details: Array<{ message: string }> };
};
const readJson = async (response: Response): Promise<Body> => (await response.json()) as Body;

const githubRequests = () => github.requests.map((r) => `${r.method} ${r.path}`);

describe('GET /', () => {
  test('says hello', async () => {
    const response = await setup().call('GET', '/');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.equal(response.headers.get('vary'), 'Accept');
    assert.equal(await response.text(), '{"message":"hello world"}');
  });

  test('says hello to clients that accept anything, like curl', async () => {
    const response = await setup().call('GET', '/', undefined, { accept: '*/*' });
    assert.equal(await response.text(), '{"message":"hello world"}');
    assert.equal(response.headers.get('set-cookie'), null);
  });

  test('shows browsers what the service does, the authorize button and the deployed commit', async () => {
    const response = await setup({
      config: {
        commitSha: '4988746aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        githubClientId: '04fcf325dd26ca2a159f',
      },
    }).call('GET', '/', undefined, {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal(response.headers.get('vary'), 'Accept');
    assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'none'/);
    const page = await response.text();
    assert.match(page, /<title>bundlewatch service \| BundleWatch<\/title>/);
    assert.match(page, /href="https:\/\/bundlewatch.io\/guide\/getting-started"/);
    assert.match(page, /<svg class="bw-mark"/);
    assert.match(page, />4988746<\/a>/);
    // The same button as /setup-github, with a state for its callback.
    const cookie = response.headers.get('set-cookie') ?? '';
    const state = /^bundlewatch_oauth_state=([\w-]+);/.exec(cookie)?.[1];
    assert.ok(state, cookie);
    assert.match(cookie, /Path=\/setup-github; Max-Age=600; HttpOnly; Secure; SameSite=Lax/);
    assert.ok(
      page.includes(
        `href="${github.url}/login/oauth/authorize?scope=repo%3Astatus&amp;client_id=04fcf325dd26ca2a159f&amp;state=${state}"`,
      ),
    );
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  });

  test('answers HEAD without a body', async () => {
    const response = await setup().call('HEAD', '/');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
  });
});

describe('unknown routes', () => {
  for (const [method, path] of [
    ['GET', '/nope'],
    ['GET', '/store'],
    ['PUT', '/results'],
    ['GET', '/static/other.css'],
    ['GET', '/r/a/b'],
  ]) {
    test(`${method} ${path} is a JSON 404`, async () => {
      const response = await setup().call(method as string, path as string);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: 'Not found' });
    });
  }
});

const storeBody = {
  ...CREDENTIALS,
  repoBranch: 'main',
  fileDetailsByPath: {
    'dist/a.js': { size: 100, maxSize: null, compression: 'gzip' },
    'dist/b.js': { size: 50, maxSize: 1024, compression: 'brotli' },
  },
};

describe('application prefixes', () => {
  test('dedicated routes require a prefix and use the same isolated storage', async () => {
    const { call, baselineStore } = setup();
    assert.equal((await call('POST', '/store/prefixed', storeBody)).status, 422);
    assert.equal(
      (await call('POST', '/store/prefixed/lookup', { ...CREDENTIALS, repoBranch: 'main' })).status,
      422,
    );
    assert.equal(await baselineStore.get('o/r', 'main'), undefined);
    const missing = await call('POST', '/store/prefixed/lookup', {
      ...CREDENTIALS,
      repoBranch: 'main',
      prefix: 'storefront',
    });
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { prefix: 'storefront' });
    assert.equal(
      (await call('POST', '/store/prefixed', { ...storeBody, prefix: 'storefront' })).status,
      200,
    );
    assert.deepEqual(
      (await baselineStore.get('o/r', 'main', 'storefront'))?.fileDetailsByPath,
      storeBody.fileDetailsByPath,
    );
    assert.equal(await baselineStore.get('o/r', 'main'), undefined);
  });
  test('advertises support without repository credentials', async () => {
    const response = await setup().call('POST', '/capabilities', {});
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { baselinePrefix: 1 });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(githubRequests(), []);
  });

  test('isolates identical paths and branches from each other and from legacy baselines', async () => {
    const { call } = setup();
    const variants = [{}, { prefix: 'storefront' }, { prefix: 'admin' }];
    for (const [index, fields] of variants.entries()) {
      const missing = await call('POST', '/store/lookup', {
        ...CREDENTIALS,
        repoBranch: 'main',
        ...fields,
      });
      assert.equal(missing.status, 404, 'never falls back to another application');
      const saved = await call('POST', '/store', {
        ...storeBody,
        ...fields,
        fileDetailsByPath: {
          'dist/assets/app.js': { size: index + 1, maxSize: null, compression: 'gzip' },
        },
      });
      assert.equal(saved.status, 200);
      assert.equal(
        ((await saved.json()) as { prefix?: string }).prefix,
        (fields as { prefix?: string }).prefix,
      );
    }
    // Updating the storefront cannot change the admin or legacy namespace.
    await call('POST', '/store', {
      ...storeBody,
      prefix: 'storefront',
      fileDetailsByPath: {
        'dist/assets/app.js': { size: 20, maxSize: null, compression: 'gzip' },
      },
    });
    for (const [index, fields] of variants.entries()) {
      const response = await call('POST', '/store/lookup', {
        ...CREDENTIALS,
        repoBranch: 'main',
        ...fields,
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        ...fields,
        fileDetailsByPath: {
          'dist/assets/app.js': {
            size: index === 1 ? 20 : index + 1,
            maxSize: null,
            compression: 'gzip',
          },
        },
      });
    }
  });

  test('invalid prefixes cannot read or write baselines or results', async (t) => {
    const { call, baselineStore, resultsStore } = setup();
    await call('POST', '/store', storeBody);
    const save = t.mock.method(baselineStore, 'save');
    const create = t.mock.method(resultsStore, 'create');
    const baseline = await baselineStore.get('o/r', 'main');
    for (const prefix of [
      '',
      null,
      0,
      false,
      {},
      [],
      'Storefront',
      'a/b',
      'a\n',
      '-a',
      'a'.repeat(65),
    ]) {
      for (const path of [
        '/store',
        '/store/lookup',
        '/store/prefixed',
        '/store/prefixed/lookup',
        '/results',
        '/analyze',
      ]) {
        const body =
          path === '/store' || path === '/store/prefixed'
            ? { ...storeBody, prefix }
            : path.endsWith('/lookup')
              ? { ...CREDENTIALS, repoBranch: 'main', prefix }
              : path === '/results'
                ? {
                    ...CREDENTIALS,
                    prefix,
                    payload: {
                      details: { prefix },
                      results: { status: 'pass', summary: 'ok', fullResults: [] },
                    },
                  }
                : {
                    ...CREDENTIALS,
                    prefix,
                    repoBranch: 'main',
                    baseBranchName: 'main',
                    bundlewatchServiceHost: 'https://test',
                    currentBranchFileDetails: {},
                  };
        const response = await call('POST', path, body);
        assert.equal(response.status, 422, `${path}: ${JSON.stringify(prefix)}`);
      }
    }
    assert.deepEqual(await baselineStore.get('o/r', 'main'), baseline);
    assert.equal(await baselineStore.get('o/r', 'main', 'storefront'), undefined);
    assert.equal(save.mock.callCount(), 0);
    assert.equal(create.mock.callCount(), 0);
  });

  for (const prefix of [undefined, 'storefront', 'admin']) {
    test(`${prefix ?? 'legacy'} results round-trip through short and long links`, async () => {
      const { call, resultsStore } = setup();
      const fields = prefix === undefined ? {} : { prefix };
      const payload = createResultsPayload(
        { status: 'pass', summary: 'ok', fullResults: [] },
        {
          repoOwner: 'o',
          repoName: 'r',
          ...fields,
        },
      );
      const response = await call('POST', '/results', { ...CREDENTIALS, ...fields, payload });
      assert.equal(response.status, 201);
      const { id } = await readJson(response);
      assert.deepEqual((await resultsStore.get(id))?.payload, payload);
      const long = new URL(createResultsUrl({ host: 'https://service.test', ...payload }));
      for (const link of [`/r/${id}`, `${long.pathname}${long.search}`]) {
        const page = await call('GET', link);
        assert.equal(page.status, 200);
        const text = await page.text();
        if (prefix) {
          assert.ok(text.includes(`Application: <b>${prefix}</b>`));
          assert.ok(text.includes(`<title>${prefix} | `));
        } else assert.doesNotMatch(text, /Application:/);
      }
    });
  }

  test('results metadata must match the request prefix', async () => {
    const { call } = setup();
    const response = await call('POST', '/results', {
      ...CREDENTIALS,
      prefix: 'storefront',
      payload: {
        details: { prefix: 'admin' },
        results: { status: 'pass', summary: 'ok', fullResults: [] },
      },
    });
    assert.equal(response.status, 422);
  });

  test('prefixes do not change repository authorization', async () => {
    github.reset(DENIED);
    const { call } = setup();
    for (const prefix of ['storefront', 'admin']) {
      assert.equal((await call('POST', '/store', { ...storeBody, prefix })).status, 401);
    }
  });
});

describe('POST /store', () => {
  test('saves the baseline and answers like 0.x', async () => {
    const { call, baselineStore } = setup();
    const response = await call('POST', '/store', storeBody);
    assert.equal(response.status, 200);
    assert.equal(
      await response.text(),
      JSON.stringify({
        commitSha: 'abc',
        fileDetailsByPath: storeBody.fileDetailsByPath,
        repoBranch: 'main',
        repoName: 'r',
        repoOwner: 'o',
        timestamp: NOW,
      }),
    );
    assert.deepEqual(await baselineStore.get('o/r', 'main'), {
      repo: 'o/r',
      repoBranch: 'main',
      repoOwner: 'o',
      repoName: 'r',
      commitSha: 'abc',
      fileDetailsByPath: storeBody.fileDetailsByPath,
      timestamp: String(NOW),
    });
    assert.deepEqual(githubRequests(), ['GET /repos/o/r']);
    assert.equal(github.requests[0]?.headers.authorization, 'Bearer tok');
  });

  for (const [name, body] of [
    ['no token', { ...storeBody, githubAccessToken: undefined }],
    ['no commitSha', { ...storeBody, commitSha: '' }],
    ['a non-object body', 'true'],
    ['an empty body', undefined],
  ] as const) {
    test(`401 without asking GitHub: ${name}`, async () => {
      const response = await setup().call('POST', '/store', body);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'Not allowed' });
      assert.equal(github.requests.length, 0);
    });
  }

  test('401 when the token may not push', async () => {
    github.reset(DENIED);
    const { call, baselineStore } = setup();
    const response = await call('POST', '/store', storeBody);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Not allowed' });
    assert.equal(await baselineStore.get('o/r', 'main'), undefined);
  });

  test('authorizes before validating', async () => {
    github.reset(DENIED);
    const response = await setup().call('POST', '/store', CREDENTIALS);
    assert.equal(response.status, 401);
  });

  test('422 with Joi-style errors, e.g. for error entries', async () => {
    const response = await setup().call('POST', '/store', {
      ...storeBody,
      fileDetailsByPath: {
        'dist/*.js': { error: 'There is no matching file' },
      },
    });
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), {
      errors: {
        details: [
          {
            message: '"fileDetailsByPath.dist/*.js.compression" is required',
            path: ['fileDetailsByPath', 'dist/*.js', 'compression'],
            type: 'any.required',
            context: {
              label: 'fileDetailsByPath.dist/*.js.compression',
              key: 'compression',
            },
          },
        ],
      },
    });
  });

  test('400 for invalid JSON', async () => {
    const response = await setup().call('POST', '/store', '{"repoOwner":');
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Invalid JSON body' });
  });

  test('413 over 1 MB, before asking GitHub', async () => {
    const response = await setup().call('POST', '/store', {
      ...storeBody,
      padding: 'x'.repeat(1024 * 1024),
    });
    assert.equal(response.status, 413);
    assert.equal(github.requests.length, 0);
  });

  test('503 when GitHub is unreachable', async () => {
    const { call, errors } = setup({
      config: { githubApiUrl: await unreachableUrl() },
    });
    const response = await call('POST', '/store', storeBody);
    assert.equal(response.status, 503);
    assert.ok((await readJson(response)).error);
    assert.equal(errors.length, 1);
  });

  test('500 when the write fails, because it is awaited', async () => {
    const failing = new MemoryBaselineStore();
    failing.save = () => Promise.reject(new Error('ProvisionedThroughputExceeded'));
    const { call, errors } = setup({ baselineStore: failing });
    const response = await call('POST', '/store', storeBody);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: 'Internal server error',
    });
    assert.equal(errors.length, 1);
  });
});

describe('POST /store size limit', () => {
  test('413 for a baseline DynamoDB could not store', async () => {
    const fileDetailsByPath: Record<string, object> = {};
    for (let i = 0; i < 6000; i++) {
      fileDetailsByPath[`dist/chunks/a-long-enough-file-name-${i}.js`] = {
        size: 1000,
        maxSize: null,
        compression: 'gzip',
      };
    }
    const { call, baselineStore } = setup();
    const response = await call('POST', '/store', {
      ...storeBody,
      fileDetailsByPath,
    });
    assert.equal(response.status, 413);
    assert.equal(await baselineStore.get('o/r', 'main'), undefined);
  });
});

describe('POST /store/lookup', () => {
  const lookupBody = { ...CREDENTIALS, repoBranch: 'main' };

  test('returns the saved baseline', async () => {
    const { call } = setup();
    await call('POST', '/store', storeBody);
    const response = await call('POST', '/store/lookup', lookupBody);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      fileDetailsByPath: storeBody.fileDetailsByPath,
    });
  });

  test('allows read-only tokens, with the 0.x check', async () => {
    const { call } = setup();
    await call('POST', '/store', storeBody);
    github.reset(DENIED);
    const response = await call('POST', '/store/lookup', lookupBody);
    assert.equal(response.status, 200);
    assert.deepEqual(githubRequests(), ['GET /repos/o/r/statuses/abc']);
  });

  test('401 when the token cannot read the commit statuses', async () => {
    github.reset({});
    const response = await setup().call('POST', '/store/lookup', lookupBody);
    assert.equal(response.status, 401);
  });

  test('404 with an empty body when there is none', async () => {
    const response = await setup().call('POST', '/store/lookup', lookupBody);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), '');
  });

  test('401 without credentials', async () => {
    const response = await setup().call('POST', '/store/lookup', {
      repoBranch: 'main',
    });
    assert.equal(response.status, 401);
  });

  test('422 for unknown keys', async () => {
    const response = await setup().call('POST', '/store/lookup', {
      ...lookupBody,
      fileDetailsByPath: {},
    });
    assert.equal(response.status, 422);
  });
});

describe('GET /results?d=', () => {
  test('renders a 0.x link (jsonpack 1.x) with an unlimited maxSize', async () => {
    const response = await setup({ config: { commitSha: 'abc1234' } }).call(
      'GET',
      `/results?d=${CLI_0X_LINK_DATA}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'none'/);
    const page = await response.text();
    assert.match(page, /\.\/dist\/&lt;script&gt;alert\(1\)&lt;\/script&gt;\.js/);
    assert.doesNotMatch(page, /<script>/);
    // The file with an unlimited maxSize is new: it has no size on master.
    assert.match(
      page,
      /\+1000B<small>new file<\/small><\/span>\s*<span class="limit">No limit<\/span>/,
    );
    assert.match(page, /<b>feat\/&quot;quotes&quot;&amp;&lt;b&gt;<\/b> into master/);
    assert.match(page, />3b63e5c<\/a>/);
    assert.match(page, /<meta name="description" content="maxSize check failed">/);
    assert.match(
      page,
      /vendor\.js is 100KB over its 100KB limit, and \.\/dist\/\*\.map matched no files\./,
    );
    assert.match(page, /commit\/abc1234">abc1234</);
    assert.doesNotMatch(page, /width:(?:NaN|Infinity)/);
  });

  for (const [name, data] of Object.entries(CAPTURED_LINK_DATA)) {
    test(`renders the captured 0.x link "${name}"`, async () => {
      const response = await setup().call('GET', `/results?d=${data}`);
      assert.equal(response.status, 200);
    });
  }

  test('decodes `+` in captured links as jsonpack 1.x does', async () => {
    const response = await setup().call('GET', `/results?d=${CAPTURED_LINK_DATA.littleDifference}`);
    const page = await response.text();
    assert.match(
      page,
      /<meta name="description" content="PASS :: Everything is in check \(\+0B, -15B\)">/,
    );
    assert.match(page, /bundlewatch\/e2e-test/);
    assert.match(page, /−15B<small>131B now<\/small>/);
  });

  test('renders links built by core', async () => {
    const url = createResultsUrl({
      host: 'https://service.test',
      details: { repoOwner: 'o', repoName: 'r' },
      results: {
        status: 'pass',
        summary: 'Everything is in check',
        fullResults: [
          {
            filePath: 'a.js',
            status: 'pass',
            message: 'm',
            size: 1,
            baseBranchSize: 0,
            maxSize: Number.POSITIVE_INFINITY,
          },
        ],
      },
    });
    const response = await setup().call('GET', url.slice('https://service.test'.length));
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<span class="limit">No limit<\/span>/);
  });

  for (const [name, query] of [
    ['missing', ''],
    ['empty', '?d='],
    ['not jsonpack', '?d=abc'],
    ['broken structure', '?d=%5E%5E%5E'],
    ['bad percent-encoding', '?d=%E0%A4%A'],
  ]) {
    test(`400 when d is ${name}`, async () => {
      const response = await setup().call('GET', `/results${query}`);
      assert.equal(response.status, 400);
      assert.ok((await readJson(response)).error);
    });
  }

  test('422 when the data decodes but is not results', async () => {
    // jsonpack for {"a":"b"}
    const response = await setup().call('GET', '/results?d=a%7Cb%5E%5E%5E%240%7C1%5D');
    assert.equal(response.status, 422);
    assert.equal((await readJson(response)).errors.details[0]?.message, '"details" is required');
  });
});

const resultsPayload = createResultsPayload(
  {
    status: 'fail',
    summary: 'maxSize check failed',
    fullResults: [
      {
        filePath: 'dist/<a>.js',
        status: 'fail',
        message: '2KB > 1KB (gzip)',
        size: 2048,
        baseBranchSize: 1024,
        maxSize: 1024,
      },
      {
        filePath: 'dist/b.js',
        status: 'pass',
        message: '1KB < Infinity (gzip)',
        size: 1024,
        baseBranchSize: 0,
        maxSize: Number.POSITIVE_INFINITY,
      },
    ],
  },
  {
    repoOwner: 'o',
    repoName: 'r',
    repoCurrentBranch: 'feature',
    repoBranchBase: 'main',
    commitSha: 'abc',
  },
);
const createBody = { ...CREDENTIALS, payload: resultsPayload };

describe('POST /results and GET /r/{id}', () => {
  test('creates a short link that renders the results', async () => {
    const { call, resultsStore } = setup();
    const response = await call('POST', '/results', createBody);
    assert.equal(response.status, 201);
    const { id, url } = await readJson(response);
    assert.match(id, /^[0-9A-Za-z]{22}$/);
    assert.equal(url, `https://service.test/r/${id}`);
    assert.equal(response.headers.get('location'), url);
    assert.deepEqual(githubRequests(), ['GET /repos/o/r']);

    const stored = await resultsStore.get(id);
    assert.deepEqual(stored, {
      id,
      repo: 'o/r',
      createdAt: new Date(NOW).toISOString(),
      expiresAt: undefined,
      payload: JSON.parse(JSON.stringify(resultsPayload)),
    });
    assert.doesNotMatch(JSON.stringify(stored), /tok/);

    const page = await call('GET', `/r/${id}`);
    assert.equal(page.status, 200);
    const text = await page.text();
    assert.match(text, /dist\/&lt;a&gt;\.js/);
    assert.match(text, /<span class="limit">No limit<\/span>/);
    assert.match(text, /\+1KB/);
  });

  test('builds the link from PUBLIC_URL when set', async () => {
    const response = await setup({
      config: { publicUrl: 'https://service.bundlewatch.io/' },
    }).call('POST', '/results', createBody);
    const { id, url } = await readJson(response);
    assert.equal(url, `https://service.bundlewatch.io/r/${id}`);
  });

  test('round-trips through gzip in the DynamoDB store', async () => {
    const items = new Map<string, Record<string, AttributeValue>>();
    const client = {
      send: async (command: unknown) => {
        if (command instanceof PutItemCommand) {
          const id = command.input.Item?.id?.S ?? '';
          if (items.has(id)) {
            throw new ConditionalCheckFailedException({
              message: 'taken',
              $metadata: {},
            });
          }
          items.set(id, command.input.Item ?? {});
          return {};
        }
        if (command instanceof GetItemCommand) {
          return { Item: items.get(command.input.Key?.id?.S ?? '') };
        }
        throw new Error('unexpected command');
      },
    } as unknown as DynamoDBClient;
    const { call } = setup({
      resultsStore: new DynamoResultsStore(client, 'results'),
    });
    const { id } = await readJson(await call('POST', '/results', createBody));
    const payload = items.get(id)?.payload?.B;
    assert.ok(payload instanceof Uint8Array);
    assert.deepEqual([...payload.subarray(0, 2)], [0x1f, 0x8b]);
    const page = await call('GET', `/r/${id}`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /dist\/&lt;a&gt;\.js/);
  });

  test('expires links after RESULTS_RETENTION_DAYS', async () => {
    const { call, resultsStore, setNow } = setup({
      config: { resultsRetentionDays: 30 },
    });
    const { id } = await readJson(await call('POST', '/results', createBody));
    assert.equal((await resultsStore.get(id))?.expiresAt, NOW / 1000 + 30 * 86400);
    setNow(NOW + 29 * 86400 * 1000);
    assert.equal((await call('GET', `/r/${id}`)).status, 200);
    setNow(NOW + 30 * 86400 * 1000);
    assert.equal((await call('GET', `/r/${id}`)).status, 404);
  });

  test('retries when an id is taken', async () => {
    const taken = 'A'.repeat(22);
    const free = 'B'.repeat(22);
    const ids = [taken, taken, free];
    const { call } = setup({ generateId: () => ids.shift() ?? 'unused' });
    assert.equal((await readJson(await call('POST', '/results', createBody))).id, taken);
    assert.equal((await readJson(await call('POST', '/results', createBody))).id, free);
  });

  test('500 after five taken ids', async () => {
    const { call, errors } = setup({ generateId: () => 'A'.repeat(22) });
    await call('POST', '/results', createBody);
    const response = await call('POST', '/results', createBody);
    assert.equal(response.status, 500);
    assert.equal(errors.length, 1);
  });

  test('renders a 12-character id, as 1.0.0 created them', async () => {
    const { call, resultsStore } = setup();
    await resultsStore.create({
      id: 'AbxBAzAlLgSQ',
      repo: 'o/r',
      createdAt: new Date(NOW).toISOString(),
      expiresAt: undefined,
      payload: resultsPayload,
    });
    const page = await call('GET', '/r/AbxBAzAlLgSQ');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /dist\/b\.js/);
  });

  test('401 when the token may not push', async () => {
    github.reset(DENIED);
    const response = await setup().call('POST', '/results', createBody);
    assert.equal(response.status, 401);
  });

  test('422 when the payload names another repository', async () => {
    const response = await setup().call('POST', '/results', {
      ...createBody,
      payload: {
        ...resultsPayload,
        details: {
          ...resultsPayload.details,
          repoOwner: 'someone-else',
        },
      },
    });
    assert.equal(response.status, 422);
  });

  test('401 without credentials', async () => {
    const response = await setup().call('POST', '/results', {
      payload: resultsPayload,
    });
    assert.equal(response.status, 401);
    assert.equal(github.requests.length, 0);
  });

  test('422 for an invalid payload', async () => {
    const response = await setup().call('POST', '/results', {
      ...CREDENTIALS,
      payload: {
        details: {},
        results: { status: 'pass', fullResults: [] },
      },
    });
    assert.equal(response.status, 422);
    assert.equal(
      (await readJson(response)).errors.details[0]?.message,
      '"payload.results.summary" is required',
    );
  });

  test('413 over 1 MB', async () => {
    const fullResults = Array.from({ length: 12000 }, (_, i) => ({
      filePath: `dist/chunk-${i}-${'x'.repeat(60)}.js`,
      status: 'pass',
      size: i,
    }));
    const results = { ...resultsPayload.results, fullResults };
    const body = { ...createBody, payload: { ...resultsPayload, results } };
    assert.ok(JSON.stringify(body).length > 1024 * 1024);
    const response = await setup().call('POST', '/results', body);
    assert.equal(response.status, 413);
    assert.equal(github.requests.length, 0);
  });

  test('400 for invalid JSON', async () => {
    const response = await setup().call('POST', '/results', 'not json');
    assert.equal(response.status, 400);
  });

  for (const id of ['A'.repeat(22), 'A'.repeat(12), 'short', 'AAAAAAAAAAA%21']) {
    test(`404 page for the unknown id ${id}`, async () => {
      const response = await setup().call('GET', `/r/${id}`);
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
      assert.match(await response.text(), /Results not found/);
    });
  }
});

const accessToken = (body: unknown) => github.reset({ 'POST /login/oauth/access_token': { body } });

describe('GET /setup-github', () => {
  const config = {
    githubClientId: '04fcf325dd26ca2a159f',
    githubClientSecret: 'secret',
  };
  const STATE = 'expected-state';
  const withState = { cookie: `bundlewatch_oauth_state=${STATE}` };

  test('without a code, links to the OAuth authorization with a state', async () => {
    const response = await setup({ config }).call('GET', '/setup-github');
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie') ?? '';
    const state = /^bundlewatch_oauth_state=([\w-]+);/.exec(cookie)?.[1];
    assert.ok(state, cookie);
    assert.match(cookie, /Path=\/setup-github; Max-Age=600; HttpOnly; Secure; SameSite=Lax/);
    const page = await response.text();
    assert.ok(
      page.includes(
        `href="${github.url}/login/oauth/authorize?scope=repo%3Astatus&amp;client_id=04fcf325dd26ca2a159f&amp;state=${state}"`,
      ),
    );
    assert.match(page, /href="\/static\/setup-github-styles.css"/);
    assert.match(page, /Authorize on GitHub<\/a>/);
    assert.doesNotMatch(page, /Github/);
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
  });

  test('with a code and the matching state, shows the token, escaped', async () => {
    accessToken({ access_token: '<b>gho_token</b>', token_type: 'bearer' });
    const response = await setup({ config }).call(
      'GET',
      `/setup-github?code=c0de&state=${STATE}`,
      undefined,
      withState,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=0/);
    const csp = response.headers.get('content-security-policy') ?? '';
    assert.match(csp, /frame-ancestors 'none'/);
    assert.ok(csp.endsWith(`; script-src 'sha256-${COPY_SCRIPT_HASH}'`), csp);
    const page = await response.text();
    assert.match(page, /<code id="copy-value"[^>]*>&lt;b&gt;gho_token&lt;\/b&gt;<\/code>/);
    const [exchange] = github.requests;
    assert.equal(exchange?.headers.accept, 'application/json');
    assert.deepEqual(JSON.parse(exchange?.body ?? ''), {
      code: 'c0de',
      client_id: '04fcf325dd26ca2a159f',
      client_secret: 'secret',
    });
  });

  for (const [name, path, headers] of [
    ['no state cookie', `/setup-github?code=c0de&state=${STATE}`, {}],
    ['no state parameter', '/setup-github?code=c0de', withState],
    ['another state', '/setup-github?code=c0de&state=other', withState],
  ] as const) {
    test(`400 without asking GitHub: ${name}`, async () => {
      accessToken({ access_token: 'gho_token' });
      const response = await setup({ config }).call('GET', path, undefined, headers);
      assert.equal(response.status, 400);
      assert.equal(github.requests.length, 0);
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
      // A new state, to authorize again from this page.
      assert.match(
        response.headers.get('set-cookie') ?? '',
        /^bundlewatch_oauth_state=[\w-]+; .*Max-Age=600/,
      );
      const page = await response.text();
      assert.match(page, /That authorization expired/);
      assert.match(
        page,
        /oauth\/authorize\?scope=repo%3Astatus&amp;client_id=04fcf325dd26ca2a159f&amp;state=/,
      );
    });
  }

  test('500 with the error description when GitHub refuses the code', async () => {
    accessToken({
      error: 'bad_verification_code',
      error_description: 'The code passed is incorrect or expired.',
    });
    const response = await setup({ config }).call(
      'GET',
      `/setup-github?code=old&state=${STATE}`,
      undefined,
      withState,
    );
    assert.equal(response.status, 500);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=600/);
    const page = await response.text();
    assert.match(page, /GitHub didn’t issue a token/);
    assert.match(page, /The code passed is incorrect or expired\. Authorize again/);
  });

  test('500 without the raw response when GitHub sends neither a token nor a description', async () => {
    accessToken({ unexpected: 'value' });
    const response = await setup({ config }).call(
      'GET',
      `/setup-github?code=c&state=${STATE}`,
      undefined,
      withState,
    );
    assert.equal(response.status, 500);
    assert.match(await response.text(), /GitHub did not return a token\./);
  });

  test('500 with the status when the exchange fails', async () => {
    github.reset({ 'POST /login/oauth/access_token': { status: 502 } });
    const response = await setup({ config }).call(
      'GET',
      `/setup-github?code=c&state=${STATE}`,
      undefined,
      withState,
    );
    assert.equal(response.status, 500);
    assert.match(await response.text(), /GitHub answered with HTTP 502\./);
  });
});

describe('write authorization modes', () => {
  test('report mode (the default) keeps the 0.x decision and logs disagreements', async () => {
    github.reset(DENIED);
    const { call, warnings } = setup({
      config: { writeAuthorization: undefined },
    });
    const response = await call('POST', '/store', storeBody);
    assert.equal(response.status, 200);
    assert.deepEqual(
      warnings.map((warning) => JSON.parse(warning)),
      [
        {
          event: 'write-authorization-differs',
          repo: 'o/r',
          token: 'other',
          enforced: false,
          enforcedVia: 'permissions',
          current: true,
        },
      ],
    );
    assert.doesNotMatch(warnings.join(), /tok"/);
  });

  for (const failure of [{ status: 503 }, { status: 429 }, { delayMs: 6500 }]) {
    test(`report mode keeps legacy-authorized writes when strict check fails: ${JSON.stringify(failure)}`, async () => {
      github.reset({
        ...ALLOWED,
        'GET /repos/o/r': failure,
      });
      const { call, warnings, baselineStore } = setup({
        config: { writeAuthorization: 'report' },
      });
      const response = await call('POST', '/store', storeBody);
      assert.equal(response.status, 200);
      assert.ok(await baselineStore.get('o/r', storeBody.repoBranch));
      assert.deepEqual(
        warnings.map((line) => JSON.parse(line)),
        [
          {
            event: 'write-authorization-check-failed',
            repo: 'o/r',
            token: 'other',
          },
        ],
      );
    });
  }

  test('report mode preserves legacy check failures', async () => {
    github.reset({
      ...ALLOWED,
      'GET /repos/o/r/statuses/abc': { status: 503 },
    });
    const { call, baselineStore } = setup({
      config: { writeAuthorization: 'report' },
    });
    assert.equal((await call('POST', '/store', storeBody)).status, 503);
    assert.equal(await baselineStore.get('o/r', storeBody.repoBranch), undefined);
  });

  test('enforce mode preserves strict check failures', async () => {
    github.reset({ ...ALLOWED, 'GET /repos/o/r': { status: 503 } });
    assert.equal((await setup().call('POST', '/store', storeBody)).status, 503);
  });

  test('report mode refuses what 0.x refused', async () => {
    github.reset({});
    const response = await setup({
      config: { writeAuthorization: 'report' },
    }).call('POST', '/store', storeBody);
    assert.equal(response.status, 401);
  });

  test('enforce mode refuses tokens that may not push', async () => {
    github.reset(DENIED);
    const response = await setup({
      config: { writeAuthorization: 'enforce' },
    }).call('POST', '/store', storeBody);
    assert.equal(response.status, 401);
  });
});

describe('POST /analyze', () => {
  const statusesPath = 'POST /repos/o/r/statuses/abc';
  const analyzeBody = {
    ...CREDENTIALS,
    repoBranch: 'feature',
    baseBranchName: 'main',
    bundlewatchServiceHost: 'https://ignored.test',
    currentBranchFileDetails: {
      'dist/a.js': { size: 2048, maxSize: 1024, compression: 'gzip' },
      'dist/b.js': { size: 100, maxSize: null, compression: 'gzip' },
    },
  };

  for (const prefix of ['storefront', 'admin']) {
    test(`${prefix}: server analysis uses the prefixed base branch, statuses and metadata`, async () => {
      github.reset({ ...ALLOWED, [statusesPath]: { status: 201, body: {} } });
      const { call, baselineStore, resultsStore } = setup();
      for (const [index, namespace] of [undefined, 'storefront', 'admin'].entries()) {
        await baselineStore.save({
          repo: 'o/r',
          repoBranch: 'main',
          prefix: namespace,
          fileDetailsByPath: {
            'dist/a.js': { size: (index + 1) * 100, maxSize: 1024, compression: 'gzip' },
          },
        });
      }
      const response = await call('POST', '/analyze', { ...analyzeBody, prefix });
      assert.equal(response.status, 202);
      const statuses = github.requests
        .filter(({ method }) => method === 'POST')
        .map(({ body }) => JSON.parse(body));
      assert.deepEqual(
        statuses.map(({ state, context }) => [state, context]),
        [
          ['pending', `${prefix}/bundlewatch`],
          ['failure', `${prefix}/bundlewatch`],
          ['failure', `${prefix}/bundlewatch dist/a.js`],
        ],
      );
      const id = new URL(statuses[1].target_url).pathname.split('/').at(-1)!;
      const stored = await resultsStore.get(id);
      assert.equal(stored?.payload.details.prefix, prefix);
      assert.equal(
        stored?.payload.results.fullResults[0]?.baseBranchSize,
        prefix === 'storefront' ? 200 : 300,
      );
      assert.equal(
        await baselineStore.get('o/r', 'feature', prefix),
        undefined,
        'analysis never saves a baseline',
      );
    });
  }

  test('analyzes against the baseline and reports statuses with a short link', async () => {
    github.reset({ ...ALLOWED, [statusesPath]: { status: 201, body: {} } });
    const { call, baselineStore, resultsStore } = setup();
    await baselineStore.save({
      repo: 'o/r',
      repoBranch: 'main',
      fileDetailsByPath: {
        'dist/a.js': { size: 1024, maxSize: 1024, compression: 'gzip' },
      },
    });
    const response = await call('POST', '/analyze', analyzeBody);
    assert.equal(response.status, 202);

    const statuses = github.requests
      .filter((r) => `${r.method} ${r.path}` === statusesPath)
      .map((r) => JSON.parse(r.body));
    assert.deepEqual(
      statuses.map((s) => [s.state, s.context, s.description]),
      [
        ['pending', 'bundlewatch', 'Checking bundlewatch...'],
        ['failure', 'bundlewatch', 'maxSize check failed'],
        ['failure', 'bundlewatch dist/a.js', '2KB > 1KB (gzip)'],
      ],
    );
    const id = statuses[1].target_url.match(/^https:\/\/service\.test\/r\/(\w{22})$/)?.[1];
    assert.ok(id);
    const stored = await resultsStore.get(id);
    assert.deepEqual(stored?.payload.details, {
      repoOwner: 'o',
      repoName: 'r',
      repoCurrentBranch: 'feature',
      repoBranchBase: 'main',
      commitSha: 'abc',
    });
    assert.equal(stored?.payload.results.fullResults[0]?.baseBranchSize, 1024);
  });

  test('reports success when everything passes', async () => {
    github.reset({ ...ALLOWED, [statusesPath]: { status: 201, body: {} } });
    const response = await setup().call('POST', '/analyze', {
      ...analyzeBody,
      currentBranchFileDetails: {
        'dist/b.js': { size: 100, maxSize: null, compression: 'gzip' },
      },
    });
    assert.equal(response.status, 202);
    const states = github.requests
      .filter((r) => r.method === 'POST')
      .map((r) => JSON.parse(r.body).state);
    assert.deepEqual(states, ['pending', 'success']);
  });

  test('422 for an invalid body', async () => {
    const response = await setup().call('POST', '/analyze', {
      ...analyzeBody,
      bundlewatchServiceHost: undefined,
    });
    assert.equal(response.status, 422);
  });

  test('401 when the token may not push', async () => {
    github.reset(DENIED);
    const response = await setup().call('POST', '/analyze', analyzeBody);
    assert.equal(response.status, 401);
  });
});

describe('stylesheets', () => {
  for (const name of ['results-styles.css', 'setup-github-styles.css']) {
    test(name, async () => {
      const response = await setup().call('GET', `/static/${name}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'text/css; charset=utf-8');
      const css = await response.text();
      assert.equal(css, PAGE_CSS);
      assert.doesNotMatch(css, /@import|googleapis/);
    });

    test(`${name} loads its fonts from the service`, async () => {
      const css = await (await setup().call('GET', `/static/${name}`)).text();
      const fonts = [...css.matchAll(/url\('([^']+)'\) format\('woff2'\)/g)].map(
        (match) => match[1] ?? '',
      );
      assert.equal(fonts.length, 6);
      await Promise.all(
        fonts.map(async (font) => {
          const response = await setup().call('GET', font);
          assert.equal(response.status, 200, font);
          assert.equal(response.headers.get('content-type'), 'font/woff2');
          const bytes = new Uint8Array(await response.arrayBuffer());
          assert.equal(Buffer.from(bytes.subarray(0, 4)).toString('latin1'), 'wOF2', font);
        }),
      );
    });
  }

  test('pages may load fonts from the service only', async () => {
    const response = await setup().call('GET', '/r/AAAAAAAAAAAA');
    assert.match(response.headers.get('content-security-policy') ?? '', /font-src 'self'/);
  });

  test('unknown fonts are 404', async () => {
    const statuses = await Promise.all(
      ['/static/fonts/missing.woff2', '/static/fonts/constructor'].map(
        async (path) => (await setup().call('GET', path)).status,
      ),
    );
    assert.deepEqual(statuses, [404, 404]);
  });

  test('the logo with the name', async () => {
    const response = await setup().call('GET', '/static/logo.svg');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/svg+xml');
    const svg = await response.text();
    assert.match(svg, /^<svg[^>]*viewBox="0 0 296\.97 52\.64"/);
  });
});
