import getLocalFileDetails from './getLocalFileDetails'
import BundlesizeService from './reporting/BundlesizeService'
import analyze from './analyze'
import getConfig from './config/getConfig'
import createURLToResultPage from './resultsPage/createURL'

const main = async ({
    files,
    bundlesizeServiceHost,
    ci,
    defaultCompression,
}) => {
    const currentBranchFileDetails = getLocalFileDetails({
        files,
        defaultCompression: defaultCompression,
    })

    const service = new BundlesizeService({
        repoOwner: ci.repoOwner,
        repoName: ci.repoName,
        repoCurrentBranch: ci.repoCurrentBranch,
        repoBranchBase: ci.repoBranchBase,
        commitSha: ci.commitSha,
        bundlesizeServiceHost,
        githubAuthToken: ci.githubAuthToken,
    })

    const baseBranchFileDetails = await service.getFileDetailsForBaseBranch()
    await service.saveFileDetailsForCurrentBranch({
        fileDetailsByPath: currentBranchFileDetails,
        trackBranches: ci.trackBranches,
    })

    const results = analyze({
        currentBranchFileDetails,
        baseBranchFileDetails,
        baseBranchName: ci.repoBranchBase,
    })

    const url = createURLToResultPage({
        results,
        bundlesizeServiceHost,
    })

    // setBuildStatus({ url, files, globalMessage, fail, event, branch })

    return {
        ...results,
        url,
    }
}

const bundleSizeApi = async customConfig => {
    const config = getConfig(customConfig)

    try {
        return main(config)
    } catch (e) {
        // CIReporting.error()
        throw e
    }
}

export default bundleSizeApi
