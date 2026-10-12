# Contributing

## Setup

You need Node.js 24 (see `.nvmrc`) and pnpm, which Corepack provides:

```sh
corepack enable
pnpm install
```

pnpm is configured to refuse dependency versions published less than a day ago, dependency install scripts nobody has reviewed, and versions whose publishing provenance is weaker than an earlier release's (see `pnpm-workspace.yaml`).

## Commands

| Command              | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `pnpm check`         | Formatting (Oxfmt) and lint (Oxlint) checks                            |
| `pnpm format`        | Formats everything                                                     |
| `pnpm typecheck`     | TypeScript in every package                                            |
| `pnpm build`         | Builds the CLI and the service bundle                                  |
| `pnpm test`          | Unit and integration tests                                             |
| `pnpm test:contract` | Compares the built CLI with bundlewatch 0.4.2 (run `pnpm build` first) |

Each package also has its own scripts, for example `pnpm --filter bundlewatch test` or `pnpm --filter @bundlewatch/service dev`.

Source files are TypeScript that Node.js runs directly, so tests need no build step. Relative imports use the `.ts` extension, and only type syntax that can be erased is allowed (no enums or namespaces).

## Compatibility

bundlewatch runs in many CI pipelines that pin old versions, and results links live on in GitHub statuses forever. Before changing behavior, read [CONTRACT.md](CONTRACT.md):

- Anything listed there must keep working for 0.x CLIs, 0.x self-hosted services, and existing links.
- If a change is intentional, add it to [MIGRATION.md](MIGRATION.md) and to the "documented differences" in `packages/contract-tests`.
- Ports of the libraries 0.x depended on (`bytes`, `ci-env`, `glob`, `gzip-size`, `brotli-size`, `jsonpack`) are tested against the original packages. Keep those tests passing.

## Releasing the CLI

Only `packages/bundlewatch` is published to npm. Every other package, including new ones, must have `"private": true` in its `package.json`. CI fails otherwise.

One-time setup, done by an npm owner of `bundlewatch`:

1. On npmjs.com, open the package settings and add a trusted publisher:
   - GitHub Actions
   - repository `bundlewatch/bundlewatch`
   - workflow `release.yml`
   - environment `npm`
2. Then disallow publishing with tokens.
3. Create the `npm` environment in the repository settings, restricted to tags matching `v*.*.*`, with a required reviewer. Do this before `release.yml` reaches `main`: GitHub creates an unprotected environment the first time a workflow names one.
4. Add a tag ruleset so only maintainers can create `v*` tags. Otherwise anyone with push access could publish.
5. Make the first release a prerelease, such as `1.0.0-rc.1`, to check the trusted publisher setup.

For each release:

1. Update `version` in `packages/bundlewatch/package.json` and merge the change.
2. Tag the commit with that version, for example `git tag v1.0.1 && git push origin v1.0.1`.

The [release workflow](.github/workflows/release.yml) runs every check, then publishes to npm with provenance through trusted publishing. A version with a prerelease suffix, such as `1.1.0-rc.1`, is published under the `next` tag.

## Deploying

- **Service:** deploys on every change to `main` that touches it. Setup and runbook: [packages/service/README.md](packages/service/README.md).
- **Website:** deploys `packages/website` to GitHub Pages on every change merged to `main`. Moving the bundlewatch.io domain to this repository is a one-time step, described in [packages/website/README.md](packages/website/README.md).
