# website

The [bundlewatch.io](https://bundlewatch.io) documentation site, built with [VitePress](https://vitepress.dev/).

## Commands

Run these from the repository root:

```bash
pnpm --filter @bundlewatch/website dev       # start the dev server
pnpm --filter @bundlewatch/website build     # build into packages/website/docs/.vitepress/dist
pnpm --filter @bundlewatch/website preview   # serve the built site locally
bash packages/website/scripts/build.sh       # the production build, with the latest release in the nav
node packages/website/scripts/check-deployment.mjs <url>  # check a deployed copy of the site
```

The build fails on dead internal links. Fix the link rather than ignoring it.

## Structure

```
docs/
  .vitepress/
    config/
      index.mjs    # combines the shared config and the locales
      shared.mjs   # site-wide settings: rewrites, clean URLs, search, markdown plugins
      en.mjs       # English nav, sidebar and "Edit this page" link
      zh.mjs       # Chinese nav, sidebar and "Edit this page" link
    llms.mjs       # writes llms.txt, llms-full.txt and a Markdown copy of each page
    theme/
      index.mjs    # default theme, plus tabs and medium-zoom
      custom.css   # theme overrides (plain CSS with native nesting)
  en/              # English pages, served at / (rewritten from en/)
  zh/              # Chinese translation, served at /zh/
  public/          # copied as-is to the site root: images, logos, favicon
  _assets/         # old images, not used by the site (see below)
```

`_assets/` is a copy of `docs/_assets/` from the old `bundlewatch/bundlewatch.io` repository. External pages, such as the 0.x npm README, still load images from that repository. Some of the files (`logo.svg`, `logo-square-transparent-highquality.png` and this version of `logo-large.svg`) exist nowhere else. The site itself only uses `public/`. `public/logo-wordmark.svg` is a copy of that `logo-large.svg`, the logo with the name, used by the repository's README; `logo-wordmark-dark.svg` is the same logo with white letters, for dark mode.

## Documentation for LLMs and agents

Every build also writes, from the English pages and following [llmstxt.org](https://llmstxt.org):

- `llms.txt`: the pages, grouped and ordered like the English sidebar, with the `description` from their frontmatter.
- `llms-full.txt`: every page in one file.
- `<page>.md`: each page as plain Markdown, so `https://bundlewatch.io/guide/getting-started.md` works next to `/guide/getting-started`.

VitePress-only syntax (containers, code groups, heading anchors, HTML images) becomes plain Markdown, and links become absolute. A page appears in these files once it is in the English sidebar, so give every page a `title` and `description`. These files only exist in builds, not with the dev server: check them in `docs/.vitepress/dist` after a build.

The [getting started guide](docs/en/guide/getting-started.md#set-up-with-an-ai-agent) and the [migration guide](docs/en/guide/migrating-to-v1.md#upgrade-with-an-ai-agent) have prompts for coding agents, which point at these files. Keep the prompts in step with the pages they describe.

## Version in the nav

The version in the nav is the latest release. [`scripts/build.sh`](scripts/build.sh) reads it from the newest `vX.Y.Z` tag on GitHub, skipping prereleases. Amplify uses that script for production and previews, and CI uses it to check the site. The Website workflow rebuilds production after every successful release. `pnpm build` alone shows the version in `packages/bundlewatch/package.json` instead.

## Translation

Every page in `en/` has a counterpart at the same path in `zh/`. When you add or change an English page:

- Update or add the matching page in `zh/`.
- Add new pages to the sidebar in both `en.mjs` and `zh.mjs`.
- Give Chinese headings that other pages link to an explicit English anchor, e.g. `## 结果链接 {#results-links}`, so that anchors are the same in both languages.

## Deployment

The site is hosted on AWS Amplify Hosting at `https://bundlewatch.io`, in the same AWS account and region (`us-east-1`) as the service.

- **Production:** the [Website workflow](../../.github/workflows/website.yml) asks Amplify to build `main` when a push changes website inputs. Manual runs can rebuild it at any time.
- **Previews:** the [Website preview workflow](../../.github/workflows/website-preview.yml) creates a `pr-<number>` branch for a pull request targeting `main` with website changes, including forks. Amplify automatically builds these branches. GitHub records a deployment against the PR commit, with a direct preview link on the PR and in the workflow summary. The deployment succeeds only once Amplify serves the expected website revision. Closing the PR, changing its target away from `main`, or removing its website changes deletes the branch; Amplify deletes its deployment too. Unrelated follow-up commits don't rebuild an existing preview.
- **Releases:** the [Website workflow](../../.github/workflows/website.yml) rebuilds `main` after each successful release, so the nav shows the new version.

Website inputs are `packages/website/**`, `packages/bundlewatch/package.json` (imported by the site config), `amplify.yml`, `customHttp.yml`, root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, and the two website workflows. Changes only to the CLI or service source don't deploy the website. Shared lockfile changes rebuild conservatively, even when only another package's dependencies changed. Keep the production path list and `isWebsitePath` in [`scripts/sync-preview.mjs`](scripts/sync-preview.mjs) in sync.

Amplify's native diff-based deployment setting only watches one directory, so it would miss the root-level inputs. Leave it disabled: Actions chooses when to deploy, including release rebuilds without a website source change.

Everything that configures the site is in this repository:

| File                                       | What it sets                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| [`amplify.yml`](../../amplify.yml)         | The build: Node.js from `.nvmrc`, pnpm from `packageManager`, then [`scripts/build.sh`](scripts/build.sh)                            |
| [`customHttp.yml`](../../customHttp.yml)   | Response headers: HSTS and CORS as on GitHub Pages, caching of `/assets/`, types of the LLM files                                    |
| [`infra/amplify.yaml`](infra/amplify.yaml) | The Amplify app, production and preview branch settings, the domain, the 404 and `www` rules, and the role the Website workflow uses |

Amplify reads `amplify.yml` and `customHttp.yml` on each build. Changes to `infra/amplify.yaml` need an administrator to update the stack.

The preview workflow uses `pull_request_target` and a token with `contents: write` to manage preview refs and `deployments: write` to publish deployment status. It checks out only its trusted workflow revision, installs no project dependencies, and never executes PR code. Preview refs copy the PR source while retaining `.github` from the trusted base, so they cannot introduce PR-supplied Actions definitions. Updates made with `GITHUB_TOKEN` don't trigger other GitHub workflows. Reserve `pr-*` for this workflow; branch rulesets must allow its ref creation, force updates, and deletion.

The Amplify app has no IAM service role and no secrets. A preview build runs code from the pull request, which can come from anyone. Keep it that way, and:

- Don't add environment variables with secrets: preview builds can read them.
- Don't enable automatic subdomains for previews. A preview at `pr-1.bundlewatch.io` would be same-site with `service.bundlewatch.io` and could set cookies for it. On `amplifyapp.com`, a public suffix, previews are isolated.
- The account's budget alert (see the service's one-time setup) also covers Amplify build minutes, which fork pull requests can spend.

### Updating an existing Amplify installation

1. Move `AMPLIFY_APP_ID` to a GitHub **repository variable**, so both workflows can read it. Add the repository variable before removing the duplicate from `website-production`. Keep `AMPLIFY_RELEASE_ROLE_ARN` in `website-production`.
2. Merge both website workflows and the preview script to `main` before updating the stack.
3. Before enabling `pr-*` branch detection, remove any old native Amplify `pr-*` preview branches that have no matching GitHub `pr-*` source branch. The new previews reuse these names.
4. Update the `bundlewatch-website` CloudFormation stack with [`infra/amplify.yaml`](infra/amplify.yaml), preserving its domain and repository parameters (the deployment command in the setup section applies). This disables native production pushes and native PR previews, and enables automatic builds and deletion for `pr-*` branches. No extra AWS permissions or credentials are needed by the preview workflow.
5. Run Website manually once, then open a website PR and a service-only PR. Only the website PR should create a preview branch. An unrelated follow-up commit should leave that branch unchanged; closing the PR should remove it and its Amplify branch.
6. If upgrading from the earlier `website-pr-*` naming, delete those obsolete GitHub branches after verifying the new previews; Amplify automatically deletes their deployments. Existing open PRs get the new `pr-*` preview on their next update or when reopened.

The production workflow reports that a build was requested; check Amplify for its build result. The preview workflow waits up to 15 minutes for the expected revision before recording success or failure on GitHub. It stamps `packages/website/docs/public/__preview.json` into each temporary preview branch; VitePress copies it to the site so a previous build returning HTTP 200 cannot count as the new deployment. The marker never enters `main`, and requires no AWS credentials or changes to the PR's build script.

Unrelated follow-up commits reuse the existing preview and link its deployment to the new PR commit. Closing or retargeting the PR, or removing its website changes, marks its deployments inactive. If a build fails, retry it in Amplify and rerun the preview workflow to refresh its GitHub status. Unrelated updates alone do not retry Amplify builds.

## Setting up Amplify and moving the domain

The site used to be deployed to GitHub Pages from `bundlewatch/bundlewatch.io`. Moving it to Amplify is a one-time change, done by an administrator of the AWS account and of the GitHub organization. The old site keeps serving `bundlewatch.io` until DNS changes in step 8, and stays available for a rollback until step 10.

1. In `bundlewatch/bundlewatch` Settings → Environments, create `website-production` and allow deployments from `main` only. Do this before `website.yml` reaches `main`: GitHub creates an unprotected environment the first time a workflow names one.
2. Install the Amplify GitHub App for `us-east-1` on the bundlewatch organization, for this repository only: <https://github.com/apps/aws-amplify-us-east-1/installations/new>.
3. As a repository administrator, create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new). Amplify uses it to connect through the GitHub App, and doesn't store it.
   - Resource owner: the `bundlewatch` organization.
   - Expiration: 7 days.
   - Repository access: only `bundlewatch/bundlewatch`.
   - Repository permissions: Webhooks, Read and write. GitHub adds Metadata, Read.

   If the organization requires approval for fine-grained tokens, approve it under the organization's Settings → Personal access tokens. A classic token with only the `admin:repo_hook` scope works too, but it covers every repository you administer.

4. Deploy the stack, without a domain yet. The GitHub OIDC provider must exist: deploy the service's `infra/bootstrap.yaml` first.

   Copy the token, then run this. It reads the token from the clipboard with `pbpaste` (macOS; on Linux, use `wl-paste` or `xclip -selection clipboard -o`), so it never appears on screen or in your shell history:

   ```sh
   aws cloudformation deploy --region us-east-1 \
     --stack-name bundlewatch-website \
     --template-file packages/website/infra/amplify.yaml \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides GitHubAccessToken="$(pbpaste)"
   pbcopy < /dev/null # clears the clipboard
   ```

5. Add the stack output `AppId` as the repository variable `AMPLIFY_APP_ID`. Add `ReleaseBuildRoleArn` as `AMPLIFY_RELEASE_ROLE_ARN` in the `website-production` environment.
6. Run the Website workflow (Actions → Website → Run workflow). It starts the first build of `main`, and checks the role on the way.
7. Check the site at the `DefaultUrl` output, and open a test pull request that changes the website to see its preview:

   ```sh
   node packages/website/scripts/check-deployment.mjs https://main.<app id>.amplifyapp.com
   ```

8. Add the domain. Create a new token as in step 3, since the first one has expired or should be revoked, copy it, then:

   ```sh
   aws cloudformation deploy --region us-east-1 \
     --stack-name bundlewatch-website \
     --template-file packages/website/infra/amplify.yaml \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides GitHubAccessToken="$(pbpaste)" CustomDomain=bundlewatch.io
   pbcopy < /dev/null # clears the clipboard
   ```

   The `bundlewatch.io` hosted zone is in Route 53, in this account, so Amplify creates the certificate's validation record and points `bundlewatch.io` and `www` at the app. The update finishes once the domain is active, which can take up to an hour. If the console (Amplify → the app → Custom domains) still shows records to update, replace the GitHub Pages records with the ones it lists. While DNS changes, visitors reach either host, and both serve the same site.

9. Check the site again, and that `www` redirects:

   ```sh
   node packages/website/scripts/check-deployment.mjs https://bundlewatch.io
   curl -sI https://www.bundlewatch.io | grep -i '^location'   # https://bundlewatch.io/
   ```

10. After a few days without problems, in `bundlewatch/bundlewatch.io` Settings → Pages, unpublish the site and disable its Pages workflow. Then archive the repository.

To roll back before step 10, point the records back at GitHub Pages:

| Name             | Type  | Value                                                                      |
| ---------------- | ----- | -------------------------------------------------------------------------- |
| `bundlewatch.io` | A     | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| `www`            | CNAME | `bundlewatch.github.io`                                                    |
