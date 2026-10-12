// The OAuth flow behind /setup-github. Tokens from it have the
// `repo:status` scope and are used by CLIs as BUNDLEWATCH_GITHUB_TOKEN.

/**
 * The web host matching an API URL: api.github.com → github.com,
 * api.<sub>.ghe.com → <sub>.ghe.com, <host>/api/v3 → <host>.
 */
export const githubWebUrl = (apiUrl: string): string => {
    const url = new URL(apiUrl)
    if (url.hostname.startsWith('api.')) {
        url.hostname = url.hostname.slice('api.'.length)
    }
    const path = url.pathname.replace(/\/api\/v3\/?$/, '').replace(/\/+$/, '')
    return `${url.origin}${path}`
}

export type TokenExchange = { token: string } | { error: unknown }

export const exchangeOAuthCode = async ({
    webUrl,
    clientId,
    clientSecret,
    code,
}: {
    webUrl: string
    clientId: string | undefined
    clientSecret: string | undefined
    code: string
}): Promise<TokenExchange> => {
    const response = await fetch(`${webUrl}/login/oauth/access_token`, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'user-agent': 'bundlewatch-service',
        },
        body: JSON.stringify({
            code,
            client_id: clientId,
            client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
        await response.body?.cancel()
        return { error: response.status }
    }
    const data = (await response.json()) as {
        access_token?: unknown
        error_description?: unknown
    }
    if (typeof data.access_token === 'string' && data.access_token) {
        return { token: data.access_token }
    }
    return { error: data.error_description ?? data }
}
