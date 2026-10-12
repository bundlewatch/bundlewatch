import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'

import {
    createProject,
    LEGACY_CLI,
    NEW_CLI,
    type Outcome,
    runCli,
    startWorld,
    type World,
} from './harness.ts'

// Runs bundlewatch 0.4.2 (from npm) and the new CLI on the same project, with
// the same environment, against the same fake service and GitHub, and
// requires the same exit code, output, service requests and GitHub statuses.
// Every tolerated difference is listed in `comparable` and in MIGRATION.md.

const normalizeLine = (line: string): string =>
    line
        .replace('unavilable', 'unavailable')
        .replace('repoBranchCase', 'repoBranchBase')
        .replace('with not be saved', 'will not be saved')
        .replace('http://bundlewatch.io', 'https://bundlewatch.io')

const comparable = (outcome: Outcome): Outcome => ({
    ...outcome,
    stdout: outcome.stdout
        // 0.x logged this while saving anyway; 1.0 logs what it actually does.
        .filter((line) => !/ !== .*, no results saved$/.test(line))
        .map(normalizeLine),
    stderr: outcome.stderr
        // 0.x shortened links with Firebase Dynamic Links, which is shut down.
        .filter((line) => !line.includes('Unable to shorten URL'))
        .map(normalizeLine),
    // 1.0 first asks for a short link; this fake is a 0.x service, so it
    // answers 404 and the CLI falls back to the long link, like 0.x.
    requests: outcome.requests.filter(
        (request) =>
            !(request.target === 'service' && request.path === '/results'),
    ),
})

let world: World

before(async () => {
    assert.ok(
        existsSync(NEW_CLI),
        `Build the CLI first: pnpm --filter bundlewatch build (${NEW_CLI})`,
    )
    world = await startWorld()
})
after(() => world.close())

const both = async (
    cwd: string,
    args: string[],
    env: Record<string, string> = {},
    baseline?: Record<string, unknown>,
): Promise<{ legacy: Outcome; next: Outcome }> => {
    world.baseline = baseline
    const legacy = await runCli('legacy', world, cwd, args, env)
    const next = await runCli('new', world, cwd, args, env)
    return { legacy, next }
}

const assertSameBehavior = async (
    cwd: string,
    args: string[],
    env: Record<string, string> = {},
    baseline?: Record<string, unknown>,
): Promise<Outcome> => {
    const { legacy, next } = await both(cwd, args, env, baseline)
    assert.deepEqual(comparable(next), comparable(legacy))
    return comparable(next)
}

const ciEnv = (
    overrides: Record<string, string> = {},
): Record<string, string> => ({
    CI: 'true',
    CI_REPO_OWNER: 'owner',
    CI_REPO_NAME: 'repo',
    CI_COMMIT_SHA: 'abc123',
    CI_BRANCH: 'master',
    BUNDLEWATCH_GITHUB_TOKEN: 'token',
    ...overrides,
})

const saves = (outcome: Outcome): number =>
    outcome.requests.filter((request) => request.path === '/store').length

const savedBranch = (outcome: Outcome): string | undefined =>
    (
        outcome.requests.find((request) => request.path === '/store')?.body as
            | { repoBranch?: string }
            | undefined
    )?.repoBranch

/** The distinct commit-status endpoints a run posted to. */
const statusPaths = (outcome: Outcome): string[] => [
    ...new Set(
        outcome.requests
            .filter((request) => request.target === 'github')
            .map((request) => request.path),
    ),
]

const BASELINE = {
    './images/test-file-1.jpg': {
        size: 25000,
        maxSize: null,
        compression: 'gzip',
    },
    './images/deleted.jpg': {
        size: 10000,
        maxSize: 102400,
        compression: 'gzip',
    },
}

