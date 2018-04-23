#!/bin/bash -e

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
source "$DIR/shell-helpers.sh"

echo '//registry.npmjs.org/:_authToken=${NPM_PUBLISH_TOKEN}' > .npmrc

PACKAGE_VERSION_JSON=package.json
PACKAGE_VERSION_NPM=@bundlesize/bundlesize

echo "Determining version to publish..."
#last_published_version="$(npm view $PACKAGE_VERSION_NPM version)"
last_published_version=0.0.0
echo "Last published version is $last_published_version"

packaged_version="$(jq '.version' --raw-output $PACKAGE_VERSION_JSON)"
echo "Version in package.json is $packaged_version"

new_version=$last_published_version
set +e
vercomp $packaged_version $last_published_version
if [ $? -eq 1 ]; then
    echo 'Packaged version is greater. Taking packaged version'
    new_version=$packaged_version
fi
set -e

echo "Incrementing version $new_version"
new_version="$(echo "${new_version%.*}.$((${new_version##*.}+1))")"
new_version_with_v="v$new_version"
echo "New version with v is $new_version_with_v"
echo "Version to publish is $new_version\n\n"

run "npm publish --access public"
