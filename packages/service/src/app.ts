import { randomBytes } from 'node:crypto';

import {
  analyze,
  createResultsPayload,
  decodeResultsData,
  GitHubStatusReporter,
  STATUSES,
} from '@bundlewatch/core';

import { checkRepoAccess, GitHubUnavailableError, type RepoAccess } from './github-auth.ts';
import { exchangeOAuthCode, githubWebUrl } from './github-oauth.ts';
import { CONTENT_SECURITY_POLICY, HttpError, htmlPage, json, readJsonBody } from './http.ts';
import { renderResultsNotFoundPage, renderResultsPage } from './pages/results-page.ts';
import { renderSetupGithubPage } from './pages/setup-github-page.ts';
import { SHORT_LINK_ID, saveShortLink } from './short-links.ts';
import { FONT_FILES } from './static/fonts.ts';
import { LOGO_SVG } from './static/logo.ts';
import { RESULTS_CSS } from './static/results-styles.ts';
import { SETUP_GITHUB_CSS } from './static/setup-github-styles.ts';
import type { BaselineStore } from './stores/baseline-store.ts';
import type { ResultsStore } from './stores/results-store.ts';
import {
  type ResultsData,
  ValidationError,
  validateAnalyzeRequest,
  validateCreateResultsRequest,
  validateLookupRequest,
  validateResultsPayload,
  validateStoreRequest,
} from './validators.ts';

export type AppConfig = {
  /** Default https://api.github.com. The OAuth host is derived from it. */
  githubApiUrl?: string | undefined;
  githubClientId?: string | undefined;
  githubClientSecret?: string | undefined;
  /** Base URL of short links. Defaults to the request's origin. */
  publicUrl?: string | undefined;
  /** Deployed commit, shown in the results page footer. */
  commitSha?: string | undefined;
  /** Days to keep short links. Kept forever when unset. */
  resultsRetentionDays?: number | undefined;
  /**
   * `report` (default) authorizes writes with the 0.x check and logs
   * where the stricter check would decide differently; `enforce` applies
   * the stricter check. See the README before switching.
   */
  writeAuthorization?: 'report' | 'enforce' | undefined;
};

export type Logger = {
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};

export type AppDeps = {
  baselineStore: BaselineStore;
  resultsStore: ResultsStore;
  config: AppConfig;
  logger?: Logger | undefined;
  now?: (() => number) | undefined;
  generateId?: (() => string) | undefined;
};

export type App = (request: Request) => Promise<Response>;

type Handler = (request: Request, url: URL, params: string[]) => Promise<Response>;

type Route = { method: string; path: string | RegExp; handle: Handler };

const USER_AGENT = 'bundlewatch-service';
const NOT_ALLOWED = { error: 'Not allowed' };
const GITHUB_UNREACHABLE = {
  error: 'Could not check repository access with GitHub',
};
// DynamoDB items are at most 400 KB. 0.x answered bodies over 100 kB with
// 413; bigger baselines now fit, up to what DynamoDB can store.
const MAX_BASELINE_BYTES = 350 * 1024;
const OAUTH_STATE_COOKIE = 'bundlewatch_oauth_state';

/** The kind of token, from its prefix, for logs. Never log the token. */
const tokenKind = (token: string): string => {
  const prefixes: Array<[string, string]> = [
    ['ghs_', 'installation'],
    ['gho_', 'oauth'],
    ['ghu_', 'app-user'],
    ['ghp_', 'classic-pat'],
    ['github_pat_', 'fine-grained-pat'],
  ];
  const match = prefixes.find(([prefix]) => token.startsWith(prefix));
  if (match) return match[1];
  return /^[0-9a-f]{40}$/.test(token) ? 'legacy' : 'other';
};

const readCookie = (request: Request, name: string): string | undefined =>
  request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === name)?.[1];

const textField = (body: unknown, key: string): string | undefined => {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' && value ? value : undefined;
};

/** Whether a repository name shown on a page matches the authorized one. */
const sameName = (shown: string | undefined, authorized: string): boolean =>
  !shown || shown.toLowerCase() === authorized.toLowerCase();

const validate = <T>(validator: (value: unknown) => T, value: unknown): T => {
  try {
    return validator(value);
  } catch (error) {
    if (error instanceof ValidationError) {
      // 0.x sent Joi's error object; `_original` is left out because
      // it echoed the GitHub token.
      throw new HttpError(json(422, { errors: { details: error.details } }));
    }
    throw error;
  }
};

