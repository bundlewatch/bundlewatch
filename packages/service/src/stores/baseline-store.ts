import type { FileDetailsByPath } from '@bundlewatch/core'

/**
 * The latest file sizes saved for a branch. Fields other than the keys are
 * optional on read: dynamoose 1.x left out empty attributes, and the table
 * holds items written since 2018.
 */
export type Baseline = {
    /** `owner/name`. */
    repo: string
    repoBranch: string
    repoOwner?: string | undefined
    repoName?: string | undefined
    commitSha?: string | undefined
    fileDetailsByPath?: FileDetailsByPath | undefined
    /** Epoch milliseconds, as a string. */
    timestamp?: string | undefined
}

export type BaselineStore = {
    /** Replaces the branch's baseline. */
    save(baseline: Baseline): Promise<void>
    get(repo: string, repoBranch: string): Promise<Baseline | undefined>
}

export class MemoryBaselineStore implements BaselineStore {
    readonly #items = new Map<string, Baseline>()

    async save(baseline: Baseline): Promise<void> {
        this.#items.set(
            JSON.stringify([baseline.repo, baseline.repoBranch]),
            structuredClone(baseline),
        )
    }

    async get(repo: string, repoBranch: string): Promise<Baseline | undefined> {
        const baseline = this.#items.get(JSON.stringify([repo, repoBranch]))
        return baseline && structuredClone(baseline)
    }
}
