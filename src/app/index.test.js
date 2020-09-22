import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

const networkMock = new MockAdapter(axios)

import bundlewatchApi from '.'

describe(`bundlewatch Node API`, () => {
    it('Works with basic options', async () => {
        const result = await bundlewatchApi({
            files: [
                {
                    path: './__testdata__/*.jpg',
                    maxSize: '100kB',
                },
            ],
            defaultCompression: 'none',
        })

        // TODO: assert logger.warn called

        delete result.url
        expect(result).toMatchSnapshot()
    })

    it(`Works when files dont exist, shows warning`, async () => {
        const result = await bundlewatchApi({
            files: [
                {
                    path: './__testdata__/test-file-doesnt-exist.jpg',
                    maxSize: '100kB',
                },
            ],
        })

        delete result.url
        expect(result).toMatchSnapshot()
    })

    it('Works with CI environment', async () => {
        const MOCK_AUTH_TOKEN = 'mock-auth-token'
        const MOCK_REPO = {
            owner: 'mockowner',
            name: 'mockname',
            currentBranch: 'mockCurrentBranch',
            branchBase: 'mockBranchBase',
            commitSha: 'mockCommitsha',
        }

        networkMock
            .onPost('https://service.bundlewatch.io/store/lookup')
            .reply(200, {
                fileDetailsByPath: {
                    './__testdata__/test-file-1.jpg': {
                        size: 25000,
                        compression: 'gzip',
                    },
                    './__testdata__/test-file-deleted.jpg': {
                        size: 10000,
                        compression: 'gzip',
                    },
                },
            })

        // TODO: assert save was called

        const result = await bundlewatchApi({
            files: [
                {
                    path: './__testdata__/*.jpg',
                    maxSize: '1MB',
                },
            ],
            ci: {
                githubAccessToken: MOCK_AUTH_TOKEN,
                repoOwner: MOCK_REPO.owner,
                repoName: MOCK_REPO.name,
                repoCurrentBranch: MOCK_REPO.currentBranch,
                repoBranchBase: MOCK_REPO.branchBase,
                commitSha: MOCK_REPO.branchBase,
            },
        })

        delete result.url
        expect(result).toMatchSnapshot()
    })

    it('Throws validations error when using brotli compression without the package', async () => {
        let error
        try {
            await bundlewatchApi({
                files: [
                    {
                        path: './__testdata__/*.jpg',
                        maxSize: '100kB',
                    },
                ],
                defaultCompression: 'brotli',
            })
        } catch (e) {
            error = e
        }
        expect(error).toMatchSnapshot()
    })

    it('Normalizes hash when given a normalizeFilenames option', async () => {
        const result = await bundlewatchApi({
            files: [
                {
                    path: './__testdata__/*.js',
                    maxSize: '100kB',
                },
            ],
            defaultCompression: 'none',
            normalizeFilenames: '^.+?(\\.\\w+)\\.(?:js|css)$',
        })

        delete result.url
        expect(result.fullResults[0].filePath).toMatchInlineSnapshot(
            `"./__testdata__/test.bundle.js"`,
        )
    })
})
