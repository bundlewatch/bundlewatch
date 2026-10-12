import { parseBytes } from '@bundlewatch/core'
import type {
    FileDetails,
    LookupRequest,
    ResultsDetails,
    StoreRequest,
} from '@bundlewatch/core'

// Ports of the 0.x Joi schemas (@hapi/joi 17.1.1). Joi's defaults are part
// of the API: unknown keys are rejected, strings must be non-empty, numeric
// strings are converted to numbers, and only the first error is reported,
// in Joi's message format.

type Path = Array<string | number>

export type ValidationIssue = {
    message: string
    path: Path
    type: string
    context: { label: string; key?: string | number | undefined }
}

export class ValidationError extends Error {
    readonly details: ValidationIssue[]

    constructor(issue: ValidationIssue) {
        super(issue.message)
        this.details = [issue]
    }
}

/** One entry of `fullResults` on the results page. */
export type ResultsFile = {
    filePath: string
    status: string
    baseBranchSize?: number
    compression?: string
    error?: string
    maxSize?: number | null
    message?: string
    size?: number
}

/**
 * A decoded `d` parameter or a stored short link. Wider than core's
 * `ResultsPayload`: 0.x accepted any status string.
 */
export type ResultsData = {
    details: ResultsDetails
    results: { status: string; summary: string; fullResults: ResultsFile[] }
}

export type AnalyzeRequest = LookupRequest & {
    bundlewatchServiceHost: string
    baseBranchName: string
    currentBranchFileDetails: Record<string, FileDetails>
}

/** Body of `POST /results`. */
export type CreateResultsRequest = {
    repoOwner: string
    repoName: string
    commitSha: string
    githubAccessToken: string
    payload: ResultsData
}

type Obj = Record<string, unknown>

const labelOf = (path: Path): string => {
    let label = ''
    for (const key of path) {
        if (typeof key === 'number') label = `${label}[${key}]`
        else label = label ? `${label}.${key}` : key
    }
    return label || 'value'
}

const invalid = (path: Path, type: string, text: string): ValidationError => {
    const label = labelOf(path)
    return new ValidationError({
        message: `"${label}" ${text}`,
        path,
        type,
        context: { label, key: path.at(-1) },
    })
}

const isObject = (value: unknown): value is Obj =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

// Own properties only: jsonpack's unpack assigns `__proto__` keys, which
// replaces the prototype instead of adding a key.
const get = (object: Obj, key: string): unknown =>
    Object.hasOwn(object, key) ? object[key] : undefined

const expectObject = (value: unknown, path: Path): Obj => {
    if (!isObject(value)) {
        throw invalid(path, 'object.base', 'must be of type object')
    }
    return value
}

const required = (value: unknown, path: Path): unknown => {
    if (value === undefined) {
        throw invalid(path, 'any.required', 'is required')
    }
    return value
}

const rejectUnknownKeys = (
    object: Obj,
    known: readonly string[],
    path: Path,
): void => {
    for (const key of Object.keys(object)) {
        if (!known.includes(key)) {
            throw invalid([...path, key], 'object.unknown', 'is not allowed')
        }
    }
}

// Keeps the caller's key order, so stored JSON matches what 0.x stored.
const inOriginalOrder = <T>(original: Obj, converted: Obj): T =>
    Object.fromEntries(
        Object.keys(original)
            .filter((key) => converted[key] !== undefined)
            .map((key) => [key, converted[key]]),
    ) as T

const optionalString = (
    value: unknown,
    path: Path,
    allowEmpty = false,
): string | undefined => {
    if (value === undefined) {
        return undefined
    }
    if (typeof value !== 'string') {
        throw invalid(path, 'string.base', 'must be a string')
    }
    if (value === '' && !allowEmpty) {
        throw invalid(path, 'string.empty', 'is not allowed to be empty')
    }
    return value
}

const requiredString = (value: unknown, path: Path): string =>
    optionalString(required(value, path), path) as string

const NUMERIC = /^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i
// What bytes.format produced, e.g. "100KB" or "1.5MB".
const SIZE_STRING = /^\d+(?:\.\d+)?(?:B|KB|MB|GB|TB|PB)$/

type NumberRule = {
    allowNull?: boolean
    allowInfinity?: boolean
    allowSizeString?: boolean
}