describe('same behavior as bundlewatch 0.4.2', () => {
    test('package.json configuration, failing maxSize, no CI', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [
                        {
                            path: './images/*.jpg',
                            maxSize: '100kB',
                            compression: 'none',
                        },
                    ],
                },
            }),
        })
        const outcome = await assertSameBehavior(cwd, [])
        assert.equal(outcome.status, 1)
    })

    test('package.json array of files', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: [
                    { path: './images/test-file-1.jpg', maxSize: '1MB' },
                ],
            }),
        })
        const outcome = await assertSameBehavior(cwd, [])
        assert.equal(outcome.status, 0)
    })

    test('CLI globs with --max-size, --compression and --normalize', async () => {
        const cwd = createProject({ 'dist/main.abc123.js': 'x'.repeat(5000) })
        await assertSameBehavior(cwd, [
            '--max-size',
            '1MB',
            '--compression',
            'brotli',
            '--normalize',
            '^.+?(\\..+?)\\.\\w+$',
            './dist/*.js',
            './images/*.jpg',
        ])
    })

    test('--config JSON file with every option', async () => {
        const cwd = createProject({
            'config.json': JSON.stringify({
                files: [
                    { path: './images/test-file-1.jpg', maxSize: '50kB' },
                    { path: 'images/test-file-2.jpg', compression: 'none' },
                    { path: './missing/*.js', maxSize: '1kB' },
                ],
                defaultCompression: 'gzip',
                normalizeFilenames: '^.+?(\\..+?)\\.\\w+$',
            }),
        })
        const outcome = await assertSameBehavior(cwd, [
            '--config',
            'config.json',
        ])
        assert.equal(outcome.status, 1)
    })

    test('--config CommonJS file', async () => {
        const cwd = createProject({
            'bundlewatch.config.js': `module.exports = { files: [{ path: './images/*.jpg', maxSize: '1MB' }] }`,
        })
        await assertSameBehavior(cwd, ['--config', 'bundlewatch.config.js'])
    })

    test('no configuration', async () => {
        const cwd = createProject({ 'package.json': '{}' })
        const outcome = await assertSameBehavior(cwd, [])
        assert.equal(outcome.status, 1)
    })

    test('CI build on a tracked branch: compares, saves the baseline, reports statuses', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [{ path: './images/*.jpg', maxSize: '1MB' }],
                    bundlewatchServiceHost: world.url,
                },
            }),
        })
        const outcome = await assertSameBehavior(cwd, [], ciEnv(), BASELINE)
        assert.deepEqual(
            outcome.requests.map(
                (request) => `${request.target} ${request.path}`,
            ),
            [
                'github /repos/owner/repo/statuses/abc123',
                'service /store/lookup',
                'service /store',
                'github /repos/owner/repo/statuses/abc123',
            ],
        )
    })

    test('CI build on an untracked branch with a configured base', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [{ path: './images/*.jpg', maxSize: '1MB' }],
                    bundlewatchServiceHost: world.url,
                },
            }),
        })
        await assertSameBehavior(
            cwd,
            [],
            ciEnv({ CI_BRANCH: 'feature', CI_BRANCH_BASE: 'release' }),
            BASELINE,
        )
    })

    test('CI build with failures reports one status per failing file, at most five', async () => {
        const files = Array.from({ length: 6 }, (_, i) => ({
            path: `./missing/a-file-with-a-long-enough-name-${i}.js`,
        }))
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [
                        ...files,
                        { path: './images/*.jpg', maxSize: '10kB' },
                    ],
                    bundlewatchServiceHost: world.url,
                },
            }),
        })
        const outcome = await assertSameBehavior(
            cwd,
            [],
            ciEnv({ CI_BRANCH: 'feature' }),
            BASELINE,
        )
        assert.equal(outcome.status, 1)
    })

    test('GitHub Actions push build', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [{ path: './images/*.jpg', maxSize: '1MB' }],
                    bundlewatchServiceHost: world.url,
                },
            }),
        })
        await assertSameBehavior(
            cwd,
            [],
            {
                GITHUB_ACTION: 'run',
                GITHUB_REPOSITORY: 'owner/repo',
                GITHUB_SHA: 'abc123',
                GITHUB_EVENT_NAME: 'push',
                GITHUB_REF: 'refs/heads/master',
                BUNDLEWATCH_GITHUB_TOKEN: 'token',
            },
            BASELINE,
        )
    })

    test('Travis pull request build', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [{ path: './images/*.jpg', maxSize: '1MB' }],
                    bundlewatchServiceHost: world.url,
                },
            }),
        })
        await assertSameBehavior(
            cwd,
            [],
            {
                TRAVIS: 'true',
                TRAVIS_REPO_SLUG: 'owner/repo',
                TRAVIS_COMMIT: 'abc123',
                TRAVIS_PULL_REQUEST_SHA: 'def456',
                TRAVIS_EVENT_TYPE: 'pull_request',
                TRAVIS_BRANCH: 'master',
                TRAVIS_PULL_REQUEST_BRANCH: 'feature',
                TRAVIS_PULL_REQUEST: '7',
                GITHUB_ACCESS_TOKEN: 'token',
            },
            BASELINE,
        )
    })

    test('service disabled with bundlewatchServiceHost: null', async () => {
        const cwd = createProject({
            'config.json': JSON.stringify({
                files: [{ path: './images/*.jpg' }],
                bundlewatchServiceHost: null,
            }),
        })
        const { legacy, next } = await both(
            cwd,
            ['--config', 'config.json'],
            ciEnv(),
        )
        // 0.x still printed a link to "null/results?d=…"; 1.0 prints none.
        const legacyStdout = comparable(legacy).stdout
        const link = legacyStdout.findIndex((line) =>
            line.startsWith('Result breakdown at:'),
        )
        assert.ok(link > 0)
        legacyStdout.splice(link - 1, 2)
        assert.deepEqual(comparable(next).stdout, legacyStdout)
        assert.equal(next.status, legacy.status)
    })
})

