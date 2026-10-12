import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import type { AppConfig } from './app.ts';
import { DynamoBaselineStore } from './stores/dynamodb-baseline-store.ts';
import { DynamoResultsStore } from './stores/dynamodb-results-store.ts';

type Env = Record<string, string | undefined>;

const positiveInteger = (value: string | undefined): number | undefined =>
  value && /^\d+$/.test(value.trim()) && Number(value) > 0 ? Number(value) : undefined;

export const appConfigFromEnv = (env: Env): AppConfig => ({
  githubApiUrl: env.GITHUB_API_URL || undefined,
  githubClientId: env.GITHUB_CLIENT_ID,
  githubClientSecret: env.GITHUB_CLIENT_SECRET,
  publicUrl: env.PUBLIC_URL || undefined,
  commitSha: env.GIT_SHA1 || undefined,
  resultsRetentionDays: positiveInteger(env.RESULTS_RETENTION_DAYS),
  writeAuthorization: env.WRITE_AUTHORIZATION === 'enforce' ? 'enforce' : 'report',
});

export const createDynamoClient = (env: Env): DynamoDBClient => {
  const endpoint = env.DYNAMODB_ENDPOINT || undefined;
  // DynamoDB Local accepts any credentials, but the SDK insists on some.
  const local =
    endpoint && !env.AWS_ACCESS_KEY_ID
      ? {
          region: env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: 'local',
            secretAccessKey: 'local',
          },
        }
      : {};
  return new DynamoDBClient({ endpoint, ...local });
};

export const dynamoStoresFromEnv = (
  env: Env,
  client: DynamoDBClient = createDynamoClient(env),
): { baselineStore: DynamoBaselineStore; resultsStore: DynamoResultsStore } => {
  const { STORE_TABLE, RESULTS_TABLE } = env;
  if (!STORE_TABLE || !RESULTS_TABLE) {
    throw new Error('STORE_TABLE and RESULTS_TABLE must be set');
  }
  return {
    baselineStore: new DynamoBaselineStore(client, STORE_TABLE),
    resultsStore: new DynamoResultsStore(client, RESULTS_TABLE),
  };
};
