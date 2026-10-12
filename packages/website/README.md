# docs

The [bundlewatch.io](https://bundlewatch.io) documentation site, built with [VitePress](https://vitepress.dev/).

## Commands

Run these from the repository root:

```bash
pnpm --filter @bundlewatch/website dev       # start the dev server
pnpm --filter @bundlewatch/website build     # build into packages/website/docs/.vitepress/dist
pnpm --filter @bundlewatch/website preview   # serve the built site locally
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
    theme/
      index.mjs    # default theme, plus tabs and medium-zoom
      custom.css   # theme overrides (plain CSS with native nesting)
  en/              # English pages, served at / (rewritten from en/)
  zh/              # Chinese translation, served at /zh/
  public/          # copied as-is to the site root: images, logos, favicon
  _assets/         # old images, not used by the site (see below)
```

The version in the nav comes from `packages/bundlewatch/package.json`.

`_assets/` is a copy of `docs/_assets/` from the old `bundlewatch/bundlewatch.io` repository. External pages, such as the 0.x npm README, still load images from that repository. Some of the files (`logo.svg`, `logo-square-transparent-highquality.png` and this version of `logo-large.svg`) exist nowhere else. The site itself only uses `public/`.

## Translation

Every page in `en/` has a counterpart at the same path in `zh/`. When you add or change an English page:

- Update or add the matching page in `zh/`.
- Add new pages to the sidebar in both `en.mjs` and `zh.mjs`.
- Give Chinese headings that other pages link to an explicit English anchor, e.g. `## 结果链接 {#results-links}`, so that anchors are the same in both languages.

## Deployment

The site is served by GitHub Pages at `https://bundlewatch.io`. The [Website workflow](../../.github/workflows/website.yml) builds it and deploys `docs/.vitepress/dist` on every change merged to `main` that touches the site, and can also be started by hand. The custom domain is set in the repository's Pages settings; a GitHub Actions deployment ignores `CNAME` files, so the site needs none.

## Moving the site to this repository

The site used to be deployed from `bundlewatch/bundlewatch.io`. Moving it here is a one-time change:

1. Verify `bundlewatch.io` for the bundlewatch GitHub organization (organization Settings → Pages → Add a domain). Once it is verified, only the organization's repositories can publish to it, so nobody else can claim the domain while it moves. GitHub asks for a TXT record; that is the only DNS change.
2. In `bundlewatch/bundlewatch` Settings → Environments, create `website-production` and allow deployments from `main` only. The workflow deploys through this environment rather than the `github-pages` one GitHub creates and protects automatically, so this rule is what stops other branches from publishing the site. Do this before the workflow reaches `main`: GitHub creates an unprotected environment the first time a workflow names one.
3. In `bundlewatch/bundlewatch` Settings → Pages, set Source to "GitHub Actions", then run the Website workflow (Actions → Website → Run workflow).
4. In `bundlewatch/bundlewatch.io` Settings → Pages, remove the custom domain.
5. In `bundlewatch/bundlewatch` Settings → Pages, add `bundlewatch.io` as the custom domain. The site is unavailable between steps 4 and 5, so do them back to back.
6. Wait for GitHub to issue the certificate, then enable "Enforce HTTPS".
7. Disable the Pages workflow of `bundlewatch/bundlewatch.io` (Actions → the workflow → Disable workflow), so it doesn't deploy the old site again.

The A and CNAME records stay as they are:

| Name             | Type  | Value                                                                      |
| ---------------- | ----- | -------------------------------------------------------------------------- |
| `bundlewatch.io` | A     | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| `www`            | CNAME | `bundlewatch.github.io`                                                    |