/** A project that checks the fixture images against the fake service. */
const trackedProject = (): string =>
    createProject({
        'package.json': JSON.stringify({
            bundlewatch: {
                files: [{ path: './images/*.jpg', maxSize: '1MB' }],
                bundlewatchServiceHost: world.url,
            },
        }),
    })

describe('same behavior as bundlewatch 0.4.2: reviewed regressions', () => {
    test('Netlify production builds save the baseline', async () => {
        const outcome = await assertSameBehavior(
            trackedProject(),
            [],
            {
                NETLIFY: 'true',
                REPOSITORY_URL: 'https://x@github.com/owner/repo',
                COMMIT_REF: 'abc123',
                HEAD: 'master',
                PULL_REQUEST: 'false',
                BUNDLEWATCH_GITHUB_TOKEN: 'token',
            },
            BASELINE,
        )
        assert.equal(saves(outcome), 1)
    })

    test('CircleCI builds of a branch with an open pull request save the baseline', async () => {
        const outcome = await assertSameBehavior(
            trackedProject(),
            [],
            {
                CIRCLECI: 'true',
                CIRCLE_PROJECT_USERNAME: 'owner',
                CIRCLE_PROJECT_REPONAME: 'repo',
                CIRCLE_SHA1: 'abc123',
                CIRCLE_BRANCH: 'develop',
                CI_PULL_REQUEST: 'https://github.com/owner/repo/pull/5',
                BUNDLEWATCH_GITHUB_TOKEN: 'token',
            },
            BASELINE,
        )
        assert.equal(saves(outcome), 1)
    })

    test('a trailing --max-size without a value means no limit', async () => {
        const outcome = await assertSameBehavior(createProject(), [
            './images/*.jpg',
            '--max-size',
        ])
        assert.equal(outcome.status, 0)
    })

    test('an ES module config with only named exports', async () => {
        const cwd = createProject({
            'config.mjs': `export const files = [{ path: './images/*.jpg', maxSize: '100kB' }]`,
        })
        const outcome = await assertSameBehavior(cwd, [
            '--config',
            'config.mjs',
        ])
        assert.equal(outcome.status, 1)
    })

    test('piped output in CI has no color codes', () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: { files: [{ path: './images/*.jpg' }] },
            }),
        })
        for (const cli of [LEGACY_CLI, NEW_CLI]) {
            const { stdout, stderr } = spawnSync(process.execPath, [cli], {
                cwd,
                env: {
                    PATH: process.env.PATH ?? '',
                    HOME: cwd,
                    CI: 'true',
                    GITHUB_ACTIONS: 'true',
                    https_proxy: world.url,
                },
                encoding: 'utf8',
            })
            assert.ok(stdout.includes('bundlewatch PASS'), `${cli}: ${stdout}`)
            assert.ok(!`${stdout}${stderr}`.includes('\u001b['), cli)
        }
    })
})

const tenByteProject = (maxSize: number | string): string =>
    createProject({
        'bundle.js': '0123456789',
        'package.json': JSON.stringify({
            bundlewatch: {
                files: [{ path: 'bundle.js', maxSize, compression: 'none' }],
            },
        }),
    })

