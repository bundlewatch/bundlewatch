import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'

import { postJson } from './http.ts'

const received: Array<{ path: string; authorization?: string | undefined }> = []
const server = createServer(async (request, response) => {
    request.resume()
    received.push({
        path: request.url ?? '',
        authorization: request.headers.authorization,
    })
    response.end('{}')
})
let url: string
before(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
after(() => new Promise<void>((resolve) => server.close(() => resolve())))

/** A local port that nothing listens on. */
const closedPort = async (): Promise<number> => {
    const probe = createServer()
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
    const { port } = probe.address() as AddressInfo
    await new Promise<void>((resolve) => probe.close(() => resolve()))
    return port
}

test('decodes URL credentials and sends Basic auth without userinfo in the path', async () => {
    const target = new URL(`${url}/store`)
    target.username = 'us%40er'
    target.password = 'p%3Ass%25word'
    await postJson(target.href, {}, {}, 1000)
    assert.deepEqual(received.at(-1), {
        path: '/store',
        authorization: `Basic ${Buffer.from('us@er:p:ss%word').toString('base64')}`,
    })
})

test('network errors do not expose request credentials or bodies', async () => {
    const port = await closedPort()
    await assert.rejects(
        postJson(
            `http://user:password@127.0.0.1:${port}`,
            { token: 'secret' },
            {},
            1000,
        ),
        (error: unknown) => {
            assert.ok(error instanceof Error)
            assert.equal(error.message, 'ECONNREFUSED')
            assert.doesNotMatch(
                JSON.stringify(error),
                /password|secret|authorization/,
            )
            return true
        },
    )
})

test('a timeout is reported as ECONNABORTED, like 0.x', async () => {
    const silent = createServer(() => {})
    await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve))
    try {
        const { port } = silent.address() as AddressInfo
        await assert.rejects(
            postJson(`http://127.0.0.1:${port}/store`, {}, {}, 200),
            { message: 'ECONNABORTED' },
        )
    } finally {
        silent.closeAllConnections()
        await new Promise<void>((resolve) => silent.close(() => resolve()))
    }
})
