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

The version in the nav is the latest release. [`scripts/build.sh`](scripts/build.sh) reads it from the newest `vX.Y.Z` tag on GitHub, skipping prereleases. GitHub Actions uses that script for production, previews, and CI. The Website workflow rebuilds production after every successful release. `pnpm build` alone shows the version in `packages/bundlewatch/package.json` instead.

## Translation

Every page in `en/` has a counterpart at the same path in `zh/`. When you add or change an English page:

- Update or add the matching page in `zh/`.
- Add new pages to the sidebar in both `en.mjs` and `zh.mjs`.
- Give Chinese headings that other pages link to an explicit English anchor, e.g. `## 结果链接 {#results-links}`, so that anchors are the same in both languages.

## Deployment

GitHub Actions builds the site and uploads its files to AWS Amplify Hosting in `us-east-1`. Amplify only hosts the files. Its `main` and `pr-<number>` branches are **hosting destinations**, with no corresponding preview Git branches.

- **Production:** [Website](../../.github/workflows/website.yml) builds website-related pushes to `main`, successful releases, and manual runs. A separate job uploads the artifact and waits for Amplify to finish. GitHub's `website-production` deployment links to the published site.
- **Previews:** [Website preview](../../.github/workflows/website-preview.yml) checks the PR's changed files before installing dependencies or building. [Website preview deployment](../../.github/workflows/website-preview-deploy.yml) uploads the artifact to `pr-<number>` and records a GitHub deployment on the original PR commit, with a preview URL. Fork PRs are supported; GitHub may require approval before running a contributor's build.
- **Cleanup:** closing a PR deletes its Amplify destination and marks its GitHub deployments inactive. A completed preview workflow also removes a preview when the PR targets another branch or no longer has website changes. Unrelated follow-up commits keep the existing preview without rebuilding or deploying it.

Website inputs are `packages/website/**`, `packages/bundlewatch/package.json`, root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, and the three website workflows. Shared lockfile changes rebuild conservatively. Keep the production path list and [`scripts/website-inputs.mjs`](scripts/website-inputs.mjs) in sync. Preview filtering reads all changed-file pages, including renames; exceptionally large PRs rebuild conservatively. CI's independent website check still runs on every PR.

The production and preview builders have read-only GitHub tokens and no AWS credentials or OIDC permissions. The preview publisher runs trusted `main` code, verifies the workflow, PR head, source repository, artifact identity, and SHA-256 digest, and sends the ZIP directly to Amplify. It never extracts the ZIP or executes PR code. Build jobs do not share dependency caches with privileged jobs.

Both publishers use GitHub OIDC, without stored AWS keys. Production can upload only to `main`. The preview role trusts runs on `main` and can manage only `pr-*` destinations. The ordinary `pull_request` build cannot assume either role. Keep `website-production` restricted to `main`, and keep previews on `amplifyapp.com`: putting untrusted previews under `bundlewatch.io` would make them same-site with the service.

[`infra/amplify.yaml`](infra/amplify.yaml) owns the app, HTTP headers, redirects, domain, and deployment roles. There is no Amplify Git integration or build configuration. Header and infrastructure changes require a stack update; a website upload alone does not apply them. Amplify failures and timeouts fail the Actions job and its GitHub deployment. Rerun the failed workflow to retry; the publisher waits for an earlier AWS job before starting another one.

## Migrate the existing installation

