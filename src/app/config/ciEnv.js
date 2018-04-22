const ciEnv = () => {
    const env = process.env
    let repo

    let repoOwner
    let repoName
    let repoCurrentBranch
    let repoBranchBase
    let commitSha

    if (env.TRAVIS) {
        // Reference: https://docs.travis-ci.com/user/environment-variables
        repo = env.TRAVIS_REPO_SLUG
        commitSha = env.TRAVIS_PULL_REQUEST_SHA || env.TRAVIS_COMMIT
        repoCurrentBranch =
            env.TRAVIS_EVENT_TYPE === 'push'
                ? env.TRAVIS_BRANCH
                : env.TRAVIS_PULL_REQUEST_BRANCH
    } else if (env.CIRCLECI) {
        // Reference: https://circleci.com/docs/1.0/environment-variables
        repoOwner = env.CIRCLE_PROJECT_USERNAME
        repoName = env.CIRCLE_PROJECT_REPONAME
        commitSha = env.CIRCLE_SHA1
        repoCurrentBranch = env.CIRCLE_BRANCH
    } else if (env.WERCKER) {
        // Reference: https://devcenter.wercker.com/docs/environment-variables/available-env-vars
        repoOwner = env.WERCKER_GIT_OWNER
        repoName = env.WERCKER_GIT_REPOSITORY
        commitSha = env.WERCKER_GIT_COMMIT
        repoCurrentBranch = env.WERCKER_GIT_BRANCH
    } else if (env.DRONE) {
        // Reference: http://readme.drone.io/usage/environment-reference
        repo = env.DRONE_REPO || env.CI_REPO
        commitSha = env.DRONE_COMMIT || env.CI_COMMIT
    } else if (env.CI_NAME === 'codeship') {
        // Reference: https://documentation.codeship.com/basic/builds-and-configuration/set-environment-variables/#default-environment-variables
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

    return {
        repoOwner,
        repoName,
        repoCurrentBranch,
        repoBranchBase,
        commitSha,
    }
}

export default ciEnv()
