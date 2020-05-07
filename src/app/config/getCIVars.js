const getCIVars = (env) => {
    Object.assign(process.env, env)
    // eslint-disable-next-line global-require
    const ci = require('ci-env')
    // Take CI preffered vars over everything
    let repoOwner = env.CI_REPO_OWNER
    let repoName = env.CI_REPO_NAME
    let commitSha = env.CI_COMMIT_SHA || env.GIT_COMMIT || ci.sha
    let repoCurrentBranch = env.CI_BRANCH || env.GIT_BRANCH || ci.branch
    let repoBranchBase = env.CI_BRANCH_BASE || ci.pull_request_target_branch
    let repo = env.CI_REPO_SLUG || ci.repo

    if (!repo) {
        const gitUrl = env.GIT_URL
        if (gitUrl) {
            const GET_REPO_FROM_STRING = /github\.com[/:](.*).git/
            const repoMatcher = GET_REPO_FROM_STRING.exec(gitUrl)
            repo = repoMatcher[1]
        }
    }

    if (repo) {
        if (!repoOwner) {
            repoOwner = repo.split('/')[0]
        }
        if (!repoName) {
            repoName = repo.split('/')[1]
        }
    }

    const githubAccessToken =
        env.BUNDLEWATCH_GITHUB_TOKEN || env.GITHUB_ACCESS_TOKEN

    return {
        repoOwner,
        repoName,
        repoCurrentBranch,
        repoBranchBase,
        githubAccessToken,
        commitSha,
    }
}

export default getCIVars
