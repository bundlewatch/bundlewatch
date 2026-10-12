import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { type AttributeValue, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

import { recordingClient } from '../test-helpers/fake-dynamodb.ts';
import {
  DynamoBaselineStore,
  fromBaselineItem,
  toBaselineItem,
} from './dynamodb-baseline-store.ts';

// Items written by dynamoose 1.11.1 with the 0.x schema
// (src/models/store.js) through the 0.x `POST /store` code path, into
// DynamoDB Local, then read back raw with GetItem.
const DYNAMOOSE_ITEMS: Record<string, Record<string, AttributeValue>> = {
  typical: {
    repoOwner: { S: 'Owner' },
    repoName: { S: 'Repo' },
    repo: { S: 'Owner/Repo' },
    fileDetailsByPath: {
      S: '{"./dist/main.js":{"size":31448,"maxSize":102400,"compression":"gzip"},"./dist/<script>.js":{"size":12,"maxSize":null,"compression":"brotli"},"émoji 😀/a b.js":{"size":0,"maxSize":1.5,"compression":"none"}}',
    },
    commitSha: { S: 'abc123' },
    repoBranch: { S: 'master' },
    timestamp: { S: '1791829883284' },
  },
  empty: {
    repoOwner: { S: 'bundlewatch' },
    repoName: { S: 'e2e-test' },
    repo: { S: 'bundlewatch/e2e-test' },
    fileDetailsByPath: { S: '{}' },
    commitSha: { S: 'e34699345ad9ea6170a18065ea05140ed47a19c0' },
    repoBranch: { S: 'feat/slash' },
    timestamp: { S: '1791830973778' },
  },
  // Both quirks of the 0.x validator: an unconverted numeric string and
  // the free-form "filePath" key.
  quirks: {
    repoOwner: { S: 'bundlewatch' },
    repoName: { S: 'quirks' },
    repo: { S: 'bundlewatch/quirks' },
    fileDetailsByPath: {
      S: '{"./a.js":{"size":"12","maxSize":null,"compression":"gzip"},"filePath":{"anything":true}}',
    },
    commitSha: { S: 'abc' },
    repoBranch: { S: 'master' },
    timestamp: { S: '1791830974107' },
  },
};

describe('items written by dynamoose 1.x', () => {
  test('read back as dynamoose returned them', () => {
    assert.deepEqual(fromBaselineItem(DYNAMOOSE_ITEMS.typical ?? {}), {
      repo: 'Owner/Repo',
      repoBranch: 'master',
      repoOwner: 'Owner',
      repoName: 'Repo',
      commitSha: 'abc123',
      fileDetailsByPath: {
        './dist/main.js': {
          size: 31448,
          maxSize: 102400,
          compression: 'gzip',
        },
        './dist/<script>.js': {
          size: 12,
          maxSize: null,
          compression: 'brotli',
        },
        'émoji 😀/a b.js': {
          size: 0,
          maxSize: 1.5,
          compression: 'none',
        },
      },
      timestamp: '1791829883284',
    });
  });

  for (const [name, item] of Object.entries(DYNAMOOSE_ITEMS)) {
    test(`${name}: written back attribute for attribute`, () => {
      // Same attribute names, types and string values, so old
      // deployments reading the table can't tell the difference.
      assert.deepEqual(toBaselineItem(fromBaselineItem(item)), item);
    });
  }
});

describe('items written by this service', () => {
  const item = toBaselineItem({
    repo: 'o/r',
    repoBranch: 'main',
    repoOwner: 'o',
    repoName: 'r',
    commitSha: 'abc',
    fileDetailsByPath: {
      'a.js': { size: 1, maxSize: null, compression: 'gzip' },
    },
    timestamp: '1700000000000',
  });

  test('use only string attributes, like dynamoose', () => {
    assert.deepEqual(item, {
      repo: { S: 'o/r' },
      repoBranch: { S: 'main' },
      repoOwner: { S: 'o' },
      repoName: { S: 'r' },
      commitSha: { S: 'abc' },
      fileDetailsByPath: {
        S: '{"a.js":{"size":1,"maxSize":null,"compression":"gzip"}}',
      },
      // The `timestamp` LSI is typed S; a number would be rejected.
      timestamp: { S: '1700000000000' },
    });
  });

  test('leave out missing attributes, like dynamoose', () => {
    assert.deepEqual(toBaselineItem({ repo: 'o/r', repoBranch: 'main' }), {
      repo: { S: 'o/r' },
      repoBranch: { S: 'main' },
    });
  });
});

describe('defensive reads', () => {
  test('a map fileDetailsByPath and a numeric timestamp', () => {
    const baseline = fromBaselineItem({
      repo: { S: 'o/r' },
      repoBranch: { S: 'main' },
      fileDetailsByPath: {
        M: {
          'a.js': {
            M: {
              size: { N: '1' },
              maxSize: { NULL: true },
              compression: { S: 'gzip' },
            },
          },
        },
      },
      timestamp: { N: '1700000000000' },
    });
    assert.deepEqual(baseline.fileDetailsByPath, {
      'a.js': { size: 1, maxSize: null, compression: 'gzip' },
    });
    assert.equal(baseline.timestamp, '1700000000000');
  });

  test('missing attributes stay undefined', () => {
    assert.deepEqual(fromBaselineItem({ repo: { S: 'o/r' }, repoBranch: { S: 'main' } }), {
      repo: 'o/r',
      repoBranch: 'main',
      repoOwner: undefined,
      repoName: undefined,
      commitSha: undefined,
      fileDetailsByPath: undefined,
      timestamp: undefined,
    });
  });
});

describe('DynamoBaselineStore', () => {
  test('save puts the item, overwriting', async () => {
    const { client, commands } = recordingClient(() => ({}));
    await new DynamoBaselineStore(client, 'store-table').save({
      repo: 'o/r',
      repoBranch: 'main',
      fileDetailsByPath: {},
      timestamp: '1',
    });
    const [command] = commands;
    assert.ok(command instanceof PutItemCommand);
    assert.deepEqual(command.input, {
      TableName: 'store-table',
      Item: {
        repo: { S: 'o/r' },
        repoBranch: { S: 'main' },
        fileDetailsByPath: { S: '{}' },
        timestamp: { S: '1' },
      },
    });
  });

  test('get reads by repo and branch', async () => {
    const { client, commands } = recordingClient(() => ({
      Item: DYNAMOOSE_ITEMS.empty,
    }));
    const baseline = await new DynamoBaselineStore(client, 'store-table').get(
      'bundlewatch/e2e-test',
      'feat/slash',
    );
    const [command] = commands;
    assert.ok(command instanceof GetItemCommand);
    assert.deepEqual(command.input, {
      TableName: 'store-table',
      Key: {
        repo: { S: 'bundlewatch/e2e-test' },
        repoBranch: { S: 'feat/slash' },
      },
    });
    assert.deepEqual(baseline?.fileDetailsByPath, {});
  });

  test('get returns undefined for a missing item', async () => {
    const { client } = recordingClient(() => ({}));
    assert.equal(await new DynamoBaselineStore(client, 't').get('o/r', 'main'), undefined);
  });
});
