import lodashMerge from 'lodash.merge'
import jsonpack from 'jsonpack/main'

const createURL = ({
    results,
    bundlesizeServiceHost,
    repoOwner,
    repoName,
    repoCurrentBranch,
    repoBranchBase,
    commitSha,
}) => {
    const strippedResultsForURL = lodashMerge({}, results)
    strippedResultsForURL.fullResults.map(result => {
        const strippedResult = result
        delete strippedResult.message
        return strippedResult
    })

    const packedJSON = jsonpack.pack({
        details: {
            repoOwner,
            repoName,
            repoCurrentBranch,
            repoBranchBase,
            commitSha,
        },
        results: strippedResultsForURL,
    })
    const urlResultData = encodeURIComponent(packedJSON)
    const url = `${bundlesizeServiceHost}/results?d=${urlResultData}`
    return url
}

export default createURL
