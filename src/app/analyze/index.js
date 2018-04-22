import analyzeFiles from './analyzeFiles'

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
        isFail: fileResults.reduce((isFail, fileResult) => {
            return isFail || fileResult.isFail
        }, false),
        fullResults: fileResults,
        summary,
    }
}

export default analyze
