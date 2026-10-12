// Express (`res.json`) sent this content type; keep it for 0.x clients.
const JSON_TYPE = 'application/json; charset=utf-8'

// No scripts and no third-party requests: results pages render
// attacker-controlled data, so lock down everything they don't use.
export const CONTENT_SECURITY_POLICY: string = [
    "default-src 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://bundlewatch.io",
    "base-uri 'none'",
    "form-action 'none'",
].join('; ')

/** Bodies above this are rejected with 413 before parsing. */
export const MAX_BODY_BYTES: number = 1024 * 1024

export const json = (
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
): Response =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': JSON_TYPE, ...headers },
    })

export const htmlPage = (
    status: number,
    body: string,
    headers: Record<string, string> = {},
): Response =>
    new Response(body, {
        status,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'content-security-policy': CONTENT_SECURITY_POLICY,
            'x-content-type-options': 'nosniff',
            ...headers,
        },
    })

/** Thrown by handlers to stop early with a ready-made response. */
export class HttpError extends Error {
    readonly response: Response

    constructor(response: Response) {
        super(`HTTP ${response.status}`)
        this.response = response
    }
}

const tooLarge = (): HttpError =>
    new HttpError(json(413, { error: 'Request body too large' }))

/**
 * Parses a JSON body leniently, like body-parser with `strict: false`: an
 * empty body is `{}` and any JSON value is accepted, whatever the
 * content type.
 */
export const readJsonBody = async (request: Request): Promise<unknown> => {
    if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
        throw tooLarge()
    }
    const bytes = new Uint8Array(await request.arrayBuffer())
    if (bytes.byteLength > MAX_BODY_BYTES) {
        throw tooLarge()
    }
    if (bytes.byteLength === 0) {
        return {}
    }
    try {
        return JSON.parse(new TextDecoder().decode(bytes))
    } catch {
        throw new HttpError(json(400, { error: 'Invalid JSON body' }))
    }
}
