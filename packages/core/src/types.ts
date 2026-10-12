export const STATUSES = {
  PASS: 'pass',
  WARN: 'warn',
  FAIL: 'fail',
  REMOVED: 'removed',
} as const;

export type Status = (typeof STATUSES)[keyof typeof STATUSES];

export type Compression = 'gzip' | 'brotli' | 'none';

/** One measured file. Sent to the service when saving a baseline. */
export type FileDetails = {
  size: number;
  /** `Infinity` locally; becomes `null` once serialized to JSON. */
  maxSize: number | null;
  compression: Compression | string;
};

/** A glob that matched nothing, or a file that couldn't be read. */
export type FileError = {
  error: string;
};

export type FileDetailsByPath = Record<string, FileDetails | FileError>;

export type FileResult = {
  filePath: string;
  status: Status;
  message?: string;
  error?: string;
  size?: number;
  baseBranchSize?: number;
  maxSize?: number | null;
};

export type AnalyzeResult = {
  status: Status;
  fullResults: FileResult[];
  summary: string;
};

/** Repository details shown on the results page. All optional. */
export type ResultsDetails = {
  repoOwner?: string | undefined;
  repoName?: string | undefined;
  repoCurrentBranch?: string | undefined;
  repoBranchBase?: string | undefined;
  commitSha?: string | undefined;
};

/** What the `d` query parameter of `/results` decodes to. */
export type ResultsPayload = {
  details: ResultsDetails;
  results: AnalyzeResult;
};

/** Body of `POST /store/lookup`. */
export type LookupRequest = {
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  commitSha: string;
  githubAccessToken: string;
};

/** Body of `POST /store`. */
export type StoreRequest = LookupRequest & {
  fileDetailsByPath: Record<string, FileDetails>;
};

export const isFileError = (value: FileDetails | FileError | undefined): value is FileError =>
  value !== undefined && 'error' in value && typeof value.error === 'string';
