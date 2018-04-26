import analyzeFiles, { STATUS } from './analyzeFiles'

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

    // TODO: determine overall stats
    const summary = `TODO: create sumary`

    return {
        status: fileResults.reduce((status, fileResult) => {
            if (status === STATUS.FAIL || fileResult.status === STATUS.FAIL) {
                return STATUS.FAIL
            }
            if (status === STATUS.WARN || fileResult.status === STATUS.WARN) {
                return STATUS.WARN
            }
            return STATUS.PASS
        }, STATUS.PASS),
        fullResults: fileResults,
        summary,
    }
}

export default analyze
