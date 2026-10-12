import { formatBytes } from './bytes.ts';
import {
  type AnalyzeResult,
  type FileDetailsByPath,
  type FileResult,
  isFileError,
  STATUSES,
  type Status,
} from './types.ts';

// The messages and summaries built here show up in GitHub statuses, CI logs
// and on the results page. Keep them byte-for-byte compatible with 0.x.

type AnalyzeInput = {
  currentBranchFileDetails: FileDetailsByPath;
  baseBranchFileDetails: FileDetailsByPath;
  baseBranchName?: string | undefined;
};

const compressionText = (compression: string | undefined): string =>
  compression === 'none' ? '(no compression)' : `(${compression})`;

export const analyzeFiles = ({
  currentBranchFileDetails,
  baseBranchFileDetails,
  baseBranchName,
}: AnalyzeInput): FileResult[] => {
  const filePaths = new Set([
    ...Object.keys(currentBranchFileDetails),
    ...Object.keys(baseBranchFileDetails),
  ]);

  return [...filePaths].map((filePath): FileResult => {
    const current = Object.hasOwn(currentBranchFileDetails, filePath)
      ? currentBranchFileDetails[filePath]
      : undefined;
    const base = Object.hasOwn(baseBranchFileDetails, filePath)
      ? baseBranchFileDetails[filePath]
      : undefined;
    const baseSize = base && !isFileError(base) ? base.size : undefined;

    if (!current) {
      const compression = base && !isFileError(base) ? base.compression : undefined;
      return {
        filePath,
        message: `${filePath}: File removed (${formatBytes(baseSize as number)} smaller than ${baseBranchName}) ${compressionText(compression)}`,
        status: STATUSES.REMOVED,
        size: 0,
        baseBranchSize: baseSize as number,
        maxSize: 0,
      };
    }

    if (isFileError(current)) {
      return { filePath, error: current.error, status: STATUSES.FAIL };
    }

    const { size, compression } = current;
    // The CLI passes Infinity; JSON callers of the service send null.
    const maxSize = current.maxSize ?? Number.POSITIVE_INFINITY;
    const prettyMaxSize = maxSize === Number.POSITIVE_INFINITY ? 'Infinity' : formatBytes(maxSize);

    let status: Status;
    let message = `${formatBytes(size)} `;
    if (size > maxSize) {
      status = STATUSES.FAIL;
      message += `> ${prettyMaxSize} `;
    } else {
      status = STATUSES.PASS;
      message += `< ${prettyMaxSize} `;
      if (baseSize !== undefined) {
        const diff = size - baseSize;
        if (diff < 0) {
          message += `(${formatBytes(Math.abs(diff))} smaller than ${baseBranchName}) `;
        } else if (diff > 0) {
          message += `(${formatBytes(diff)} larger than ${baseBranchName}) `;
        } else {
          message += '(no difference) ';
        }
      }
    }
    message += compressionText(compression);

    return {
      filePath,
      message,
      status,
      size,
      baseBranchSize: base ? (baseSize as number) : 0,
      maxSize: current.maxSize,
    };
  });
};

const overallStatus = (fileResults: FileResult[]): Status => {
  if (fileResults.some((result) => result.status === STATUSES.FAIL)) {
    return STATUSES.FAIL;
  }
  if (fileResults.some((result) => result.status === STATUSES.WARN)) {
    return STATUSES.WARN;
  }
  return STATUSES.PASS;
};

export const getOverallDifference = (
  fullResults: FileResult[],
): {
  totalAdded: number;
  totalRemoved: number;
  percentageChange: number | null;
} => {
  let totalBaseBranchSize = 0;
  let totalSize = 0;
  let totalAdded = 0;
  let totalRemoved = 0;
  for (const { size = 0, baseBranchSize = 0 } of fullResults) {
    totalBaseBranchSize += baseBranchSize;
    totalSize += size;
    if (size < baseBranchSize) {
      totalRemoved += baseBranchSize - size;
    } else {
      totalAdded += size - baseBranchSize;
    }
  }
  const percentageChange = totalBaseBranchSize
    ? ((totalSize - totalBaseBranchSize) / totalBaseBranchSize) * 100
    : null;
  return { totalAdded, totalRemoved, percentageChange };
};

export const getPercentageChangeString = (percentageChange: number | null): string => {
  if (percentageChange === null) {
    return '';
  }
  const fixed = percentageChange.toFixed(1);
  if (percentageChange > 0) return `+${fixed}%`;
  if (percentageChange < 0) return `${fixed}%`;
  return `±${fixed}%`;
};

const summarize = (
  status: Status,
  fullResults: FileResult[],
  baseBranchName: string | undefined,
): string => {
  if (status === STATUSES.FAIL) {
    return 'maxSize check failed';
  }

  let difference = '';
  if (baseBranchName) {
    const { totalAdded, totalRemoved, percentageChange } = getOverallDifference(fullResults);
    const percentage = getPercentageChangeString(percentageChange);
    difference = `(+${formatBytes(totalAdded)}, -${formatBytes(totalRemoved)}${percentage ? `, ${percentage}` : ''})`;
  }

  if (status === STATUSES.WARN) {
    return `File(s) have passed tolerance thresholds ${difference}`;
  }
  return `Everything is in check ${difference}`;
};

export const analyze = (input: AnalyzeInput): AnalyzeResult => {
  const fullResults = analyzeFiles(input);
  const status = overallStatus(fullResults);
  return {
    status,
    fullResults,
    summary: summarize(status, fullResults, input.baseBranchName),
  };
};
