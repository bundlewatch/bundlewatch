import assert from 'node:assert/strict'
import { test } from 'node:test'

import { logger } from './logger.ts'
import { ServiceClient } from './service-client.ts'
import { startFakeServer } from './test-helpers.ts'

const ci = {
    repoOwner: 'o',
    repoName: 'r',
    commitSha: 'abc',
    githubAccessToken: 'token',
    repoCurrentBranch: 'main',
    repoBranchBase: 'main',
    trackBranches: ['main'],
    isPullRequest: false,
}

const files = {
    'a.js': { size: 123, maxSize: 200, compression: 'gzip' as const },
}

test('Basic-authenticated services accept lookups, saves and short links', async (t) => {
    const authorization = `Basic ${Buffer.from('us@er:p:ass').toString('base64')}`
    const server = await startFakeServer({
        'POST *': (request) => {
            if (request.headers.authorization !== authorization)
                return { status: 401 }
            return {
                status: 200,
                body:
                    request.path === '/store/lookup'
                        ? { fileDetailsByPath: files }
                        : { url: 'https://service.test/r/abc' },
            }
        },
    })
    t.after(() => server.close())
    const host = new URL(server.url)
    host.username = 'us%40er'
    host.password = 'p%3Aass'
    const client = new ServiceClient({
        bundlewatchServiceHost: host.href.replace(/\/$/, ''),
        ci,
    })
    assert.deepEqual(await client.getBaseline(), files)
    await client.saveBaseline(files)
    assert.equal(
        await client.getResultsUrl({
            status: 'pass',
            summary: 'ok',
            fullResults: [],
        }),
        'https://service.test/r/abc',
    )
    assert.deepEqual(
        server.requests.map((request) => request.path),
        ['/store/lookup', '/store', '/results'],
    )
    assert.ok(server.requests[1])
    assert.deepEqual(
        (server.requests[1].body as { fileDetailsByPath: unknown })
            .fileDetailsByPath,
        files,
    )
})

test('lookup failures redact Basic credentials from error and debug logs', async (t) => {
    const server = await startFakeServer({})
    t.after(() => server.close())
    const logs: unknown[] = []
    t.mock.method(logger, 'error', (value: unknown) => logs.push(value))
    t.mock.method(logger, 'debug', (value: unknown) => logs.push(value))
    const client = new ServiceClient({
        bundlewatchServiceHost: server.url.replace('://', '://user:password@'),
        ci,
    })
    assert.deepEqual(await client.getBaseline(), {})
    assert.doesNotMatch(logs.map(String).join('\n'), /user|password/)
    assert.match(logs.map(String).join('\n'), /code=404/)
})
