import assert from 'node:assert/strict'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { decodeResultsData } from '@bundlewatch/core'

import bundlewatch, { STATUSES } from './index.ts'
import {
    type RecordedRequest,
    startFakeServer,
    withEnv,
} from './test-helpers.ts'

// Ports of the 0.x Node API tests, plus the flows added in 1.0.

const fixtures = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '__fixtures__',
)
let previousCwd: string

before(() => {
    previousCwd = process.cwd()
    process.chdir(fixtures)
})
after(() => process.chdir(previousCwd))

const CI = {
    githubAccessToken: 'token',
    repoOwner: 'owner',
    repoName: 'name',
    repoCurrentBranch: 'feature',
    repoBranchBase: 'main',
    commitSha: 'sha',
}

const BASELINE = {
    './test-file-1.jpg': { size: 25000, maxSize: null, compression: 'gzip' },
    './test-file-deleted.jpg': {
        size: 10000,
        maxSize: null,
        compression: 'gzip',
    },
}

const statuses = (requests: RecordedRequest[]): unknown[] =>
    requests
        .filter((request) => request.path.startsWith('/repos/'))
        .map((request) => request.body)

describe('bundlewatch Node API', () => {
    test('works with basic options', async () => {
        const result = await withEnv({}, () =>
            bundlewatch({
                files: [{ path: './*.jpg', maxSize: '100kB' }],
                defaultCompression: 'none',
                bundlewatchServiceHost: null,
            }),
        )
        assert.deepEqual(result, {
            status: 'fail',
            fullResults: [
                {
                    baseBranchSize: 0,
                    filePath: './test-file-1.jpg',
                    maxSize: 102400,
                    message: '38.05KB < 100KB (no compression)',
                    size: 38962,
                    status: 'pass',
                },
                {
                    baseBranchSize: 0,
                    filePath: './test-file-2.jpg',
                    maxSize: 102400,
                    message: '248.79KB > 100KB (no compression)',
                    size: 254765,
                    status: 'fail',
                },
            ],
            summary: 'maxSize check failed',
            url: undefined,
        })
    })

    test('reports files that do not exist', async () => {
        const result = await withEnv({}, () =>
            bundlewatch({
                files: [
                    { path: './test-file-doesnt-exist.jpg', maxSize: '100kB' },
                ],
            }),
        )
        assert.equal(result.status, STATUSES.FAIL)
        assert.equal(result.summary, 'maxSize check failed')
        assert.deepEqual(result.fullResults, [
            {
                error: 'There is no matching file for ./test-file-doesnt-exist.jpg',
                filePath: './test-file-doesnt-exist.jpg',
                status: 'fail',
            },
        ])
        assert.ok(
            result.url?.startsWith('https://service.bundlewatch.io/results?d='),
        )
    })

    test('compares with the baseline, reports statuses and links to a short URL', async () => {
        const server = await startFakeServer({
            'POST /store/lookup': () => ({
                status: 200,
                body: { fileDetailsByPath: BASELINE },
            }),
            'POST /results': () => ({
                status: 201,
                body: { id: 'abc123', url: 'https://short.test/r/abc123' },
            }),
            'POST /repos/*': () => ({ status: 201, body: {} }),
        })
        try {
            const result = await withEnv({ GITHUB_API_URL: server.url }, () =>
                bundlewatch({
                    files: [{ path: './*.jpg', maxSize: '1MB' }],
                    bundlewatchServiceHost: server.url,
                    ci: { ...CI, repoBranchBase: 'mockBranchBase' },
                }),
            )

            assert.equal(
                result.summary,
                'Everything is in check (+262.13KB, -9.77KB, +738.3%)',
            )
            assert.equal(result.url, 'https://short.test/r/abc123')
            assert.deepEqual(
                result.fullResults.map((file) => file.message),
                [
                    '38.08KB < 1MB (13.67KB larger than mockBranchBase) (gzip)',
                    '248.46KB < 1MB (gzip)',
                    './test-file-deleted.jpg: File removed (9.77KB smaller than mockBranchBase) (gzip)',
                ],
            )

            const lookup = server.requests.find(
                (request) => request.path === '/store/lookup',
            )
            assert.deepEqual(lookup?.body, {
                repoOwner: 'owner',
                repoName: 'name',
                commitSha: 'sha',
                githubAccessToken: 'token',
                repoBranch: 'mockBranchBase',
            })
            assert.equal(
                server.requests.some((request) => request.path === '/store'),
                false,
                'feature is not a tracked branch',
            )

            const shortLink = server.requests.find(
                (request) => request.path === '/results',
            )
            assert.ok(shortLink)
            const { payload } = shortLink.body as {
                payload: { results: { fullResults: object[] } }
            }
            assert.equal(payload.results.fullResults.length, 3)
            assert.equal(
                'message' in (payload.results.fullResults[0] ?? {}),
                false,
            )

            assert.deepEqual(statuses(server.requests), [
                {
                    state: 'pending',
                    description: 'Checking bundlewatch...',
                    context: 'bundlewatch',
                },
                {
                    state: 'success',
                    target_url: 'https://short.test/r/abc123',
                    description:
                        'Everything is in check (+262.13KB, -9.77KB, +738.3%)',
                    context: 'bundlewatch',
                },
            ])
            const statusRequest = server.requests.find((request) =>
                request.path.startsWith('/repos/'),
            )
            assert.equal(statusRequest?.path, '/repos/owner/name/statuses/sha')
            assert.equal(statusRequest?.headers.authorization, 'token token')
        } finally {
            await server.close()
        }
    })

    test('saves results on tracked branches', async () => {
        const server = await startFakeServer({
            'POST /store/lookup': () => ({ status: 404 }),
            'POST /store': () => ({ status: 200, body: {} }),
            'POST /results': () => ({
                status: 201,
                body: { id: 'x', url: 'https://short.test/r/x' },
            }),
        })
        try {
            await withEnv({}, () =>
                bundlewatch({
                    files: [{ path: './test-file-1.jpg' }],
                    bundlewatchServiceHost: server.url,
                    ci: {
                        ...CI,
                        githubAccessToken: '',
                        repoCurrentBranch: 'main',
                    },
                }),
            )
            assert.equal(
                server.requests.length,
                0,
                'nothing is sent without a token',
            )

            await withEnv({}, () =>
                bundlewatch({
                    files: [{ path: './test-file-1.jpg' }],
                    bundlewatchServiceHost: server.url,
                    ci: {
                        ...CI,
                        repoCurrentBranch: 'main',
                        commitSha: 'not-reported-without-github',
                    },
                }),
            )
            const save = server.requests.find(
                (request) => request.path === '/store',
            )
            assert.deepEqual(save?.body, {
                repoOwner: 'owner',
                repoName: 'name',
                commitSha: 'not-reported-without-github',
                githubAccessToken: 'token',
                repoBranch: 'main',
                fileDetailsByPath: {
                    './test-file-1.jpg': {
                        maxSize: null,
                        size: 38995,
                        compression: 'gzip',
                    },
                },
            })
        } finally {
            await server.close()
        }
    })

    test('does not save results from pull request builds, even for a tracked head branch', async () => {
        const server = await startFakeServer({
            'POST /store/lookup': () => ({
                status: 200,
                body: { fileDetailsByPath: {} },
            }),
            'POST /store': () => ({ status: 200, body: {} }),
        })
        try {
            await withEnv({}, () =>
                bundlewatch({
                    files: [{ path: './test-file-1.jpg' }],
                    bundlewatchServiceHost: server.url,
                    ci: {
                        ...CI,
                        repoCurrentBranch: 'master',
                        isPullRequest: true,
                    },
                }),
            )
            assert.equal(
                server.requests.some((request) => request.path === '/store'),
                false,
            )
        } finally {
            await server.close()
        }
    })

    test('falls back to a long link when the service has no short links', async () => {
        const server = await startFakeServer({
            'POST /store/lookup': () => ({
                status: 200,
                body: { fileDetailsByPath: {} },
            }),
        })
        try {
            const result = await withEnv({}, () =>
                bundlewatch({
                    files: [{ path: './test-file-1.jpg' }],
                    bundlewatchServiceHost: server.url,
                    ci: CI,
                }),
            )
            assert.ok(result.url?.startsWith(`${server.url}/results?d=`))
            const data = new URL(result.url ?? '').searchParams.get('d') ?? ''
            assert.deepEqual(decodeResultsData(data), {
                details: {
                    repoOwner: 'owner',
                    repoName: 'name',
                    repoCurrentBranch: 'feature',
                    repoBranchBase: 'main',
                    commitSha: 'sha',
                },
                results: {
                    status: 'pass',
                    fullResults: [
                        {
                            filePath: './test-file-1.jpg',
                            status: 'pass',
                            size: 38995,
                            baseBranchSize: 0,
                            maxSize: null,
                        },
                    ],
                    summary: 'Everything is in check (+38.08KB, -0B)',
                },
            })
        } finally {
            await server.close()
        }
    })

    test('reports failures per file, up to five GitHub statuses', async () => {
        const server = await startFakeServer({
            'POST /repos/*': () => ({ status: 201, body: {} }),
        })
        try {
            const files = Array.from({ length: 6 }, (_, i) => ({
                path: `./missing-file-with-a-rather-long-name-${i}.js`,
            }))
            const result = await withEnv({ GITHUB_API_URL: server.url }, () =>
                bundlewatch({ files, bundlewatchServiceHost: null, ci: CI }),
            )
            assert.equal(result.status, 'fail')
            // Per-file statuses are sent concurrently, so their order varies.
            const reported = statuses(server.requests) as Record<
                string,
                unknown
            >[]
            assert.deepEqual(
                reported
                    .slice(0, 2)
                    .map((status) => [status.state, status.context]),
                [
                    ['pending', 'bundlewatch'],
                    ['failure', 'bundlewatch'],
                ],
            )
            const fileStatuses = reported.slice(2)
            assert.deepEqual(
                fileStatuses.map((status) => status.context).toSorted(),
                files
                    .slice(0, 4)
                    .map((file) => `bundlewatch *${file.path.slice(-37)}`),
            )
            for (const status of fileStatuses) {
                assert.equal(status.state, 'failure')
                assert.equal(
                    'description' in status,
                    false,
                    'errored files have no message, like 0.x',
                )
            }
        } finally {
            await server.close()
        }
    })
})
