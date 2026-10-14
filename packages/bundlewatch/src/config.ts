import { type Compression, isValidPrefix, PREFIX_RULE } from '@bundlewatch/core';

import { getCiVars } from './ci.ts';
import { ValidationError } from './errors.ts';
import { logger } from './logger.ts';

export type FileConfig = {
  /** Glob for one or more files. */
  path: string;
  /** For example `'100kB'`, or a number of bytes. Defaults to no limit. */
  maxSize?: string | number | undefined;
  compression?: Compression | undefined;
};

export type CiConfig = {
  githubAccessToken?: string | undefined;
  repoOwner?: string | undefined;
  repoName?: string | undefined;
  repoCurrentBranch?: string | undefined;
  /** Branch to compare against, usually the pull request target. */
  repoBranchBase?: string | undefined;
  commitSha?: string | undefined;
  /** Branches whose results are saved as baselines. */
  trackBranches?: string[] | undefined;
  /** Pull request builds compare against a baseline but never save one. */
  isPullRequest?: boolean | undefined;
};

export type BundlewatchConfig = {
  /** Independent application namespace: 1-64 lowercase ASCII letters, digits, _ or -. */
  prefix?: string | undefined;
  files?: FileConfig[] | undefined;
  defaultCompression?: Compression | undefined;
  /** Removes matching capture groups from file names, e.g. content hashes. */
  normalizeFilenames?: string | RegExp | null | undefined;
  /** `null` disables comparisons and short links. */
  bundlewatchServiceHost?: string | null | undefined;
  ci?: CiConfig | undefined;
};

export type ResolvedConfig = {
  prefix?: string | undefined;
  files: FileConfig[];
  defaultCompression: Compression;
  normalizeFilenames: RegExp | null;
  bundlewatchServiceHost: string | null;
  ci: CiConfig & { trackBranches: string[]; isPullRequest: boolean };
};

const COMPRESSION_TYPES = new Set(['gzip', 'brotli', 'none']);
const LEARN_MORE = 'Learn more at: https://bundlewatch.io/';

// lodash.merge also merged null-prototype objects, such as the namespace of
// an ES module config with only named exports.
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Like lodash.merge, which 0.x used, except that arrays replace instead of
 * merging index by index: with 0.x, `trackBranches: ['main']` silently
 * tracked `['main', 'develop']`.
 */
export const mergeConfig = <T extends Record<string, unknown>>(target: T, source: unknown): T => {
  // Like lodash.merge, any object's own properties merge at the top level.
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return target;
  }
  const merged: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    const current = merged[key];
    merged[key] =
      isPlainObject(value) && isPlainObject(current) ? mergeConfig(current, value) : value;
  }
  return merged as T;
};

const defaultConfig = (): BundlewatchConfig & { ci: CiConfig } => {
  const ci = getCiVars();
  const trackBranches = ['master', 'main', 'develop'];
  if (ci.defaultBranch && !trackBranches.includes(ci.defaultBranch)) {
    trackBranches.push(ci.defaultBranch);
  }
  return {
    files: [],
    defaultCompression: 'gzip',
    normalizeFilenames: null,
    bundlewatchServiceHost: 'https://service.bundlewatch.io',
    ci: {
      githubAccessToken: ci.githubAccessToken,
      repoOwner: ci.repoOwner,
      repoName: ci.repoName,
      repoCurrentBranch: ci.repoCurrentBranch,
      repoBranchBase: ci.repoBranchBase || ci.defaultBranch || 'master',
      commitSha: ci.commitSha,
      trackBranches,
      isPullRequest: ci.isPullRequest,
    },
  };
};

const toRegExp = (value: unknown): RegExp | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof RegExp) return value;
  if (typeof value === 'string') {
    try {
      return new RegExp(value);
    } catch {
      // fall through to the error below
    }
  }
  throw new ValidationError(`config.normalizeFilenames (${String(value)}) is not a valid RegExp.`);
};

const warnAboutCi = (config: ResolvedConfig): void => {
  const { ci } = config;
  const missing = (['githubAccessToken', 'repoOwner', 'repoName', 'commitSha'] as const).filter(
    (option) => !ci[option],
  );
  if (missing.length > 0) {
    logger.warn(`Some CI configuration options were not found (${missing.join(', ')}):
    bundlewatch will be unable to report build status, or save comparison data
    ${LEARN_MORE}
        `);
    return;
  }
  if (!config.bundlewatchServiceHost) {
    logger.warn(`bundlewatchServiceHost was not supplied, bundlewatch comparisons unavailable:
    ${LEARN_MORE}
            `);
    return;
  }
  if (!ci.repoBranchBase) {
    logger.warn(`The ci.repoBranchBase was not supplied, bundlewatch comparisons unavailable:
    ${LEARN_MORE}
                `);
  }
  if (!ci.repoCurrentBranch) {
    logger.warn(`The ci.repoCurrentBranch was not supplied, bundlewatch results will not be saved:
    ${LEARN_MORE}
            `);
  }
};

/** Applies defaults (including detected CI values) and validates. */
export const resolveConfig = (customConfig: BundlewatchConfig = {}): ResolvedConfig => {
  const config = mergeConfig(defaultConfig(), customConfig) as Record<string, unknown> & {
    ci: Record<string, unknown>;
  };

  if (config.prefix !== undefined && !isValidPrefix(config.prefix)) {
    throw new ValidationError(`config.prefix ${PREFIX_RULE}`);
  }
  if (!Array.isArray(config.files)) {
    throw new ValidationError('config.files must be an Array');
  }
  for (const file of config.files as unknown[]) {
    if (!isPlainObject(file) || typeof file.path !== 'string') {
      throw new ValidationError(
        'config.files must only contain objects with a path, e.g. { path: "./dist/*.js" }',
      );
    }
  }
  if (!COMPRESSION_TYPES.has(config.defaultCompression as string)) {
    throw new ValidationError('config.compression must be a valid type');
  }
  if (!Array.isArray(config.ci.trackBranches)) {
    throw new ValidationError('config.ci.trackBranches must be an Array');
  }

  const resolved = {
    ...config,
    normalizeFilenames: toRegExp(config.normalizeFilenames),
    ci: { ...config.ci, isPullRequest: Boolean(config.ci.isPullRequest) },
  } as ResolvedConfig;
  warnAboutCi(resolved);
  return resolved;
};
