import {
  type AnalyzeResult,
  analyze,
  type FileDetailsByPath,
  GitHubStatusReporter,
  STATUSES,
} from '@bundlewatch/core';

import { type BundlewatchConfig, type ResolvedConfig, resolveConfig } from './config.ts';
import { logger } from './logger.ts';
import { measureFiles } from './measure.ts';
import { ServiceClient } from './service-client.ts';
import { USER_AGENT } from './version.ts';

export type { FileResult, Status } from '@bundlewatch/core';
export type { BundlewatchConfig, CiConfig, FileConfig } from './config.ts';
export { ValidationError } from './errors.ts';
export { STATUSES };

export type BundlewatchResult = AnalyzeResult & {
  /** Results page. Missing when `bundlewatchServiceHost` is `null`. */
  url: string | undefined;
};

const run = async (config: ResolvedConfig): Promise<BundlewatchResult> => {
  const currentBranchFileDetails = measureFiles(config);

  const service = new ServiceClient(config);
  let baseBranchFileDetails: FileDetailsByPath = {};
  if (config.compare) {
    baseBranchFileDetails = await service.getBaseline();
  } else {
    logger.info('Baseline comparison disabled; checking size limits only');
  }
  await service.saveBaseline(currentBranchFileDetails);

  const results = analyze({
    currentBranchFileDetails,
    baseBranchFileDetails,
    // Without a base branch name, the summary leaves out the difference.
    baseBranchName: config.compare ? config.ci.repoBranchBase : undefined,
  });
  return { ...results, url: await service.getResultsUrl(results) };
};

/**
 * Measures the configured files, compares them with the baseline unless
 * `compare` is `false`, and reports to GitHub.
 */
const bundlewatch = async (customConfig?: BundlewatchConfig): Promise<BundlewatchResult> => {
  const config = resolveConfig(customConfig);
  const github = new GitHubStatusReporter({
    ...config.ci,
    prefix: config.prefix,
    apiUrl: process.env.GITHUB_API_URL || undefined,
    userAgent: USER_AGENT,
    logger,
  });
  await github.start({ message: 'Checking bundlewatch...' });

  try {
    const results = await run(config);
    if (results.status === STATUSES.FAIL) {
      await github.fail({ message: results.summary, url: results.url });
      await Promise.all(
        results.fullResults
          .filter((result) => result.status === STATUSES.FAIL)
          .map((result) =>
            github.fail({
              message: result.message,
              filePath: result.filePath,
            }),
          ),
      );
    } else {
      await github.pass({ message: results.summary, url: results.url });
    }
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    await github.error({
      message: `Unable to analyze, check logs. ${message}`,
    });
    throw error;
  }
};

export default bundlewatch;
