import type { ResultsData } from '../validators.ts'

/** A results page behind a short link (`/r/{id}`). */
export type StoredResults = {
    id: string
    /** `owner/name` of the repo the token was checked against. */
    repo: string
    /** ISO 8601. */
    createdAt: string
    /** Epoch seconds, for DynamoDB TTL. Missing when kept forever. */
    expiresAt?: number | undefined
    payload: ResultsData
}

export type ResultsStore = {
    /** Returns false, without writing, if the id is already taken. */
    create(results: StoredResults): Promise<boolean>
    get(id: string): Promise<StoredResults | undefined>
}

export class MemoryResultsStore implements ResultsStore {
    readonly #items = new Map<string, StoredResults>()

    async create(results: StoredResults): Promise<boolean> {
        if (this.#items.has(results.id)) {
            return false
        }
        this.#items.set(results.id, structuredClone(results))
        return true
    }

    async get(id: string): Promise<StoredResults | undefined> {
        const results = this.#items.get(id)
        return results && structuredClone(results)
    }
}
