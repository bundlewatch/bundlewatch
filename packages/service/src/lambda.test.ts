import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { gunzipSync } from 'node:zlib';

import { createApp } from './app.ts';
import { createHandler, type HttpApiEvent, handler, toRequest, toResult } from './lambda.ts';
import { MemoryBaselineStore } from './stores/baseline-store.ts';
import { MemoryResultsStore } from './stores/results-store.ts';
import { CLI_0X_LINK_DATA } from './test-helpers/results-links.ts';

const event = (overrides: Partial<HttpApiEvent> = {}): HttpApiEvent => ({
  rawPath: '/',
  rawQueryString: '',
  headers: {},
  isBase64Encoded: false,
  ...overrides,
  requestContext: {
    domainName: 'service.bundlewatch.io',
    http: { method: 'GET' },
    ...overrides.requestContext,
  },
});

describe('toRequest', () => {
  test('maps the method, URL, query string and headers', () => {
    const request = toRequest(
      event({
        rawPath: '/results',
        rawQueryString: 'd=a%7Cb&x=1+2',
        headers: {
          'content-type': 'text/plain',
          'x-forwarded-proto': 'https',
        },
      }),
    );
    assert.equal(request.method, 'GET');
    assert.equal(request.url, 'https://service.bundlewatch.io/results?d=a%7Cb&x=1+2');
    assert.equal(new URL(request.url).searchParams.get('x'), '1 2');
    assert.equal(request.headers.get('content-type'), 'text/plain');
  });

  test('puts cookies back into a header', () => {
    const request = toRequest(event({ cookies: ['a=1', 'b=2'] }));
    assert.equal(request.headers.get('cookie'), 'a=1; b=2');
  });

  test('passes text bodies through', async () => {
    const request = toRequest(
      event({
        body: '{"a":"é"}',
        requestContext: { domainName: 'x', http: { method: 'POST' } },
      }),
    );
    assert.equal(request.method, 'POST');
    assert.equal(await request.text(), '{"a":"é"}');
  });

  test('decodes base64 bodies', async () => {
    const request = toRequest(
      event({
        body: Buffer.from('{"a":"é"}').toString('base64'),
        isBase64Encoded: true,
        requestContext: { domainName: 'x', http: { method: 'post' } },
      }),
    );
    assert.equal(request.method, 'POST');
    assert.equal(await request.text(), '{"a":"é"}');
  });

  test('ignores bodies on GET', async () => {
    const request = toRequest(event({ body: 'ignored' }));
    assert.equal(request.body, null);
  });
});

describe('toResult', () => {
  test('maps status, headers and a text body', async () => {
    const result = await toResult(
      new Response('{"error":"Not allowed"}', {
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }),
    );
    assert.deepEqual(result, {
      statusCode: 401,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: '{"error":"Not allowed"}',
      isBase64Encoded: false,
    });
  });

  test('base64-encodes binary bodies', async () => {
    const result = await toResult(
      new Response(new Uint8Array([0, 255, 1]), {
        headers: { 'content-type': 'image/png' },
      }),
    );
    assert.equal(result.isBase64Encoded, true);
    assert.equal(result.body, Buffer.from([0, 255, 1]).toString('base64'));
  });

  test('empty bodies', async () => {
    const result = await toResult(new Response(null, { status: 404 }));
    assert.equal(result.statusCode, 404);
    assert.equal(result.body, '');
    assert.equal(result.isBase64Encoded, false);
  });

  test('moves set-cookie into cookies', async () => {
    const headers = new Headers({ 'content-type': 'text/plain' });
    headers.append('set-cookie', 'a=1');
    headers.append('set-cookie', 'b=2');
    const result = await toResult(new Response('ok', { headers }));
    assert.deepEqual(result.cookies, ['a=1', 'b=2']);
    assert.equal(result.headers['set-cookie'], undefined);
  });
});

describe('createHandler with the app', () => {
  const run = createHandler(
    createApp({
      baselineStore: new MemoryBaselineStore(),
      resultsStore: new MemoryResultsStore(),
      config: {},
    }),
  );

  test('renders a results page from the query string', async () => {
    const result = await run(
      event({
        rawPath: '/results',
        rawQueryString: `d=${CLI_0X_LINK_DATA}`,
      }),
    );
    assert.equal(result.statusCode, 200);
    assert.equal(result.headers['content-type'], 'text/html; charset=utf-8');
    assert.match(result.body, /maxSize check failed/);
  });

  test('returns errors with their status', async () => {
    const malformed = await run(event({ rawPath: '/results', rawQueryString: 'd=abc' }));
    assert.equal(malformed.statusCode, 400);
    const missing = await run(event({ rawPath: '/nope' }));
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.body, '{"error":"Not found"}');
  });

  test('reads base64 POST bodies', async () => {
    const result = await run(
      event({
        rawPath: '/store',
        body: Buffer.from('{"repoOwner":"o"}').toString('base64'),
        isBase64Encoded: true,
        requestContext: { domainName: 'x', http: { method: 'POST' } },
      }),
    );
    assert.equal(result.statusCode, 401);
    assert.equal(result.body, '{"error":"Not allowed"}');
  });
});

test('handler builds the app on first use, from the environment', async () => {
  const saved = { ...process.env };
  try {
    delete process.env.STORE_TABLE;
    delete process.env.RESULTS_TABLE;
    await assert.rejects(handler(event()), /STORE_TABLE and RESULTS_TABLE/);
    Object.assign(process.env, {
      STORE_TABLE: 's',
      RESULTS_TABLE: 'r',
      AWS_REGION: 'us-east-1',
    });
    const result = await handler(event());
    assert.equal(result.statusCode, 200);
    assert.equal(result.body, '{"message":"hello world"}');
  } finally {
    process.env = saved;
  }
});

describe('compression and malformed events', () => {
  const run = createHandler(
    createApp({
      baselineStore: new MemoryBaselineStore(),
      resultsStore: new MemoryResultsStore(),
      config: {},
    }),
  );
  const page = (headers: Record<string, string>) =>
    run(
      event({
        rawPath: '/results',
        rawQueryString: `d=${CLI_0X_LINK_DATA}`,
        headers,
      }),
    );

  test('gzips pages for clients that accept it', async () => {
    const result = await page({ 'accept-encoding': 'gzip, deflate, br' });
    assert.equal(result.headers['content-encoding'], 'gzip');
    assert.equal(result.headers.vary, 'accept-encoding');
    assert.equal(result.isBase64Encoded, true);
    const html = gunzipSync(Buffer.from(result.body, 'base64')).toString();
    assert.match(html, /maxSize check failed/);
  });

  test('sends plain text when gzip is not accepted', async () => {
    const cases: Array<Record<string, string>> = [{}, { 'accept-encoding': 'gzip;q=0, br' }];
    const results = await Promise.all(cases.map((headers) => page(headers)));
    for (const result of results) {
      assert.equal(result.headers['content-encoding'], undefined);
      assert.equal(result.isBase64Encoded, false);
      assert.match(result.body, /maxSize check failed/);
    }
  });

  test('400 for requests that cannot be represented', async () => {
    const result = await run(
      event({
        requestContext: {
          domainName: 'service.bundlewatch.io',
          http: { method: 'TRACE' },
        },
      }),
    );
    assert.equal(result.statusCode, 400);
  });
});
