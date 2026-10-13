import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';

/** A DynamoDB client that records commands and answers with `respond`. */
export const recordingClient = (
  respond: (command: unknown) => unknown,
): { client: DynamoDBClient; commands: unknown[] } => {
  const commands: unknown[] = [];
  const client = {
    send: async (command: unknown) => {
      commands.push(command);
      return respond(command);
    },
  } as unknown as DynamoDBClient;
  return { client, commands };
};
