import jsonpack from 'jsonpack/main'
import shortenURL from './shortenURL'

const createURL = async ({
    results,
    bundlesizeServiceHost,
    repoOwner,
    repoName,
    repoCurrentBranch,
    repoBranchBase,
    commitSha,
}) => {
    // TODO strip out data, etc
    // TODO url shortern service?
    const packedJSON = jsonpack.pack({
        details: {
            repoOwner,
            repoName,
            repoCurrentBranch,
            repoBranchBase,
            commitSha,
        },
        results,
    })
    const urlResultData = encodeURIComponent(packedJSON)
    const longURL = `${bundlesizeServiceHost}/results?d=${urlResultData}`
    const shortURL = await shortenURL(longURL)
    return shortURL
}

export default createURL
