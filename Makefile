ARTIFACT_DIR = artifacts

SHELL := /bin/bash -eo pipefail
export PATH := $(shell yarn bin):$(PATH)

ifdef CI
    ESLINT_ARGS=--format junit --output-file $(ARTIFACT_DIR)/test_results/eslint/eslint.junit.xml
	JEST_ENV_VARIABLES=JEST_SUITE_NAME="Jest Tests" JEST_JUNIT_OUTPUT=$(ARTIFACT_DIR)/test_results/jest/jest.junit.xml
    JEST_EXTRA_ARGS=--testResultsProcessor ./node_modules/jest-junit --coverageReporters=text-lcov | coveralls
    YARN_ARGS=--frozen-lockfile
else
    ESLINT_ARGS=
    JEST_ENV_VARIABLES=
    YARN_ARGS=
endif


.PHONY: help
help:
	@echo "--------------------- Useful Commands for Development ----------------------"
	@echo "make help                            - show this help message"
	@echo "make install                         - install dependencies, blows up node_modules"
	@echo "make bundlewatch                      - runs the bundlewatch command in the project"
	@echo "make test                            - runs test"
	@echo "make test-watch                      - watches test"
	@echo "make test-snapshots                  - runs test and overwrites snapshots"
	@echo "make lint                            - runs eslint"
	@echo "make lint-fix                        - attempts to autofix linting errors"
	@echo "make watch                           - babelize locally for development"
	@echo "make package                         - package (babelize) bundlewatch ready for distribution"

# ---- Installing, Building and Running ----

.PHONY: install
install: check-versions clean node_modules

.PHONY: bundlewatch
bundlewatch: package check-versions node_modules
	./lib/bin/index.js ${FLAGS}

ifndef CI
.PHONY: package
endif
package: check-versions node_modules ${ARTIFACT_DIR}
	rm -rf lib
	babel src --out-dir=lib --copy-files --no-copy-ignored --ignore **/*.test.js
	npm pack
	mv *.tgz artifacts/

# -------------- Testing and Linting --------------

.PHONY: test
test: check-versions node_modules ${ARTIFACT_DIR}
	${JEST_ENV_VARIABLES} jest ${JEST_EXTRA_ARGS}

.PHONY: test-snapshots
test-snapshots: check-versions node_modules ${ARTIFACT_DIR}
	${JEST_ENV_VARIABLES} jest -u ${JEST_EXTRA_ARGS}

.PHONY: test-watch
test-watch: check-versions node_modules
	jest --watch

.PHONY: lint
lint: check-versions node_modules ${ARTIFACT_DIR}
	eslint ${ESLINT_ARGS} .

.PHONY: lint-fix
lint-fix: check-versions node_modules
	eslint --fix .

# --------------- CI Scripts -----------------

.PHONY: deploy
deploy:
	./scripts/deploy.sh

# ----------------- Helpers ------------------

.PHONY: check-versions
check-versions:
	@./scripts/check-versions.sh

.PHONY: clean
clean:
	rm -rf ${ARTIFACT_DIR}
	rm -rf node_modules

${ARTIFACT_DIR}:
	mkdir -p ${ARTIFACT_DIR}/test_results/eslint

node_modules:
	yarn install ${YARN_ARGS}
	touch node_modules
