import { type FileDetailsByPath, validatePrefix } from '@bundlewatch/core';

/** GitHub repositories have two path components; prefixes cannot contain a slash. */
export const baselineRepoKey = (repo: string, prefix?: string): string => {
  validatePrefix(prefix);
  return prefix === undefined ? repo : `${repo}/${prefix}`;
};

/**
 * The latest file sizes saved for a branch. Fields other than the keys are
 * optional on read: dynamoose 1.x left out empty attributes, and the table
 * holds items written since 2018.
 */
export type Baseline = {
  /** `owner/name`. */
  repo: string;
  prefix?: string | undefined;
  repoBranch: string;
  repoOwner?: string | undefined;
  repoName?: string | undefined;
  commitSha?: string | undefined;
  fileDetailsByPath?: FileDetailsByPath | undefined;
  /** Epoch milliseconds, as a string. */
  timestamp?: string | undefined;
};

export type BaselineStore = {
  /** Replaces the branch's baseline. */
  save(baseline: Baseline): Promise<void>;
  get(repo: string, repoBranch: string, prefix?: string): Promise<Baseline | undefined>;
};

export class MemoryBaselineStore implements BaselineStore {
  readonly #items = new Map<string, Baseline>();

  async save(baseline: Baseline): Promise<void> {
    this.#items.set(
      JSON.stringify([baselineRepoKey(baseline.repo, baseline.prefix), baseline.repoBranch]),
      structuredClone(baseline),
    );
  }

  async get(repo: string, repoBranch: string, prefix?: string): Promise<Baseline | undefined> {
    const baseline = this.#items.get(JSON.stringify([baselineRepoKey(repo, prefix), repoBranch]));
    return baseline && structuredClone(baseline);
  }
}
