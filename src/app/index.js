import getLocalFileDetails from './getLocalFileDetails'
import BundlesizeService from './reporting/BundlesizeService'
import GitHubService from './reporting/GitHubService'
import analyze from './analyze'
import { STATUSES } from './analyze/analyzeFiles'
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

    const bundlesizeService = new BundlesizeService({
        repoOwner: ci.repoOwner,
        repoName: ci.repoName,
        repoCurrentBranch: ci.repoCurrentBranch,
        repoBranchBase: ci.repoBranchBase,
        commitSha: ci.commitSha,
        bundlesizeServiceHost,
        githubAccessToken: ci.githubAccessToken,
    })

    const baseBranchFileDetails = await bundlesizeService.getFileDetailsForBaseBranch()
    await bundlesizeService.saveFileDetailsForCurrentBranch({
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
        repoOwner: ci.repoOwner,
        repoName: ci.repoName,
        repoCurrentBranch: ci.repoCurrentBranch,
        repoBranchBase: ci.repoBranchBase,
        commitSha: ci.commitSha,
    })

    return {
        ...results,
        url,
    }
}

const bundleSizeApi = async customConfig => {
    const config = getConfig(customConfig)
    const githubService = new GitHubService({
        repoOwner: config.ci.repoOwner,
        repoName: config.ci.repoName,
        commitSha: config.ci.commitSha,
        githubAccessToken: config.ci.githubAccessToken,
    })
    await githubService.start({ message: 'Checking bundlesize...' })

    try {
        const results = await main(config)
        if (results.status === STATUSES.FAIL) {
            await githubService.fail({
                message: results.summary,
                url: results.url,
            })

            await Promise.all(
                results.fullResults.map(result => {
                    if (result.status === STATUSES.FAIL) {
                        return githubService.fail({
                            message: result.message,
                            filePath: result.filePath,
                        })
                    }
                    return Promise.resolve()
                }),
            )
        } else {
            // TODO: add warn
            await githubService.pass({
                message: results.summary,
                url: results.url,
            })
        }
        return results
    } catch (e) {
        await githubService.error({
            message: `Unable to analyze, check logs. ${e ? e.messsage : ''}`,
        })
        throw e
    }
}

export default bundleSizeApi
export { STATUSES }
