import lodashMerge from 'lodash.merge'
import jsonpack from 'jsonpack/main'
import shortenURL from './shortenURL'

const createURL = async ({
    results,
    bundlewatchServiceHost,
    shortenURLServiceHost,
    repoOwner,
    repoName,
    repoCurrentBranch,
    repoBranchBase,
    commitSha,
}) => {
    if (bundlewatchServiceHost === false) return;

    const strippedResultsForURL = lodashMerge({}, results)
    strippedResultsForURL.fullResults.map((result) => {
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
    const longURL = `${bundlewatchServiceHost}/results?d=${urlResultData}`
    const shortURL = await shortenURL(longURL, shortenURLServiceHost)
    return shortURL || longURL;
}

export default createURL
