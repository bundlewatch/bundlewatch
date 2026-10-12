import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';

import { detectCiEnv, getCiVars } from './ci.ts';

const ciEnvPath = createRequire(import.meta.url).resolve('ci-env');

/** What ci-env@1.17.0 reports for `env`. It reads process.env on load, hence the child process. */
const ciEnv = (env: Record<string, string>): Record<string, unknown> =>
  JSON.parse(
    execFileSync(
      process.execPath,
      ['-e', `process.stdout.write(JSON.stringify(require(${JSON.stringify(ciEnvPath)})))`],
      {
        env: { PATH: process.env.PATH ?? '', ...env },
      },
    ).toString(),
  );

const CASES: Record<string, Record<string, string>> = {
  'travis push': {
    TRAVIS: 'true',
    TRAVIS_REPO_SLUG: 'o/r',
    TRAVIS_COMMIT: 'sha1',
    TRAVIS_EVENT_TYPE: 'push',
    TRAVIS_BRANCH: 'master',
    TRAVIS_PULL_REQUEST: 'false',
  },
  'travis pull request': {
    TRAVIS: 'true',
    TRAVIS_REPO_SLUG: 'o/r',
    TRAVIS_COMMIT: 'sha1',
    TRAVIS_PULL_REQUEST_SHA: 'sha2',
    TRAVIS_EVENT_TYPE: 'pull_request',
    TRAVIS_BRANCH: 'master',
    TRAVIS_PULL_REQUEST_BRANCH: 'feature',
    TRAVIS_PULL_REQUEST: '12',
  },
  'circle push': {
    CIRCLECI: 'true',
    CIRCLE_PROJECT_USERNAME: 'o',
    CIRCLE_PROJECT_REPONAME: 'r',
    CIRCLE_SHA1: 'sha',
    CIRCLE_BRANCH: 'master',
  },
  'circle pull request': {
    CIRCLECI: 'true',
    CIRCLE_PROJECT_USERNAME: 'o',
    CIRCLE_PROJECT_REPONAME: 'r',
    CIRCLE_SHA1: 'sha',
    CIRCLE_BRANCH: 'feature',
    CI_PULL_REQUEST: 'https://github.com/o/r/pull/7',
  },
  wercker: {
    WERCKER: 'true',
    WERCKER_GIT_OWNER: 'o',
    WERCKER_GIT_REPOSITORY: 'r',
    WERCKER_GIT_COMMIT: 'sha',
    WERCKER_GIT_BRANCH: 'master',
  },
  drone: {
    DRONE: 'true',
    DRONE_REPO: 'o/r',
    DRONE_COMMIT: 'sha',
    DRONE_BUILD_EVENT: 'pull_request',
    DRONE_PULL_REQUEST: '3',
    DRONE_TARGET_BRANCH: 'main',
    DRONE_BRANCH: 'feature',
  },
  'legacy drone': {
    DRONE: 'true',
    DRONE_REMOTE: 'git://github.com/o/r.git',
    CI_COMMIT: 'sha',
    CI_BRANCH: 'x',
  },
  'gitlab merge request': {
    GITLAB_CI: 'true',
    CI_PROJECT_PATH: 'group/r',
    CI_COMMIT_SHA: 'sha',
    CI_PIPELINE_SOURCE: 'merge_request_event',
    CI_MERGE_REQUEST_ID: '9',
    CI_MERGE_REQUEST_TARGET_BRANCH_NAME: 'main',
    CI_MERGE_REQUEST_SOURCE_BRANCH_NAME: 'feature',
    CI_COMMIT_REF_NAME: 'feature',
  },
  'gitlab push': {
    GITLAB_CI: 'true',
    CI_PROJECT_PATH: 'group/r',
    CI_COMMIT_SHA: 'sha',
    CI_PIPELINE_SOURCE: 'push',
    CI_COMMIT_REF_NAME: 'main',
  },
  codeship: {
    CI_NAME: 'codeship',
    CI_REPO_NAME: 'o/r',
    CI_COMMIT_ID: 'sha',
    CI_BRANCH: 'master',
    CI_PR_NUMBER: '0',
  },
  'github actions push': {
    GITHUB_ACTION: 'run',
    GITHUB_REPOSITORY: 'o/r',
    GITHUB_SHA: 'sha',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF: 'refs/heads/main',
  },
  'github actions pull request': {
    GITHUB_ACTION: 'run',
    GITHUB_REPOSITORY: 'o/r',
    GITHUB_SHA: 'sha',
    GITHUB_EVENT_NAME: 'pull_request',
    GITHUB_REF: 'refs/pull/5/merge',
    GITHUB_HEAD_REF: 'feature/x',
    GITHUB_BASE_REF: 'main',
  },
  'cloudflare pages': {
    CF_PAGES: '1',
    CF_PAGES_COMMIT_SHA: 'sha',
    CF_PAGES_BRANCH: 'main',
  },
  netlify: {
    NETLIFY: 'true',
    REPOSITORY_URL: 'https://x@github.com/o/r',
    COMMIT_REF: 'sha',
    HEAD: 'feature',
    PULL_REQUEST: 'true',
    REVIEW_ID: '4',
  },
  vercel: {
    NOW_GITHUB_ORG: 'o',
    NOW_GITHUB_REPO: 'r',
    NOW_GITHUB_COMMIT_SHA: 'sha',
    NOW_GITHUB_COMMIT_REF: 'main',
  },
  buddy: {
    BUDDY: 'true',
    BUDDY_PROJECT_NAME: 'r',
    BUDDY_EXECUTION_BRANCH: 'main',
    BUDDY_EXECUTION_REVISION: 'sha',
    BUDDY_EXECUTION_MODE: 'manual',
    BUDDY_EXECUTION_PULL_REQUEST_NO: '',
  },
  codefresh: {
    CF_BUILD_URL: 'https://g.codefresh.io/x',
    CF_REPO_NAME: 'r',
    CF_BRANCH: 'main',
    CF_REVISION: 'sha',
    CF_PULL_REQUEST_NUMBER: '8',
    CF_PULL_REQUEST_TARGET: 'main',
  },
  'generic CI': {
    CI: 'true',
    CI_REPO_OWNER: 'o',
    CI_REPO_NAME: 'r',
    CI_COMMIT_SHA: 'sha',
    CI_BRANCH: 'main',
    CI_TARGET_BRANCH: 'main',
  },
  'no CI': {},
};

