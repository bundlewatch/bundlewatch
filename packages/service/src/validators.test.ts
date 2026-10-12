import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createResultsPayload } from '@bundlewatch/core';

import {
  ValidationError,
  validateAnalyzeRequest,
  validateCreateResultsRequest,
  validateLookupRequest,
  validateResultsPayload,
  validateStoreRequest,
} from './validators.ts';

// Expected outcomes and messages come from running the 0.x schemas with
// @hapi/joi 17.1.1 on the same inputs. Deliberate differences are marked.

const outcome = (validator: (value: unknown) => unknown, value: unknown): string => {
  try {
    validator(value);
    return 'ok';
  } catch (error) {
    assert.ok(error instanceof ValidationError);
    return error.message;
  }
};

const repo = {
  commitSha: 'a',
  githubAccessToken: 't',
  repoBranch: 'master',
  repoName: 'r',
  repoOwner: 'o',
};
const store = (fileDetailsByPath: unknown) => ({ ...repo, fileDetailsByPath });
const entry = { size: 1, maxSize: 2, compression: 'gzip' };

describe('validateStoreRequest', () => {
  const cases: Array<[string, unknown, string]> = [
    ['valid', store({ 'a.js': entry }), 'ok'],
    ['maxSize null', store({ 'a.js': { ...entry, maxSize: null } }), 'ok'],
    [
      'maxSize missing',
      store({ 'a.js': { size: 1, compression: 'gzip' } }),
      '"fileDetailsByPath.a.js.maxSize" is required',
    ],
    [
      'size missing',
      store({ 'a.js': { maxSize: 1, compression: 'gzip' } }),
      '"fileDetailsByPath.a.js.size" is required',
    ],
    [
      'compression missing',
      store({ 'a.js': { size: 1, maxSize: 1 } }),
      '"fileDetailsByPath.a.js.compression" is required',
    ],
    [
      'error entry',
      store({ 'a.js': { error: 'x' } }),
      '"fileDetailsByPath.a.js.compression" is required',
    ],
    [
      'extra key in entry',
      store({ 'a.js': { ...entry, extra: 1 } }),
      '"fileDetailsByPath.a.js.extra" is not allowed',
    ],
    ['extra top-level key', { ...store({}), extra: 1 }, '"extra" is not allowed'],
    ['required before unknown', { extra: 1 }, '"commitSha" is required'],
    ['empty fileDetailsByPath', store({}), 'ok'],
    ['fileDetailsByPath missing', repo, '"fileDetailsByPath" is required'],
    ['fileDetailsByPath array', store([]), '"fileDetailsByPath" must be of type object'],
    ['fileDetailsByPath null', store(null), '"fileDetailsByPath" must be of type object'],
    ['numeric string size', store({ 'a.js': { ...entry, size: '12' } }), 'ok'],
    [
      'numeric strings with spaces and exponent',
      store({ 'a.js': { ...entry, size: ' 12 ', maxSize: '1e3' } }),
      'ok',
    ],
    [
      'non-numeric size',
      store({ 'a.js': { ...entry, size: 'abc' } }),
      '"fileDetailsByPath.a.js.size" must be a number',
    ],
    [
      'empty string size',
      store({ 'a.js': { ...entry, size: '' } }),
      '"fileDetailsByPath.a.js.size" must be a number',
    ],
    [
      'boolean size',
      store({ 'a.js': { ...entry, size: true } }),
      '"fileDetailsByPath.a.js.size" must be a number',
    ],
    [
      '"Infinity" maxSize',
      store({ 'a.js': { ...entry, maxSize: 'Infinity' } }),
      '"fileDetailsByPath.a.js.maxSize" must be a number',
    ],
    [
      'Infinity size',
      store({ 'a.js': { ...entry, size: Number.POSITIVE_INFINITY } }),
      '"fileDetailsByPath.a.js.size" cannot be infinity',
    ],
    [
      'NaN size',
      store({ 'a.js': { ...entry, size: Number.NaN } }),
      '"fileDetailsByPath.a.js.size" must be a number',
    ],
    [
      'unsafe size',
      store({ 'a.js': { ...entry, size: 2 ** 60 } }),
      '"fileDetailsByPath.a.js.size" must be a safe number',
    ],
    ['negative size', store({ 'a.js': { ...entry, size: -1 } }), 'ok'],
    ['fractional size', store({ 'a.js': { ...entry, size: 1.5 } }), 'ok'],
    [
      'empty compression',
      store({ 'a.js': { ...entry, compression: '' } }),
      '"fileDetailsByPath.a.js.compression" is not allowed to be empty',
    ],
    [
      'numeric compression',
      store({ 'a.js': { ...entry, compression: 5 } }),
      '"fileDetailsByPath.a.js.compression" must be a string',
    ],
    ['unknown compression', store({ 'a.js': { ...entry, compression: 'zstd' } }), 'ok'],
    ['null entry', store({ 'a.js': null }), '"fileDetailsByPath.a.js" must be of type object'],
    ['string entry', store({ 'a.js': 'x' }), '"fileDetailsByPath.a.js" must be of type object'],
    ['"filePath" key takes any object', store({ filePath: {} }), 'ok'],
    ['empty key', store({ '': entry }), '"fileDetailsByPath." is not allowed'],
    ['newline key', store({ '\n': entry }), '"fileDetailsByPath.\n" is not allowed'],
    ['empty commitSha', { ...store({}), commitSha: '' }, '"commitSha" is not allowed to be empty'],
    ['numeric commitSha', { ...store({}), commitSha: 5 }, '"commitSha" must be a string'],
    ['repoBranch missing', { ...store({}), repoBranch: undefined }, '"repoBranch" is required'],
    ['string body', 'x', '"value" must be of type object'],
    ['null body', null, '"value" must be of type object'],
    ['array body', [], '"value" must be of type object'],
  ];
  for (const [name, value, expected] of cases) {
    test(name, () => assert.equal(outcome(validateStoreRequest, value), expected));
  }

  test('converts numeric strings and keeps key order', () => {
    const { fileDetailsByPath } = validateStoreRequest(
      store({
        'a.js': { size: '12', compression: 'gzip', maxSize: null },
      }),
    );
    assert.equal(
      JSON.stringify(fileDetailsByPath),
      '{"a.js":{"size":12,"compression":"gzip","maxSize":null}}',
    );
  });

  test('reports errors in Joi’s shape', () => {
    try {
      validateStoreRequest({});
      assert.fail('expected a ValidationError');
    } catch (error) {
      assert.ok(error instanceof ValidationError);
      assert.deepEqual(error.details, [
        {
          message: '"commitSha" is required',
          path: ['commitSha'],
          type: 'any.required',
          context: { label: 'commitSha', key: 'commitSha' },
        },
      ]);
    }
  });

  test('a "__proto__" file name stays a plain key', () => {
    const body = JSON.parse(
      '{"commitSha":"a","githubAccessToken":"t","repoBranch":"m","repoName":"r","repoOwner":"o","fileDetailsByPath":{"__proto__":{"size":1,"maxSize":1,"compression":"gzip"}}}',
    );
    const { fileDetailsByPath } = validateStoreRequest(body);
    assert.equal(Object.getPrototypeOf(fileDetailsByPath), Object.prototype);
    assert.deepEqual(Object.keys(fileDetailsByPath), ['__proto__']);
  });
});

