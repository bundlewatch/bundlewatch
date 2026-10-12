import { gzipSync } from 'node:zlib'

import { type App, createApp } from './app.ts'
import { appConfigFromEnv, dynamoStoresFromEnv } from './config.ts'

// Adapter for API Gateway HTTP APIs, payload format 2.0.

export type HttpApiEvent = {
    rawPath: string
    rawQueryString: string
    cookies?: string[] | undefined
    headers?: Record<string, string | undefined> | undefined
    body?: string | undefined
    isBase64Encoded: boolean
    requestContext: {
        domainName: string
        http: { method: string }
    }
}

export type HttpApiResult = {
    statusCode: number
    headers: Record<string, string>
    cookies?: string[]
    body: string
    isBase64Encoded: boolean
}

export const toRequest = (event: HttpApiEvent): Request => {
    const headers = new Headers()
    for (const [name, value] of Object.entries(event.headers ?? {})) {
        if (value !== undefined) headers.set(name, value)
    }
    // Payload 2.0 moves cookies out of the headers.
    if (event.cookies?.length) {
        headers.set('cookie', event.cookies.join('; '))
    }
    const protocol = headers.get('x-forwarded-proto') ?? 'https'
    const query = event.rawQueryString ? `?${event.rawQueryString}` : ''
    const url = `${protocol}://${event.requestContext.domainName}${event.rawPath}${query}`
    const method = event.requestContext.http.method.toUpperCase()
    let body: Uint8Array | string | undefined
    if (event.body !== undefined && method !== 'GET' && method !== 'HEAD') {
        body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64')
            : event.body
    }
    return new Request(url, { method, headers, body: body ?? null })
}

const isText = (contentType: string | null): boolean =>
    !contentType || /^text\/|[/+](?:json|xml|javascript)\b/i.test(contentType)

const acceptsGzip = (acceptEncoding: string | undefined): boolean =>
    (acceptEncoding ?? '').split(',').some((part) => {
        const [coding = '', ...params] = part.trim().toLowerCase().split(';')
        const rejected = params.some((param) =>
            /^\s*q=0(?:\.0*)?\s*$/.test(param),
        )
        return (coding === 'gzip' || coding === '*') && !rejected
    })

// Lambda responses are limited to 6 MB. Pages of very large projects go
// over it uncompressed; HTML compresses about tenfold.
const COMPRESS_FROM_BYTES = 1024

export const toResult = async (
    response: Response,
    acceptEncoding?: string,
): Promise<HttpApiResult> => {
    const headers: Record<string, string> = {}
    for (const [name, value] of response.headers) {
        if (name !== 'set-cookie') headers[name] = value
    }
    const cookies = response.headers.getSetCookie()
    let bytes = Buffer.from(await response.arrayBuffer())
    const text = isText(response.headers.get('content-type'))
    let base64 = !text
    if (
        text &&
        bytes.byteLength >= COMPRESS_FROM_BYTES &&
        !response.headers.has('content-encoding') &&
        acceptsGzip(acceptEncoding)
    ) {
        bytes = gzipSync(bytes)
        headers['content-encoding'] = 'gzip'
        headers.vary = headers.vary
            ? `${headers.vary}, accept-encoding`
            : 'accept-encoding'
        base64 = true
    }
    return {
        statusCode: response.status,
        headers,
        ...(cookies.length ? { cookies } : {}),
        body: bytes.toString(base64 ? 'base64' : 'utf8'),
        isBase64Encoded: base64,
    }
}

export const createHandler =
    (app: App): ((event: HttpApiEvent) => Promise<HttpApiResult>) =>
    async (event) => {
        let request: Request
        try {
            request = toRequest(event)
        } catch {
            // Methods or header values that `Request` refuses.
            return {
                statusCode: 400,
                headers: { 'content-type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: 'Bad request' }),
                isBase64Encoded: false,
            }
        }
        const acceptEncoding = Object.entries(event.headers ?? {}).find(
            ([name]) => name.toLowerCase() === 'accept-encoding',
        )?.[1]
        return toResult(await app(request), acceptEncoding)
    }

let lambdaHandler: ((event: HttpApiEvent) => Promise<HttpApiResult>) | undefined

// Built on the first invocation, so importing this module needs no
// environment.
export const handler = async (event: HttpApiEvent): Promise<HttpApiResult> => {
    lambdaHandler ??= createHandler(
        createApp({
            ...dynamoStoresFromEnv(process.env),
            config: appConfigFromEnv(process.env),
        }),
    )
    return lambdaHandler(event)
}
