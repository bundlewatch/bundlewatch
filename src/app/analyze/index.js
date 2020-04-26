import bytes from 'bytes'
import analyzeFiles, { STATUSES } from './analyzeFiles'

const getOverallStatus = (fileResults) => {
    return fileResults.reduce((status, fileResult) => {
        if (status === STATUSES.FAIL || fileResult.status === STATUSES.FAIL) {
            return STATUSES.FAIL
        }
        if (status === STATUSES.WARN || fileResult.status === STATUSES.WARN) {
            return STATUSES.WARN
        }
        return STATUSES.PASS
    }, STATUSES.PASS)
}

export const getOverallDifference = (fullResults) => {
    let totalBaseBranchSize = 0
    let totalFileResultSize = 0
    let totalAdded = 0
    let totalRemoved = 0
    fullResults.forEach((fileResult) => {
        totalBaseBranchSize += fileResult.baseBranchSize
        totalFileResultSize += fileResult.size
        if (fileResult.size < fileResult.baseBranchSize) {
            totalRemoved += fileResult.baseBranchSize - fileResult.size
        } else {
            totalAdded += fileResult.size - fileResult.baseBranchSize
        }
    })
    const percentageChange = totalBaseBranchSize
        ? ((totalFileResultSize - totalBaseBranchSize) / totalBaseBranchSize) *
          100
        : null

    return {
        totalAdded,
        totalRemoved,
        percentageChange,
    }
}

export const getPercentageChangeString = (percentageChange) => {
    if (percentageChange === null) {
        return ''
    }
    const percentageChangeFixed = percentageChange.toFixed(1)
    if (percentageChange > 0) {
        return `+${percentageChangeFixed}%`
    }
    if (percentageChange < 0) {
        return `${percentageChangeFixed}%`
    }
    return `±${percentageChangeFixed}%`
}

const getSummary = ({ overallStatus, fullResults, baseBranchName }) => {
    if (overallStatus === STATUSES.FAIL) {
        return `maxSize check failed`
    }

    let differenceSummary = ''
    if (baseBranchName) {
        const {
            totalAdded,
            totalRemoved,
            percentageChange,
        } = getOverallDifference(fullResults)
        const percentageChangeString = getPercentageChangeString(
            percentageChange,
        )
        const percentageChangeStringWithComma = percentageChangeString
            ? `, ${percentageChangeString}`
            : ''
        differenceSummary = `(+${bytes(totalAdded)}, -${bytes(
            totalRemoved,
        )}${percentageChangeStringWithComma})`
    }

    if (overallStatus === STATUSES.WARN) {
        return `File(s) have passed tolerance thresholds ${differenceSummary}`
    }
    return `Everything is in check ${differenceSummary}`
}

const analyze = ({
    currentBranchFileDetails,
    baseBranchFileDetails,
    baseBranchName,
}) => {
    const fileResults = analyzeFiles({
        currentBranchFileDetails,
        baseBranchFileDetails,
        baseBranchName,
    })

    const overallStatus = getOverallStatus(fileResults)
    const summary = getSummary({
        overallStatus,
        fullResults: fileResults,
        baseBranchName,
    })

    return {
        status: overallStatus,
        fullResults: fileResults,
        summary,
    }
}

export default analyze
