import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';

import { checkRepoAccess, GitHubUnavailableError } from './github-auth.ts';
import {
  type FakeGitHub,
  type FakeRoutes,
  startFakeGitHub,
  unreachableUrl,
} from './test-helpers/fake-github.ts';

let github: FakeGitHub;

before(async () => {
  github = await startFakeGitHub();
});
after(() => github.close());
beforeEach(() => github.reset());

const check = (overrides: Partial<Parameters<typeof checkRepoAccess>[0]> = {}) =>
  checkRepoAccess({
    apiUrl: github.url,
    token: 'tok',
    owner: 'Owner',
    repo: 'Repo',
    commitSha: 'abc123',
    ...overrides,
  });

const REPO = 'GET /repos/Owner/Repo';
const INSTALLATION = 'GET /installation/repositories?per_page=100';
const STATUSES = 'GET /repos/Owner/Repo/statuses/abc123';

const requested = () => github.requests.map((r) => `${r.method} ${r.path}`);

describe('tokens whose user has repo permissions', () => {
  for (const role of ['push', 'maintain', 'admin']) {
    test(`allows ${role}`, async () => {
      github.reset({
        [REPO]: {
          body: {
            full_name: 'Owner/Repo',
            permissions: { pull: true, [role]: true },
          },
        },
      });
      assert.deepEqual(await check(), {
        allowed: true,
        via: 'permissions',
      });
      assert.deepEqual(requested(), [REPO]);
    });
  }

  test('denies read-only access without falling back', async () => {
    // Any user can read a public repo: the 0.x hole.
    github.reset({
      [REPO]: {
        body: {
          permissions: {
            admin: false,
            maintain: false,
            push: false,
            pull: true,
          },
        },
      },
      [STATUSES]: { body: [] },
    });
    assert.deepEqual(await check(), { allowed: false, via: 'permissions' });
    // Not an installation token (the fake answers 404), so no fallback.
    assert.deepEqual(requested(), [REPO, INSTALLATION]);
  });

  test('sends the token and API headers', async () => {
    github.reset({ [REPO]: { body: { permissions: { push: true } } } });
    await check();
    const [request] = github.requests;
    assert.equal(request?.headers.authorization, 'Bearer tok');
    assert.equal(request?.headers.accept, 'application/vnd.github+json');
    assert.equal(request?.headers['x-github-api-version'], '2022-11-28');
    assert.equal(request?.headers['user-agent'], 'bundlewatch-service');
  });
});

describe('installation tokens (no permissions in the repo response)', () => {
  const repoWithoutPermissions: FakeRoutes = {
    [REPO]: { body: { full_name: 'Owner/Repo' } },
  };

  test('allows a repo of the installation, ignoring case', async () => {
    github.reset({
      ...repoWithoutPermissions,
      [INSTALLATION]: {
        body: {
          repositories: [{ full_name: 'owner/other' }, { full_name: 'OWNER/repo' }],
        },
      },
    });
    assert.deepEqual(await check(), { allowed: true, via: 'installation' });
    assert.deepEqual(requested(), [REPO, INSTALLATION]);
  });

  test('follows pagination', async () => {
    github.reset({
      ...repoWithoutPermissions,
      [INSTALLATION]: {
        body: { repositories: [{ full_name: 'Owner/other' }] },
        headers: {
          link: `<${github.url}/installation/repositories?per_page=100&page=2>; rel="next", <${github.url}/installation/repositories?per_page=100&page=2>; rel="last"`,
        },
      },
      'GET /installation/repositories?per_page=100&page=2': {
        body: { repositories: [{ full_name: 'Owner/Repo' }] },
      },
    });
    assert.deepEqual(await check(), { allowed: true, via: 'installation' });
    assert.equal(github.requests.length, 3);
  });

  test('does not follow pagination to another host', async () => {
    github.reset({
      ...repoWithoutPermissions,
      [INSTALLATION]: {
        body: { repositories: [] },
        headers: {
          link: '<https://evil.test/installation/repositories?page=2>; rel="next"',
        },
      },
    });
    assert.deepEqual(await check(), { allowed: false, via: 'installation' });
    assert.deepEqual(requested(), [REPO, INSTALLATION]);
  });

  test('denies a repo outside the installation without falling back', async () => {
    // E.g. another repo's GITHUB_TOKEN reading this public repo.
    github.reset({
      ...repoWithoutPermissions,
      [INSTALLATION]: {
        body: { repositories: [{ full_name: 'Attacker/repo' }] },
      },
      [STATUSES]: { body: [] },
    });
    assert.deepEqual(await check(), { allowed: false, via: 'installation' });
    assert.deepEqual(requested(), [REPO, INSTALLATION]);
  });

  test('falls back to the statuses check when not an installation token', async () => {
    github.reset({
      ...repoWithoutPermissions,
      [INSTALLATION]: {
        status: 403,
        body: { message: 'Must authenticate as an installation' },
      },
      [STATUSES]: { body: [] },
    });
    assert.deepEqual(await check(), { allowed: true, via: 'statuses' });
    assert.deepEqual(requested(), [REPO, INSTALLATION, STATUSES]);
  });

  test('denies when the fallback fails too', async () => {
    github.reset({
      ...repoWithoutPermissions,
      [INSTALLATION]: { status: 401 },
      [STATUSES]: { status: 404 },
    });
    assert.deepEqual(await check(), { allowed: false, via: 'statuses' });
  });
});

