import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, test } from 'node:test'

import { mergeConfig, resolveConfig } from './config.ts'
import { ValidationError } from './errors.ts'
import { withEnv } from './test-helpers.ts'

describe('mergeConfig', () => {
    test('merges objects deeply and skips undefined values', () => {
        assert.deepEqual(
            mergeConfig(
                { a: 1, ci: { x: 1, y: 2 } },
                { a: undefined, ci: { y: 3 } },
            ),
            {
                a: 1,
                ci: { x: 1, y: 3 },
            },
        )
    })

    test('replaces arrays instead of merging them by index', () => {
        assert.deepEqual(
            mergeConfig(
                { list: ['master', 'main', 'develop'] },
                { list: ['release'] },
            ),
            {
                list: ['release'],
            },
        )
    })

    test('keeps non-plain objects as they are', () => {
        const pattern = /x/
        assert.equal(
            mergeConfig({ normalize: null }, { normalize: pattern }).normalize,
            pattern,
        )
    })
})

describe('resolveConfig', () => {
    test('applies the 1.0 defaults', async () => {
        const config = await withEnv({}, () =>
            resolveConfig({ files: [{ path: 'a.js' }] }),
        )
        assert.equal(config.defaultCompression, 'gzip')
        assert.equal(
            config.bundlewatchServiceHost,
            'https://service.bundlewatch.io',
        )
        assert.equal(config.normalizeFilenames, null)
        assert.equal(config.ci.repoBranchBase, 'master')
        assert.deepEqual(config.ci.trackBranches, ['master', 'main', 'develop'])
        assert.equal(config.ci.isPullRequest, false)
    })

    test('uses the detected GitHub default branch as base and tracks it', async () => {
        const eventPath = path.join(
            mkdtempSync(path.join(tmpdir(), 'bundlewatch-config-')),
            'event.json',
        )
        writeFileSync(
            eventPath,
            JSON.stringify({ repository: { default_branch: 'trunk' } }),
        )
        const config = await withEnv(
            {
                GITHUB_ACTIONS: 'true',
                GITHUB_ACTION: 'run',
                GITHUB_EVENT_NAME: 'push',
                GITHUB_REF: 'refs/heads/trunk',
                GITHUB_REPOSITORY: 'o/r',
                GITHUB_SHA: 'sha',
                GITHUB_EVENT_PATH: eventPath,
            },
            () => resolveConfig({ files: [] }),
        )
        assert.equal(config.ci.repoBranchBase, 'trunk')
        assert.equal(config.ci.repoCurrentBranch, 'trunk')
        assert.deepEqual(config.ci.trackBranches, [
            'master',
            'main',
            'develop',
            'trunk',
        ])
    })

    test('prefers the pull request target over the default branch', async () => {
        const config = await withEnv(
            {
                GITHUB_ACTION: 'run',
                GITHUB_EVENT_NAME: 'pull_request',
                GITHUB_REF: 'refs/pull/1/merge',
                GITHUB_HEAD_REF: 'feature',
                GITHUB_BASE_REF: 'release',
            },
            () => resolveConfig({ files: [] }),
        )
        assert.equal(config.ci.repoBranchBase, 'release')
        assert.equal(config.ci.isPullRequest, true)
    })

    test('lets configuration override detected values', async () => {
        const config = await withEnv({ CI_BRANCH_BASE: 'detected' }, () =>
            resolveConfig({
                files: [],
                ci: {
                    repoBranchBase: 'configured',
                    trackBranches: ['configured'],
                },
            }),
        )
        assert.equal(config.ci.repoBranchBase, 'configured')
        assert.deepEqual(config.ci.trackBranches, ['configured'])
    })

    test('turns a normalizeFilenames string into a RegExp', async () => {
        const config = await withEnv({}, () =>
            resolveConfig({
                files: [],
                normalizeFilenames: '^.+?(\\..+?)\\.\\w+$',
            }),
        )
        assert.ok(config.normalizeFilenames instanceof RegExp)
    })

    test('rejects invalid configuration', async () => {
        const invalid = [
            { files: 'dist/*.js' },
            { files: [{ maxSize: '1kB' }] },
            { files: [], defaultCompression: 'zip' },
            { files: [], normalizeFilenames: '(' },
            { files: [], ci: { trackBranches: 'main' } },
        ]
        await withEnv({}, () => {
            for (const config of invalid) {
                assert.throws(
                    () => resolveConfig(config as never),
                    (error: unknown) =>
                        error instanceof ValidationError &&
                        error.type === 'ValidationError',
                    JSON.stringify(config),
                )
            }
        })
    })
})
