import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, test } from 'node:test';

import { html } from '../html.ts';
import type { ResultsData, ResultsFile } from '../validators.ts';
import {
  cssPercentage,
  headline,
  renderResultsNotFoundPage,
  renderResultsPage,
  toReportView,
} from './results-page.ts';
import { COPY_SCRIPT_HASH, renderSetupGithubPage } from './setup-github-page.ts';

const KB = 1024;

const payload = (
  fullResults: ResultsFile[] = [{ filePath: 'a.js', status: 'pass', size: 10, maxSize: 20 }],
  overrides: Partial<ResultsData['details']> = {},
  status = 'pass',
  summary = 'Everything is in check (+1KB, -0B, +1.0%)',
): ResultsData => ({
  details: {
    repoOwner: 'owner',
    repoName: 'repo',
    repoCurrentBranch: 'feature',
    repoBranchBase: 'main',
    commitSha: '0123456789abcdef',
    ...overrides,
  },
  results: { status, summary, fullResults },
});

const file = (
  filePath: string,
  status: string,
  size: number,
  baseBranchSize: number,
  maxSize: number | null,
): ResultsFile => ({ filePath, status, size, baseBranchSize, maxSize });

const OVER_LIMIT: ResultsFile[] = [
  file('./dist/main.js', 'pass', 31_448, 30_000, 100 * KB),
  file('./dist/vendor.js', 'fail', 214_800, 198_000, 200 * KB),
  file('./dist/charts.js', 'pass', 18_210, 41_900, 50 * KB),
  file('./dist/runtime.js', 'pass', 1210, 1210, 2 * KB),
  file('./dist/styles.css', 'pass', 9120, 0, null),
  file('./dist/old.js', 'removed', 0, 12_938, 0),
  { filePath: './dist/*.map', status: 'fail', error: 'There is no matching file for ./dist/*.map' },
];

/** The text of a page, without tags or repeated whitespace. */
const text = (page: string): string =>
  page
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ ([.,:])(?=\s|$)/g, '$1');

describe('toReportView', () => {
  const view = toReportView(payload(OVER_LIMIT));
  const byName = (name: string) => view.files.find((f) => f.name === name);

  test('reads every 0.x shape', () => {
    assert.deepEqual(
      view.files.map(({ name, kind, base, max, change, isNew }) => ({
        name,
        kind,
        base,
        max,
        change,
        isNew,
      })),
      [
        { name: 'main.js', kind: 'ok', base: 30_000, max: 100 * KB, change: 1448, isNew: false },
        {
          name: 'vendor.js',
          kind: 'over',
          base: 198_000,
          max: 200 * KB,
          change: 16_800,
          isNew: false,
        },
        {
          name: 'charts.js',
          kind: 'ok',
          base: 41_900,
          max: 50 * KB,
          change: -23_690,
          isNew: false,
        },
        { name: 'runtime.js', kind: 'ok', base: 1210, max: 2 * KB, change: 0, isNew: false },
        { name: 'styles.css', kind: 'ok', base: null, max: null, change: 9120, isNew: true },
        { name: 'old.js', kind: 'removed', base: 12_938, max: null, change: -12_938, isNew: false },
        { name: '*.map', kind: 'error', base: null, max: null, change: null, isNew: false },
      ],
    );
  });

  test('splits paths at the last slash', () => {
    assert.equal(byName('vendor.js')?.dir, './dist/');
    assert.equal(toReportView(payload()).files[0]?.dir, '');
  });

  test('totals the change like the GitHub status summary', () => {
    assert.equal(view.added, 1448 + 16_800 + 9120);
    assert.equal(view.removed, 23_690 + 12_938);
    assert.ok(view.percentageChange !== null && view.percentageChange < 0);
  });

  for (const maxSize of [null, undefined, Number.POSITIVE_INFINITY, 0]) {
    test(`no limit for a maxSize of ${maxSize}`, () => {
      const [entry] = toReportView(
        payload([{ filePath: 'a', status: 'pass', size: 1, maxSize }]),
      ).files;
      assert.equal(entry?.max, null);
    });
  }

  test('without sizes on the base branch, nothing is new and nothing changed', () => {
    const first = toReportView(
      payload([file('a.js', 'pass', 10, 0, 20), file('b.js', 'pass', 5, 0, null)]),
    );
    assert.equal(first.hasBaseline, false);
    assert.deepEqual(
      first.files.map(({ change, isNew }) => ({ change, isNew })),
      [
        { change: null, isNew: false },
        { change: null, isNew: false },
      ],
    );
  });

  test('unknown statuses are removed files, as in 0.x', () => {
    const [entry] = toReportView(payload([{ filePath: 'a', status: 'surprise' }])).files;
    assert.equal(entry?.kind, 'removed');
  });
});

