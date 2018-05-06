import getCIVars from './getCIVars'

describe(`getCIVars`, () => {
    const mockRepoOwner = 'repoowner_mock'
    const mockRepoName = 'reponame_mock'
    const mockRepo = `${mockRepoOwner}/${mockRepoName}`
    const mockBranchBase = `mock_branch_base`

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
})
