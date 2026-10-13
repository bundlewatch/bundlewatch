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

- **Production:** Amplify builds `main` on every push. It is the same build for every change, website or not, so the deployed site always matches `main`.
- **Previews:** Amplify builds every pull request that targets `main`, including pull requests from forks, and comments the preview URL on it. The preview is deleted when the pull request closes. Previews use the same build, headers and rules as production.
- **Releases:** the [Website workflow](../../.github/workflows/website.yml) rebuilds `main` after each successful release, so the nav shows the new version.

Everything that configures the site is in this repository:

| File                                       | What it sets                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [`amplify.yml`](../../amplify.yml)         | The build: Node.js from `.nvmrc`, pnpm from `packageManager`, then [`scripts/build.sh`](scripts/build.sh)                     |
| [`customHttp.yml`](../../customHttp.yml)   | Response headers: HSTS and CORS as on GitHub Pages, caching of `/assets/`, types of the LLM files                             |
| [`infra/amplify.yaml`](infra/amplify.yaml) | The Amplify app, the `main` branch with previews, the domain, the 404 and `www` rules, and the role the Website workflow uses |

Amplify reads `amplify.yml` and `customHttp.yml` on each build. Changes to `infra/amplify.yaml` need an administrator to update the stack.

The app has no IAM service role and no secrets. That is required for previews of a public repository, and it matters: a preview build runs the code of the pull request, which can come from anyone. Keep it that way, and:

- Don't add environment variables with secrets: preview builds can read them.
- Don't enable automatic subdomains for previews. A preview at `pr-1.bundlewatch.io` would be same-site with `service.bundlewatch.io` and could set cookies for it. On `amplifyapp.com`, a public suffix, previews are isolated.
- The account's budget alert (see the service's one-time setup) also covers Amplify build minutes, which fork pull requests can spend.

## Setting up Amplify and moving the domain

The site used to be deployed to GitHub Pages from `bundlewatch/bundlewatch.io`. Moving it to Amplify is a one-time change, done by an administrator of the AWS account and of the GitHub organization. The old site keeps serving `bundlewatch.io` until DNS changes in step 8, and stays available for a rollback until step 10.

1. In `bundlewatch/bundlewatch` Settings → Environments, create `website-production` and allow deployments from `main` only. Do this before `website.yml` reaches `main`: GitHub creates an unprotected environment the first time a workflow names one.
2. Install the Amplify GitHub App for `us-east-1` on the bundlewatch organization, for this repository only: <https://github.com/apps/aws-amplify-us-east-1/installations/new>.
3. As a repository administrator, create a classic personal access token with only the `admin:repo_hook` scope and a short expiration. Amplify uses it to connect through the GitHub App, and doesn't store it.
4. Deploy the stack, without a domain yet. The GitHub OIDC provider must exist: deploy the service's `infra/bootstrap.yaml` first.

   ```sh
   read -rs GITHUB_TOKEN
   aws cloudformation deploy --region us-east-1 \
     --stack-name bundlewatch-website \
     --template-file packages/website/infra/amplify.yaml \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides GitHubAccessToken="$GITHUB_TOKEN"
   ```

5. Add the stack outputs `AppId` and `ReleaseBuildRoleArn` to the `website-production` environment, as the variables `AMPLIFY_APP_ID` and `AMPLIFY_RELEASE_ROLE_ARN`.
6. Run the Website workflow (Actions → Website → Run workflow). It starts the first build of `main`, and checks the role on the way.
7. Check the site at the `DefaultUrl` output, and open a test pull request that changes the website to see its preview:

   ```sh
   node packages/website/scripts/check-deployment.mjs https://main.<app id>.amplifyapp.com
   ```

8. Add the domain. Pass a new token, since the first one has expired or should be revoked:

   ```sh
   read -rs GITHUB_TOKEN
   aws cloudformation deploy --region us-east-1 \
     --stack-name bundlewatch-website \
     --template-file packages/website/infra/amplify.yaml \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides GitHubAccessToken="$GITHUB_TOKEN" CustomDomain=bundlewatch.io
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
