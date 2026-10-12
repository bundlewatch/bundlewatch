import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { gunzipSync } from 'node:zlib';

import {
  ConditionalCheckFailedException,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';

import { recordingClient } from '../test-helpers/fake-dynamodb.ts';
import { DynamoResultsStore, fromResultsItem, toResultsItem } from './dynamodb-results-store.ts';
import type { StoredResults } from './results-store.ts';

const results: StoredResults = {
  id: 'AbCdEf123456',
  repo: 'o/r',
  createdAt: '2026-10-12T00:00:00.000Z',
  expiresAt: 1_800_000_000,
  payload: {
    details: { repoOwner: 'o', repoName: 'r' },
    results: {
      status: 'pass',
      summary: 'Everything is in check',
      fullResults: [{ filePath: 'a.js', status: 'pass', size: 1, maxSize: null }],
    },
  },
};

describe('results items', () => {
  test('store the payload as gzip-compressed JSON', () => {
    const item = toResultsItem(results);
    assert.deepEqual(Object.keys(item).toSorted(), [
      'createdAt',
      'expiresAt',
      'id',
      'payload',
      'repo',
    ]);
    assert.deepEqual(item.id, { S: 'AbCdEf123456' });
    assert.deepEqual(item.repo, { S: 'o/r' });
    assert.deepEqual(item.createdAt, { S: '2026-10-12T00:00:00.000Z' });
    assert.deepEqual(item.expiresAt, { N: '1800000000' });
    const binary = item.payload?.B;
    assert.ok(binary instanceof Uint8Array);
    assert.deepEqual([...binary.subarray(0, 2)], [0x1f, 0x8b]);
    assert.deepEqual(JSON.parse(gunzipSync(binary).toString('utf8')), results.payload);
  });

  test('leave out expiresAt when kept forever', () => {
    assert.equal(toResultsItem({ ...results, expiresAt: undefined }).expiresAt, undefined);
  });

  test('round-trip', () => {
    assert.deepEqual(fromResultsItem(toResultsItem(results)), results);
  });
});

describe('DynamoResultsStore', () => {
  test('create writes only if the id is free', async () => {
    const { client, commands } = recordingClient(() => ({}));
    assert.equal(await new DynamoResultsStore(client, 'results').create(results), true);
    const [command] = commands;
    assert.ok(command instanceof PutItemCommand);
    assert.equal(command.input.TableName, 'results');
    assert.equal(command.input.ConditionExpression, 'attribute_not_exists(#id)');
    assert.deepEqual(command.input.ExpressionAttributeNames, {
      '#id': 'id',
    });
  });

  test('create returns false when the id is taken', async () => {
    const { client } = recordingClient(() => {
      throw new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
      });
    });
    assert.equal(await new DynamoResultsStore(client, 'results').create(results), false);
  });

  test('create rethrows other errors', async () => {
    const { client } = recordingClient(() => {
      throw new Error('throttled');
    });
    await assert.rejects(new DynamoResultsStore(client, 'results').create(results), {
      message: 'throttled',
    });
  });

  test('get reads and decompresses', async () => {
    const { client, commands } = recordingClient(() => ({
      Item: toResultsItem(results),
    }));
    assert.deepEqual(await new DynamoResultsStore(client, 'results').get(results.id), results);
    const [command] = commands;
    assert.ok(command instanceof GetItemCommand);
    assert.deepEqual(command.input.Key, { id: { S: results.id } });
  });

  test('get returns undefined for an unknown id', async () => {
    const { client } = recordingClient(() => ({}));
    assert.equal(await new DynamoResultsStore(client, 'results').get('x'), undefined);
  });
});
