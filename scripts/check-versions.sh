#!/bin/bash

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
source "$DIR/shell-helpers.sh"

if [[ -n $CI ]]; then
    exit 0
fi

function version { echo "$@" | awk -F. '{ printf("%03d%03d%03d\n", $1,$2,$3); }'; }

DESIRED_NODE_VERSION="$(cat $DIR/../.nvmrc)"
DESIRED_YARN_VERSION="1.0.2"

NODE_VERSION=$(node --version)
YARN_VERSION=$(yarn --version)

if [ "$NODE_VERSION" != "${DESIRED_NODE_VERSION}" ];
then
    echo -e "${RED}Node version is ${NODE_VERSION}. Please use the exact version ${DESIRED_NODE_VERSION} by running:"
    echo -e "${YELLOW}>>> nvm use${NC}"
    exit 1
fi
#
#if [ "$(version "$YARN_VERSION")" !=  "$(version "$DESIRED_YARN_VERSION")" ];
#then
#    echo -e "${RED}Yarn version is ${YARN_VERSION}. Please use version ${DESIRED_YARN_VERSION}${NC}"
#    exit 2
#fi
