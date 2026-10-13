import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { html } from '../html.ts';
import type { ResultsData } from '../validators.ts';
import {
  cssPercentage,
  renderResultsNotFoundPage,
  renderResultsPage,
  toFileRow,
} from './results-page.ts';
import { renderSetupGithubPage } from './setup-github-page.ts';

describe('toFileRow (the 0.x derived fields)', () => {
  test('a larger file', () => {
    assert.deepEqual(
      toFileRow({
        filePath: 'a.js',
        status: 'pass',
        size: 31448,
        baseBranchSize: 30000,
        maxSize: 102400,
      }),
      {
        filePath: 'a.js',
        flag: 'pass',
        prettySize: '30.71KB',
        prettyMaxSize: '100KB',
        prettyDiffSize: '+1.41KB',
        isDiffNegative: false,
        baseBranchSizePercentage: (30000 / 102400) * 100,
        diffPercentage: (1448 / 102400) * 100,
      },
    );
  });

  test('a smaller file eats into the base bar', () => {
    const row = toFileRow({
      filePath: 'a.js',
      status: 'pass',
      size: 900,
      baseBranchSize: 1000,
      maxSize: 2000,
    });
    assert.equal(row.prettyDiffSize, '-100B');
    assert.equal(row.isDiffNegative, true);
    assert.equal(row.baseBranchSizePercentage, 45);
    assert.equal(row.diffPercentage, 5);
  });

  test('no difference', () => {
    const row = toFileRow({
      filePath: 'a.js',
      status: 'pass',
      size: 50,
      baseBranchSize: 50,
      maxSize: 100,
    });
    assert.equal(row.prettyDiffSize, '0B');
    assert.equal(row.isDiffNegative, false);
  });

  test('no baseline: no diff, bar relative to the max', () => {
    const row = toFileRow({
      filePath: 'a.js',
      status: 'warn',
      size: 25,
      baseBranchSize: 0,
      maxSize: 100,
    });
    assert.equal(row.flag, 'warn');
    assert.equal(row.prettyDiffSize, null);
    assert.equal(row.baseBranchSizePercentage, 0);
    assert.equal(row.diffPercentage, 25);
  });

  for (const maxSize of [Number.POSITIVE_INFINITY, null]) {
    test(`an unlimited maxSize (${maxSize})`, () => {
      const row = toFileRow({
        filePath: 'a.js',
        status: 'pass',
        size: 200,
        baseBranchSize: 100,
        maxSize,
      });
      assert.equal(row.prettyMaxSize, 'Infinity');
      assert.equal(row.baseBranchSizePercentage, 50);
      assert.equal(row.diffPercentage, 50);
    });
  }

  test('an error entry', () => {
    const row = toFileRow({ filePath: 'x', status: 'fail', error: 'e' });
    assert.equal(row.prettySize, null);
    assert.equal(row.prettyMaxSize, null);
    assert.equal(row.prettyDiffSize, null);
    assert.equal(cssPercentage(row.diffPercentage), '0');
  });

  test('unknown statuses show as removed', () => {
    assert.equal(toFileRow({ filePath: 'x', status: 'other' }).flag, 'removed');
  });
});

test('cssPercentage keeps style widths plain numbers between 0 and 100', () => {
  assert.equal(cssPercentage(12.5), '12.5');
  assert.equal(cssPercentage(Number.NaN), '0');
  assert.equal(cssPercentage(Number.POSITIVE_INFINITY), '0');
  assert.equal(cssPercentage(-3), '0');
  assert.equal(cssPercentage(250), '100');
});

const payload = (overrides: Partial<ResultsData['details']> = {}): ResultsData => ({
  details: {
    repoOwner: 'owner',
    repoName: 'repo',
    repoCurrentBranch: 'feature',
    repoBranchBase: 'main',
    commitSha: '0123456789abcdef',
    ...overrides,
  },
  results: {
    status: 'pass',
    summary: 'Everything is in check (+1KB, -0B, +1.0%)',
    fullResults: [{ filePath: 'a.js', status: 'pass', size: 10, maxSize: 20 }],
  },
});