describe('validateLookupRequest', () => {
  const cases: Array<[string, unknown, string]> = [
    ['valid', repo, 'ok'],
    ['whitespace is not empty', { ...repo, commitSha: ' ' }, 'ok'],
    [
      'fileDetailsByPath is not allowed',
      { ...repo, fileDetailsByPath: {} },
      '"fileDetailsByPath" is not allowed',
    ],
    ['extra key', { ...repo, foo: 1 }, '"foo" is not allowed'],
    ['repoBranch missing', { ...repo, repoBranch: undefined }, '"repoBranch" is required'],
  ];
  for (const [name, value, expected] of cases) {
    test(name, () => assert.equal(outcome(validateLookupRequest, value), expected));
  }
});

describe('validateAnalyzeRequest', () => {
  const analyze = {
    ...repo,
    bundlewatchServiceHost: 'https://service.bundlewatch.io',
    baseBranchName: 'master',
    currentBranchFileDetails: { 'a.js': { ...entry, maxSize: null } },
  };
  test('valid', () => assert.equal(outcome(validateAnalyzeRequest, analyze), 'ok'));
  test('bundlewatchServiceHost is required', () =>
    assert.equal(
      outcome(validateAnalyzeRequest, {
        ...analyze,
        bundlewatchServiceHost: undefined,
      }),
      '"bundlewatchServiceHost" is required',
    ));
  test('rejects error entries', () =>
    assert.equal(
      outcome(validateAnalyzeRequest, {
        ...analyze,
        currentBranchFileDetails: { 'a.js': { error: 'e' } },
      }),
      '"currentBranchFileDetails.a.js.compression" is required',
    ));
});

