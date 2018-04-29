import bytes from 'bytes'
import analyzeFiles, { STATUSES } from './analyzeFiles'

const getOverallStatus = fileResults => {
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

const getOverallDifference = fullResults => {
    let totalAdded = 0
    let totalRemoved = 0
    fullResults.forEach(fileResult => {
        if (fileResult.size < fileResult.baseBranchSize) {
            totalRemoved += fileResult.baseBranchSize - fileResult.size
        } else {
            totalAdded += fileResult.size - fileResult.baseBranchSize
        }
    })
    return {
        totalAdded,
        totalRemoved,
    }
}

const getSummary = ({ overallStatus, fullResults, baseBranchName }) => {
    if (overallStatus === STATUSES.FAIL) {
        return `maxSize check failed`
    }

    let differenceSummary = ''
    if (baseBranchName) {
        const { totalAdded, totalRemoved } = getOverallDifference(fullResults)
        differenceSummary = `(+${bytes(totalAdded)}, -${bytes(totalRemoved)})`
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