describe('renderResultsPage', () => {
  test('shows the repo, branch and short commit', () => {
    const page = renderResultsPage({ payload: payload() });
    assert.match(page, /<a href="https:\/\/github.com\/owner\/repo">owner\/repo<\/a>/);
    assert.match(page, /\(feature\)/);
    assert.match(
      page,
      /<a href="https:\/\/github.com\/owner\/repo\/commit\/0123456789abcdef">01234567<\/a>/,
    );
  });

  test('hides repo details unless owner, name, branch and commit are all set', () => {
    const page = renderResultsPage({
      payload: payload({ repoCurrentBranch: undefined }),
    });
    assert.doesNotMatch(page, /github.com\/owner/);
  });

  test('escapes every interpolated value', () => {
    const page = renderResultsPage({
      payload: {
        details: {
          repoOwner: '"><script>owner</script>',
          repoName: "<img src=x onerror='x'>",
          repoCurrentBranch: '<b>branch</b>',
          commitSha: '"onmouseover="x',
        },
        results: {
          status: 'fail',
          summary: '<script>summary</script>',
          fullResults: [
            {
              filePath: '<script>alert(1)</script>',
              status: 'fail',
            },
          ],
        },
      },
      serverCommitSha: '<sha>',
    });
    assert.doesNotMatch(page, /<script>|<img src=x|<b>|<sha>|"onmouseover/);
    assert.match(page, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(page, /&lt;script&gt;summary&lt;\/script&gt;/);
    assert.match(page, /\(&lt;b&gt;branch&lt;\/b&gt;\)/);
    assert.match(page, />&lt;sha&gt;<\/a>/);
  });

  test('uses inline icons with the 0.x classes', () => {
    const page = renderResultsPage({
      payload: {
        details: {},
        results: {
          status: 'fail',
          summary: 's',
          fullResults: [
            { filePath: 'a', status: 'pass' },
            { filePath: 'b', status: 'warn' },
            { filePath: 'c', status: 'fail' },
            { filePath: 'd', status: 'removed' },
          ],
        },
      },
    });
    assert.match(page, /<svg class="big-icon cell-fail material-icons"[^>]*aria-label="FAIL"/);
    for (const flag of ['pass', 'warn', 'fail', 'removed']) {
      assert.match(page, new RegExp(`<svg class="cell-${flag} material-icons"`));
    }
    assert.match(page, /<title>This commit removes this file<\/title>/);
    assert.match(page, /This commit removed this file/);
  });

  test('makes no third-party requests', () => {
    const page = renderResultsPage({
      payload: payload(),
      serverCommitSha: 'abc',
    });
    assert.doesNotMatch(page, /googleapis|rawgit|raw\.githubusercontent/);
    const loaded = [...page.matchAll(/<(?:img|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(loaded, [
      'https://bundlewatch.io/favicon.svg',
      '/static/results-styles.css',
      '/static/logo.svg',
    ]);
  });

  test('shows the short commit of the service, linking to the full one', () => {
    const sha = '3021e0aad67a0a7a35cb73154c0d005db2372387';
    const page = renderResultsPage({ payload: payload(), serverCommitSha: sha });
    assert.match(
      page,
      new RegExp(`<a href="https://github.com/bundlewatch/bundlewatch/commit/${sha}">3021e0a</a>`),
    );
  });

  test('starts with a doctype and declares the charset and viewport', () => {
    const page = renderResultsPage({ payload: payload() });
    assert.ok(page.startsWith('<!doctype html>'));
    assert.match(page, /<meta charset="utf-8">/);
    assert.match(page, /<meta name="viewport"/);
  });

  test('links the deployed commit in the monorepo', () => {
    const page = renderResultsPage({
      payload: payload(),
      serverCommitSha: 'abc1234',
    });
    assert.match(
      page,
      /<a href="https:\/\/github.com\/bundlewatch\/bundlewatch\/commit\/abc1234">abc1234<\/a>/,
    );
    assert.match(page, /bundlewatch\/blob\/main\/CONTRIBUTING.md/);
    assert.doesNotMatch(renderResultsPage({ payload: payload() }), /server-commit-sha/);
  });
});

test('renderResultsNotFoundPage', () => {
  assert.match(renderResultsNotFoundPage({}), /Results not found/);
});

describe('renderSetupGithubPage', () => {
  test('links the OAuth authorization with the repo:status scope', () => {
    const page = renderSetupGithubPage({
      clientId: '04fcf325dd26ca2a159f',
      githubWebUrl: 'https://github.com',
    });
    assert.match(
      page,
      /href="https:\/\/github.com\/login\/oauth\/authorize\?scope=repo%3Astatus&amp;client_id=04fcf325dd26ca2a159f"/,
    );
    assert.match(page, /src="https:\/\/bundlewatch.io\/build-status-preview.png"/);
  });

  test('escapes the token', () => {
    const page = renderSetupGithubPage({
      token: '<script>t</script>',
      githubWebUrl: 'https://github.com',
    });
    assert.match(page, /<code>&lt;script&gt;t&lt;\/script&gt;<\/code>/);
    assert.doesNotMatch(page, /oauth\/authorize/);
  });
});

test('html escapes values but not nested html', () => {
  const inner = html`<b>${'<i>'}</b>`;
  assert.equal(
    html`${inner}${['<', html`<br>`]}${null}${undefined}${false}${0}`.value,
    '<b>&lt;i&gt;</b>&lt;<br>0',
  );
  assert.equal(html`${`"'&`}`.value, '&quot;&#39;&amp;');
});