const asCiEnv = (env: Record<string, string>): Record<string, unknown> => {
  const detected = detectCiEnv(env);
  return {
    ci: detected.ci,
    repo: detected.repo,
    sha: detected.sha,
    event: detected.event,
    branch: detected.branch,
    pull_request_number: detected.pullRequestNumber,
    pull_request_target_branch: detected.pullRequestTargetBranch,
  };
};

describe('detectCiEnv', () => {
  for (const [name, env] of Object.entries(CASES)) {
    test(`matches ci-env@1.17.0: ${name}`, () => {
      const expected = ciEnv(env);
      const actual = asCiEnv(env);
      for (const key of Object.keys(actual)) {
        assert.equal(actual[key] ?? '', expected[key] ?? '', `${name}: ${key}`);
      }
    });
  }

  test('keeps slashes in GitHub Actions branch names (ci-env cut them off)', () => {
    const env = {
      ...CASES['github actions push'],
      GITHUB_REF: 'refs/heads/feat/foo',
    };
    assert.equal(ciEnv(env).branch, 'feat');
    assert.equal(detectCiEnv(env).branch, 'feat/foo');
  });

  test('uses the head branch for pull_request_target (ci-env used the base branch)', () => {
    const env = {
      ...CASES['github actions pull request'],
      GITHUB_EVENT_NAME: 'pull_request_target',
      GITHUB_REF: 'refs/heads/main',
    };
    assert.equal(detectCiEnv(env).branch, 'feature/x');
  });

  test('leaves the repo unset on generic CI without owner and name (ci-env said "undefined/undefined")', () => {
    assert.equal(ciEnv({ CI: 'true' }).repo, 'undefined/undefined');
    assert.equal(detectCiEnv({ CI: 'true' }).repo, undefined);
  });
});