// What GitHub really returns for installation tokens, including Actions'
// GITHUB_TOKEN: every permission false, whatever the token may do.
describe('installation tokens (all-false permissions in the repo response)', () => {
  const repoWithFalsePermissions: FakeRoutes = {
    [REPO]: {
      body: {
        full_name: 'Owner/Repo',
        permissions: {
          admin: false,
          maintain: false,
          push: false,
          triage: false,
          pull: false,
        },
      },
    },
  };

  test("allows the installation's own repo (GITHUB_TOKEN)", async () => {
    github.reset({
      ...repoWithFalsePermissions,
      [INSTALLATION]: {
        body: { repositories: [{ full_name: 'Owner/Repo' }] },
      },
    });
    assert.deepEqual(await check(), { allowed: true, via: 'installation' });
    assert.deepEqual(requested(), [REPO, INSTALLATION]);
  });

  test('denies a repo outside the installation', async () => {
    github.reset({
      ...repoWithFalsePermissions,
      [INSTALLATION]: {
        body: { repositories: [{ full_name: 'Owner/Other' }] },
      },
    });
    assert.deepEqual(await check(), {
      allowed: false,
      via: 'installation',
    });
  });

  test('falls back to the statuses check when the list is too slow', async () => {
    github.reset({
      ...repoWithFalsePermissions,
      [INSTALLATION]: { delayMs: 300, body: { repositories: [] } },
      [STATUSES]: { body: [] },
    });
    assert.deepEqual(await check({ budgetMs: 200 }), {
      allowed: true,
      via: 'statuses',
    });
    assert.deepEqual(requested(), [REPO, INSTALLATION, STATUSES]);
  });

  test('falls back to the statuses check when the list errors', async () => {
    github.reset({
      ...repoWithFalsePermissions,
      [INSTALLATION]: { status: 502, body: {} },
      [STATUSES]: { body: [] },
    });
    assert.deepEqual(await check(), { allowed: true, via: 'statuses' });
  });
});

describe('the 0.x statuses check as a fallback', () => {
  for (const status of [403, 404]) {
    test(`allows when the repo is ${status} but statuses are readable`, async () => {
      // A `repo:status` OAuth token on a private repo.
      github.reset({ [REPO]: { status }, [STATUSES]: { body: [] } });
      assert.deepEqual(await check(), { allowed: true, via: 'statuses' });
      assert.deepEqual(requested(), [REPO, STATUSES]);
    });

    test(`denies when the repo is ${status} and statuses are not readable`, async () => {
      github.reset({ [REPO]: { status }, [STATUSES]: { status: 404 } });
      assert.deepEqual(await check(), { allowed: false, via: 'statuses' });
    });
  }

  test('denies other errors without falling back', async () => {
    github.reset({ [REPO]: { status: 401 }, [STATUSES]: { body: [] } });
    assert.deepEqual(await check(), { allowed: false, via: 'repo-error' });
    assert.deepEqual(requested(), [REPO]);
  });
});