const say = (fullResults: ResultsFile[], status = 'pass', summary = 's') =>
  headline(toReportView(payload(fullResults, {}, status, summary)));

describe('headline', () => {
  test('names the file over its limit, by how much', () => {
    assert.equal(say(OVER_LIMIT.slice(0, 2), 'fail'), 'vendor.js is 9.77KB over its 200KB limit.');
  });

  test('and the pattern that matched nothing', () => {
    assert.equal(
      say(OVER_LIMIT, 'fail'),
      'vendor.js is 9.77KB over its 200KB limit, and ./dist/*.map matched no files.',
    );
  });

  test('counts several files', () => {
    assert.equal(
      say(
        [
          file('a.js', 'fail', 30, 0, 20),
          file('b.js', 'fail', 30, 0, 20),
          { filePath: 'c', status: 'fail', error: 'There is no matching file for c' },
          { filePath: 'd', status: 'fail', error: 'Could not read file' },
        ],
        'fail',
      ),
      '2 files are over their limits, and 2 files couldn’t be measured.',
    );
  });

  test('a failing file without a limit', () => {
    assert.equal(say([file('a.js', 'fail', 30, 0, null)], 'fail'), 'a.js is over its limit.');
  });

  test('warnings, which core never produces', () => {
    assert.equal(say([file('a.js', 'warn', 30, 0, 40)], 'warn'), '1 file has a warning.');
  });

  test('a failure the files don’t explain keeps the status summary', () => {
    assert.equal(
      say([file('a.js', 'pass', 1, 0, 2)], 'fail', 'maxSize check failed'),
      'maxSize check failed',
    );
  });

  test('everything within its limit', () => {
    assert.equal(say(OVER_LIMIT.slice(2, 5)), 'All 3 files are within their limits.');
    assert.equal(say(OVER_LIMIT.slice(2, 3)), 'The file is within its limit.');
    assert.equal(say([]), 'There are no files to measure.');
  });
});

test('cssPercentage keeps style widths plain numbers between 0 and 100', () => {
  assert.equal(cssPercentage(12.5), '12.5');
  assert.equal(cssPercentage(Number.NaN), '0');
  assert.equal(cssPercentage(Number.POSITIVE_INFINITY), '0');
  assert.equal(cssPercentage(-3), '0');
  assert.equal(cssPercentage(250), '100');
});

