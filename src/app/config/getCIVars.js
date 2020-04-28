import envCi from 'env-ci'

const getCIVars = (env) => {
    const { branch, commit, isPr, prBranch, slug } = envCi({ env })
    let repo = slug
    let repoOwner
    let repoName
    let repoCurrentBranch = isPr ? prBranch : branch
    let repoBranchBase = branch
    let commitSha = commit

    // Take CI preffered vars over everything
    repoOwner = env.CI_REPO_OWNER || repoOwner
    repoName = env.CI_REPO_NAME || repoName
    commitSha = env.CI_COMMIT_SHA || env.GIT_COMMIT || commitSha
    repoCurrentBranch = env.CI_BRANCH || env.GIT_BRANCH || repoCurrentBranch
    repoBranchBase = env.CI_BRANCH_BASE || repoBranchBase
    repo = env.CI_REPO_SLUG || repo

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
