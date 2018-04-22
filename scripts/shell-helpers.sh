#!/bin/bash

# Constants
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
run () {
  if [ -z "$1" ]
  then
    echo -e "${RED}ERROR: function run() requires a command to execute${NC}"
    return 1
  fi

  echo -e "${GREEN}>>> ${1}${NC}"
  eval $1

  if [ "$?" -ne "0" ]
  then
    echo -e "${RED}>>> Command Failed. Exiting Now${NC}"
    exit 1
  fi

  return 0
}
