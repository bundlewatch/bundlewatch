import logger from '../../../logger'
import axios from 'axios'

class bundlewatchService {
    constructor({
        repoOwner,
        repoName,
        repoBranchBase,
        repoCurrentBranch,
        commitSha,
        bundlewatchServiceHost,
        githubAccessToken,
    }) {
        this.repoOwner = repoOwner
        this.repoName = repoName
        this.repoBranchBase = repoBranchBase
        this.repoCurrentBranch = repoCurrentBranch
        this.commitSha = commitSha
        this.bundlewatchServiceHost = bundlewatchServiceHost
        this.githubAccessToken = githubAccessToken
    }

    get bundlewatchServiceStoreUrl() {
        return `${this.bundlewatchServiceHost}/store`
    }

    get enabled() {
        if (
            this.githubAccessToken &&
            this.repoOwner &&
            this.repoName &&
            this.bundlewatchServiceHost
        ) {
            return true
        }

        return false
    }

    getFileDetailsForBaseBranch() {
        if (!this.enabled || !this.repoBranchBase) {
            return Promise.resolve({})
        }

        logger.info(`Retrieving comparison`)

        return axios
            .post(
                `${this.bundlewatchServiceStoreUrl}/lookup`,
                {
                    repoOwner: this.repoOwner,
                    repoName: this.repoName,
                    repoBranch: this.repoBranchBase,
                    githubAccessToken: this.githubAccessToken,
                    commitSha: this.commitSha,
                },
                {
                    timeout: 10000,
                },
            )
            .then((response) => {
                return response.data.fileDetailsByPath
            })
            .catch((error) => {
                logger.debug(error)
                logger.error(
                    `Unable to fetch fileDetails for baseBranch=${
                        this.repoBranchBase
                    } from ${this.bundlewatchServiceStoreUrl} code=${
                        error.code || error.message
                    }`,
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
                `${this.repoBranchBase} !== ${this.repoCurrentBranch}, no results saved`,
            )
        }

        if (!trackBranches.includes(this.repoCurrentBranch)) {
            logger.info(
                `${this.repoCurrentBranch} is not a branch to track, no results saved`,
            )
            return Promise.resolve()
        }

        logger.info(`Saving results`)

        return axios
            .post(
                `${this.bundlewatchServiceStoreUrl}`,
                {
                    repoOwner: this.repoOwner,
                    repoName: this.repoName,
                    repoBranch: this.repoCurrentBranch,
                    githubAccessToken: this.githubAccessToken,
                    commitSha: this.commitSha,
                    fileDetailsByPath,
                },
                {
                    timeout: 10000,
                },
            )
            .catch((error) => {
                logger.debug(error)
                logger.error(
                    `Unable to save fileDetails for currentBranch=${
                        this.repoCurrentBranch
                    } code=${error.code || error.message}`,
                )
            })
    }
}

export default bundlewatchService
