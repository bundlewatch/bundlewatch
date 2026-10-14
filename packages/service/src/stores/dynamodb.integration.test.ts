import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';

import { GetItemCommand } from '@aws-sdk/client-dynamodb';

import { createDynamoClient } from '../config.ts';
import { DynamoBaselineStore } from './dynamodb-baseline-store.ts';
import { DynamoResultsStore } from './dynamodb-results-store.ts';
import {
  baselineTableDefinition,
  ensureTables,
  resultsTableDefinition,
} from './dynamodb-tables.ts';

// Against a real DynamoDB, e.g.
// `docker run --rm -p 8000:8000 amazon/dynamodb-local` and
// `DYNAMODB_ENDPOINT=http://localhost:8000`.
const endpoint = process.env.DYNAMODB_ENDPOINT;

describe('DynamoDB stores', { skip: !endpoint && 'set DYNAMODB_ENDPOINT to run' }, async () => {
  const client = createDynamoClient({ DYNAMODB_ENDPOINT: endpoint });
  const suffix = randomUUID().slice(0, 8);
  const storeTable = `bundlewatch-store-test-${suffix}`;
  const resultsTable = `bundlewatch-results-test-${suffix}`;
  await ensureTables(client, [
    baselineTableDefinition(storeTable),
    resultsTableDefinition(resultsTable),
  ]);

  test('baselines are written as dynamoose 1.x wrote them', async () => {
    const store = new DynamoBaselineStore(client, storeTable);
    const baseline = {
      repo: 'o/r',
      repoBranch: 'main',
      repoOwner: 'o',
      repoName: 'r',
      commitSha: 'abc',
      fileDetailsByPath: {
        'a.js': { size: 1, maxSize: null, compression: 'gzip' },
      },
      timestamp: '1700000000000',
    };
    await store.save(baseline);
    assert.deepEqual(await store.get('o/r', 'main'), baseline);
    assert.equal(await store.get('o/r', 'other'), undefined);
    const { Item } = await client.send(
      new GetItemCommand({
        TableName: storeTable,
        Key: { repo: { S: 'o/r' }, repoBranch: { S: 'main' } },
      }),
    );
    assert.deepEqual(Item?.fileDetailsByPath, {
      S: '{"a.js":{"size":1,"maxSize":null,"compression":"gzip"}}',
    });
    assert.deepEqual(Item?.timestamp, { S: '1700000000000' });
  });

  test('short links are created once per id', async () => {
    const store = new DynamoResultsStore(client, resultsTable);
    const results = {
      id: 'AAAAAAAAAAAAAAAAAAAAAA',
      repo: 'o/r',
      createdAt: new Date(0).toISOString(),
      payload: {
        details: {},
        results: { status: 'pass', summary: 's', fullResults: [] },
      },
    };
    assert.equal(await store.create(results), true);
    assert.equal(await store.create({ ...results, repo: 'x/y' }), false);
    assert.deepEqual(await store.get(results.id), {
      ...results,
      expiresAt: undefined,
    });
    assert.equal(await store.get('BBBBBBBBBBBBBBBBBBBBBB'), undefined);
  });
});
