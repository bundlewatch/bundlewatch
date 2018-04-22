import logger from '../../../logger'
import axios from 'axios'

class BundlesizeService {
    constructor({
        repoOwner,
        repoName,
        repoBranchBase,
        repoCurrentBranch,
        commitSha,
        bundlesizeServiceHost,
        githubAuthToken,
    }) {
        this.repoOwner = repoOwner
        this.repoName = repoName
        this.repoBranchBase = repoBranchBase
        this.repoCurrentBranch = repoCurrentBranch
        this.commitSha = commitSha
        this.bundlesizeServiceHost = bundlesizeServiceHost
        this.githubAuthToken = githubAuthToken
    }

    get bundlesizeServiceStoreUrl() {
        return `${this.bundlesizeServiceHost}/store`
    }

    get enabled() {
        if (
            this.githubAuthToken &&
            this.repoOwner &&
            this.repoName &&
            this.bundlesizeServiceHost
        ) {
            return true
        }

        return false
    }

    getFileDetailsForBaseBranch() {
        if (!this.enabled || !this.repoBranchBase) {
            return Promise.resolve({})
        }

        return axios
            .post(`${this.bundlesizeServiceStoreUrl}/lookup`, {
                repoOwner: this.repoOwner,
                repoName: this.repoName,
                repoBranch: this.repoBranchBase,
                githubAuthToken: this.githubAuthToken,
            })
            .then(response => {
                return response.data.fileDetailsByPath
            })
            .catch(error => {
                logger.error(
                    `Unable to fetch fileDetails for base branch`,
                    error,
                )
                return {}
            })
    }

    saveFileDetailsForCurrentBranch({ fileDetailsByPath, trackBranches }) {
        if (!this.enabled || !this.repoCurrentBranch || !!this.repoBranchBase) {
            return Promise.resolve()
        }

        if (!trackBranches.includes(this.repoCurrentBranch)) {
            return Promise.resolve()
        }

        return axios
            .post(`${this.bundlesizeServiceStoreUrl}`, {
                repoOwner: this.repoOwner,
                repoName: this.repoName,
                repoBranch: this.repoCurrentBranch,
                githubAuthToken: this.githubAuthToken,
                commitSha: this.commitSha,
                fileDetailsByPath,
            })
            .catch(error => {
                logger.error(
                    `Unable to save fileDetails for current branch`,
                    error,
                )
            })
    }
}

export default BundlesizeService
