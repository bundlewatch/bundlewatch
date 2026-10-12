import { createServer, type IncomingMessage } from 'node:http';

import { createApp } from './app.ts';
import { appConfigFromEnv, createDynamoClient, dynamoStoresFromEnv } from './config.ts';
import { MemoryBaselineStore } from './stores/baseline-store.ts';
import {
  baselineTableDefinition,
  ensureTables,
  resultsTableDefinition,
} from './stores/dynamodb-tables.ts';
import { MemoryResultsStore } from './stores/results-store.ts';

// Local development server. Stores are in memory unless DYNAMODB_ENDPOINT
// points at DynamoDB Local, where missing tables are created.

const env: Record<string, string | undefined> & {
  STORE_TABLE: string;
  RESULTS_TABLE: string;
} = {
  ...process.env,
  STORE_TABLE: process.env.STORE_TABLE || 'bundlewatch-store-local',
  RESULTS_TABLE: process.env.RESULTS_TABLE || 'bundlewatch-results-local',
};
const port = Number(env.PORT) || 3000;

const stores = async () => {
  if (!env.DYNAMODB_ENDPOINT) {
    return {
      baselineStore: new MemoryBaselineStore(),
      resultsStore: new MemoryResultsStore(),
    };
  }
  const client = createDynamoClient(env);
  await ensureTables(client, [
    baselineTableDefinition(env.STORE_TABLE),
    resultsTableDefinition(env.RESULTS_TABLE),
  ]);
  return dynamoStoresFromEnv(env, client);
};

const app = createApp({ ...(await stores()), config: appConfigFromEnv(env) });

const toRequest = async (incoming: IncomingMessage): Promise<Request> => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value !== undefined) {
      headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of incoming) {
    chunks.push(chunk as Buffer);
  }
  const method = incoming.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const host = incoming.headers.host ?? `localhost:${port}`;
  return new Request(`http://${host}${incoming.url}`, {
    method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : null,
  });
};

createServer(async (incoming, outgoing) => {
  const response = await app(await toRequest(incoming));
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => {
  const storage = env.DYNAMODB_ENDPOINT
    ? `DynamoDB at ${env.DYNAMODB_ENDPOINT}`
    : 'in-memory stores';
  console.log(`bundlewatch service on http://localhost:${port} (${storage})`);
});
