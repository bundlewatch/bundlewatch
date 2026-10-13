import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  analyze,
  analyzeFiles,
  getOverallDifference,
  getPercentageChangeString,
} from './analyze.ts';
import type { FileDetailsByPath } from './types.ts';

// Expected values are copied from the 0.x snapshots in bundlewatch/bundlewatch
// and bundlewatch/service.

describe('analyzeFiles', () => {
  test('matches the 0.x service snapshot', () => {
    const baseBranchFileDetails = {
      'path/to/removed/file': { size: 30, compression: 'none' },
      'path/to/larger/file': { size: 40 },
      'path/to/equal/file': { size: 50 },
      'path/to/smaller/file': { size: 60 },
      'path/to/unbound/file': { size: 512 },
    } as unknown as FileDetailsByPath;
    const currentBranchFileDetails = {
      'path/to/errored/file': {
        size: 0,
        maxSize: 50,
        error: 'Failed to compare',
        compression: 'none',
      },
      'path/to/larger/file': {
        size: 60,
        maxSize: 50,
        compression: 'none',
      },
      'path/to/equal/file': {
        size: 50,
        maxSize: 50,
        compression: 'none',
      },
      'path/to/smaller/file': {
        size: 30,
        maxSize: 50,
        compression: 'none',
      },
      'path/to/unbound/file': {
        size: 1024,
        maxSize: null,
        compression: 'none',
      },
    } as unknown as FileDetailsByPath;

    assert.deepEqual(
      analyzeFiles({
        currentBranchFileDetails,
        baseBranchFileDetails,
        baseBranchName: 'master',
      }),
      [
        {
          error: 'Failed to compare',
          filePath: 'path/to/errored/file',
          status: 'fail',
        },
        {
          baseBranchSize: 40,
          filePath: 'path/to/larger/file',
          maxSize: 50,
          message: '60B > 50B (no compression)',
          size: 60,
          status: 'fail',
        },
        {
          baseBranchSize: 50,
          filePath: 'path/to/equal/file',
          maxSize: 50,
          message: '50B < 50B (no difference) (no compression)',
          size: 50,
          status: 'pass',
        },
        {
          baseBranchSize: 60,
          filePath: 'path/to/smaller/file',
          maxSize: 50,
          message: '30B < 50B (30B smaller than master) (no compression)',
          size: 30,
          status: 'pass',
        },
        {
          baseBranchSize: 512,
          filePath: 'path/to/unbound/file',
          maxSize: null,
          message: '1KB < Infinity (512B larger than master) (no compression)',
          size: 1024,
          status: 'pass',
        },
        {
          baseBranchSize: 30,
          filePath: 'path/to/removed/file',
          maxSize: 0,
          message: 'path/to/removed/file: File removed (30B smaller than master) (no compression)',
          size: 0,
          status: 'removed',
        },
      ],
    );
  });
});

