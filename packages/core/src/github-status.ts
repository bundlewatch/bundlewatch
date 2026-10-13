import { postJson } from './http.ts';

// Reports commit statuses. Users list the `bundlewatch` context in
// branch-protection required checks, so context names must not change.

export type StatusLogger = {
  error: (message: string) => void;
  warn: (message: string) => void;
};

type CommitState = 'pending' | 'success' | 'failure' | 'error';

const MAX_CONTEXTS = 5;
const MAX_PATH_LENGTH = 35;

// GitHub rejects longer descriptions, which would leave the status pending.
const MAX_DESCRIPTION_LENGTH = 140;

const truncate = (description: string | undefined): string | undefined => {
  if (description === undefined) return undefined;
  const characters = [...description];
  return characters.length > MAX_DESCRIPTION_LENGTH
    ? `${characters.slice(0, MAX_DESCRIPTION_LENGTH - 1).join('')}…`
    : description;
};

const contextFor = (filePath: string | undefined): string => {
  if (!filePath) {
    return 'bundlewatch';
  }
  if (filePath.length > MAX_PATH_LENGTH) {
    return `bundlewatch *${filePath.slice(-(MAX_PATH_LENGTH + 2))}`;
  }
  return `bundlewatch ${filePath}`;
};

export type GitHubStatusOptions = {
  repoOwner?: string | undefined;
  repoName?: string | undefined;
  commitSha?: string | undefined;
  githubAccessToken?: string | undefined;
  apiUrl?: string | undefined;
  userAgent: string;
  logger: StatusLogger;
};

export class GitHubStatusReporter {
  readonly #options: GitHubStatusOptions;
  /** Context name → the file it reports on. */
  readonly #contexts = new Map<string, string | undefined>();

  constructor(options: GitHubStatusOptions) {
    this.#options = options;
  }

  get enabled(): boolean {
    const { githubAccessToken, repoOwner, repoName, commitSha } = this.#options;
    return Boolean(githubAccessToken && repoOwner && repoName && commitSha);
  }

  start({ message }: { message: string }): Promise<void> {
    return this.#update('pending', message);
  }

  pass({ message, url }: { message: string; url?: string | undefined }): Promise<void> {
    return this.#update('success', message, url);
  }

  /** `message` can be missing for files that errored; 0.x then sent no description. */
  fail({
    message,
    url,
    filePath,
  }: {
    message: string | undefined;
    url?: string | undefined;
    filePath?: string | undefined;
  }): Promise<void> {
    return this.#update('failure', message, url, filePath);
  }

  error({ message }: { message: string }): Promise<void> {
    return this.#update('error', message);
  }

  /**
   * The context for a file. Two long paths can end in the same 37
   * characters; 0.x then posted both under one context, and one result
   * hid the other.
   */
  #uniqueContext(filePath: string | undefined): string {
    const base = contextFor(filePath);
    for (let n = 1; ; n++) {
      const candidate = n === 1 ? base : `${base} (${n})`;
      if (!this.#contexts.has(candidate) || this.#contexts.get(candidate) === filePath) {
        return candidate;
      }
    }
  }

  async #update(
    state: CommitState,
    description: string | undefined,
    targetUrl?: string,
    filePath?: string,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }
    const { repoOwner, repoName, commitSha, githubAccessToken, logger } = this.#options;

    const context = this.#uniqueContext(filePath);
    if (!this.#contexts.has(context) && this.#contexts.size >= MAX_CONTEXTS) {
      logger.warn('Max reported statuses reached, github status will not be reported');
      return;
    }
    this.#contexts.set(context, filePath);

    const apiUrl = this.#options.apiUrl ?? 'https://api.github.com';
    // Network failures and timeouts propagate; HTTP errors are logged.
    const response = await postJson(
      `${apiUrl}/repos/${repoOwner}/${repoName}/statuses/${commitSha}`,
      {
        state,
        target_url: targetUrl,
        description: truncate(description),
        context,
      },
      {
        accept: 'application/vnd.github+json',
        // Older GitHub Enterprise versions require this scheme.
        authorization: `token ${githubAccessToken}`,
        'user-agent': this.#options.userAgent,
        'x-github-api-version': '2022-11-28',
      },
      5000,
    );
    if (response.status < 200 || response.status >= 300) {
      let body: { message?: string } | null = null;
      try {
        body = JSON.parse(response.data);
      } catch {
        // Some proxies return non-JSON error pages.
      }
      logger.error(`GitHubService HTTP_${response.status} :: ${body?.message ?? ''}`);
    }
  }
}
