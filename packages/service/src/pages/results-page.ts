import { formatBytes } from '@bundlewatch/core'

import { html, type SafeHtml } from '../html.ts'
import type { ResultsData, ResultsFile } from '../validators.ts'
import { icon } from './icons.ts'
import { footerLinks, logoHeader, page } from './layout.ts'

// Port of the 0.x `GET /results` route and results.mustache. The derived
// fields and the bar arithmetic are kept as they were, including their
// reliance on JavaScript's number coercion.

type StatusFlag = 'pass' | 'warn' | 'fail' | 'removed'

// 0.x showed every unknown status as removed.
const flagFor = (status: string): StatusFlag =>
    status === 'pass' || status === 'warn' || status === 'fail'
        ? status
        : 'removed'

export type FileRow = {
    filePath: string
    flag: StatusFlag
    prettySize: string | null
    prettyMaxSize: string | null
    prettyDiffSize: string | null
    isDiffNegative: boolean
    baseBranchSizePercentage: number
    diffPercentage: number
}

// What `Math.max` and arithmetic did to these values in 0.x.
const coerce = (value: number | null | undefined): number =>
    value === null ? 0 : (value ?? Number.NaN)

export const toFileRow = (file: ResultsFile): FileRow => {
    const size = coerce(file.size)
    const { baseBranchSize } = file
    // An unlimited maxSize is Infinity in 0.x links and null in JSON. Both
    // show as "Infinity" and, like null in 0.x, don't stretch the bar.
    const unlimited =
        file.maxSize === null || file.maxSize === Number.POSITIVE_INFINITY
    const maxSize = unlimited ? 0 : coerce(file.maxSize)

    let prettyMaxSize: string | null = null
    if (unlimited) prettyMaxSize = 'Infinity'
    else if (file.maxSize !== undefined) prettyMaxSize = formatBytes(maxSize)

    let diff = Number.NaN
    let prettyDiffSize: string | null = null
    if (baseBranchSize) {
        diff = size - baseBranchSize
        prettyDiffSize = formatBytes(diff)
        if (diff > 0) {
            prettyDiffSize = `+${prettyDiffSize}`
        }
    }

    const barTotalLength = Math.max(size, maxSize)
    let isDiffNegative = false
    let baseBranchSizePercentage = 0
    let diffPercentage = (size / barTotalLength) * 100
    if (baseBranchSize) {
        // A smaller file eats into the base branch's bar.
        isDiffNegative = diff < 0
        const absDiff = Math.abs(diff)
        const remaining = isDiffNegative
            ? baseBranchSize - absDiff
            : baseBranchSize
        baseBranchSizePercentage = (remaining / barTotalLength) * 100
        diffPercentage = (absDiff / barTotalLength) * 100
    }

    return {
        filePath: file.filePath,
        flag: flagFor(file.status),
        prettySize: file.size === undefined ? null : formatBytes(size),
        prettyMaxSize,
        prettyDiffSize,
        isDiffNegative,
        baseBranchSizePercentage,
        diffPercentage,
    }
}

// Widths end up in style attributes. NaN and Infinity come out of the
// arithmetic above for odd inputs (a 0-byte file with no maxSize).
export const cssPercentage = (value: number): string =>
    Number.isFinite(value) ? String(Math.min(100, Math.max(0, value))) : '0'

const statusIcon = (flag: StatusFlag, extraClass: string): SafeHtml | '' => {
    const className = extraClass ? `${extraClass} cell-${flag}` : `cell-${flag}`
    const label = flag.toUpperCase()
    if (flag === 'pass') return icon({ name: 'check', className, label })
    if (flag === 'warn') return icon({ name: 'warning', className, label })
    if (flag === 'fail') return icon({ name: 'close', className, label })
    if (extraClass) return ''
    return icon({
        name: 'remove_circle',
        className,
        label,
        title: 'This commit removes this file',
    })
}

