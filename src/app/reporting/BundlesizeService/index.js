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
        githubAccessToken,
    }) {
        this.repoOwner = repoOwner
        this.repoName = repoName
        this.repoBranchBase = repoBranchBase
        this.repoCurrentBranch = repoCurrentBranch
        this.commitSha = commitSha
        this.bundlesizeServiceHost = bundlesizeServiceHost
        this.githubAccessToken = githubAccessToken
    }

    get bundlesizeServiceStoreUrl() {
        return `${this.bundlesizeServiceHost}/store`
    }

    get enabled() {
        if (
            this.githubAccessToken &&
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

        logger.info(`Retrieve comparison`)

        return axios
            .post(`${this.bundlesizeServiceStoreUrl}/lookup`, {
                repoOwner: this.repoOwner,
                repoName: this.repoName,
                repoBranch: this.repoBranchBase,
                githubAccessToken: this.githubAccessToken,
                commitSha: this.commitSha,
            })
            .then(response => {
                return response.data.fileDetailsByPath
            })
            .catch(error => {
                logger.error(
                    `Unable to fetch fileDetails for baseBranch=${
                        this.repoBranchBase
                    } from ${
                        this.bundlesizeServiceStoreUrl
                    } code=${error.code || error.message}`,
                )
                return {}
            })
    }

    saveFileDetailsForCurrentBranch({ fileDetailsByPath, trackBranches }) {
        if (!this.enabled || !this.repoCurrentBranch) {
            return Promise.resolve()
        }

        if (
            this.repoBranchBase &&
            this.repoCurrentBranch !== this.repoBranchBase
        ) {
            logger.info(
                `${this.repoBranchBase} !== ${
                    this.repoCurrentBranch
                }, no results saved`,
            )
        }

        if (!trackBranches.includes(this.repoCurrentBranch)) {
            logger.info(
                `${
                    this.repoCurrentBranch
                } is not a branch to track, no results saved`,
            )
            return Promise.resolve()
        }

        logger.info(`Saving results`)

        return axios
            .post(`${this.bundlesizeServiceStoreUrl}`, {
                repoOwner: this.repoOwner,
                repoName: this.repoName,
                repoBranch: this.repoCurrentBranch,
                githubAccessToken: this.githubAccessToken,
                commitSha: this.commitSha,
                fileDetailsByPath,
            })
            .catch(error => {
                logger.error(
                    `Unable to save fileDetails for currentBranch=${
                        this.repoCurrentBranch
                    } code=${error.code || error.message}`,
                    error,
                )
            })
    }
}

export default BundlesizeService
