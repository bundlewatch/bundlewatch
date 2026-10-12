import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, describe, test } from 'node:test'

import { GitHubStatusReporter } from './github-status.ts'

type Posted = { authorization?: string; body: Record<string, unknown> }
const posted: Posted[] = []
let apiUrl: string
let close: () => Promise<void>

before(async () => {
    const server = createServer(async (request, response) => {
        let raw = ''
        for await (const chunk of request) raw += chunk
        posted.push({
            authorization: request.headers.authorization,
            body: JSON.parse(raw),
        })
        response.writeHead(201, { 'content-type': 'application/json' })
        response.end('{}')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    close = () => new Promise((resolve) => server.close(() => resolve()))
})
after(() => close())
beforeEach(() => {
    posted.length = 0
})

const reporter = (): GitHubStatusReporter =>
    new GitHubStatusReporter({
        repoOwner: 'o',
        repoName: 'r',
        commitSha: 'sha',
        githubAccessToken: 'secret',
        apiUrl,
        userAgent: 'test',
        logger: { error: () => {}, warn: () => {} },
    })

describe('GitHubStatusReporter', () => {
    test('authenticates like 0.x', async () => {
        await reporter().start({ message: 'Checking bundlewatch...' })
        assert.equal(posted[0]?.authorization, 'token secret')
        assert.deepEqual(posted[0]?.body, {
            state: 'pending',
            description: 'Checking bundlewatch...',
            context: 'bundlewatch',
        })
    })

    test("truncates descriptions to GitHub's 140 characters", async () => {
        await reporter().error({ message: `x${'é'.repeat(200)}` })
        const description = posted[0]?.body.description as string
        assert.equal([...description].length, 140)
        assert.ok(description.endsWith('…'))
    })

    test('keeps contexts of files with the same ending apart', async () => {
        const status = reporter()
        const a = `apps/admin/build/static/js/vendors~main.chunk.js`
        const b = `apps/store/build/static/js/vendors~main.chunk.js`
        await status.fail({ message: 'a', filePath: a })
        await status.fail({ message: 'b', filePath: b })
        await status.fail({ message: 'a again', filePath: a })
        assert.deepEqual(
            posted.map(({ body }) => body.context),
            [
                'bundlewatch *build/static/js/vendors~main.chunk.js',
                'bundlewatch *build/static/js/vendors~main.chunk.js (2)',
                'bundlewatch *build/static/js/vendors~main.chunk.js',
            ],
        )
    })
})
