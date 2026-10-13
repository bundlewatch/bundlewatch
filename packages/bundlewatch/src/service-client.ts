import {
  type AnalyzeResult,
  createResultsPayload,
  createResultsUrl,
  type FileDetails,
  type FileDetailsByPath,
  isFileError,
  postJson as requestJson,
  type ResultsDetails,
} from '@bundlewatch/core';

import type { ResolvedConfig } from './config.ts';
import { logger } from './logger.ts';
import { USER_AGENT } from './version.ts';

type RepoAuth = {
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

  constructor({
    bundlewatchServiceHost,
    ci,
  }: Pick<ResolvedConfig, 'bundlewatchServiceHost' | 'ci'>) {
    this.#host = bundlewatchServiceHost;
    this.#ci = ci;
  }

  get enabled(): boolean {
    const { githubAccessToken, repoOwner, repoName } = this.#ci;
    return Boolean(githubAccessToken && repoOwner && repoName && this.#host);
  }

  /** Fields every service request carries; the service checks the token against the repo. */
  #request(): RepoAuth {
    const { repoOwner, repoName, commitSha, githubAccessToken } = this.#ci;
    return { repoOwner, repoName, commitSha, githubAccessToken };
  }

  async getBaseline(): Promise<FileDetailsByPath> {
    const { repoBranchBase } = this.#ci;
    if (!this.enabled || !repoBranchBase) {
      return {};
    }
    logger.info('Retrieving comparison');
    try {
      const data = (await postJson(
        `${this.#host}/store/lookup`,
        { ...this.#request(), repoBranch: repoBranchBase },
        10_000,
      )) as { fileDetailsByPath?: FileDetailsByPath };
      return data?.fileDetailsByPath ?? {};
    } catch (error) {
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

    logger.info('Saving results');
    try {
      await postJson(
        `${this.#host}/store`,
        {
          ...this.#request(),
          repoBranch: repoCurrentBranch,
          fileDetailsByPath: fileDetailsByPath as Record<string, FileDetails>,
        },
        10_000,
      );
    } catch (error) {
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
