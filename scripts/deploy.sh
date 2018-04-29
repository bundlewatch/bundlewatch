#!/bin/bash -e

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
source "$DIR/shell-helpers.sh"

version=$(git describe --tags)
version=$( echo $version | cut -d 'v' -f 2 )

# 0.0.35 6 char max
version=0.1.1

echo "${version} appears to be a release tag"
echo "Deploying...."

echo '//registry.npmjs.org/:_authToken=${NPM_PUBLISH_TOKEN}' > .npmrc

PACKAGE_VERSION_JSON=package.json
PACKAGE_VERSION_NPM=@bundlesize/bundlesize

jq ".version=\"$version\"" $PACKAGE_VERSION_JSON > $PACKAGE_VERSION_JSON.tmp
mv $PACKAGE_VERSION_JSON.tmp $PACKAGE_VERSION_JSON

#cat $PACKAGE_VERSION_JSON

run "npm publish --access public"

echo "Deployed!"