describe('request paths', () => {
  test('encodes each value into one path segment', async () => {
    github.reset({ 'GET /repos/a%20b/c%2Fd': { status: 404 } });
    await check({ owner: 'a b', repo: 'c/d', commitSha: 'x?y' });
    assert.deepEqual(requested(), [
      'GET /repos/a%20b/c%2Fd',
      'GET /repos/a%20b/c%2Fd/statuses/x%3Fy',
    ]);
  });

  for (const segment of ['.', '..']) {
    test(`rejects "${segment}" without calling GitHub`, async () => {
      assert.deepEqual(await check({ repo: segment }), {
        allowed: false,
        via: 'invalid-request',
      });
      assert.equal(github.requests.length, 0);
    });
  }

  test('accepts an API URL with a trailing slash', async () => {
    github.reset({ [REPO]: { body: { permissions: { push: true } } } });
    assert.equal((await check({ apiUrl: `${github.url}/` })).allowed, true);
  });
});

describe('failures talking to GitHub', () => {
  test('throws GitHubUnavailableError on network errors', async () => {
    await assert.rejects(check({ apiUrl: await unreachableUrl() }), GitHubUnavailableError);
  });

  test('throws GitHubUnavailableError when the budget runs out', async () => {
    github.reset({ [REPO]: { delayMs: 1000, body: {} } });
    const diagnostics: unknown[] = [];
    await assert.rejects(
      check({ budgetMs: 50, onDiagnostic: (entry) => diagnostics.push(entry) }),
      GitHubUnavailableError,
    );
    assert.deepEqual(diagnostics, [
      { operation: 'repository', access: 'write', failure: 'timeout' },
    ]);
  });

  test('records transport codes without logging exception messages or secrets', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => {
      throw new TypeError('secret-token and private URL', {
        cause: { code: 'ECONNRESET', message: 'secret-token' },
      });
    });
    const diagnostics: unknown[] = [];
    await assert.rejects(check({ onDiagnostic: (entry) => diagnostics.push(entry) }), {
      name: 'GitHubUnavailableError',
      message: 'GitHub request failed: network',
    });
    assert.deepEqual(diagnostics, [
      { operation: 'repository', access: 'write', failure: 'network', causeCode: 'ECONNRESET' },
    ]);
  });

  for (const status of [429, 500, 502, 503]) {
    test(`throws GitHubUnavailableError when GitHub answers ${status}`, async () => {
      github.reset({ [REPO]: { status, body: {} } });
      await assert.rejects(check(), GitHubUnavailableError);
    });
  }
});

test('slow installation pagination leaves time for statuses within the total budget', async () => {
  github.reset({
    [REPO]: { body: { permissions: { push: false } } },
    [INSTALLATION]: {
      delayMs: 100,
      body: { repositories: [] },
      headers: {
        link: `<${github.url}/installation/repositories?per_page=100&page=2>; rel="next"`,
      },
    },
    'GET /installation/repositories?per_page=100&page=2': {
      delayMs: 1000,
      body: { repositories: [] },
    },
    [STATUSES]: { body: [] },
  });
  assert.deepEqual(await check({ budgetMs: 600 }), {
    allowed: true,
    via: 'statuses',
  });
  assert.equal(requested().at(-1), STATUSES);
  assert.equal(requested().length, 4);
  github.reset({
    [REPO]: { body: { permissions: { push: false } } },
    [INSTALLATION]: { delayMs: 1000, body: {} },
    [STATUSES]: { delayMs: 1000, body: [] },
  });
  const start = Date.now();
  await assert.rejects(check({ budgetMs: 600 }), GitHubUnavailableError);
  assert.ok(Date.now() - start < 950, 'fallback must not reset the total budget');
  assert.equal(requested().at(-1), STATUSES);
});

test('a timed-out installation response body still falls back to statuses', async () => {
  github.reset({
    [REPO]: { body: { permissions: { push: false } } },
    [INSTALLATION]: { bodyDelayMs: 1000, body: { repositories: [] } },
    [STATUSES]: { body: [] },
  });
  assert.deepEqual(await check({ budgetMs: 600 }), {
    allowed: true,
    via: 'statuses',
  });
  assert.deepEqual(requested(), [REPO, INSTALLATION, STATUSES]);
});
