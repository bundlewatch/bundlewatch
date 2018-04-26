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
    const url = `${bundlesizeServiceHost}/results?d=${urlResultData}`
    return url
}

export default createURL
