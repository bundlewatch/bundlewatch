const ciEnv = () => {
    const env = process.env
    let repo

    let repoOwner
    let repoName
    let repoCurrentBranch
    let repoBranchBase
    let commitSha

    if (env.TRAVIS) {
        repo = env.TRAVIS_REPO_SLUG
        commitSha = env.TRAVIS_PULL_REQUEST_SHA || env.TRAVIS_COMMIT
        repoCurrentBranch =
            env.TRAVIS_EVENT_TYPE === 'push'
                ? env.TRAVIS_BRANCH
                : env.TRAVIS_PULL_REQUEST_BRANCH
    } else if (env.CIRCLECI) {
        repoOwner = env.CIRCLE_PROJECT_USERNAME
        repoName = env.CIRCLE_PROJECT_REPONAME
        commitSha = env.CIRCLE_SHA1
        repoCurrentBranch = env.CIRCLE_BRANCH
    } else if (env.WERCKER) {
        repoOwner = env.WERCKER_GIT_OWNER
        repoName = env.WERCKER_GIT_REPOSITORY
        commitSha = env.WERCKER_GIT_COMMIT
        repoCurrentBranch = env.WERCKER_GIT_BRANCH
    } else if (env.DRONE) {
        repo = env.DRONE_REPO || env.CI_REPO
        commitSha = env.DRONE_COMMIT || env.CI_COMMIT
    } else if (env.CI_NAME === 'codeship') {
        repo = env.CI_REPO_NAME
        repoCurrentBranch = env.CI_BRANCH
    } else {
        // Best effort
        repoOwner = env.CI_REPO_OWNER
        repoName = env.CI_REPO_NAME
        commitSha = env.CI_COMMIT_SHA
        repoCurrentBranch = env.CI_BRANCH
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
        process.env.GITHUB_ACCESS_TOKEN || process.env.BUNDLESIZE_GITHUB_TOKEN
    
    const repoBranchBase = env.CI_BRANCH_BASE

    // TODO: fine repoBranchBase

    return {
        repoOwner,
        repoName,
        repoCurrentBranch,
        repoBranchBase,
        githubAccessToken,
        commitSha,
    }
}

export default ciEnv()
