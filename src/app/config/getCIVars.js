const getCIVars = (env) => {
    let repo

    let repoOwner
    let repoName
    let repoCurrentBranch
    let repoBranchBase
    let commitSha

    if (env.TRAVIS) {
        repo = env.TRAVIS_REPO_SLUG
        commitSha = env.TRAVIS_PULL_REQUEST_SHA || env.TRAVIS_COMMIT
        repoCurrentBranch = env.TRAVIS_PULL_REQUEST_BRANCH
        repoBranchBase = env.TRAVIS_BRANCH
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
        repoOwner = env.DRONE_REPO_OWNER
        repoName = env.DRONE_REPO_NAME
        commitSha = env.DRONE_COMMIT || env.CI_COMMIT
        repoCurrentBranch = env.DRONE_COMMIT_BRANCH
        repoBranchBase = env.DRONE_REPO_BRANCH
    } else if (env.GITHUB_ACTIONS) {
        repoOwner = env.GITHUB_REPOSITORY.split('/')[0]
        repoName = env.GITHUB_REPOSITORY.split('/')[1]
        commitSha = env.GITHUB_SHA
        // GitHub only provides ref (read more: https://stackoverflow.com/q/1526471)
        repoCurrentBranch = env.GITHUB_REF.replace(/^refs\/heads\//, '')
    }
    // Take CI preffered vars over everything
    repoOwner = env.CI_REPO_OWNER || repoOwner
    repoName = env.CI_REPO_NAME || repoName
    commitSha = env.CI_COMMIT_SHA || env.GIT_COMMIT || commitSha
    repoCurrentBranch = env.CI_BRANCH || env.GIT_BRANCH || repoCurrentBranch
    repoBranchBase = env.CI_BRANCH_BASE || repoBranchBase
    repo = env.CI_REPO_NAME || repo

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
