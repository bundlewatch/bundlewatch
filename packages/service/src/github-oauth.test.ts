import assert from 'node:assert/strict'
import { test } from 'node:test'

import { githubWebUrl } from './github-oauth.ts'

test('githubWebUrl derives the OAuth host from the API URL', () => {
    assert.equal(githubWebUrl('https://api.github.com'), 'https://github.com')
    assert.equal(githubWebUrl('https://api.github.com/'), 'https://github.com')
    assert.equal(
        githubWebUrl('https://api.octocorp.ghe.com'),
        'https://octocorp.ghe.com',
    )
    assert.equal(
        githubWebUrl('https://github.example.com/api/v3'),
        'https://github.example.com',
    )
    assert.equal(githubWebUrl('http://127.0.0.1:4000'), 'http://127.0.0.1:4000')
})