const payload = (fullResults: unknown, details: unknown = {}, extra = {}) => ({
  details,
  results: { status: 'pass', summary: 's', fullResults, ...extra },
});

describe('size strings from 0.x CLIs with a numeric maxSize', () => {
  // 0.x formatted those with bytes.format, e.g. 102400 became "100KB".
  test('are read back as bytes in baselines and results links', () => {
    const baseline = validateStoreRequest(store({ 'a.js': { ...entry, maxSize: '100KB' } }));
    assert.equal(baseline.fileDetailsByPath['a.js']?.maxSize, 102400);
    const results = validateResultsPayload(
      payload([{ filePath: 'a', status: 'pass', maxSize: '1.5MB' }]),
    );
    assert.equal(results.results.fullResults[0]?.maxSize, 1572864);
  });

  test('other strings are still rejected', () => {
    assert.throws(
      () => validateStoreRequest(store({ 'a.js': { ...entry, maxSize: 'lots' } })),
      ValidationError,
    );
  });
});

describe('validateResultsPayload', () => {
  const file = { filePath: 'a', status: 'pass' };
  const cases: Array<[string, unknown, string]> = [
    ['valid', payload([{ ...file, size: 1, baseBranchSize: 0, maxSize: 2 }]), 'ok'],
    // Deliberate: 0.x said "cannot be infinity", so no 0.x link with an
    // unlimited file ever rendered.
    ['maxSize Infinity', payload([{ ...file, maxSize: Number.POSITIVE_INFINITY }]), 'ok'],
    ['maxSize -Infinity', payload([{ ...file, maxSize: Number.NEGATIVE_INFINITY }]), 'ok'],
    ['maxSize null', payload([{ ...file, maxSize: null }]), 'ok'],
    ['maxSize undefined', payload([{ ...file, maxSize: undefined }]), 'ok'],
    [
      'size Infinity',
      payload([{ ...file, size: Number.POSITIVE_INFINITY }]),
      '"results.fullResults[0].size" cannot be infinity',
    ],
    ['error entry', payload([{ filePath: 'a', status: 'fail', error: 'e' }]), 'ok'],
    ['message', payload([{ ...file, message: 'm' }]), 'ok'],
    ['compression', payload([{ ...file, compression: 'gzip' }]), 'ok'],
    [
      'extra item key',
      payload([{ ...file, foo: 1 }]),
      '"results.fullResults[0].foo" is not allowed',
    ],
    [
      'empty filePath',
      payload([{ ...file, filePath: '' }]),
      '"results.fullResults[0].filePath" is not allowed to be empty',
    ],
    [
      'filePath missing',
      payload([{ status: 'pass' }]),
      '"results.fullResults[0].filePath" is required',
    ],
    ['status missing', payload([{ filePath: 'a' }]), '"results.fullResults[0].status" is required'],
    ['unknown status', payload([{ ...file, status: 'weird' }]), 'ok'],
    [
      'empty status',
      payload([{ ...file, status: '' }]),
      '"results.fullResults[0].status" is not allowed to be empty',
    ],
    ['numeric string size', payload([{ ...file, size: '12' }]), 'ok'],
    ['null item', payload([null]), '"results.fullResults[0]" must be of type object'],
    [
      'undefined item',
      payload([undefined]),
      '"results.fullResults[0]" must not be a sparse array item',
    ],
    ['no files', payload([]), 'ok'],
    [
      'empty summary',
      payload([], {}, { summary: '' }),
      '"results.summary" is not allowed to be empty',
    ],
    [
      'summary missing',
      { details: {}, results: { status: 'pass', fullResults: [] } },
      '"results.summary" is required',
    ],
    ['unknown overall status', payload([], {}, { status: 'x' }), 'ok'],
    ['extra results key', payload([], {}, { url: 'x' }), '"results.url" is not allowed'],
    ['details missing', { results: payload([]).results }, '"details" is required'],
    ['results missing', { details: {} }, '"results" is required'],
    [
      'undefined details fields',
      payload([], { repoOwner: undefined, repoBranchBase: undefined }),
      'ok',
    ],
    // Deliberate: display-only fields; 0.x rejected empty strings.
    ['empty details field', payload([], { repoCurrentBranch: '' }), 'ok'],
    ['extra details key', payload([], { foo: 'x' }), '"details.foo" is not allowed'],
    [
      'numeric details field',
      payload([], { commitSha: 5 }),
      '"details.commitSha" must be a string',
    ],
    [
      'null details field',
      payload([], { commitSha: null }),
      '"details.commitSha" must be a string',
    ],
    ['null details', payload([], null), '"details" must be of type object'],
    ['extra top-level key', { ...payload([]), foo: 1 }, '"foo" is not allowed'],
    ['undefined unknown key', { ...payload([]), foo: undefined }, '"foo" is not allowed'],
    ['string', 'x', '"value" must be of type object'],
    ['array', [], '"value" must be of type object'],
    ['null', null, '"value" must be of type object'],
    ['fullResults object', payload({}), '"results.fullResults" must be an array'],
    ['negative size', payload([{ ...file, size: -5 }]), 'ok'],
    [
      'unsafe size',
      payload([{ ...file, size: 2 ** 60 }]),
      '"results.fullResults[0].size" must be a safe number',
    ],
    [
      'NaN baseBranchSize',
      payload([{ ...file, baseBranchSize: Number.NaN }]),
      '"results.fullResults[0].baseBranchSize" must be a number',
    ],
  ];
  for (const [name, value, expected] of cases) {
    test(name, () => assert.equal(outcome(validateResultsPayload, value), expected));
  }

  test('a "__proto__" key from jsonpack is not read through', () => {
    // jsonpack's unpack assigns keys, so `__proto__` sets the prototype.
    const item = { status: 'pass' };
    Object.setPrototypeOf(item, { filePath: 'inherited' });
    assert.equal(
      outcome(validateResultsPayload, payload([item])),
      '"results.fullResults[0].filePath" is required',
    );
  });
});

