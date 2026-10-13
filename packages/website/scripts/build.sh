#!/usr/bin/env bash
# Builds the site as it is deployed. Amplify runs this for production and for
# selected pull request previews, and CI runs it to check the site.
#
# The nav shows the latest release: the newest vX.Y.Z tag, skipping
# prereleases. release.yml only publishes tags that match the package version.
# Tags are read from GitHub rather than the checkout, which may be shallow.
set -euo pipefail

version=$(
  git ls-remote --tags --refs https://github.com/bundlewatch/bundlewatch.git 'v*' |
    sed -n 's|.*refs/tags/v\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)$|\1|p' |
    sort -t . -k 1,1n -k 2,2n -k 3,3n |
    tail -n 1
)
if [[ -z $version ]]; then
  echo "No vX.Y.Z release tag found" >&2
  exit 1
fi
echo "Latest release: $version"

BUNDLEWATCH_VERSION=$version pnpm --filter @bundlewatch/website build