const progressBar = (row: FileRow): SafeHtml => {
    let diffClass = `progress-bar-${row.flag}`
    if (row.flag === 'pass' && row.isDiffNegative) {
        diffClass = 'progress-bar-pass-negative'
    }
    return html`<div class="progress-bar-container">
                                    <div class="progress-bar progress-bar-last-size"
                                         style="width:${cssPercentage(row.baseBranchSizePercentage)}%"></div>
                                    <div class="progress-bar ${diffClass}"
                                         style="width:${cssPercentage(row.diffPercentage)}%"></div>
                                </div>`
}

const fileRowHtml = (row: FileRow): SafeHtml => html`
                <tr>
                    <td class="cell-status">
                        ${statusIcon(row.flag, '')}
                    </td>
                    <td class="file-path-cell">
                        ${row.filePath} <br/>
                    </td>
                    <td>
                        <div class="progress-bar-cell">
                            ${row.flag === 'removed' ? 'This commit removed this file' : progressBar(row)}
                        </div>
                    </td>
                    <td>${row.prettySize}</td>
                    <td>
                        ${row.prettyDiffSize ?? html`<span title="Not available">n/a</span>`}
                    </td>
                    <td>${row.prettyMaxSize}</td>
                </tr>`

const repoInfo = ({ details }: ResultsData): SafeHtml | '' => {
    const { repoOwner, repoName, repoCurrentBranch, commitSha } = details
    if (!(repoOwner && repoName && repoCurrentBranch && commitSha)) {
        return ''
    }
    const repoUrl = `https://github.com/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}`
    return html`<a href="${repoUrl}">${repoOwner}/${repoName}</a>
            (${repoCurrentBranch})
            @ <a href="${repoUrl}/commit/${encodeURIComponent(commitSha)}">${commitSha.slice(0, 8)}</a>`
}

export const serverCommitFooter = (
    serverCommitSha: string | undefined,
): SafeHtml => html`<footer>
    ${footerLinks}
    ${
        serverCommitSha &&
        html`<div class="server-commit-sha">
        <p>
            <a href="https://github.com/bundlewatch/bundlewatch/commit/${encodeURIComponent(serverCommitSha)}">${serverCommitSha}</a>
        </p>
    </div>`
    }
</footer>`

export const renderResultsPage = ({
    payload,
    serverCommitSha,
}: {
    payload: ResultsData
    serverCommitSha?: string | undefined
}): string => {
    const { results } = payload
    const rows = results.fullResults.map(toFileRow)
    return page({
        title: 'Build Results | BundleWatch',
        stylesheet: '/static/results-styles.css',
        body: html`<article class="container">
    ${logoHeader}
    <div class="repo-info">
        ${repoInfo(payload)}
    </div>
    <div class="build-info">
        <span class="build-info-text big dark">
            ${statusIcon(flagFor(results.status), 'big-icon')}
            ${results.summary}
        </span>
    </div>

    <div class="table-wrapper">
        <table>
            <thead>
            <tr class="row-header">
                <th class="column-status column-header">Status</th>
                <th class="column-file column-header">File</th>
                <th class="column-bundle column-header">Bundle</th>
                <th class="column-now column-header">Now</th>
                <th class="column-diff column-header">Diff</th>
                <th class="column-max column-header">Max</th>
            </tr>
            </thead>
            <tbody>${rows.map(fileRowHtml)}
            </tbody>
        </table>
    </div>
</article>

${serverCommitFooter(serverCommitSha)}`,
    })
}

export const renderResultsNotFoundPage = ({
    serverCommitSha,
}: {
    serverCommitSha?: string | undefined
}): string =>
    page({
        title: 'Results not found | BundleWatch',
        stylesheet: '/static/results-styles.css',
        body: html`<article class="container">
    ${logoHeader}
    <div class="build-info">
        <span class="build-info-text big dark">Results not found</span>
    </div>
    <p class="repo-info">This results link doesn't exist or has expired.</p>
</article>

${serverCommitFooter(serverCommitSha)}`,
    })