describe('validateCreateResultsRequest', () => {
  const credentials = {
    repoOwner: 'o',
    repoName: 'r',
    commitSha: 'abc',
    githubAccessToken: 't',
  };
  const results = {
    status: 'pass' as const,
    summary: 'Everything is in check',
    fullResults: [
      {
        filePath: 'a.js',
        status: 'pass' as const,
        message: 'dropped',
        size: 1,
        baseBranchSize: 0,
        maxSize: Number.POSITIVE_INFINITY,
      },
    ],
  };

  test('accepts what core’s createResultsPayload produces, sent as JSON', () => {
    const created = createResultsPayload(results, {
      repoOwner: 'o',
      repoName: 'r',
      repoCurrentBranch: 'main',
      repoBranchBase: undefined,
      commitSha: 'abc',
    });
    const body = JSON.parse(JSON.stringify({ ...credentials, payload: created }));
    assert.deepEqual(validateCreateResultsRequest(body).payload, {
      details: {
        repoOwner: 'o',
        repoName: 'r',
        repoCurrentBranch: 'main',
        commitSha: 'abc',
      },
      results: {
        fullResults: [
          {
            filePath: 'a.js',
            status: 'pass',
            size: 1,
            baseBranchSize: 0,
            maxSize: null,
          },
        ],
        status: 'pass',
        summary: 'Everything is in check',
      },
    });
  });

  const cases: Array<[string, unknown, string]> = [
    ['payload missing', credentials, '"payload" is required'],
    [
      'invalid payload',
      { ...credentials, payload: { details: {} } },
      '"payload.results" is required',
    ],
    [
      'repoBranch is not part of it',
      {
        ...credentials,
        repoBranch: 'main',
        payload: { details: {}, results },
      },
      '"repoBranch" is not allowed',
    ],
    [
      'commitSha required',
      {
        ...credentials,
        commitSha: undefined,
        payload: { details: {}, results },
      },
      '"commitSha" is required',
    ],
  ];
  for (const [name, value, expected] of cases) {
    test(name, () => assert.equal(outcome(validateCreateResultsRequest, value), expected));
  }
});
