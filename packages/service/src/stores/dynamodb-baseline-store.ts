import {
    type AttributeValue,
    type DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import type { FileDetailsByPath } from '@bundlewatch/core'

import type { Baseline, BaselineStore } from './baseline-store.ts'

// The baseline table was written by dynamoose 1.11.1, and older service
// deployments may still read and write it. dynamoose stored every attribute
// as a string (S): `fileDetailsByPath` (schema type Object) as a JSON
// string, and `timestamp` (schema type String, given Date.now()) as epoch
// milliseconds. It can't read a map (M) back, and the `timestamp` local
// secondary index requires S. See dynamodb-baseline-store.test.ts.

export const toBaselineItem = (
    baseline: Baseline,
): Record<string, AttributeValue> =>
    marshall(
        {
            ...baseline,
            fileDetailsByPath:
                baseline.fileDetailsByPath &&
                JSON.stringify(baseline.fileDetailsByPath),
        },
        { removeUndefinedValues: true },
    )

const optionalString = (value: unknown): string | undefined =>
    value === undefined ? undefined : String(value)

export const fromBaselineItem = (
    item: Record<string, AttributeValue>,
): Baseline => {
    const raw = unmarshall(item)
    return {
        repo: String(raw.repo),
        repoBranch: String(raw.repoBranch),
        repoOwner: optionalString(raw.repoOwner),
        repoName: optionalString(raw.repoName),
        commitSha: optionalString(raw.commitSha),
        // A map is accepted too, in case anything ever wrote one.
        fileDetailsByPath: (typeof raw.fileDetailsByPath === 'string'
            ? JSON.parse(raw.fileDetailsByPath)
            : raw.fileDetailsByPath) as FileDetailsByPath | undefined,
        timestamp: optionalString(raw.timestamp),
    }
}

export class DynamoBaselineStore implements BaselineStore {
    readonly #client: DynamoDBClient
    readonly #tableName: string

    constructor(client: DynamoDBClient, tableName: string) {
        this.#client = client
        this.#tableName = tableName
    }

    async save(baseline: Baseline): Promise<void> {
        await this.#client.send(
            new PutItemCommand({
                TableName: this.#tableName,
                Item: toBaselineItem(baseline),
            }),
        )
    }

    async get(repo: string, repoBranch: string): Promise<Baseline | undefined> {
        const { Item } = await this.#client.send(
            new GetItemCommand({
                TableName: this.#tableName,
                Key: marshall({ repo, repoBranch }),
            }),
        )
        return Item && fromBaselineItem(Item)
    }
}
