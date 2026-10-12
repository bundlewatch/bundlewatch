import { gunzipSync, gzipSync } from 'node:zlib'

import {
    type AttributeValue,
    type DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import type { ResultsData } from '../validators.ts'
import type { ResultsStore, StoredResults } from './results-store.ts'

// Items: { id: S, repo: S, createdAt: S, expiresAt?: N, payload: B }.
// `payload` is gzip-compressed JSON: results of large projects compress
// about tenfold, which keeps them well below DynamoDB's 400 KB item limit.

export const toResultsItem = (
    results: StoredResults,
): Record<string, AttributeValue> =>
    marshall(
        {
            ...results,
            payload: gzipSync(JSON.stringify(results.payload)),
        },
        { removeUndefinedValues: true },
    )

export const fromResultsItem = (
    item: Record<string, AttributeValue>,
): StoredResults => {
    const raw = unmarshall(item)
    return {
        id: String(raw.id),
        repo: String(raw.repo),
        createdAt: String(raw.createdAt),
        expiresAt:
            typeof raw.expiresAt === 'number' ? raw.expiresAt : undefined,
        payload: JSON.parse(
            gunzipSync(raw.payload as Uint8Array).toString('utf8'),
        ) as ResultsData,
    }
}

export class DynamoResultsStore implements ResultsStore {
    readonly #client: DynamoDBClient
    readonly #tableName: string

    constructor(client: DynamoDBClient, tableName: string) {
        this.#client = client
        this.#tableName = tableName
    }

    async create(results: StoredResults): Promise<boolean> {
        try {
            await this.#client.send(
                new PutItemCommand({
                    TableName: this.#tableName,
                    Item: toResultsItem(results),
                    ConditionExpression: 'attribute_not_exists(#id)',
                    ExpressionAttributeNames: { '#id': 'id' },
                }),
            )
            return true
        } catch (error) {
            if ((error as Error).name === 'ConditionalCheckFailedException') {
                return false
            }
            throw error
        }
    }

    async get(id: string): Promise<StoredResults | undefined> {
        const { Item } = await this.#client.send(
            new GetItemCommand({
                TableName: this.#tableName,
                Key: marshall({ id }),
            }),
        )
        return Item && fromResultsItem(Item)
    }
}