const optionalNumber = (
    value: unknown,
    path: Path,
    rule: NumberRule = {},
): number | null | undefined => {
    if (value === undefined || (value === null && rule.allowNull)) {
        return value
    }
    // 0.x CLIs sent a numeric maxSize from the config through bytes.format,
    // e.g. "100KB". 0.x services rejected those baselines and links.
    const sizeString =
        rule.allowSizeString &&
        typeof value === 'string' &&
        SIZE_STRING.test(value)
            ? parseBytes(value)
            : null
    const number =
        sizeString ??
        (typeof value === 'string' && NUMERIC.test(value)
            ? Number.parseFloat(value)
            : value)
    if (typeof number !== 'number' || Number.isNaN(number)) {
        throw invalid(path, 'number.base', 'must be a number')
    }
    if (!Number.isFinite(number)) {
        if (rule.allowInfinity) return number
        throw invalid(path, 'number.infinity', 'cannot be infinity')
    }
    if (Math.abs(number) > Number.MAX_SAFE_INTEGER) {
        throw invalid(path, 'number.unsafe', 'must be a safe number')
    }
    return number
}

const requiredNumber = (
    value: unknown,
    path: Path,
    rule: NumberRule = {},
): number | null =>
    optionalNumber(required(value, path), path, rule) as number | null

const fileDetails = (value: unknown, path: Path): FileDetails => {
    const entry = expectObject(value, path)
    const converted = {
        compression: requiredString(get(entry, 'compression'), [
            ...path,
            'compression',
        ]),
        maxSize: requiredNumber(get(entry, 'maxSize'), [...path, 'maxSize'], {
            allowNull: true,
            allowSizeString: true,
        }),
        size: requiredNumber(get(entry, 'size'), [...path, 'size']),
    }
    rejectUnknownKeys(entry, Object.keys(converted), path)
    return inOriginalOrder(entry, converted)
}

// Rejects error entries (`{ error }`), so a run with a missing file saves
// no baseline. That is 0.x behaviour and listed in CONTRACT.md.
const fileDetailsByPath = (
    value: unknown,
    path: Path,
): Record<string, FileDetails> => {
    const object = expectObject(required(value, path), path)
    const entries = Object.keys(object).map((key) => {
        const entryPath = [...path, key]
        const entry = get(object, key)
        // 0.x declared `filePath: Joi.object()` as documentation, so a file
        // literally named "filePath" accepts any object.
        if (key === 'filePath') {
            return [key, expectObject(entry, entryPath)]
        }
        if (!/.+/.test(key)) {
            throw invalid(entryPath, 'object.unknown', 'is not allowed')
        }
        return [key, fileDetails(entry, entryPath)]
    })
    return Object.fromEntries(entries)
}

const REPO_KEYS = [
    'commitSha',
    'githubAccessToken',
    'repoBranch',
    'repoName',
    'repoOwner',
] as const

const repoFields = (body: Obj): LookupRequest => {
    const fields: Obj = {}
    for (const key of REPO_KEYS) {
        fields[key] = requiredString(get(body, key), [key])
    }
    return fields as LookupRequest
}

/** `POST /store/lookup`. */
export const validateLookupRequest = (value: unknown): LookupRequest => {
    const body = expectObject(value, [])
    const request = repoFields(body)
    rejectUnknownKeys(body, REPO_KEYS, [])
    return request
}

/** `POST /store`. */
export const validateStoreRequest = (value: unknown): StoreRequest => {
    const body = expectObject(value, [])
    const request = {
        ...repoFields(body),
        fileDetailsByPath: fileDetailsByPath(get(body, 'fileDetailsByPath'), [
            'fileDetailsByPath',
        ]),
    }
    rejectUnknownKeys(body, [...REPO_KEYS, 'fileDetailsByPath'], [])
    return request
}

