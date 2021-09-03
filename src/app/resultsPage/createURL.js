import lodashMerge from 'lodash.merge'
import lzString from 'lz-string'
import shortenURL from './shortenURL'

const createURL = async ({
    results,
    bundlewatchServiceHost,
    repoOwner,
    repoName,
    repoCurrentBranch,
    repoBranchBase,
    commitSha,
}) => {
    const strippedResultsForURL = lodashMerge({}, results)
    strippedResultsForURL.fullResults.map((result) => {
        const strippedResult = result
        delete strippedResult.message
        return strippedResult
    })

    const urlResultData = lzString.compressToEncodedURIComponent(JSON.stringify({
        details: {
            repoOwner,
            repoName,
            repoCurrentBranch,
            repoBranchBase,
            commitSha,
        },
        results: strippedResultsForURL,
    }))
    const longURL = `${bundlewatchServiceHost}/results?d=${urlResultData}`
    const shortURL = await shortenURL(longURL)
    return shortURL
}

export default createURL