describe('renderResultsPage', () => {
  const page = renderResultsPage({
    payload: payload(OVER_LIMIT, {}, 'fail', 'maxSize check failed'),
  });

  test('shows the repo, the branch into its base, and the short commit', () => {
    assert.match(page, /<a href="https:\/\/github.com\/owner\/repo">owner\/repo<\/a>/);
    assert.match(page, /<b>feature<\/b> into main/);
    assert.match(
      page,
      /<a class="mono" href="https:\/\/github.com\/owner\/repo\/commit\/0123456789abcdef">0123456<\/a>/,
    );
  });

  test('shows whatever details there are', () => {
    const partial = renderResultsPage({
      payload: payload(undefined, { repoOwner: undefined, repoCurrentBranch: undefined }),
    });
    assert.doesNotMatch(partial, /github.com\/owner/);
    assert.match(partial, /<span class="mono">0123456<\/span>/);
    assert.doesNotMatch(
      renderResultsPage({ payload: { details: {}, results: payload().results } }),
      /class="crumbs"/,
    );
  });

  test('leads with the verdict and the totals', () => {
    assert.match(
      text(page),
      /vendor\.js is 9\.77KB over its 200KB limit, and \.\/dist\/\*\.map matched no files\./,
    );
    assert.match(
      text(page),
      /This commit adds 26\.73KB and removes 35\.77KB: the files are 3\.3% smaller than on main\./,
    );
    assert.match(
      page,
      /<h1><span class="flag fail" role="img" aria-label="Failed"><\/span>vendor\.js/,
    );
    assert.match(page, /<title>vendor\.js is 9\.77KB over its 200KB limit, and/);
  });

  test('states each limit in bytes', () => {
    assert.match(text(page), /9\.77KB over the 200KB limit/);
    assert.match(text(page), /69\.29KB under the 100KB limit/);
    assert.match(text(page), /No limit/);
    assert.match(page, /class="limit over"/);
  });

  test('lists changes largest first, and folds the files that didn’t change', () => {
    const rows = [
      ...page.matchAll(/<li class="r [a-z]+">\s*<span class="file"><span class="name">([^<]+)/g),
    ].map((match) => match[1]);
    assert.deepEqual(rows, ['charts.js', 'vendor.js', 'old.js', 'styles.css', 'main.js']);
    assert.match(
      text(page),
      /1 file didn’t change runtime\.js \.\/dist\/ · 1\.18KB, 838B under the 2KB limit/,
    );
    assert.match(text(page), /−23\.13KB 17\.78KB now/);
    assert.match(text(page), /\+8\.91KB new file/);
    assert.match(text(page), /−12\.63KB removed/);
  });

  test('explains error entries', () => {
    assert.match(text(page), /\.\/dist\/\*\.map · No file matches this pattern/);
    const other = renderResultsPage({
      payload: payload(
        [{ filePath: 'a', status: 'fail', error: 'Could not read file' }],
        {},
        'fail',
      ),
    });
    assert.match(text(other), /a · Could not read file/);
  });

  test('shows size against limit before the base branch has sizes', () => {
    const first = renderResultsPage({
      payload: payload([file('a.js', 'pass', 10, 0, 20), file('b.js', 'pass', 19, 0, 20)]),
    });
    assert.match(first, /<h2>Size against limit<\/h2>/);
    assert.doesNotMatch(first, /Changes from/);
    assert.match(text(first), /There are no sizes saved for main yet/);
    assert.match(first, /class="limit near"/);
  });

  test('keeps every width in a style attribute between 0 and 100', () => {
    const odd = renderResultsPage({
      payload: payload([
        file('a', 'pass', -5, 10, 20),
        file('b', 'fail', 10 ** 9, 1, 1),
        file('c', 'pass', 0, 0, Number.POSITIVE_INFINITY),
      ]),
    });
    for (const [, width] of odd.matchAll(/(?:width|left):([^;"%]+)%/g)) {
      const value = Number(width);
      assert.ok(value >= 0 && value <= 100, width);
    }
  });

  test('escapes every interpolated value', () => {
    const hostile = renderResultsPage({
      payload: {
        details: {
          repoOwner: '"><script>owner</script>',
          repoName: "<img src=x onerror='x'>",
          repoCurrentBranch: '<b>branch</b>',
          repoBranchBase: '<i>base</i>',
          commitSha: '"onmouseover="x',
        },
        results: {
          status: 'fail',
          summary: '<script>summary</script>',
          fullResults: [
            {
              filePath: '<script>alert(1)</script>',
              status: 'fail',
              size: 2,
              baseBranchSize: 1,
              maxSize: 1,
            },
            { filePath: 'x', status: 'fail', error: '<script>error</script>' },
          ],
        },
      },
      serverCommitSha: '<sha>',
    });
    assert.doesNotMatch(hostile, /<script>|<img src=x|<b>branch|<i>base|<sha>|"onmouseover/);
    assert.match(hostile, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(hostile, /&lt;script&gt;error&lt;\/script&gt;/);
    assert.match(hostile, /&lt;b&gt;branch&lt;\/b&gt;/);
    assert.match(hostile, />&lt;sha&gt;<\/a>/);
  });

  test('makes no third-party requests and runs no scripts', () => {
    const loaded = [...page.matchAll(/<(?:img|link|script)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(loaded, ['https://bundlewatch.io/favicon.svg', '/static/results-styles.css']);
    assert.doesNotMatch(page, /<script/);
  });

  test('shows the short commit of the service, linking to the full one', () => {
    const sha = '3021e0aad67a0a7a35cb73154c0d005db2372387';
    assert.match(
      renderResultsPage({ payload: payload(), serverCommitSha: sha }),
      new RegExp(`<a href="https://github.com/bundlewatch/bundlewatch/commit/${sha}">3021e0a</a>`),
    );
    assert.doesNotMatch(renderResultsPage({ payload: payload() }), /class="sha"/);
  });

  test('starts with a doctype and declares the charset and viewport', () => {
    assert.ok(page.startsWith('<!doctype html>'));
    assert.match(page, /<meta charset="utf-8">/);
    assert.match(page, /<meta name="viewport"/);
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
      state: 's',
    });
    assert.match(
      page,
      /<a class="button" href="https:\/\/github.com\/login\/oauth\/authorize\?scope=repo%3Astatus&amp;client_id=04fcf325dd26ca2a159f&amp;state=s">/,
    );
    assert.match(text(page), /Authorize on GitHub/);
    assert.match(text(page), /On GitHub Actions You don’t need a token/);
    assert.doesNotMatch(page, /<script/);
  });

  test('links revoking on the configured GitHub', () => {
    const page = renderSetupGithubPage({ githubWebUrl: 'https://github.example.com' });
    assert.match(page, /href="https:\/\/github.example.com\/settings\/applications"/);
  });

  test('shows the name and the token in boxes to copy, escaped', () => {
    const page = renderSetupGithubPage({
      token: '<script>t</script>',
      githubWebUrl: 'https://github.com',
    });
    assert.match(page, /<code id="copy-name"[^>]*>BUNDLEWATCH_GITHUB_TOKEN<\/code>/);
    assert.match(page, /<code id="copy-value"[^>]*>&lt;script&gt;t&lt;\/script&gt;<\/code>/);
    assert.doesNotMatch(page, /oauth\/authorize/);
  });

  test('the token page’s only script matches COPY_SCRIPT_HASH', () => {
    const page = renderSetupGithubPage({ token: 't', githubWebUrl: 'https://github.com' });
    const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
      (match) => match[1] ?? '',
    );
    assert.equal(scripts.length, 1);
    assert.equal(
      createHash('sha256')
        .update(scripts[0] ?? '')
        .digest('base64'),
      COPY_SCRIPT_HASH,
    );
  });

  test('explains a failure and asks to authorize again', () => {
    const expired = renderSetupGithubPage({
      githubWebUrl: 'https://github.com',
      failure: { kind: 'expired' },
    });
    assert.match(text(expired), /That authorization expired/);
    assert.match(text(expired), /Authorize again/);
    const refused = renderSetupGithubPage({
      githubWebUrl: 'https://github.com',
      failure: { kind: 'exchange', error: '<b>The code passed is incorrect or expired.</b>' },
    });
    assert.match(refused, /&lt;b&gt;The code passed is incorrect or expired\.&lt;\/b&gt;/);
    const status = renderSetupGithubPage({
      githubWebUrl: 'https://github.com',
      failure: { kind: 'exchange', error: 502 },
    });
    assert.match(text(status), /GitHub answered with HTTP 502\./);
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