describe('documented differences (MIGRATION.md)', () => {
    test('a run with missing files does not try to save a baseline', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [
                        { path: './images/*.jpg' },
                        { path: './missing.js' },
                    ],
                    bundlewatchServiceHost: world.url,
                },
            }),
        })
        const { legacy, next } = await both(cwd, [], ciEnv(), BASELINE)
        // A 0.x service rejects such a baseline with 422, so nothing was saved.
        assert.equal(saves(legacy), 1)
        assert.equal(saves(next), 0)
        assert.ok(
            next.stdout.includes(
                '[INFO] Some files could not be measured, no results saved',
            ),
        )
    })

    test('no package.json no longer crashes (bundlewatch#434)', async () => {
        const cwd = createProject({ 'package.json': null })
        const { legacy, next } = await both(cwd, ['./images/*.jpg'])
        assert.ok(legacy.stderr.includes('[FATAL] Uncaught exception'))
        assert.equal(legacy.status, 1)
        assert.equal(next.status, 0)
    })

    test('a pull request whose head branch is tracked no longer overwrites the baseline', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [{ path: './images/*.jpg' }],
                    bundlewatchServiceHost: world.url,
                },
            }),
        })
        const { legacy, next } = await both(
            cwd,
            [],
            {
                GITHUB_ACTION: 'run',
                GITHUB_REPOSITORY: 'owner/repo',
                GITHUB_SHA: 'abc123',
                GITHUB_EVENT_NAME: 'pull_request',
                GITHUB_REF: 'refs/pull/9/merge',
                GITHUB_HEAD_REF: 'master',
                GITHUB_BASE_REF: 'master',
                BUNDLEWATCH_GITHUB_TOKEN: 'token',
            },
            BASELINE,
        )
        assert.equal(saves(legacy), 1)
        assert.equal(saves(next), 0)
    })

    test('branch names with slashes are kept on GitHub Actions', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [{ path: './images/*.jpg' }],
                    bundlewatchServiceHost: world.url,
                    ci: { trackBranches: ['release/1.x'] },
                },
            }),
        })
        const { legacy, next } = await both(
            cwd,
            [],
            {
                GITHUB_ACTION: 'run',
                GITHUB_REPOSITORY: 'owner/repo',
                GITHUB_SHA: 'abc123',
                GITHUB_EVENT_NAME: 'push',
                GITHUB_REF: 'refs/heads/release/1.x',
                BUNDLEWATCH_GITHUB_TOKEN: 'token',
            },
            BASELINE,
        )
        assert.equal(
            savedBranch(legacy),
            undefined,
            '0.x saw the branch as "release"',
        )
        assert.equal(savedBranch(next), 'release/1.x')
    })

    test('GitHub Actions pull request statuses go to the head commit', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [{ path: './images/*.jpg' }],
                    bundlewatchServiceHost: world.url,
                },
            }),
        })
        const eventPath = path.join(cwd, 'event.json')
        writeFileSync(
            eventPath,
            JSON.stringify({
                repository: { default_branch: 'main' },
                pull_request: { head: { sha: 'head-sha' } },
            }),
        )
        const { legacy, next } = await both(
            cwd,
            [],
            {
                GITHUB_ACTIONS: 'true',
                GITHUB_ACTION: 'run',
                GITHUB_REPOSITORY: 'owner/repo',
                GITHUB_SHA: 'merge-sha',
                GITHUB_EVENT_NAME: 'pull_request',
                GITHUB_EVENT_PATH: eventPath,
                GITHUB_REF: 'refs/pull/9/merge',
                GITHUB_HEAD_REF: 'feature',
                GITHUB_BASE_REF: 'main',
                BUNDLEWATCH_GITHUB_TOKEN: 'token',
            },
            BASELINE,
        )
        // The merge commit's statuses never show on the pull request.
        assert.deepEqual(statusPaths(legacy), [
            '/repos/owner/repo/statuses/merge-sha',
        ])
        assert.deepEqual(statusPaths(next), [
            '/repos/owner/repo/statuses/head-sha',
        ])
    })

    test('a numeric maxSize is enforced', async () => {
        const cwd = createProject({
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [
                        { path: './images/test-file-2.jpg', maxSize: 1024 },
                    ],
                },
            }),
        })
        const { legacy, next } = await both(cwd, [])
        assert.equal(legacy.status, 0, '0.x ignored numeric limits')
        assert.equal(next.status, 1)
    })

    test('a maxSize of 0 means no limit, numeric or string', async () => {
        // 0.x passed too, but printed the numeric 0 as "< 0".
        const numeric = await both(tenByteProject(0), [])
        assert.equal(numeric.legacy.status, 0)
        assert.equal(numeric.next.status, 0)
        assert.ok(
            numeric.next.stdout.includes(
                'PASS bundle.js: 10B < Infinity (no compression)',
            ),
        )
        const outcome = await assertSameBehavior(tenByteProject('0B'), [])
        assert.equal(outcome.status, 0)
    })

    test('a file named __proto__ is measured (0.x lost it and passed)', async () => {
        const cwd = createProject({
            ['__proto__']: '0123456789',
            'package.json': JSON.stringify({
                bundlewatch: {
                    files: [
                        {
                            path: '__proto__',
                            maxSize: '1B',
                            compression: 'none',
                        },
                    ],
                },
            }),
        })
        const { legacy, next } = await both(cwd, [])
        assert.equal(legacy.status, 0)
        assert.ok(legacy.stdout.includes('bundlewatch PASS'))
        assert.equal(next.status, 1)
        assert.ok(
            next.stdout.includes('FAIL __proto__: 10B > 1B (no compression)'),
        )
    })
})

