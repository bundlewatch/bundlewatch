import logger from '../../../logger'
import axios from 'axios'

class BundlewatchService {
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
    get enabled() {
        return !!(
            this.githubAccessToken &&
            this.repoOwner &&
            this.repoName &&
            this.bundlewatchServiceHost
        )
    }

    analyzeAsync({ currentBranchFileDetails }) {
        if (!this.enabled || !this.repoCurrentBranch) {
            return Promise.resolve()
        }

        logger.info(`Analyzing files`)

        return axios
            .post(
                `${this.bundlewatchServiceHost}/analyze`,
                {
                    repoOwner: this.repoOwner,
                    repoName: this.repoName,
                    repoBranch: this.repoCurrentBranch,
                    baseBranchName: this.repoBranchBase,
                    githubAccessToken: this.githubAccessToken,
                    bundlewatchServiceHost: this.bundlewatchServiceHost,
                    commitSha: this.commitSha,
                    currentBranchFileDetails,
                },
                {
                    timeout: 10000,
                },
            )
            .catch(error => {
                logger.debug(error)
                logger.error(
                    `Unable to analyze fileDetails for currentBranch=${
                        this.repoCurrentBranch
                    } code=${error.code || error.message}`,
                )
            })
    }
}

export default BundlewatchService
