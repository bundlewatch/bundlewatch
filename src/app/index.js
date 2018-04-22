import getLocalFileDetails from './getLocalFileDetails'
import BundlesizeService from './reporting/BundlesizeService'
import GitHubService from './reporting/GitHubService'
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

    const bundlesizeService = new BundlesizeService({
        repoOwner: ci.repoOwner,
        repoName: ci.repoName,
        repoCurrentBranch: ci.repoCurrentBranch,
        repoBranchBase: ci.repoBranchBase,
        commitSha: ci.commitSha,
        bundlesizeServiceHost,
        githubAuthToken: ci.githubAuthToken,
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
        githubAuthToken: config.ci.githubAuthToken,
    })
    await githubService.start({ message: 'Checking bundlesize...' })

    try {
        const results = await main(config)
        if (results.isFail) {
            await githubService.fail({
                message: results.summary,
                url: results.url,
            })

            let failCount = 0
            await Promise.all(
                results.fullResults.map(result => {
                    if (result.isFail && failCount <= 5) {
                        failCount += 0
                        const message =
                            failCount === 5
                                ? `More than 4 failed files, see details for full report`
                                : result.message
                        return githubService.fail({
                            message,
                            isOverallStatus: false,
                        })
                    }
                    return Promise.resolve()
                }),
            )
        } else {
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
