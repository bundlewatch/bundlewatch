import getCIVars from './getCIVars'

describe(`getCIVars`, () => {
    const mockRepoOwner = 'repoowner_mock'
    const mockRepoName = 'reponame_mock'
    const mockRepo = `${mockRepoOwner}/${mockRepoName}`
    const mockBranchBase = `mock_branch_base`
    const mockRef = `refs/heads/mock_branch_base`
    const mockCommitSha = `ffac537e6cbbf934b08745a378932722df287a53`

    beforeEach(jest.resetModules)

    it(`Extracts GIT_URL (ssh) correct`, () => {
        const ciVars = getCIVars({
            GIT_URL: `git@github.com:${mockRepo}.git`,
        })
        expect(ciVars.repoOwner).toBe(mockRepoOwner)
        expect(ciVars.repoName).toBe(mockRepoName)

        // eslint-disable-next-line no-console
        console.log('HERE', ciVars)
    })

    it(`Extracts GIT_URL (https) correct`, () => {
        const ciVars = getCIVars({
            GIT_URL: `[https://github.com/${mockRepo}.git]`,
        })
        expect(ciVars.repoOwner).toBe(mockRepoOwner)
        expect(ciVars.repoName).toBe(mockRepoName)
    })

    it(`An empty string environment variables, returns default`, () => {
        const ciVars = getCIVars({
            CI_BRANCH_BASE: mockBranchBase,
        })
        expect(ciVars.repoBranchBase || 'master').toBe(mockBranchBase)
        const ciVars2 = getCIVars({
            CI_BRANCH_BASE: '',
        })
        expect(ciVars2.repoBranchBase || 'master').toBe('master')
    })

    it(`GitHub Actions is detected`, () => {
        const ciVars = getCIVars({
            GITHUB_ACTION: 'action-id',
            GITHUB_ACTIONS: true,
            GITHUB_REPOSITORY: mockRepo,
            GITHUB_SHA: mockCommitSha,
            GITHUB_REF: mockRef,
        })
        expect(ciVars.repoOwner).toBe(mockRepoOwner)
        expect(ciVars.repoName).toBe(mockRepoName)
        expect(ciVars.commitSha).toBe(mockCommitSha)
        expect(ciVars.repoCurrentBranch).toBe(mockBranchBase)
    })
})
