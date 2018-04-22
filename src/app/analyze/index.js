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
    return {
        isFail: fileResults.reduce((isFail, fileResult) => {
            return isFail || fileResult.isFail
        }, false),
        fullResults: fileResults,
    }
}

export default analyze
