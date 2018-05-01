import lodashMerge from 'lodash.merge'

import ciEnv from './ciEnv'
import ensureValid from './ensureValid'

const defaultConfig = {
    files: [],
    bundlewatchServiceHost: 'https://service.bundlewatch.io', // Can be a custom service, or set to NUll
    ci: {
        githubAccessToken: ciEnv.githubAccessToken,
        repoOwner: ciEnv.repoOwner,
        repoName: ciEnv.repoName,
        repoCurrentBranch: ciEnv.repoCurrentBranch,
        repoBranchBase: ciEnv.repoBranchBase || 'master', // Branch PR is being merged into
        commitSha: ciEnv.commitSha,
        trackBranches: ['master', 'develop'],
    },
    defaultCompression: 'gzip',
}

const getConfig = customConfig => {
    const config = lodashMerge({}, defaultConfig, customConfig)
    ensureValid(config)
    return config
}

export default getConfig
