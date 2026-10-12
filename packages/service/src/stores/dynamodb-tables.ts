import {
    type CreateTableCommandInput,
    CreateTableCommand,
    type DynamoDBClient,
    ResourceInUseException,
} from '@aws-sdk/client-dynamodb'

// Table definitions for DynamoDB Local (dev server, integration tests).
// Production tables are defined in the deployment template; the baseline
// table mirrors the one the 0.x Serverless stack created.

export const baselineTableDefinition = (
    tableName: string,
): CreateTableCommandInput => ({
    TableName: tableName,
    AttributeDefinitions: [
        { AttributeName: 'repo', AttributeType: 'S' },
        { AttributeName: 'repoBranch', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'S' },
    ],
    KeySchema: [
        { AttributeName: 'repo', KeyType: 'HASH' },
        { AttributeName: 'repoBranch', KeyType: 'RANGE' },
    ],
    LocalSecondaryIndexes: [
        {
            IndexName: 'timestamp',
            KeySchema: [
                { AttributeName: 'repo', KeyType: 'HASH' },
                { AttributeName: 'timestamp', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'KEYS_ONLY' },
        },
    ],
    BillingMode: 'PAY_PER_REQUEST',
})

export const resultsTableDefinition = (
    tableName: string,
): CreateTableCommandInput => ({
    TableName: tableName,
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
})

export const ensureTables = async (
    client: DynamoDBClient,
    definitions: CreateTableCommandInput[],
): Promise<void> => {
    const create = async (definition: CreateTableCommandInput) => {
        try {
            await client.send(new CreateTableCommand(definition))
        } catch (error) {
            if (!(error instanceof ResourceInUseException)) {
                throw error
            }
        }
    }
    await Promise.all(definitions.map(create))
}
