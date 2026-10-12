import { readFileSync } from 'node:fs'

type Env = Record<string, string | undefined>

type CiEnv = {
    ci?: string | undefined
    repo?: string | undefined
    sha?: string | undefined
    event?: string | undefined
    branch?: string | undefined
    pullRequestNumber?: string | undefined
    pullRequestTargetBranch?: string | undefined
}

// Port of ci-env@1.17.0, which 0.x used to detect the CI provider. Provider
// order and variable precedence match it exactly (ci.test.ts compares the two)
// except where commented.
export const detectCiEnv = (env: Env): CiEnv => {
    if (env.TRAVIS) {
        const isPush = env.TRAVIS_EVENT_TYPE === 'push'
        return {
            ci: 'travis',
            repo: env.TRAVIS_REPO_SLUG,
            sha: env.TRAVIS_PULL_REQUEST_SHA || env.TRAVIS_COMMIT,
            event: env.TRAVIS_EVENT_TYPE,
            pullRequestNumber: env.TRAVIS_PULL_REQUEST,
            branch: isPush ? env.TRAVIS_BRANCH : env.TRAVIS_PULL_REQUEST_BRANCH,
            pullRequestTargetBranch: isPush ? '' : env.TRAVIS_BRANCH,
        }
    }
    if (env.CIRCLECI) {
        return {
            ci: 'circle',
            repo: `${env.CIRCLE_PROJECT_USERNAME}/${env.CIRCLE_PROJECT_REPONAME}`,
            sha: env.CIRCLE_SHA1,
            event: env.CI_PULL_REQUEST ? 'pull_request' : 'push',
            pullRequestNumber: env.CI_PULL_REQUEST
                ? env.CI_PULL_REQUEST.split('/').pop()
                : '',
            branch: env.CIRCLE_BRANCH,
        }
    }
    if (env.WERCKER) {
        return {
            ci: 'wercker',
            repo: `${env.WERCKER_GIT_OWNER}/${env.WERCKER_GIT_REPOSITORY}`,
            sha: env.WERCKER_GIT_COMMIT,
            event: 'push',
            pullRequestNumber: '',
            pullRequestTargetBranch: '',
            branch: env.WERCKER_GIT_BRANCH,
        }
    }
    if (env.DRONE) {
        return {
            ci: 'drone',
            repo: env.DRONE_REPO || env.CI_REPO || legacyDroneRepo(env),
            sha: env.DRONE_COMMIT || env.CI_COMMIT,
            event:
                env.DRONE_BUILD_EVENT ||
                env.DRONE_EVENT ||
                env.CI_EVENT ||
                'push',
            pullRequestNumber: env.DRONE_PULL_REQUEST,
            pullRequestTargetBranch: env.DRONE_TARGET_BRANCH,
            branch: env.DRONE_BRANCH || env.CI_BRANCH,
        }
    }
    if (env.GITLAB_CI) {
        return {
            ci: 'gitlab',
            repo: env.CI_PROJECT_PATH,
            sha: env.CI_COMMIT_SHA,
            event: env.CI_PIPELINE_SOURCE,
            pullRequestNumber: env.CI_MERGE_REQUEST_ID || '',
            pullRequestTargetBranch:
                env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME ||
                env.CI_EXTERNAL_PULL_REQUEST_TARGET_BRANCH_NAME,
            branch:
                env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME ||
                env.CI_COMMIT_REF_NAME,
        }
    }
    if (env.CI_NAME === 'codeship') {
        return {
            ci: 'codeship',
            repo: env.CI_REPO_NAME,
            sha: env.CI_COMMIT_ID,
            event: 'push',
            pullRequestNumber: env.CI_PR_NUMBER,
            pullRequestTargetBranch: '',
            branch: env.CI_BRANCH,
        }
    }
    if (env.GITHUB_ACTION) {
        const ref = env.GITHUB_REF ?? ''
        const event = env.GITHUB_EVENT_NAME
        const isPullRequest = event === 'pull_request'
        // ci-env took only the third segment of GITHUB_REF, which cut
        // `refs/heads/feat/foo` down to `feat` (bundlewatch#422).
        const refName = ref.split('/').slice(2).join('/')
        return {
            ci: 'github_actions',
            repo: env.GITHUB_REPOSITORY,
            sha: env.GITHUB_SHA,
            event,
            pullRequestNumber: isPullRequest ? (ref.split('/')[2] ?? '') : '',
            pullRequestTargetBranch: env.GITHUB_BASE_REF,
            branch: env.GITHUB_HEAD_REF || refName,
        }
    }
    if (env.CF_PAGES) {
        return {
            ci: 'cloudflare',
            repo: '',
            sha: env.CF_PAGES_COMMIT_SHA,
            event: 'push',
            pullRequestNumber: '',
            pullRequestTargetBranch: '',
            branch: env.CF_PAGES_BRANCH,
        }
    }
    if (env.NETLIFY) {
        return {
            ci: 'netlify',
            repo: env.REPOSITORY_URL?.split('@github.com/').pop(),
            sha: env.COMMIT_REF,
            event: env.PULL_REQUEST ? 'pull_request' : 'push',
            pullRequestNumber: env.PULL_REQUEST ? env.REVIEW_ID : '',
            pullRequestTargetBranch: '',
            branch: env.HEAD,
        }
    }
    if (env.NOW_GITHUB_ORG) {
        return {
            ci: 'now',
            repo: `${env.NOW_GITHUB_ORG}/${env.NOW_GITHUB_REPO}`,
            sha: env.NOW_GITHUB_COMMIT_SHA,
            event: 'push',
            pullRequestNumber: '',
            branch: env.NOW_GITHUB_COMMIT_REF,
        }
    }
    if (env.BUDDY) {
        return {
            ci: 'buddy',
            repo: env.BUDDY_PROJECT_NAME,
            sha: env.BUDDY_EXECUTION_REVISION,
            event: env.BUDDY_EXECUTION_MODE,
            pullRequestNumber: env.BUDDY_EXECUTION_PULL_REQUEST_NO,
            pullRequestTargetBranch:
                env.BUDDY_EXECUTION_PULL_REQUEST_BASE_BRANCH,
            branch: env.BUDDY_EXECUTION_BRANCH,
        }
    }
    if (env.CF_BUILD_URL) {
        return {
            ci: 'codefresh',
            repo: env.CF_REPO_NAME,
            sha: env.CF_REVISION,
            event: 'push',
            pullRequestNumber: env.CF_PULL_REQUEST_NUMBER,
            pullRequestTargetBranch: env.CF_PULL_REQUEST_TARGET,
            branch: env.CF_BRANCH,
        }
    }
    if (env.CI) {
        return {
            ci: env.CI,
            // ci-env produced the string "undefined/undefined" here when the
            // variables were missing, which also hid the GIT_URL fallback.
            repo:
                env.CI_REPO_OWNER && env.CI_REPO_NAME
                    ? `${env.CI_REPO_OWNER}/${env.CI_REPO_NAME}`
                    : undefined,
            sha: env.CI_COMMIT_SHA,
            event: env.CI_EVENT || 'push',
            pullRequestNumber: env.CI_MERGE_REQUEST_ID,
            pullRequestTargetBranch: env.CI_TARGET_BRANCH,
            branch: env.CI_BRANCH,
        }
    }
    return {}
}

