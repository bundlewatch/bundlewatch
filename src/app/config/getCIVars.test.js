import getCIVars from './getCIVars'

// jest.mock('ci-env', () => ({
//     branch: 'master',
//     pull_request_target_branch: 'master',
// }))

describe(`getCIVars`, () => {
    const mockRepoOwner = 'repoowner_mock'
    const mockRepoName = 'reponame_mock'
    const mockRepo = `${mockRepoOwner}/${mockRepoName}`
    const mockBranchBase = `mock_branch_base`
    const mockRef = `refs/heads/mock_branch_base`
    const mockCommitSha = `ffac537e6cbbf934b08745a378932722df287a53`
    let originalEnv

    beforeEach(() => {
        jest.resetModules()
        originalEnv = process.env
        process.env = {
            ...originalEnv,
            CI_REPO_OWNER: undefined,
            CI_REPO_NAME: undefined,
            CI_COMMIT_SHA: undefined,
            CI_BRANCH: undefined,
            CI_BRANCH_BASE: undefined,
            CI_REPO_SLUG: undefined,
            GIT_COMMIT: undefined,
            GIT_BRANCH: undefined,
            CIRCLE_PROJECT_USERNAME: undefined,
            CIRCLE_PROJECT_REPONAME: undefined,
        }
    })

    afterEach(() => {
        process.env = originalEnv
    })

    it(`Extracts GIT_URL (ssh) correct`, () => {
        const ciVars = getCIVars({
            GIT_URL: `git@github.com:${mockRepo}.git`,
        })
        expect(ciVars.repoOwner).toBe(mockRepoOwner)
        expect(ciVars.repoName).toBe(mockRepoName)
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
