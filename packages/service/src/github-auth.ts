// Decides whether a GitHub token may read or write a repository's baseline
// or results. 0.x allowed any token that could read the commit's statuses,
// so on public repos any GitHub user could overwrite a baseline. Reading
// still uses that check. Writing needs one of:
//
// 1. A token whose user can push to the repo (the repo's `permissions`).
// 2. An installation token (Actions' GITHUB_TOKEN, GitHub Apps) whose
//    installation includes the repo. GitHub returns `permissions` with every
//    flag false for these, so the flags alone can't tell them apart from a
//    user without access.
// 3. When GitHub won't show the repo to the token at all, the 0.x check.
//    Tokens from the bundlewatch OAuth app only have the `repo:status`
//    scope, which can't read private repos, and must keep working.

export type RepoAccessRequest = {
    apiUrl: string
    token: string
    owner: string
    repo: string
    commitSha: string
    /** Defaults to `write`. */
    access?: 'read' | 'write' | undefined
    userAgent?: string | undefined
    /** Total time for all GitHub requests of one check. */
    budgetMs?: number | undefined
}

export type RepoAccess = {
    allowed: boolean
    /** Which check decided, for logs and tests. */
    via:
        | 'invalid-request'
        | 'permissions'
        | 'installation'
        | 'statuses'
        | 'repo-error'
}

/** GitHub failed or rate-limited us, so the check couldn't be made. */
export class GitHubUnavailableError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'GitHubUnavailableError'
    }
}

// Installations can hold thousands of repos; stop somewhere.
const MAX_INSTALLATION_PAGES = 50
// 0.x CLIs give up on the service after 10 seconds.
const DEFAULT_BUDGET_MS = 6000

const isUnavailable = (status: number): boolean =>
    status === 429 || status >= 500

const nextPageUrl = (
    link: string | null,
    apiUrl: string,
): string | undefined => {
    const match = link?.match(/<([^>]+)>;\s*rel="next"/)
    if (!match?.[1]) {
        return undefined
    }
    // Never send the token anywhere but the configured API.
    const next = new URL(match[1])
    return next.origin === new URL(apiUrl).origin ? next.href : undefined
}

/**
 * Network errors, timeouts and GitHub outages throw
 * `GitHubUnavailableError`; the service answers those with 503.
 */
export const checkRepoAccess = async ({
    apiUrl,
    token,
    owner,
    repo,
    commitSha,
    access = 'write',
    userAgent = 'bundlewatch-service',
    budgetMs = DEFAULT_BUDGET_MS,
}: RepoAccessRequest): Promise<RepoAccess> => {
    // Encoding keeps each value in one path segment, but URL parsing still
    // resolves `.` and `..` segments.
    const parts = [owner, repo, commitSha]
    if (parts.some((part) => part === '.' || part === '..')) {
        return { allowed: false, via: 'invalid-request' }
    }
    const base = apiUrl.replace(/\/+$/, '')
    const repoPath = [owner, repo]
        .map((part) => encodeURIComponent(part))
        .join('/')
    const repoUrl = `${base}/repos/${repoPath}`
    const deadline = Date.now() + budgetMs

    // Leave the last third (two seconds by default) for the statuses fallback.
    const installationDeadline = deadline - Math.ceil(budgetMs / 3)
    const get = async (
        url: string,
        requestDeadline = deadline,
    ): Promise<Response> => {
        const remaining = requestDeadline - Date.now()
        if (remaining <= 0) {
            throw new GitHubUnavailableError('GitHub access check timed out')
        }
        try {
            return await fetch(url, {
                headers: {
                    accept: 'application/vnd.github+json',
                    authorization: `Bearer ${token}`,
                    'user-agent': userAgent,
                    'x-github-api-version': '2022-11-28',
                },
                signal: AbortSignal.timeout(remaining),
            })
        } catch (error) {
            throw new GitHubUnavailableError(
                `GitHub request failed: ${(error as Error).message}`,
            )
        }
    }

    const readStatuses = async (): Promise<RepoAccess> => {
        const statuses = await get(
            `${repoUrl}/statuses/${encodeURIComponent(commitSha)}`,
        )
        await statuses.body?.cancel()
        if (isUnavailable(statuses.status)) {
            throw new GitHubUnavailableError(
                `GitHub answered ${statuses.status}`,
            )
        }
        return { allowed: statuses.ok, via: 'statuses' }
    }

    /**
     * `listed` or `not-listed` for installation tokens, `not-installation`
     * for other tokens, `unknown` when the list couldn't be read in time.
     */
    const installationAccess = async (): Promise<
        'listed' | 'not-listed' | 'not-installation' | 'unknown'
    > => {
        const fullName = `${owner}/${repo}`.toLowerCase()
        let url: string | undefined =
            `${base}/installation/repositories?per_page=100`
        // Each page links to the next, so they're fetched one at a time.
        /* oxlint-disable no-await-in-loop */
        for (let page = 0; url; page++) {
            if (page === MAX_INSTALLATION_PAGES) {
                return 'unknown'
            }
            let response: Response
            try {
                response = await get(url, installationDeadline)
            } catch {
                return 'unknown'
            }
            if (!response.ok) {
                await response.body?.cancel()
                // Tokens that aren't installation tokens get 401 or 403.
                return page === 0 && !isUnavailable(response.status)
                    ? 'not-installation'
                    : 'unknown'
            }
            const body = (await response.json().catch(() => null)) as {
                repositories?: Array<{ full_name?: unknown }>
            } | null
            if (!body) return 'unknown'
            const found = body.repositories?.some(
                (candidate) =>
                    typeof candidate.full_name === 'string' &&
                    candidate.full_name.toLowerCase() === fullName,
            )
            if (found) {
                return 'listed'
            }
            url = nextPageUrl(response.headers.get('link'), base)
        }
        /* oxlint-enable no-await-in-loop */
        return 'not-listed'
    }

    if (access === 'read') {
        return readStatuses()
    }

    const repoResponse = await get(repoUrl)
    if (repoResponse.ok) {
        type RepoBody = { permissions?: Record<string, unknown> } | null
        const body = (await repoResponse.json().catch(() => null)) as RepoBody
        const permissions =
            body?.permissions && typeof body.permissions === 'object'
                ? body.permissions
                : undefined
        if (
            permissions?.push === true ||
            permissions?.maintain === true ||
            permissions?.admin === true
        ) {
            return { allowed: true, via: 'permissions' }
        }
        switch (await installationAccess()) {
            case 'listed':
                return { allowed: true, via: 'installation' }
            case 'not-listed':
                return { allowed: false, via: 'installation' }
            case 'unknown':
                return readStatuses()
            case 'not-installation':
                // A user without write access; or no `permissions` at all,
                // which only the 0.x check can decide.
                return permissions
                    ? { allowed: false, via: 'permissions' }
                    : readStatuses()
        }
    }

    await repoResponse.body?.cancel()
    if (isUnavailable(repoResponse.status)) {
        throw new GitHubUnavailableError(
            `GitHub answered ${repoResponse.status}`,
        )
    }
    // 403/404: e.g. a `repo:status` token on a private repo.
    if (repoResponse.status === 403 || repoResponse.status === 404) {
        return readStatuses()
    }
    return { allowed: false, via: 'repo-error' }
}