describe('analyze', () => {
  test('matches the 0.x CLI snapshot for a run with a baseline', () => {
    const result = analyze({
      currentBranchFileDetails: {
        './__testdata__/test-file-1.jpg': {
          size: 38995,
          maxSize: 1048576,
          compression: 'gzip',
        },
        './__testdata__/test-file-2.jpg': {
          size: 254427,
          maxSize: 1048576,
          compression: 'gzip',
        },
      },
      baseBranchFileDetails: {
        './__testdata__/test-file-1.jpg': {
          size: 25000,
          maxSize: null,
          compression: 'gzip',
        },
        './__testdata__/test-file-deleted.jpg': {
          size: 10000,
          maxSize: null,
          compression: 'gzip',
        },
      },
      baseBranchName: 'mockBranchBase',
    });
    assert.deepEqual(result, {
      status: 'pass',
      fullResults: [
        {
          baseBranchSize: 25000,
          filePath: './__testdata__/test-file-1.jpg',
          maxSize: 1048576,
          message: '38.08KB < 1MB (13.67KB larger than mockBranchBase) (gzip)',
          size: 38995,
          status: 'pass',
        },
        {
          baseBranchSize: 0,
          filePath: './__testdata__/test-file-2.jpg',
          maxSize: 1048576,
          message: '248.46KB < 1MB (gzip)',
          size: 254427,
          status: 'pass',
        },
        {
          baseBranchSize: 10000,
          filePath: './__testdata__/test-file-deleted.jpg',
          maxSize: 0,
          message:
            './__testdata__/test-file-deleted.jpg: File removed (9.77KB smaller than mockBranchBase) (gzip)',
          size: 0,
          status: 'removed',
        },
      ],
      summary: 'Everything is in check (+262.13KB, -9.77KB, +738.3%)',
    });
  });

  test('reports a failed maxSize check', () => {
    const result = analyze({
      currentBranchFileDetails: {
        './a.jpg': {
          size: 38962,
          maxSize: 102400,
          compression: 'none',
        },
        './b.jpg': {
          size: 254765,
          maxSize: 102400,
          compression: 'none',
        },
      },
      baseBranchFileDetails: {},
      baseBranchName: 'master',
    });
    assert.equal(result.status, 'fail');
    assert.equal(result.summary, 'maxSize check failed');
    assert.equal(result.fullResults[0]?.message, '38.05KB < 100KB (no compression)');
    assert.equal(result.fullResults[1]?.message, '248.79KB > 100KB (no compression)');
  });

  test('reports missing files as failures', () => {
    const result = analyze({
      currentBranchFileDetails: {
        './missing.jpg': {
          error: 'There is no matching file for ./missing.jpg',
        },
      },
      baseBranchFileDetails: {},
      baseBranchName: 'master',
    });
    assert.deepEqual(result, {
      status: 'fail',
      fullResults: [
        {
          error: 'There is no matching file for ./missing.jpg',
          filePath: './missing.jpg',
          status: 'fail',
        },
      ],
      summary: 'maxSize check failed',
    });
  });

  test('omits the difference without a base branch name', () => {
    const result = analyze({
      currentBranchFileDetails: {
        './a.js': { size: 10, maxSize: 100, compression: 'gzip' },
      },
      baseBranchFileDetails: {},
    });
    assert.equal(result.summary, 'Everything is in check ');
  });

  test('omits the percentage when there is no baseline', () => {
    const result = analyze({
      currentBranchFileDetails: {
        './a.js': { size: 10, maxSize: 100, compression: 'gzip' },
      },
      baseBranchFileDetails: {},
      baseBranchName: 'master',
    });
    assert.equal(result.summary, 'Everything is in check (+10B, -0B)');
  });
});

describe('getOverallDifference', () => {
  test('adds bytes when a file grows', () => {
    assert.deepEqual(
      getOverallDifference([
        {
          filePath: 'a',
          status: 'pass',
          size: 125,
          baseBranchSize: 100,
        },
      ]),
      {
        totalAdded: 25,
        totalRemoved: 0,
        percentageChange: 25,
      },
    );
  });

  test('removes bytes when a file shrinks', () => {
    const { totalAdded, totalRemoved } = getOverallDifference([
      { filePath: 'a', status: 'pass', size: 50, baseBranchSize: 200 },
    ]);
    assert.equal(totalAdded, 0);
    assert.equal(totalRemoved, 150);
  });

  test('reports both directions and the overall percentage', () => {
    assert.deepEqual(
      getOverallDifference([
        {
          filePath: 'a',
          status: 'pass',
          size: 125,
          baseBranchSize: 100,
        },
        {
          filePath: 'b',
          status: 'pass',
          size: 650,
          baseBranchSize: 700,
        },
      ]),
      { totalAdded: 25, totalRemoved: 50, percentageChange: -3.125 },
    );
    assert.equal(
      getOverallDifference([
        {
          filePath: 'a',
          status: 'pass',
          size: 225,
          baseBranchSize: 100,
        },
        {
          filePath: 'b',
          status: 'pass',
          size: 650,
          baseBranchSize: 700,
        },
      ]).percentageChange,
      9.375,
    );
  });
});

describe('getPercentageChangeString', () => {
  test('formats like 0.x', () => {
    assert.equal(getPercentageChangeString(null), '');
    assert.equal(getPercentageChangeString(1.2), '+1.2%');
    assert.equal(getPercentageChangeString(-1.2), '-1.2%');
    assert.equal(getPercentageChangeString(0), '±0.0%');
    assert.equal(getPercentageChangeString(1.2345), '+1.2%');
  });
});

for (const filePath of Object.getOwnPropertyNames(Object.prototype)) {
  test(`analyzes own entries only: ${filePath}`, () => {
    const files: FileDetailsByPath = {
      [filePath]: { size: 100, maxSize: 200, compression: 'none' },
    };
    const [removed] = analyzeFiles({
      currentBranchFileDetails: {},
      baseBranchFileDetails: files,
      baseBranchName: 'main',
    });
    assert.equal(removed?.status, 'removed');
    assert.equal(removed?.baseBranchSize, 100);
    assert.equal(removed?.size, 0);
    const [added] = analyzeFiles({
      currentBranchFileDetails: files,
      baseBranchFileDetails: {},
      baseBranchName: 'main',
    });
    assert.equal(added?.status, 'pass');
    assert.equal(added?.baseBranchSize, 0);
    assert.equal(added?.size, 100);
  });
}
