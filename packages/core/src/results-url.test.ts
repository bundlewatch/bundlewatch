import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createResultsPayload, createResultsUrl, decodeResultsData } from './results-url.ts';
import type { AnalyzeResult, ResultsDetails } from './types.ts';

const random = (n: number): number => Math.floor(Math.random() * n);
const strings = [
  './dist/main.js',
  'a b',
  'émoji 😀',
  'x|y',
  'a^b',
  'with "quotes"',
  '',
  '1',
  'true',
  'null',
  '-',
  '+',
  'feat/slash',
  '%20',
  'a\\b',
  '\n',
];
const pick = <T>(values: T[]): T => values[random(values.length)] as T;

const randomPayload = (): {
  details: ResultsDetails;
  results: AnalyzeResult;
} => ({
  details: {
    repoOwner: pick(strings),
    repoName: 'name',
    repoCurrentBranch: pick(strings),
    repoBranchBase: random(2) ? 'master' : undefined,
    commitSha: random(2) ? 'abc123' : undefined,
  },
  results: {
    status: pick(['pass', 'fail', 'warn'] as const),
    summary: 'Everything is in check (+1KB, -0B, ±0.0%)',
    fullResults: Array.from({ length: random(8) }, () => ({
      filePath: `${pick(strings)}${random(1000)}`,
      status: pick(['pass', 'fail', 'warn', 'removed'] as const),
      message: 'dropped from the URL',
      size: random(5e6),
      baseBranchSize: random(2) ? 0 : random(5e6),
      maxSize: pick([0, 102400, Number.POSITIVE_INFINITY, null]),
    })),
  },
});

const dataParam = (url: string): string => {
  const data = new URL(url).searchParams.get('d');
  assert.ok(data);
  return data;
};

test('builds a /results URL without per-file messages', () => {
  const url = createResultsUrl({
    host: 'https://service.bundlewatch.io',
    details: { repoOwner: 'o', repoName: 'r' },
    results: {
      status: 'pass',
      summary: 'ok',
      fullResults: [{ filePath: 'a.js', status: 'pass', message: 'm', size: 1 }],
    },
  });
  assert.ok(url.startsWith('https://service.bundlewatch.io/results?d='));
  assert.deepEqual(decodeResultsData(dataParam(url)), {
    details: { repoOwner: 'o', repoName: 'r' },
    results: {
      status: 'pass',
      summary: 'ok',
      fullResults: [{ filePath: 'a.js', status: 'pass', size: 1 }],
    },
  });
});

// 0.x CLIs and services use the same jsonpack version, so links work in both
// directions as long as every payload survives the round trip. Compared as
// JSON: jsonpack keeps keys whose value is undefined.
const asJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

test('results links round-trip', () => {
  for (let i = 0; i < 1000; i++) {
    const { details, results } = randomPayload();
    const data = dataParam(createResultsUrl({ host: 'https://x.test', details, results }));
    assert.deepEqual(
      asJson(decodeResultsData(data)),
      asJson(createResultsPayload(results, details)),
    );
  }
});

test('sends an unlimited maxSize as null, which 0.x services accept', () => {
  const url = createResultsUrl({
    host: 'https://x.test',
    details: {},
    results: {
      status: 'pass',
      summary: 'ok',
      fullResults: [
        {
          filePath: 'a.js',
          status: 'pass',
          size: 1,
          maxSize: Number.POSITIVE_INFINITY,
        },
      ],
    },
  });
  const decoded = decodeResultsData(dataParam(url)) as {
    results: { fullResults: { maxSize: unknown }[] };
  };
  assert.equal(decoded.results.fullResults[0]?.maxSize, null);
});

for (const name of Object.getOwnPropertyNames(Object.prototype)) {
  test(`reserved names round-trip: ${name}`, () => {
    const payload = {
      details: {
        repoOwner: name,
        repoName: name,
        repoCurrentBranch: name,
        repoBranchBase: name,
      },
      results: {
        status: 'pass' as const,
        summary: 'ok',
        fullResults: [{ filePath: name, status: 'pass' as const, size: 1 }],
      },
    };
    const data = dataParam(createResultsUrl({ host: 'https://x.test', ...payload }));
    assert.deepEqual(decodeResultsData(data), payload);
  });
}