describe('proxies and authenticated self-hosted services', () => {
    // A documented 1.0 change: 0.x picked up proxy variables only as a side
    // effect of axios, and never documented them.
    test('proxy variables are no longer read', async () => {
        const cwd = createProject({
            'config.json': JSON.stringify({
                files: [{ path: './images/*.jpg', maxSize: '1MB' }],
                bundlewatchServiceHost: 'http://service.invalid',
            }),
        })
        const { legacy, next } = await both(
            cwd,
            ['--config', 'config.json'],
            ciEnv({ HTTP_PROXY: world.url, http_proxy: world.url }),
            BASELINE,
        )
        assert.equal(
            saves(legacy),
            1,
            '0.x reached the service through the proxy',
        )
        assert.equal(saves(next), 0)
        assert.equal(next.status, 0, 'an unreachable service never fails a run')
    })

    test('URL Basic auth works for lookup and saving', async () => {
        const host = new URL(world.url)
        host.username = 'user'
        host.password = 'pass'
        const cwd = createProject({
            'config.json': JSON.stringify({
                files: [{ path: './images/*.jpg', maxSize: '1MB' }],
                bundlewatchServiceHost: host.href.replace(/\/$/, ''),
            }),
        })
        world.authorizations = []
        try {
            const outcome = await assertSameBehavior(
                cwd,
                ['--config', 'config.json'],
                ciEnv(),
                BASELINE,
            )
            assert.equal(outcome.status, 0)
            assert.equal(saves(outcome), 1)
            // Legacy lookup/save and new lookup/save/short-link request.
            assert.equal(
                world.authorizations.filter(
                    (auth) => auth === 'Basic dXNlcjpwYXNz',
                ).length,
                5,
            )
        } finally {
            delete world.authorizations
        }
    })
})

describe('reserved repository, branch and file names', () => {
    for (const name of [
        'constructor',
        'toString',
        '__proto__',
        'hasOwnProperty',
    ]) {
        test(`old and new CLIs produce usable long links for ${name}`, async () => {
            const cwd = createProject({
                'bundle.js': 'bundle',
                'config.json': JSON.stringify({
                    files: [{ path: 'bundle.js', maxSize: '1MB' }],
                    bundlewatchServiceHost: world.url,
                }),
            })
            const outcome = await assertSameBehavior(
                cwd,
                ['--config', 'config.json'],
                ciEnv({
                    CI_REPO_NAME: name,
                    CI_BRANCH: name,
                    CI_BRANCH_BASE: name,
                    BUNDLEWATCH_GITHUB_TOKEN: '',
                }),
            )
            assert.equal(outcome.status, 0)
        })
    }

    test('documented difference: reserved baseline filenames are reported as removed', async () => {
        const cwd = createProject({
            'config.json': JSON.stringify({
                files: [{ path: './images/*.jpg', maxSize: '1MB' }],
                bundlewatchServiceHost: world.url,
            }),
        })
        const { legacy, next } = await both(
            cwd,
            ['--config', 'config.json'],
            ciEnv(),
            {
                constructor: { size: 100, maxSize: 200, compression: 'none' },
            },
        )
        assert.equal(legacy.status, 0)
        assert.equal(next.status, 0)
        assert.ok(
            legacy.stdout.some((line) => line.includes('PASS constructor:')),
        )
        assert.ok(
            next.stdout.some((line) =>
                line.includes('constructor: File removed'),
            ),
        )
    })
})
