import getLocalFileDetails from './getLocalFileDetails'
import BundleWatchService from './reporting/BundleWatchService'
import getConfig from './config/getConfig'
import logger from '../logger'

const analyzeAsync = ({
    files,
    bundlewatchServiceHost,
    ci,
    defaultCompression,
}) => {
    const currentBranchFileDetails = getLocalFileDetails({
        files,
        defaultCompression: defaultCompression,
    })

    const bundlewatchService = new BundleWatchService({
        repoOwner: ci.repoOwner,
        repoName: ci.repoName,
        repoCurrentBranch: ci.repoCurrentBranch,
        repoBranchBase: ci.repoBranchBase,
        commitSha: ci.commitSha,
        bundlewatchServiceHost,
        githubAccessToken: ci.githubAccessToken,
    })

    bundlewatchService.analyzeAsync({
        currentBranchFileDetails,
    })
}

const bundlewatchApi = async customConfig => {
    const config = getConfig(customConfig)

    try {
        analyzeAsync(config)
    } catch (e) {
        logger.error('analyzeAsync error', e.message)
    }
}

export default bundlewatchApi