/** `POST /analyze`. */
export const validateAnalyzeRequest = (value: unknown): AnalyzeRequest => {
    const body = expectObject(value, [])
    const request = {
        commitSha: requiredString(get(body, 'commitSha'), ['commitSha']),
        githubAccessToken: requiredString(get(body, 'githubAccessToken'), [
            'githubAccessToken',
        ]),
        bundlewatchServiceHost: requiredString(
            get(body, 'bundlewatchServiceHost'),
            ['bundlewatchServiceHost'],
        ),
        baseBranchName: requiredString(get(body, 'baseBranchName'), [
            'baseBranchName',
        ]),
        repoBranch: requiredString(get(body, 'repoBranch'), ['repoBranch']),
        repoName: requiredString(get(body, 'repoName'), ['repoName']),
        repoOwner: requiredString(get(body, 'repoOwner'), ['repoOwner']),
        currentBranchFileDetails: fileDetailsByPath(
            get(body, 'currentBranchFileDetails'),
            ['currentBranchFileDetails'],
        ),
    }
    rejectUnknownKeys(body, Object.keys(request), [])
    return request
}

const DETAILS_KEYS = [
    'commitSha',
    'repoBranchBase',
    'repoCurrentBranch',
    'repoName',
    'repoOwner',
] as const

const details = (value: unknown, path: Path): ResultsDetails => {
    const object = expectObject(required(value, path), path)
    const converted: Obj = {}
    for (const key of DETAILS_KEYS) {
        // Display-only, so empty strings are allowed (0.x returned 422).
        converted[key] = optionalString(get(object, key), [...path, key], true)
    }
    rejectUnknownKeys(object, DETAILS_KEYS, path)
    return inOriginalOrder(object, converted)
}

const fileResult = (value: unknown, path: Path): ResultsFile => {
    if (value === undefined) {
        throw invalid(path, 'array.sparse', 'must not be a sparse array item')
    }
    const item = expectObject(value, path)
    const at = (key: string): [unknown, Path] => [
        get(item, key),
        [...path, key],
    ]
    const converted = {
        baseBranchSize: optionalNumber(...at('baseBranchSize')),
        compression: optionalString(...at('compression')),
        error: optionalString(...at('error')),
        filePath: requiredString(...at('filePath')),
        // 0.x CLIs send Infinity for files without a maxSize. 0.x services
        // rejected those links, so they never rendered until now.
        maxSize: optionalNumber(...at('maxSize'), {
            allowNull: true,
            allowInfinity: true,
            allowSizeString: true,
        }),
        message: optionalString(...at('message')),
        size: optionalNumber(...at('size')),
        status: requiredString(...at('status')),
    }
    rejectUnknownKeys(item, Object.keys(converted), path)
    return inOriginalOrder(item, converted)
}

const results = (value: unknown, path: Path): ResultsData['results'] => {
    const object = expectObject(required(value, path), path)
    const fullResultsPath = [...path, 'fullResults']
    const list = required(get(object, 'fullResults'), fullResultsPath)
    if (!Array.isArray(list)) {
        throw invalid(fullResultsPath, 'array.base', 'must be an array')
    }
    const converted = {
        fullResults: Array.from(list, (item, index) =>
            fileResult(item, [...fullResultsPath, index]),
        ),
        status: requiredString(get(object, 'status'), [...path, 'status']),
        summary: requiredString(get(object, 'summary'), [...path, 'summary']),
    }
    rejectUnknownKeys(object, Object.keys(converted), path)
    return converted
}

/** A decoded `d` parameter of `/results`, or the payload of a short link. */
export const validateResultsPayload = (
    value: unknown,
    path: Path = [],
): ResultsData => {
    const object = expectObject(value, path)
    const payload = {
        details: details(get(object, 'details'), [...path, 'details']),
        results: results(get(object, 'results'), [...path, 'results']),
    }
    rejectUnknownKeys(object, Object.keys(payload), path)
    return payload
}

/** `POST /results`. */
export const validateCreateResultsRequest = (
    value: unknown,
): CreateResultsRequest => {
    const body = expectObject(value, [])
    const request = {
        repoOwner: requiredString(get(body, 'repoOwner'), ['repoOwner']),
        repoName: requiredString(get(body, 'repoName'), ['repoName']),
        commitSha: requiredString(get(body, 'commitSha'), ['commitSha']),
        githubAccessToken: requiredString(get(body, 'githubAccessToken'), [
            'githubAccessToken',
        ]),
        payload: validateResultsPayload(
            required(get(body, 'payload'), ['payload']),
            ['payload'],
        ),
    }
    rejectUnknownKeys(body, Object.keys(request), [])
    return request
}