const stylesheet =
  (css: string): Handler =>
  async () =>
    new Response(css, {
      headers: {
        'content-type': 'text/css; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    });

const WEEK_SECONDS = 7 * 24 * 60 * 60;

const logo: Handler = async () =>
  new Response(LOGO_SVG, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': `public, max-age=${WEEK_SECONDS}`,
    },
  });

const font: Handler = async (_request, _url, [name]) => {
  const data = name && Object.hasOwn(FONT_FILES, name) ? FONT_FILES[name] : undefined;
  if (!data) {
    return new Response(null, { status: 404 });
  }
  return new Response(new Uint8Array(data), {
    headers: {
      'content-type': 'font/woff2',
      'cache-control': `public, max-age=${WEEK_SECONDS}`,
    },
  });
};

export const createApp = (deps: AppDeps): App => {
  const { baselineStore, resultsStore, config } = deps;
  const logger = deps.logger ?? console;
  const now = deps.now ?? Date.now;
  const writeAuthorization = config.writeAuthorization ?? 'report';
  const apiUrl = (config.githubApiUrl || 'https://api.github.com').replace(/\/+$/, '');
  const publicBase = (url: URL): string => (config.publicUrl || url.origin).replace(/\/+$/, '');
  const notFoundPage = (): Response =>
    htmlPage(404, renderResultsNotFoundPage({ serverCommitSha: config.commitSha }));

  // Runs before validation, as in 0.x: a body without these is a 401.
  const authorize = async (body: unknown, need: 'read' | 'write' = 'write'): Promise<void> => {
    const owner = textField(body, 'repoOwner');
    const repo = textField(body, 'repoName');
    const commitSha = textField(body, 'commitSha');
    const token = textField(body, 'githubAccessToken');
    if (!owner || !repo || !commitSha || !token) {
      throw new HttpError(json(401, NOT_ALLOWED));
    }
    const check = (access: 'read' | 'write'): Promise<RepoAccess> =>
      checkRepoAccess({
        apiUrl,
        token,
        owner,
        repo,
        commitSha,
        access,
        userAgent: USER_AGENT,
      });
    const log = {
      repo: `${owner}/${repo}`,
      token: tokenKind(token),
    };
    let access: RepoAccess;
    try {
      if (need === 'read') {
        access = await check('read');
      } else if (writeAuthorization === 'enforce') {
        access = await check('write');
      } else {
        // Report mode: 0.x decides; disagreements are logged so the
        // stricter check can be reviewed before it's enforced.
        const [strict, legacy] = await Promise.allSettled([check('write'), check('read')]);
        if (legacy.status === 'rejected') throw legacy.reason;
        if (strict.status === 'rejected') {
          logger.warn(
            JSON.stringify({
              event: 'write-authorization-check-failed',
              ...log,
            }),
          );
        } else if (strict.value.allowed !== legacy.value.allowed) {
          logger.warn(
            JSON.stringify({
              event: 'write-authorization-differs',
              ...log,
              enforced: strict.value.allowed,
              enforcedVia: strict.value.via,
              current: legacy.value.allowed,
            }),
          );
        }
        access = legacy.value;
      }
    } catch (error) {
      if (error instanceof GitHubUnavailableError) {
        logger.error(
          JSON.stringify({
            event: 'github-unavailable',
            ...log,
            error: error.message,
          }),
        );
        throw new HttpError(json(503, GITHUB_UNREACHABLE));
      }
      throw error;
    }
    if (!access.allowed) {
      logger.warn(
        JSON.stringify({
          event: 'not-allowed',
          ...log,
          need,
          via: access.via,
        }),
      );
      throw new HttpError(json(401, NOT_ALLOWED));
    }
  };

  const shortLink = async (
    url: URL,
    repo: string,
    payload: ResultsData,
  ): Promise<{ id: string; url: string }> => {
    const id = await saveShortLink({
      store: resultsStore,
      repo,
      payload,
      now: now(),
      retentionDays: config.resultsRetentionDays,
      generateId: deps.generateId,
    });
    return { id, url: `${publicBase(url)}/r/${id}` };
  };

  const saveBaseline: Handler = async (request) => {
    const body = await readJsonBody(request);
    await authorize(body);
    const { commitSha, fileDetailsByPath, repoBranch, repoName, repoOwner } = validate(
      validateStoreRequest,
      body,
    );
    if (Buffer.byteLength(JSON.stringify(fileDetailsByPath)) > MAX_BASELINE_BYTES) {
      throw new HttpError(json(413, { error: 'Baseline too large' }));
    }
    const timestamp = now();
    await baselineStore.save({
      repo: `${repoOwner}/${repoName}`,
      repoBranch,
      repoOwner,
      repoName,
      commitSha,
      fileDetailsByPath,
      timestamp: String(timestamp),
    });
    // What 0.x sent: its dynamoose model as constructed, before saving.
    return json(200, {
      commitSha,
      fileDetailsByPath,
      repoBranch,
      repoName,
      repoOwner,
      timestamp,
    });
  };

  const lookupBaseline: Handler = async (request) => {
    const body = await readJsonBody(request);
    // Reading a baseline keeps the 0.x check, so read-only tokens still
    // get comparisons.
    await authorize(body, 'read');
    const { repoOwner, repoName, repoBranch } = validate(validateLookupRequest, body);
    const baseline = await baselineStore.get(`${repoOwner}/${repoName}`, repoBranch);
    if (!baseline) {
      return new Response(null, { status: 404 });
    }
    return json(200, { fileDetailsByPath: baseline.fileDetailsByPath });
  };

  const showLongLink: Handler = async (_request, url) => {
    const data = url.searchParams.get('d');
    if (!data) {
      return json(400, { error: 'Missing results data' });
    }
    let decoded: unknown;
    try {
      decoded = decodeResultsData(data);
    } catch {
      return json(400, { error: 'Malformed results data' });
    }
    const payload = validate(validateResultsPayload, decoded);
    return htmlPage(200, renderResultsPage({ payload, serverCommitSha: config.commitSha }));
  };

  const createShortLink: Handler = async (request, url) => {
    const body = await readJsonBody(request);
    await authorize(body);
    const { repoOwner, repoName, payload } = validate(validateCreateResultsRequest, body);
    // The token was checked against repoOwner/repoName; the page must
    // not claim another repository.
    if (
      !sameName(payload.details.repoOwner, repoOwner) ||
      !sameName(payload.details.repoName, repoName)
    ) {
      throw new HttpError(
        json(422, {
          errors: {
            details: [
              {
                message: '"payload.details" must name the authorized repository',
              },
            ],
          },
        }),
      );
    }
    const link = await shortLink(url, `${repoOwner}/${repoName}`, payload);
    return json(201, link, { location: link.url });
  };

  const showShortLink: Handler = async (_request, _url, [id]) => {
    if (!id || !SHORT_LINK_ID.test(id)) {
      return notFoundPage();
    }
    const stored = await resultsStore.get(id);
    // DynamoDB deletes expired items up to a few days late.
    const expired = stored?.expiresAt !== undefined && stored.expiresAt * 1000 <= now();
    if (!stored || expired) {
      return notFoundPage();
    }
    return htmlPage(
      200,
      renderResultsPage({
        payload: stored.payload,
        serverCommitSha: config.commitSha,
      }),
    );
  };

  // The token page must not be framed by other sites.
  const tokenPageHeaders = {
    'cache-control': 'no-store',
    'content-security-policy': `${CONTENT_SECURITY_POLICY}; frame-ancestors 'none'`,
    'x-frame-options': 'DENY',
  };

  const setupGithub: Handler = async (request, url) => {
    const webUrl = githubWebUrl(apiUrl);
    const clientId = config.githubClientId;
    const code = url.searchParams.get('code');
    if (!code) {
      // `state` ties GitHub's redirect to this browser, so nobody can
      // make a victim's browser show the attacker's token (0.x sent
      // none).
      const state = randomBytes(16).toString('base64url');
      return htmlPage(
        200,
        renderSetupGithubPage({
          clientId,
          githubWebUrl: webUrl,
          state,
        }),
        {
          ...tokenPageHeaders,
          'set-cookie': `${OAUTH_STATE_COOKIE}=${state}; Path=/setup-github; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
        },
      );
    }
    const expected = readCookie(request, OAUTH_STATE_COOKIE);
    const state = url.searchParams.get('state');
    if (!expected || state !== expected) {
      return json(400, {
        error:
          'This authorization expired or started in another browser. Start again at /setup-github.',
      });
    }
    const exchange = await exchangeOAuthCode({
      webUrl,
      clientId,
      clientSecret: config.githubClientSecret,
      code,
    });
    if ('error' in exchange) {
      return json(500, { error: exchange.error });
    }
    return htmlPage(
      200,
      renderSetupGithubPage({
        token: exchange.token,
        clientId,
        githubWebUrl: webUrl,
      }),
      {
        ...tokenPageHeaders,
        'referrer-policy': 'no-referrer',
        'set-cookie': `${OAUTH_STATE_COOKIE}=; Path=/setup-github; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      },
    );
  };

  // No known callers. Kept because 0.x had it (see CONTRACT.md).
  const analyzeAndReport: Handler = async (request, url) => {
    const body = await readJsonBody(request);
    await authorize(body);
    const {
      repoOwner,
      repoName,
      repoBranch,
      baseBranchName,
      commitSha,
      githubAccessToken,
      currentBranchFileDetails,
    } = validate(validateAnalyzeRequest, body);
    const reporter = new GitHubStatusReporter({
      repoOwner,
      repoName,
      commitSha,
      githubAccessToken,
      apiUrl,
      userAgent: USER_AGENT,
      logger,
    });
    try {
      await reporter.start({ message: 'Checking bundlewatch...' });
    } catch (error) {
      logger.error('Setting the pending status failed', error);
    }
    try {
      const repo = `${repoOwner}/${repoName}`;
      const baseline = await baselineStore.get(repo, baseBranchName);
      const results = analyze({
        currentBranchFileDetails,
        baseBranchFileDetails: baseline?.fileDetailsByPath ?? {},
        baseBranchName,
      });
      const details = {
        repoOwner,
        repoName,
        repoCurrentBranch: repoBranch,
        repoBranchBase: baseBranchName,
        commitSha,
      };
      const link = await shortLink(url, repo, createResultsPayload(results, details));
      if (results.status === STATUSES.FAIL) {
        await reporter.fail({ message: results.summary, url: link.url });
        await Promise.all(
          results.fullResults
            .filter((result) => result.status === STATUSES.FAIL)
            .map((result) =>
              reporter.fail({
                message: result.message ?? '',
                filePath: result.filePath,
              }),
            ),
        );
      } else {
        await reporter.pass({ message: results.summary, url: link.url });
      }
    } catch (error) {
      await reporter
        .error({
          message: `Unable to analyze, check logs. ${(error as Error).message}`,
        })
        .catch(() => {});
      throw error;
    }
    return new Response('Accepted', {
      status: 202,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  };

  const routes: Route[] = [
    {
      method: 'GET',
      path: '/',
      handle: async () => json(200, { message: 'hello world' }),
    },
    { method: 'POST', path: '/store', handle: saveBaseline },
    { method: 'POST', path: '/store/lookup', handle: lookupBaseline },
    { method: 'GET', path: '/results', handle: showLongLink },
    { method: 'POST', path: '/results', handle: createShortLink },
    { method: 'GET', path: /^\/r\/([^/]+)$/, handle: showShortLink },
    { method: 'GET', path: '/setup-github', handle: setupGithub },
    { method: 'POST', path: '/analyze', handle: analyzeAndReport },
    {
      method: 'GET',
      path: '/static/results-styles.css',
      handle: stylesheet(RESULTS_CSS),
    },
    {
      method: 'GET',
      path: '/static/setup-github-styles.css',
      handle: stylesheet(SETUP_GITHUB_CSS),
    },
    { method: 'GET', path: '/static/logo.svg', handle: logo },
    { method: 'GET', path: /^\/static\/fonts\/([\w.-]+)$/, handle: font },
  ];

  const route = async (request: Request, url: URL): Promise<Response> => {
    const method = request.method === 'HEAD' ? 'GET' : request.method;
    for (const { method: routeMethod, path, handle } of routes) {
      if (routeMethod !== method) {
        continue;
      }
      if (path === url.pathname) {
        return handle(request, url, []);
      }
      const match = typeof path === 'string' ? null : path.exec(url.pathname);
      if (match) {
        return handle(request, url, match.slice(1));
      }
    }
    return json(404, { error: 'Not found' });
  };

  return async (request) => {
    const url = new URL(request.url);
    let response: Response;
    try {
      response = await route(request, url);
    } catch (error) {
      if (error instanceof HttpError) {
        response = error.response;
      } else {
        logger.error(`${request.method} ${url.pathname} failed`, error);
        response = json(500, { error: 'Internal server error' });
      }
    }
    if (request.method === 'HEAD') {
      return new Response(null, response);
    }
    return response;
  };
};