Create a **new** stack named `bundlewatch-website-artifacts`. Do **not** update the existing `bundlewatch-website` stack with this template: [artifact deployments require an app without a Git repository](https://docs.aws.amazon.com/amplify/latest/APIReference/API_CreateDeployment.html). The existing app continues serving the domain while the new app is tested. Moving the domain can cause a brief interruption while Amplify provisions its association and DNS changes propagate.

Run these commands locally with AWS administrator credentials and GitHub repository administration access. The existing GitHub OIDC provider from the service bootstrap is reused. No GitHub access token is needed for the new app.

1. Check out this change and create the new stack with **no custom domain**:

   ```sh
   aws cloudformation deploy --region us-east-1 \
     --stack-name bundlewatch-website-artifacts \
     --template-file packages/website/infra/amplify.yaml \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides GitHubRepository=bundlewatch/bundlewatch GitHubEnvironment=website-production

   aws cloudformation describe-stacks --region us-east-1 \
     --stack-name bundlewatch-website-artifacts \
     --query 'Stacks[0].Outputs' --output table
   ```

2. Disable the two old workflows before changing their app ID. This stops new deployment requests; it does not take the current site offline. Wait for any running Website or Website preview jobs to finish.

   ```sh
   gh workflow disable website.yml --repo bundlewatch/bundlewatch
   gh workflow disable website-preview.yml --repo bundlewatch/bundlewatch
   ```

3. Merge the artifact-deployment PR. Keep the superseded branch-copying PR #508 out of `main`. Update your local checkout to the merged `main` before the later stack commands.

4. Configure the new stack outputs in GitHub. Set `AppId` as the **repository variable** `AMPLIFY_APP_ID`, and `PreviewDeployRoleArn` as the **repository variable** `AMPLIFY_PREVIEW_ROLE_ARN`. Set `ProductionDeployRoleArn` as `AMPLIFY_DEPLOY_ROLE_ARN` in the **website-production environment**, restricted to deployments from `main`. Remove any environment-level `AMPLIFY_APP_ID` that would override the repository value. Keep the old `AMPLIFY_RELEASE_ROLE_ARN` until the migration is verified, for rollback.

   ```sh
   gh variable set AMPLIFY_APP_ID --repo bundlewatch/bundlewatch \
     --body "$(aws cloudformation describe-stacks --region us-east-1 --stack-name bundlewatch-website-artifacts --query 'Stacks[0].Outputs[?OutputKey==`AppId`].OutputValue | [0]' --output text)"
   gh variable set AMPLIFY_PREVIEW_ROLE_ARN --repo bundlewatch/bundlewatch \
     --body "$(aws cloudformation describe-stacks --region us-east-1 --stack-name bundlewatch-website-artifacts --query 'Stacks[0].Outputs[?OutputKey==`PreviewDeployRoleArn`].OutputValue | [0]' --output text)"
   gh variable set AMPLIFY_DEPLOY_ROLE_ARN --repo bundlewatch/bundlewatch --env website-production \
     --body "$(aws cloudformation describe-stacks --region us-east-1 --stack-name bundlewatch-website-artifacts --query 'Stacks[0].Outputs[?OutputKey==`ProductionDeployRoleArn`].OutputValue | [0]' --output text)"

   gh workflow enable website.yml --repo bundlewatch/bundlewatch
   gh workflow enable website-preview.yml --repo bundlewatch/bundlewatch
   ```

5. Deploy production to the new app and wait for the Website run to succeed:

   ```sh
   gh workflow run website.yml --ref main --repo bundlewatch/bundlewatch
   gh run watch --exit-status --repo bundlewatch/bundlewatch
   ```

   Verify the new site's default URL:

   ```sh
   website_default_url=$(aws cloudformation describe-stacks --region us-east-1 \
     --stack-name bundlewatch-website-artifacts \
     --query 'Stacks[0].Outputs[?OutputKey==`DefaultUrl`].OutputValue | [0]' --output text)
   node packages/website/scripts/check-deployment.mjs "$website_default_url"
   ```

6. Test a website PR and a service-only PR, including a fork if available. Only the website PR should upload a preview; its GitHub deployment must link to `https://pr-<number>.<new-app-id>.amplifyapp.com`. Add an unrelated follow-up commit and verify the preview build is skipped. Close the website PR and verify its Amplify destination is removed. The publisher becomes available after its workflow reaches `main`; an existing PR can be reopened to trigger its first build.

7. After those checks pass, release the domain from the **old** stack using its **previous template**. Preserve its repository, environment, and token parameters:

   ```sh
   aws cloudformation update-stack --region us-east-1 \
     --stack-name bundlewatch-website --use-previous-template \
     --capabilities CAPABILITY_IAM \
     --parameters \
       ParameterKey=GitHubRepository,UsePreviousValue=true \
       ParameterKey=GitHubEnvironment,UsePreviousValue=true \
       ParameterKey=GitHubAccessToken,UsePreviousValue=true \
       ParameterKey=CustomDomain,ParameterValue=
   aws cloudformation wait stack-update-complete --region us-east-1 \
     --stack-name bundlewatch-website
   ```

   This removes the old domain association while retaining the old app and its last deployment. If Amplify asks to reauthorize the legacy repository connection, supply a fresh `GitHubAccessToken` for this legacy update only.

8. Attach the domain to the **new** stack:

   ```sh
   aws cloudformation deploy --region us-east-1 \
     --stack-name bundlewatch-website-artifacts \
     --template-file packages/website/infra/amplify.yaml \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides CustomDomain=bundlewatch.io
   ```

   Wait for the stack to complete. In Amplify → Custom domains, verify both `bundlewatch.io` and `www`. If Amplify lists DNS changes, apply those records in Route 53. Then check:

   ```sh
   node packages/website/scripts/check-deployment.mjs https://bundlewatch.io
   curl -sI https://www.bundlewatch.io
   ```

9. Keep the old stack until the new site has been stable for a few days. Remove the generated `website-pr-*` Git branches after checking their names with `git ls-remote --heads origin 'website-pr-*'`; the old app automatically removes their previews. Then retire the old stack and remove the unused `AMPLIFY_RELEASE_ROLE_ARN` environment variable. The new app does not need the Amplify GitHub App; remove its repository access only after confirming no other Amplify app uses it.

To roll back **before retiring the old stack**, remove `CustomDomain` from the new stack by deploying its template with `CustomDomain=`. Restore the old stack's domain with the step 7 command using `ParameterKey=CustomDomain,ParameterValue=bundlewatch.io` instead. The old app still has its previous production files. Leave the new workflows disabled during rollback; restoring automatic deployments also requires reverting the workflow change and restoring the old repository app ID.

## Fresh installation and later updates

For a fresh installation, create the GitHub OIDC provider using the service's `infra/bootstrap.yaml`, then follow migration steps 1, 4, 5, 6, and 8. Create the `website-production` environment restricted to `main` before its first deployment. There is no old stack to disable or detach.

For later infrastructure or header updates, run `aws cloudformation deploy` against **bundlewatch-website-artifacts** with this template and `CAPABILITY_IAM`. Omitted parameters preserve the stack's existing values. Site content changes deploy through Actions; neither native Amplify auto-builds nor native PR previews should be enabled.
