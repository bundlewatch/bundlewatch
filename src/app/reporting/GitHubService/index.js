import axios from 'axios'

import logger from '../../../logger'

class GitHubService {
    constructor({ repoOwner, repoName, commitSha, githubAuthToken }) {
        this.repoOwner = repoOwner
        this.repoName = repoName
        this.commitSha = commitSha
        this.githubAuthToken = githubAuthToken
        this.statusCount = 0
    }

    get repo() {
        return `${this.repoOwner}/${this.repoName}`
    }

    get enabled() {
        if (
            this.githubAuthToken &&
            this.repoOwner &&
            this.repoName &&
            this.commitSha
        ) {
            return true
        }

        return false
    }

    update(message, url, status, isOverallStatus = true) {
        if (!this.enabled) {
            return Promise.resolve({})
        }

        let context = 'bundlesize'
        if (isOverallStatus) {
            this.statusCount += 1
            context += this.statusCount
        }

        return axios({
            method: 'POST',
            url: `https://api.github.com/repos/${this.repo}/statuses/${
                this.commitSha
            }`,
            responseType: 'json',
            data: {
                state: status,
                target_url: url,
                description: message,
                context,
            },
            headers: {
                Authorization: `token ${this.githubAuthToken}`,
            },
        }).catch(error => {
            if (error.response) {
                logger.error(
                    `GitHubService HTTP_${error.response.status} :: ${
                        error.response.data ? error.response.data.message : ''
                    }`,
                )
                return
            }
            throw error
        })
    }

    start({ message }) {
        return this.update(message, undefined, 'pending')
    }
    pass({ message, url }) {
        return this.update(message, url, 'success')
    }
    fail({ message, url, isOverallStatus }) {
        return this.update(message, url, 'failure', isOverallStatus)
    }
    error({ message }) {
        return this.update(message, undefined, 'error')
    }
}

export default GitHubService
