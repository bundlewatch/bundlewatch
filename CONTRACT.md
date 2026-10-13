# bundlewatch rewrite contract

The rewrite starts from an empty repository. It must not break anything listed here, unless a change is listed under [Deliberate breaks for 1.0](#deliberate-breaks-for-10).

The reference implementations are `bundlewatch@0.4.2` (npm) and `bundlewatch/service@master` (deployed at `service.bundlewatch.io`). If this document and the reference implementations disagree, the reference implementations win. Fix this document.

There are two sides to stay compatible with, in both directions:

| Old     | New         | Who runs this combination                                                                     |
| ------- | ----------- | --------------------------------------------------------------------------------------------- |
| Old CLI | New service | Every pinned `bundlewatch@0.x` install. This will continue for years.                         |
| New CLI | Old service | Self-hosted forks of `bundlewatch/service`, a setup the docs describe. The repo has 14 forks. |

---

## 1. npm package `bundlewatch`

### Package identity

- The package name is `bundlewatch` and the bin name is `bundlewatch`.
- The docs show `import bundlewatch from 'bundlewatch'` and `import { STATUSES } from 'bundlewatch'`.
- Today `lib/app/index.js` is CJS compiled by Babel, with `exports.default` and `exports.STATUSES`. These access patterns must keep working:
  - `require('bundlewatch').default(config)`
  - `require('bundlewatch').STATUSES`
  - `import bundlewatch, { STATUSES } from 'bundlewatch'` in a bundler or TS with `esModuleInterop`
- 1.0 ships separate ES module and CommonJS builds, so none of these depend on Node's `require(esm)`.
- 0.x deep imports `bundlewatch/lib/app` (and `lib/app/index.js`) map to the main export, and `lib/bin/index.js` still runs the CLI.

### Node API: `bundlewatch(config) => Promise<Result>`

```ts
type Status = 'pass' | 'warn' | 'fail' | 'removed'
// STATUSES = { PASS: 'pass', WARN: 'warn', FAIL: 'fail', REMOVED: 'removed' }

type Result = {
  status: Status
  summary: string
  url: string // the results page URL, short or long
  fullResults: Array<{
    filePath: string
    status: Status
    message?: string // missing on error entries
    error?: string // present only on error entries
    size?: number // bytes after compression
    baseBranchSize?: number // 0 when there is no baseline
    maxSize?: number // bytes; Infinity when not set; 0 for removed files
  }>
}
```

### Config shape

The defaults below come from `src/app/config/getConfig.js`. The config is deep-merged with lodash.merge semantics.

```ts
{
  files: Array<{ path: string; maxSize?: string; compression?: 'gzip' | 'brotli' | 'none' }>
  defaultCompression: 'gzip' | 'brotli' | 'none'          // default 'gzip'
  normalizeFilenames: string | RegExp | null               // default null
  bundlewatchServiceHost: string | null                    // default 'https://service.bundlewatch.io'; null disables the service
  ci: {
    githubAccessToken, repoOwner, repoName, repoCurrentBranch, commitSha,
    repoBranchBase,                                        // default: detected value || 'master'
    trackBranches: string[],                               // default ['master', 'develop']
  }
}
```

- `maxSize` is parsed with the `bytes` package (for example `'100KB'` or `'2kB'`). A missing or unparseable value, or `0` (number or string), becomes `Infinity`. 1.0 enforces numeric values, which 0.x ignored.
- `compression` on a file entry overrides `defaultCompression`.
- Validation errors:
  - `files` is not an array
  - an unknown compression value
  - an invalid `normalizeFilenames` regex
  - `ci.trackBranches` is not an array

### Config resolution order (CLI)

1. **Positional globs** (`bundlewatch [options] <globs...>`):
   - Builds `files` from the globs, with `--max-size` and `--compression` (default `gzip`).
   - `--normalize <regex>` sets `normalizeFilenames`.
   - Logs a warning if `package.json` config or `--config` is also present.
2. **`--config <path>`:**
   - `.js`, `.cjs` and `.mjs` files are loaded relative to `cwd`.
   - Any other extension is parsed as JSON.
   - Logs a warning if `package.json` config is also present.
3. **`bundlewatch` key in the nearest `package.json`** (found by walking up from `cwd`):
   - The value can be an object, or an array that is used as `files`.
4. **Nothing found:** prints "Configuration missing" and exits with code 1.

### Environment variables

| Variable                                                                                    | Sets                                                     |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `BUNDLEWATCH_GITHUB_TOKEN`, then `GITHUB_ACCESS_TOKEN`                                      | `ci.githubAccessToken`                                   |
| `CI_REPO_OWNER`, `CI_REPO_NAME`                                                             | Owner and name. Take precedence over every other source. |
| `CI_REPO_SLUG`, then the ci-env repo, then `GIT_URL` (parsed with `github.com[/:](.*).git`) | `owner/name`                                             |
| `CI_COMMIT_SHA`, then `GIT_COMMIT`, then the ci-env sha                                     | `ci.commitSha`                                           |
| `CI_BRANCH`, then `GIT_BRANCH`, then the ci-env branch                                      | `ci.repoCurrentBranch`                                   |
| `CI_BRANCH_BASE`, then ci-env `pull_request_target_branch`                                  | `ci.repoBranchBase`                                      |
| `DEBUG` (any value)                                                                         | Enables debug logging                                    |

Auto-detection also has to match `ci-env@1.17.0` for these providers:

- GitHub Actions
- CircleCI
- Travis
- GitLab
- Drone
- Wercker
- Buddy
- Codefresh
- Netlify
- Vercel (`NOW_*`)
- Cloudflare Pages

Do not add ci-env as a dependency. Reimplement its detection and port its test table.

### File measurement

- Globs go through `glob@7.2.3` itself, the version 0.x used, so keys are spelled the same way and the same files match: escapes, symlinked directories, dotfiles, sort order, platform differences. Directories can match (see open PR "ignore directories").
- A pattern with no matches produces the entry `{ [pattern]: { error: 'There is no matching file for <pattern>' } }`.
- Sizes:
  - `gzip`: `zlib.gzipSync(buf, { level: 9 }).length` (gzip-size@6)
  - `brotli`: `zlib.brotliCompressSync(buf, { params: { MODE: DEFAULT, QUALITY: 11, SIZE_HINT: buf.byteLength } }).byteLength` (brotli-size@4, an optional peer dependency the user installs). Keep `SIZE_HINT`, because it can change the output.
  - `none`: the raw byte length
- The new sizes must be byte-for-byte identical to the old ones. Otherwise every baseline in the service shows a phantom diff on the first run after the upgrade.
- Filename normalization: if the regex matches, the path is split on the regex, and each resulting segment is removed from the path with `String.replace`. This only behaves like "remove the capture groups" for typical patterns. Port the algorithm itself, not a cleaner version of it.
- **0.x quirk, fixed in 1.0:** with `compression: 'none'`, a readable 0-byte file was reported as an error ("Could not read file"), because the code checked `if (size)`. With gzip or brotli the compressed size is never 0.

### Analysis strings

Users see these strings in GitHub statuses, CI logs and the results page.

- Per-file messages, where `<x>` is formatted with `bytes(x)` (for example `30.71KB`):
  - `<size> < <max> (<diff> larger than <base>) (gzip)`
  - `… (<diff> smaller than <base>) …`
  - `… (no difference) …`
  - `<size> > <max> (…)`. A failure omits the diff part.
  - `<path>: File removed (<size> smaller than <base>) (gzip)`
  - The compression label is `(gzip)`, `(brotli)` or `(no compression)`.
- Summary:
  - `maxSize check failed`
  - `Everything is in check (+<added>, -<removed>, <pct>)`
  - `File(s) have passed tolerance thresholds (…)`. This needs `warn`, which the code never produces today.
  - `<pct>` is `+1.2%`, `-1.2%` or `±0.0%`. It is left out when the baseline total is 0.
- Overall status: `fail` if any file fails, otherwise `warn` if any file warns, otherwise `pass`. Removed files count as `pass` for the overall status.
- An error entry has `status: 'fail'` and no size fields.

### CLI output and exit codes

- The exit code is 1 on `fail`, a validation error, an uncaught exception, or missing config. It is 0 on `pass` or `warn`.
- Line formats. Users grep these in CI, so treat them as a soft contract:
  - `Result breakdown at: <url>`
  - `PASS|WARN|FAIL|ERROR <path>: <message>`
  - `bundlewatch PASS|WARN|FAIL`, followed by the summary
  - Log prefixes: `[INFO]`, `[WARNING]`, `[ERROR]`, `[FATAL]`, `[DEBUG]`
- CLI flags: `--config`, `--max-size`, `--compression`, `--normalize`, `--help`. Keep the commander behaviour where `--flag [value]` takes an optional value.

### GitHub commit statuses (hard contract)

- Requests are `POST https://api.github.com/repos/{owner}/{repo}/statuses/{sha}` with `Authorization: token <t>`.
- The overall context is `bundlewatch`. **Users list this name in branch-protection required checks, so it must not change.** Do not move to the Checks API in 1.x without also keeping this status.
- Per-file failure contexts:
  - `bundlewatch <path>` when the path is 35 characters or fewer
  - otherwise `bundlewatch *` followed by the last 37 characters of the path
- At most 5 distinct contexts per run. Once that limit is reached, further contexts are skipped with a warning.
- Two files whose paths end in the same 37 characters shared one context in 0.x, so one result hid the other. 1.0 gives the second one `… (2)`.
- Descriptions longer than GitHub's 140-character limit made the request fail in 0.x; 1.0 truncates them.
- Sequence: `pending` ("Checking bundlewatch..."), then `success` with the summary and URL, or `failure` with the summary and URL plus one `failure` per failing file, or `error` ("Unable to analyze, check logs. <msg>").
- When the GitHub API returns an HTTP error, the CLI logs it and continues. A network error is thrown.
- Statuses are skipped when the token, owner, name or sha is missing.

---

## 2. Service HTTP API (`bundlewatch-service`)

`bundlewatchServiceHost` is a base URL. The CLI appends paths to it. URL userinfo is decoded and sent as Basic authorization; credentials are stripped from request URLs, error logs and results links (0.x leaked them through the long results link, into CI logs and GitHub statuses).

0.x honored proxy variables (`HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `npm_config_*_proxy`, `all_proxy`) only as a side effect of axios, without documenting them. 1.0 doesn't read them; this is a deliberate break listed in MIGRATION.md and pinned by a contract test.

### `POST /store`: save a baseline

Request:

```json
{
  "repoOwner": "",
  "repoName": "",
  "repoBranch": "",
  "commitSha": "",
  "githubAccessToken": "",
  "fileDetailsByPath": {
    "<path>": { "size": 0, "maxSize": 0, "compression": "gzip" }
  }
}
```

- A `maxSize` of `Infinity` becomes `null` when serialized to JSON. The service must accept `null`.
- Error entries (`{ error }`) can appear in `fileDetailsByPath`. The current validator rejects them, which means a run with any missing file saves nothing. Keep this behaviour or list the change as a deliberate break.
- Responses:
  - `200` with the stored item as JSON. The CLI ignores the body.
  - `401 { error: 'Not allowed' }`
  - `422 { errors }`
  - `500 { error }`
- The CLI sends this request only when `repoCurrentBranch` is in `trackBranches`.
  - The log line `X !== Y, no results saved` is misleading: the CLI saves anyway when the branch is tracked.
- The CLI uses a 10s timeout, and failures are non-fatal. A timeout is logged as `code=ECONNABORTED`, as with 0.x's Axios.

### `POST /store/lookup`: fetch a baseline

- Request body: the same fields as `/store`, without `fileDetailsByPath`. `repoBranch` is the base branch.
- Responses:
  - `200 { fileDetailsByPath }`
  - `404` when no baseline exists. The CLI treats this as an empty baseline and logs an error.
  - `401`, `422` or `500`, as for `/store`.

### Authorization

- 0.x allowed any token that can `GET /repos/{o}/{r}/statuses/{sha}`. On public repos any valid token passes, so anyone could overwrite a public repo's baseline.
- Reading a baseline (`/store/lookup`) keeps that check.
- Writing (`/store`, `POST /results`, `/analyze`) is stricter in 1.0 (see `packages/service/README.md`):
  - A token whose repository response includes `permissions` needs push, maintain or admin.
  - An installation token, such as Actions' `GITHUB_TOKEN`, must have the repository in its installation.
  - Only when GitHub won't show the repository to the token does the 0.x check apply. For example, an OAuth token with only `repo:status` on a private repository.
- In default report mode, the independent 0.x check decides even when the stricter check errors or times out; failures of the shadow check are logged as `write-authorization-check-failed`. Errors from the 0.x check, and strict errors in enforce mode, remain 503s.
- The installation listing leaves the last two seconds of the six-second check budget for the statuses fallback; it never resets the total deadline.
- Old CLIs send the same request bodies, so they keep working. In enforce mode, tokens without write access to a public repository are refused.
- Tokens issued by the existing OAuth app (client id `04fcf325dd26ca2a159f`, scope `repo:status`) must still be accepted. Do not delete or rotate that OAuth app.

### `GET /results?d=<data>`: results page (HTML)

- `d` is `encodeURIComponent(jsonpack.pack({ details, results }))`. The CLI removes `message` from each `fullResults` item before packing.
  - `details` is `{ repoOwner, repoName, repoCurrentBranch, repoBranchBase, commitSha }`. All fields are optional.
  - `results` is `{ status, summary, fullResults[] }`.
- **Every URL already posted to a GitHub status must keep rendering, indefinitely.**
  - That includes the Firebase short links (`ja2r7.app.goo.gl/...`), which redirect here.
  - Packing and unpacking use jsonpack 1.1.5. Version 2.0 crashes on valid names such as `constructor` and `__proto__`. `packages/core/src/results-url.test.ts` checks historical and new links, including reserved repository, branch and file names.
- 0.x CLIs encoded an unlimited `maxSize` as `Infinity`. The 0.x service rejected it, so those pages never rendered. The 1.0 service accepts it; the 1.0 CLI sends `null`, which 0.x services accept.
- Malformed `d` returned HTTP 500 in 0.x and returns 400 in 1.0.
- 0.x CLIs with a numeric `maxSize` in their config sent it as a size string such as `"100KB"`. The 0.x service rejected those baselines and links; 1.0 reads them as bytes.
- The CSS at `/static/results-styles.css` is linked from the HTML.

### `GET /setup-github[?code=]`: OAuth token page

- Without a `code`, it renders the authorize button (`scope=repo:status`).
- With a `code`, it exchanges the code for a token and renders the token.
- The CSS at `/static/setup-github-styles.css` is linked from the page.

### `POST /analyze`

- Server-side analysis that posts statuses. The current CLI never calls it.
- **Check the access logs before dropping it.** Older CLIs or third-party callers may still use it.

### `GET /`

- Returns `{"message":"hello world"}`. External monitors might be pointed at it, so keep it.
- Requests whose `Accept` header includes `text/html`, which browsers send, get an HTML page instead. Both responses vary on `Accept`. Clients that send `*/*` or no `Accept` header, like curl, monitors and the deploy's smoke test, keep getting the JSON.

### Added in 1.0: short links

- `POST /results` stores a results payload and returns `201 { id, url }`. It requires the same authorization as `POST /store`. The request shape is in `packages/service/README.md`.
- `GET /r/{id}` renders a stored payload.
- The 1.0 CLI tries `POST /results` first. On a 0.x service it gets a 404 and falls back to the long `/results?d=…` link.

---

## 3. Data

- DynamoDB table `bundlewatch-service-store-table-prod`, region `us-east-1`, `DeletionPolicy: Retain`.
- Keys: hash key `repo` (`owner/name`), range key `repoBranch`. The table holds only the latest item per branch, and each save overwrites it.
- Local secondary index `timestamp` (KEYS_ONLY). The timestamp is stored as a string of epoch milliseconds.
- Item: `{ repo, repoBranch, repoOwner, repoName, commitSha, fileDetailsByPath, timestamp }`.
- The new service must either read this table in place or migrate it. Baselines are only replaced when a tracked branch next builds, and an inactive repo would lose its baseline permanently.

## 4. Assets outside the code

- npm package `bundlewatch`. Publishing rights: charpeni, jakebolam, iamogbz.
- The domain `service.bundlewatch.io` (Route53, API Gateway custom domain).
- The domain `bundlewatch.io` (docs). CLI messages link to it.
- The GitHub OAuth app (see [Authorization](#authorization)). Its client secret is in the deploy environment.
- The AWS account that runs the service.
- The Firebase project behind `ja2r7.app.goo.gl`. Its short links redirect to `/results`. As of October 2026 they still resolve, but Google has announced the product's shutdown.

---

## Not part of the contract

- Internal module layout, dependencies, Babel, yarn, CircleCI and the Makefile.
- Deep imports into `bundlewatch/lib/…` other than `lib/app` and `lib/bin/index.js`. They pointed at 0.x internals that no longer exist.
- The exact wording of `[WARNING]` and `[ERROR]` lines, apart from the formats listed above.
- How URLs are shortened, provided the URL in `Result.url` and the status `target_url` still opens the results page.

## Deliberate breaks for 1.0

Decided. Each one is listed in [MIGRATION.md](MIGRATION.md) and, where the CLI is involved, tested under "documented differences" in `packages/contract-tests`.

- [x] Node.js 22.17 or later.
- [x] Base branch: the pull request target, then the detected default branch on GitHub Actions, then `master`. `main` and the default branch are tracked too (CLI #423, service #280).
- [x] Arrays in configuration replace defaults instead of merging index by index.
- [x] Branch names with `/` on GitHub Actions (CLI #422).
- [x] GitHub Actions pull request statuses go to the head commit instead of the merge commit.
- [x] Pull request builds never save baselines. Only builds the CI provider runs for a pull request count (see MIGRATION.md); branch builds with an open pull request keep saving.
- [x] Runs with missing files don't send a baseline (the 0.x service rejected it anyway).
- [x] The Firebase shortener is gone; the service stores results behind short links instead.
- [x] Proxy variables are no longer read (0.x only picked them up through axios, undocumented).
- [x] Numeric `maxSize` values are enforced. `0`, numeric or string, still means no limit.
- [x] Empty files measure 0 B.
- [x] Removed files named after Object.prototype properties are correctly reported as removed, rather than passing with no size (a pre-existing 0.x bug).
- [x] A measured file whose key is `__proto__` is kept and checked, rather than dropped so the run passes (a pre-existing 0.x bug).
- [x] `--config` loads modules with `import()` and accepts absolute paths.
- [x] No crash without a `package.json` (CLI #434).
- [x] `bundlewatchServiceHost: null` prints no results link.
- [x] Generic `CI` without `CI_REPO_OWNER`/`CI_REPO_NAME` falls back to `GIT_URL` instead of the repository `undefined/undefined`.
- [x] Stricter authorization for writes on the service, in report-only mode until enforced (`WRITE_AUTHORIZATION`).
- [x] Service errors: GitHub failures are `503`, baselines too large to store are `413`.
- [x] `/setup-github` checks an OAuth `state`.

---

## How it is enforced

- **`packages/contract-tests/src/contract.test.ts`** runs `bundlewatch@0.4.2` from npm and the built CLI on the same projects, with the same environment, against one fake server playing the service, GitHub and Firebase.
  - It compares exit codes, output, every service request, every GitHub status, and the data inside results links.
  - Each tolerated difference is named in the test and in MIGRATION.md.
  - 0.4.0, 0.4.1 and 0.4.2 contain identical code.
- **`packages/contract-tests/src/service.test.ts`** runs every 0.x release still in use against the new service, in memory: 0.2.7, 0.3.1, 0.3.3 and 0.4.2, over 99% of weekly downloads. Each one saves a baseline, compares against it, and opens its links, including links with an unlimited `maxSize`. The new CLI's short links are checked there too.
- **Library ports** are compared with the original packages in their unit tests: `bytes@3.1.2`, `ci-env@1.17.0` (19 CI scenarios), `gzip-size@6`, `brotli-size@4` and `jsonpack@1.1.5`. File matching uses `glob@7.2.3` itself.
- **The service** has tests for every route. They include results links packed by 0.x CLIs, and baseline items in the exact format dynamoose 1.x wrote, verified against DynamoDB Local.

Not covered yet:

- A corpus of real results links collected from GitHub statuses.
- Running the 0.x service code itself against the 1.0 CLI. The fake server answers like a 0.x service, but it isn't one.
- Real GitHub tokens against the new authorization. This is a checklist in `packages/service/README.md` before enforcing it.
