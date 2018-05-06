import lodashMerge from 'lodash.merge'

import getCIVars from './getCIVars'
import ensureValid from './ensureValid'

const ciVars = getCIVars(process.env)

const defaultConfig = {
    files: [],
    bundlewatchServiceHost: 'https://service.bundlewatch.io', // Can be a custom service, or set to NUll
    ci: {
        githubAccessToken: ciVars.githubAccessToken,
        repoOwner: ciVars.repoOwner,
        repoName: ciVars.repoName,
        repoCurrentBranch: ciVars.repoCurrentBranch,
        repoBranchBase: ciVars.repoBranchBase || 'master', // Branch PR is being merged into
        commitSha: ciVars.commitSha,
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