const legacyDroneRepo = (env: Env): string => {
    const remote = env.DRONE_REMOTE || env.CI_REMOTE
    if (!remote) {
        return ''
    }
    const [owner, name = ''] = remote.split('/').slice(-2)
    return `${owner}/${name.replace(/\.git$/, '')}`
}

/**
 * Whether this build runs for a pull request, where it must not save a
 * baseline. Only providers that run separate pull request builds count:
 * CircleCI and others attach pull request details to ordinary branch builds,
 * which 0.x saved and must keep saving.
 */
const isPullRequestBuild = (env: Env, { ci, event }: CiEnv): boolean => {
    switch (ci) {
        case 'github_actions':
            return event === 'pull_request' || event === 'pull_request_target'
        case 'travis':
            return env.TRAVIS_EVENT_TYPE === 'pull_request'
        case 'gitlab':
            return (
                env.CI_PIPELINE_SOURCE === 'merge_request_event' ||
                env.CI_PIPELINE_SOURCE === 'external_pull_request_event'
            )
        case 'drone':
            return event === 'pull_request'
        case 'circle':
            // Set only for pull requests from forks.
            return Boolean(env.CIRCLE_PR_NUMBER)
        case 'netlify':
            // Deploy previews; production builds set it to "false".
            return env.PULL_REQUEST === 'true'
        case undefined:
            return false
        default:
            // Generic CI_* variables, where the user names the event.
            return env.CI && ci === env.CI
                ? env.CI_EVENT === 'pull_request'
                : false
    }
}

type GitHubEvent = {
    repository?: { default_branch?: unknown }
    pull_request?: { head?: { sha?: unknown } }
}

/** The GitHub Actions event payload, when running there. */
const readGitHubEvent = (env: Env): GitHubEvent | undefined => {
    if (!env.GITHUB_ACTIONS || !env.GITHUB_EVENT_PATH) {
        return undefined
    }
    try {
        return JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'))
    } catch {
        return undefined
    }
}

const nonEmptyString = (value: unknown): string | undefined =>
    typeof value === 'string' && value ? value : undefined

export type CiVars = {
    githubAccessToken?: string | undefined
    repoOwner?: string | undefined
    repoName?: string | undefined
    repoCurrentBranch?: string | undefined
    repoBranchBase?: string | undefined
    commitSha?: string | undefined
    defaultBranch?: string | undefined
    isPullRequest: boolean
}

/** Same precedence as 0.x: explicit CI_* variables, then the provider's. */
export const getCiVars = (env: Env = process.env): CiVars => {
    const ci = detectCiEnv(env)

    let repo = env.CI_REPO_SLUG || ci.repo
    if (!repo && env.GIT_URL) {
        repo = /github\.com[/:](.*).git/.exec(env.GIT_URL)?.[1]
    }
    const [slugOwner, slugName] = repo ? repo.split('/') : []

    const event = readGitHubEvent(env)
    // On pull_request events GITHUB_SHA is a temporary merge commit, and
    // statuses posted to it never show on the pull request.
    const pullRequestHead = nonEmptyString(event?.pull_request?.head?.sha)

    return {
        githubAccessToken:
            env.BUNDLEWATCH_GITHUB_TOKEN || env.GITHUB_ACCESS_TOKEN,
        repoOwner: env.CI_REPO_OWNER || slugOwner,
        repoName: env.CI_REPO_NAME || slugName,
        repoCurrentBranch: env.CI_BRANCH || env.GIT_BRANCH || ci.branch,
        repoBranchBase:
            env.CI_BRANCH_BASE || ci.pullRequestTargetBranch || undefined,
        commitSha:
            env.CI_COMMIT_SHA || env.GIT_COMMIT || pullRequestHead || ci.sha,
        defaultBranch: nonEmptyString(event?.repository?.default_branch),
        isPullRequest: isPullRequestBuild(env, ci),
    }
}
