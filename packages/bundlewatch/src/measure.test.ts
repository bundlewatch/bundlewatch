import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'

import { compressedSize, globFiles, measureFiles } from './measure.ts'

const require = createRequire(import.meta.url)
const gzipSize6: { sync: (data: Buffer) => number } = require('gzip-size')
const brotliSize4: { sync: (data: Buffer) => number } = require('brotli-size')

const FILES = [
    'dist/a.js',
    'dist/B.js',
    'dist/c.min.js',
    'dist/10.js',
    'dist/2.js',
    'dist/ä.js',
    'dist/main.abc123.js',
    'dist/sub/x.js',
    'dist/sub/deep/y.js',
    'dist/with space/s.js',
    'dist/.dot/d.js',
    'dist/.e.js',
    '.hidden/h.js',
    'README.md',
    'empty.txt',
    '__proto__',
    'dist/__proto__',
]

let root: string
let previousCwd: string

before(() => {
    previousCwd = process.cwd()
    root = mkdtempSync(path.join(tmpdir(), 'bundlewatch-measure-'))
    for (const file of FILES) {
        mkdirSync(path.join(root, path.dirname(file)), { recursive: true })
        writeFileSync(
            path.join(root, file),
            file === 'empty.txt' ? '' : `${file}\n`.repeat(50),
        )
    }
    mkdirSync(path.join(root, 'dist/dir.js'))
    mkdirSync(path.join(root, 'pages'))
    writeFileSync(path.join(root, 'pages/[id]-page.js'), 'x')
    symlinkSync(path.join(root, 'dist/sub'), path.join(root, 'dist/linked'))
    process.chdir(root)
})

after(() => process.chdir(previousCwd))

describe('globFiles', () => {
    // Cases where Node's fs.globSync, tried first, differed from 0.x.
    test('keeps the pattern prefix in the keys, sorted like 0.x', () => {
        assert.deepEqual(globFiles('./dist/?.js'), [
            './dist/2.js',
            './dist/a.js',
            './dist/ä.js',
            './dist/B.js',
        ])
        assert.deepEqual(globFiles('./dist//a.js'), ['./dist/a.js'])
    })

    test('honours backslash escapes, e.g. Next.js dynamic routes', () => {
        assert.deepEqual(globFiles('./pages/\\[id\\]-*.js'), [
            './pages/[id]-page.js',
        ])
    })

    test('lists files inside symlinked directories', () => {
        assert.deepEqual(globFiles('./dist/linked/*.js'), [
            './dist/linked/x.js',
        ])
        assert.ok(globFiles('./dist/**/*.js').includes('./dist/linked/x.js'))
    })

    test('matches dot directories when the pattern names them', () => {
        assert.deepEqual(globFiles('**/.hidden/*.js'), ['.hidden/h.js'])
    })
})

describe('compressedSize', () => {
    test('matches gzip-size@6 and brotli-size@4', () => {
        const samples = [
            Buffer.alloc(0),
            Buffer.from('a'),
            Buffer.from('hello world '.repeat(1000)),
            randomBytes(1),
            randomBytes(70_000),
            Buffer.from(
                JSON.stringify(
                    Array.from({ length: 2000 }, (_, i) => ({
                        i,
                        s: `item-${i}`,
                    })),
                ),
            ),
        ]
        for (const sample of samples) {
            assert.equal(compressedSize(sample, 'gzip'), gzipSize6.sync(sample))
            assert.equal(
                compressedSize(sample, 'brotli'),
                brotliSize4.sync(sample),
            )
            assert.equal(compressedSize(sample, 'none'), sample.byteLength)
        }
    })
})

describe('measureFiles', () => {
    test('measures, normalizes and reports errors like 0.x', () => {
        const details = measureFiles({
            files: [
                { path: './dist/main.*.js', maxSize: '1kB' },
                { path: './dist/a.js', maxSize: '100' },
                { path: './dist/dir.js' },
                { path: './missing/*.js', maxSize: '1kB' },
            ],
            defaultCompression: 'none',
            normalizeFilenames: /^.+?(\..+?)\.\w+$/,
        })
        assert.deepEqual(details, {
            './dist/main.js': {
                maxSize: 1024,
                size: 1000,
                compression: 'none',
            },
            './dist/a.js': { maxSize: 100, size: 500, compression: 'none' },
            './dist/dir.js': { error: 'Could not read file ./dist/dir.js' },
            './missing/*.js': {
                error: 'There is no matching file for ./missing/*.js',
            },
        })
    })

    test('measures empty files as 0 bytes', () => {
        const details = measureFiles({
            files: [{ path: './empty.txt' }],
            defaultCompression: 'none',
            normalizeFilenames: null,
        })
        assert.deepEqual(details['./empty.txt'], {
            maxSize: Number.POSITIVE_INFINITY,
            size: 0,
            compression: 'none',
        })
    })

    test('accepts a numeric maxSize (0.x ignored it)', () => {
        const details = measureFiles({
            files: [{ path: './dist/a.js', maxSize: 512 }],
            defaultCompression: 'gzip',
            normalizeFilenames: null,
        })
        assert.equal(
            (details['./dist/a.js'] as { maxSize: number }).maxSize,
            512,
        )
    })

    test('treats a zero or unparseable maxSize as no limit, like 0.x', () => {
        for (const maxSize of [0, '0', '0B', '0kb', 'lots', Number.NaN]) {
            const details = measureFiles({
                files: [{ path: './dist/a.js', maxSize }],
                defaultCompression: 'gzip',
                normalizeFilenames: null,
            })
            assert.equal(
                (details['./dist/a.js'] as { maxSize: number }).maxSize,
                Number.POSITIVE_INFINITY,
            )
        }
    })

    // 0.x assigned into a plain object, so these entries vanished and the
    // run passed.
    test('keeps files whose key is __proto__', () => {
        const options = { defaultCompression: 'none', normalizeFilenames: null }
        const present = measureFiles({
            ...options,
            files: [{ path: '__proto__', maxSize: '1B' }],
        })
        assert.deepEqual(Object.keys(present), ['__proto__'])
        assert.deepEqual(Object.getPrototypeOf(present), Object.prototype)
        assert.deepEqual(present['__proto__'], {
            maxSize: 1,
            size: 500,
            compression: 'none',
        })

        process.chdir(path.join(root, 'dist/sub'))
        try {
            const missing = measureFiles({
                ...options,
                files: [{ path: '__proto__' }],
            })
            assert.deepEqual(Object.keys(missing), ['__proto__'])
        } finally {
            process.chdir(root)
        }

        const normalized = measureFiles({
            defaultCompression: 'none',
            normalizeFilenames: /__proto__/,
            files: [{ path: 'dist/__proto__' }],
        })
        assert.deepEqual(Object.keys(normalized), ['__proto__'])
    })
})
