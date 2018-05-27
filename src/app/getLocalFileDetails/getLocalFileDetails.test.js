import getSize from './getSize'
import ValidationError from '../errors/ValidationError'

import getLocalFileDetails from '.'

describe(`getLocalFileDetails`, () => {
    it('Works with basic options', async () => {
        const result = await getLocalFileDetails({
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
        const result = await getLocalFileDetails({
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

        const result = await getLocalFileDetails({
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
})

describe('getSize', () => {
    it('Throws validations error when using brotli compression without the package', async () => {
        expect(() =>
            getSize({
                filePath: './__testdata__/test-file-1.jpg',
                compression: 'brotli',
            }),
        ).toThrow(ValidationError)
    })
})