describe('getCiVars', () => {
  test('prefers explicit CI_* variables', () => {
    const vars = getCiVars({
      ...CASES['github actions push'],
      CI_REPO_OWNER: 'owner',
      CI_REPO_NAME: 'name',
      CI_COMMIT_SHA: 'explicit',
      CI_BRANCH: 'branch',
      CI_BRANCH_BASE: 'base',
      BUNDLEWATCH_GITHUB_TOKEN: 'token',
      GITHUB_ACCESS_TOKEN: 'other',
    });
    assert.deepEqual(vars, {
      githubAccessToken: 'token',
      repoOwner: 'owner',
      repoName: 'name',
      repoCurrentBranch: 'branch',
      repoBranchBase: 'base',
      commitSha: 'explicit',
      defaultBranch: undefined,
      isPullRequest: false,
    });
  });

  test('falls back to GIT_* variables (Jenkins)', () => {
    const vars = getCiVars({
      GIT_URL: 'git@github.com:owner/name.git',
      GIT_COMMIT: 'sha',
      GIT_BRANCH: 'main',
      GITHUB_ACCESS_TOKEN: 'token',
    });
    assert.equal(vars.repoOwner, 'owner');
    assert.equal(vars.repoName, 'name');
    assert.equal(vars.commitSha, 'sha');
    assert.equal(vars.repoCurrentBranch, 'main');
    assert.equal(vars.githubAccessToken, 'token');
  });

  test('does not crash on a GIT_URL outside github.com', () => {
    assert.equal(getCiVars({ GIT_URL: 'https://gitlab.com/o/r.git' }).repoOwner, undefined);
  });

  test('detects the default branch from the GitHub Actions event payload', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'bundlewatch-ci-'));
    const eventPath = path.join(directory, 'event.json');
    writeFileSync(eventPath, JSON.stringify({ repository: { default_branch: 'trunk' } }));
    const vars = getCiVars({
      ...CASES['github actions push'],
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_PATH: eventPath,
    });
    assert.equal(vars.defaultBranch, 'trunk');
  });

  test('reports statuses on the pull request head, not the merge commit', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'bundlewatch-ci-'));
    const eventPath = path.join(directory, 'event.json');
    writeFileSync(eventPath, JSON.stringify({ pull_request: { head: { sha: 'head-sha' } } }));
    const env = {
      ...CASES['github actions pull request'],
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_PATH: eventPath,
    };
    assert.equal(getCiVars(env).commitSha, 'head-sha');
    assert.equal(getCiVars({ ...env, CI_COMMIT_SHA: 'explicit' }).commitSha, 'explicit');
  });

  test('flags pull request builds', () => {
    assert.equal(getCiVars(CASES['github actions pull request']).isPullRequest, true);
    assert.equal(getCiVars(CASES['travis pull request']).isPullRequest, true);
    assert.equal(getCiVars(CASES['gitlab merge request']).isPullRequest, true);
    assert.equal(getCiVars(CASES.drone).isPullRequest, true);
    assert.equal(
      getCiVars({
        ...CASES['circle pull request'],
        CIRCLE_PR_NUMBER: '7',
      }).isPullRequest,
      true,
    );
    assert.equal(getCiVars({ ...CASES.netlify, PULL_REQUEST: 'true' }).isPullRequest, true);
    assert.equal(
      getCiVars({ ...CASES['generic CI'], CI_EVENT: 'pull_request' }).isPullRequest,
      true,
    );
  });

  test('does not flag branch builds, which 0.x saved', () => {
    for (const name of [
      'github actions push',
      'travis push',
      'gitlab push',
      'circle push',
      // CircleCI attaches the pull request to builds of its branch,
      // e.g. pushes to `develop` while `develop -> main` is open.
      'circle pull request',
      'codeship',
      'buddy',
      'codefresh',
      'generic CI',
      'no CI',
    ]) {
      assert.equal(getCiVars(CASES[name] ?? {}).isPullRequest, false, name);
    }
    // Netlify production builds.
    assert.equal(getCiVars({ ...CASES.netlify, PULL_REQUEST: 'false' }).isPullRequest, false);
  });
});
