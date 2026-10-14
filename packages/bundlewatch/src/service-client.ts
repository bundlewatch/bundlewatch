import {
  type AnalyzeResult,
  createResultsPayload,
  createResultsUrl,
  type FileDetails,
  type FileDetailsByPath,
  isFileError,
  postJson as requestJson,
  type ResultsDetails,
  validatePrefix,
} from '@bundlewatch/core';

import type { ResolvedConfig } from './config.ts';
import { logger } from './logger.ts';
import { USER_AGENT } from './version.ts';

type RepoAuth = {
  prefix?: string | undefined;
  repoOwner: string | undefined;
  repoName: string | undefined;
  commitSha: string | undefined;
  githubAccessToken: string | undefined;
};

/**
 * The service host without Basic auth credentials. Links and log lines can
 * be read by anyone who sees the CI log or the commit status.
 */
const withoutCredentials = (host: string): string =>
  host.replace(/^([a-z][a-z\d+.-]*:\/\/)[^/?#]*@/i, '$1');

class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with status code ${status}`);
    this.status = status;
  }
}

class PrefixSupportError extends Error {}

const errorCode = (error: unknown): string => {
  if (error instanceof HttpError) return String(error.status);
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code ?? (error instanceof Error ? error.message : String(error));
};

const postJson = async (url: string, body: unknown, timeout: number): Promise<unknown> => {
  const response = await requestJson(url, body, { 'user-agent': USER_AGENT }, timeout);
  if (response.status < 200 || response.status >= 300) {
    throw new HttpError(response.status);
  }
  return JSON.parse(response.data);
};

/** Talks to the bundlewatch service: baselines and short results links. */
export class ServiceClient {
  readonly #host: string | null;
  readonly #ci: ResolvedConfig['ci'];
  readonly #prefix: string | undefined;
  #prefixSupport: Promise<void> | undefined;

  constructor({
    bundlewatchServiceHost,
    ci,
    prefix,
  }: Pick<ResolvedConfig, 'bundlewatchServiceHost' | 'ci' | 'prefix'>) {
    validatePrefix(prefix);
    this.#host = bundlewatchServiceHost;
    this.#ci = ci;
    this.#prefix = prefix;
  }

  get enabled(): boolean {
    const { githubAccessToken, repoOwner, repoName } = this.#ci;
    return Boolean(githubAccessToken && repoOwner && repoName && this.#host);
  }

  /** Fields every service request carries; the service checks the token against the repo. */
  #request(): RepoAuth {
    const { repoOwner, repoName, commitSha, githubAccessToken } = this.#ci;
    return {
      repoOwner,
      repoName,
      commitSha,
      githubAccessToken,
      ...(this.#prefix === undefined ? {} : { prefix: this.#prefix }),
    };
  }

  get #storePath(): string {
    // Old instances cannot treat a prefixed write as a legacy write during rollout.
    return this.#prefix === undefined ? '/store' : '/store/prefixed';
  }

  #prefixError(): PrefixSupportError {
    return new PrefixSupportError(
      `Cannot confirm prefix support at ${withoutCredentials(this.#host ?? '')} for prefix "${this.#prefix}". ` +
        'Deploy a service supporting baselinePrefix: 1 to every instance before enabling prefix, ' +
        'or set bundlewatchServiceHost to an upgraded service. Check that POST /capabilities and /store/prefixed routes are reachable. ' +
        'Legacy baseline fallback is disabled.',
    );
  }

  async #baselineRequest(suffix: string, body: unknown): Promise<unknown> {
    const url = `${this.#host}${this.#storePath}${suffix}`;
    if (this.#prefix === undefined) return postJson(url, body, 10_000);
    const response = await requestJson(url, body, { 'user-agent': USER_AGENT }, 10_000);
    // Older API gateways can reject unknown routes with 403 or 405 instead of 404.
    if (response.status === 403 || response.status === 405) throw this.#prefixError();
    // A supporting service echoes the namespace, including on a missing baseline.
    // A route missing on an old instance must stop the run, not look like an empty baseline.
    let data: { prefix?: unknown } | null = null;
    if ((response.status >= 200 && response.status < 300) || response.status === 404) {
      try {
        data = JSON.parse(response.data);
      } catch {
        throw this.#prefixError();
      }
      if (data?.prefix !== this.#prefix) throw this.#prefixError();
    }
    if (response.status < 200 || response.status >= 300) throw new HttpError(response.status);
    return data;
  }

  /** Check before either baseline operation; never fall back to the legacy namespace. */
  async #requirePrefixSupport(): Promise<void> {
    if (this.#prefix === undefined) return;
    this.#prefixSupport ??= (async () => {
      try {
        const data = await postJson(`${this.#host}/capabilities`, {}, 5000);
        if ((data as { baselinePrefix?: unknown } | null)?.baselinePrefix === 1) return;
      } catch {
        // Do not expose URL credentials or turn this into a best-effort lookup.
      }
      throw this.#prefixError();
    })();
    await this.#prefixSupport;
  }

  async getBaseline(): Promise<FileDetailsByPath> {
    const { repoBranchBase } = this.#ci;
    if (!this.enabled || !repoBranchBase) {
      return {};
    }
    await this.#requirePrefixSupport();
    logger.info('Retrieving comparison');
    try {
      const data = (await this.#baselineRequest('/lookup', {
        ...this.#request(),
        repoBranch: repoBranchBase,
      })) as { fileDetailsByPath?: FileDetailsByPath };
      return data?.fileDetailsByPath ?? {};
    } catch (error) {
      if (error instanceof PrefixSupportError) throw error;
      logger.debug(error);
      logger.error(
        `Unable to fetch fileDetails for baseBranch=${repoBranchBase} from ${withoutCredentials(this.#host ?? '')}/store code=${errorCode(error)}`,
      );
      return {};
    }
  }

  async saveBaseline(fileDetailsByPath: FileDetailsByPath): Promise<void> {
    const { repoCurrentBranch, trackBranches, isPullRequest } = this.#ci;
    if (!this.enabled || !repoCurrentBranch) {
      return;
    }
    if (!trackBranches.includes(repoCurrentBranch)) {
      logger.info(`${repoCurrentBranch} is not a branch to track, no results saved`);
      return;
    }
    if (isPullRequest) {
      logger.info('Pull request build, no results saved');
      return;
    }
    if (Object.values(fileDetailsByPath).some(isFileError)) {
      logger.info('Some files could not be measured, no results saved');
      return;
    }

    await this.#requirePrefixSupport();
    logger.info('Saving results');
    try {
      await this.#baselineRequest('', {
        ...this.#request(),
        repoBranch: repoCurrentBranch,
        fileDetailsByPath: fileDetailsByPath as Record<string, FileDetails>,
      });
    } catch (error) {
      if (error instanceof PrefixSupportError) throw error;
      logger.debug(error);
      logger.error(
        `Unable to save fileDetails for currentBranch=${repoCurrentBranch} code=${errorCode(error)}`,
      );
    }
  }

  /**
   * A short link (`/r/<id>`) when the service can store the results, the
   * long `/results?d=…` link otherwise: without a token, or against a
   * self-hosted service older than 1.0.
   */
  async getResultsUrl(results: AnalyzeResult): Promise<string | undefined> {
    if (!this.#host) {
      return undefined;
    }
    const { repoOwner, repoName, repoCurrentBranch, repoBranchBase, commitSha } = this.#ci;
    const details: ResultsDetails = {
      ...(this.#prefix === undefined ? {} : { prefix: this.#prefix }),
      repoOwner,
      repoName,
      repoCurrentBranch,
      repoBranchBase,
      commitSha,
    };

    if (this.enabled) {
      const payload = createResultsPayload(results, details);
      try {
        // Shorter than the other calls: the long link is a fine
        // fallback, and old CLIs never waited for this request.
        const { url } = (await postJson(
          `${this.#host}/results`,
          { ...this.#request(), payload },
          5000,
        )) as {
          url?: unknown;
        };
        if (typeof url === 'string') {
          return url;
        }
      } catch (error) {
        logger.debug(error);
        // Services older than 1.0 answer 403 (REST APIs), 404 or
        // 405; a token without write access gets 401. Only warn
        // when the service itself fails.
        const refused = error instanceof HttpError && error.status >= 400 && error.status < 500;
        if (!refused) {
          logger.warn(`Unable to create a short results link code=${errorCode(error)}`);
        }
      }
    }

    return createResultsUrl({ host: withoutCredentials(this.#host), results, details });
  }
}
