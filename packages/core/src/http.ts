const errorCode = (error: unknown): string | undefined => {
    const cause = (error as { cause?: { code?: unknown; errors?: unknown } })
        ?.cause
    if (typeof cause?.code === 'string') return cause.code
    // Connecting to every address of a host failed.
    if (Array.isArray(cause?.errors)) {
        const code = (cause.errors[0] as { code?: unknown } | undefined)?.code
        if (typeof code === 'string') return code
    }
    return undefined
}

/** POSTs JSON. Network errors and timeouts throw an Error named by its code. */
export const postJson = async (
    url: string,
    body: unknown,
    headers: Record<string, string>,
    timeout: number,
): Promise<{ status: number; data: string }> => {
    const target = new URL(url)
    // 0.x's axios turned credentials in the URL into Basic auth; fetch
    // refuses URLs with credentials.
    if (target.username || target.password) {
        const credentials = `${decodeURIComponent(target.username)}:${decodeURIComponent(target.password)}`
        headers = {
            ...headers,
            authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
        }
        target.username = ''
        target.password = ''
    }

    const deadline = AbortSignal.timeout(timeout)
    try {
        const response = await fetch(target.href, {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...headers },
            body: JSON.stringify(body),
            signal: deadline,
        })
        return { status: response.status, data: await response.text() }
    } catch (error) {
        // 0.x logged timeouts as ECONNABORTED. Other errors are reduced to
        // their code: messages and causes can contain the request URL, and
        // with it credentials.
        // oxlint-disable-next-line preserve-caught-error -- The cause can contain credentials.
        throw new Error(
            deadline.aborted
                ? 'ECONNABORTED'
                : (errorCode(error) ?? 'HTTP request failed'),
        )
    }
}
