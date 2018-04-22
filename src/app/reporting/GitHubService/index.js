import axios from 'axios'

import logger from '../../../logger'

class GitHubService {
    constructor({ repoOwner, repoName, commitSha, githubAuthToken }) {
        this.repoOwner = repoOwner
        this.repoName = repoName
        this.commitSha = commitSha
        this.githubAuthToken = githubAuthToken
        this.contexts = new Set()
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

    update(message, url, status, filePath) {
        if (!this.enabled) {
            return Promise.resolve({})
        }

        let context = filePath || 'bundlesize'
        if (context.length > 20) {
            context = context.substring(context.length - 17, context.length)
            context = '...' + context
        }
        if (!this.contexts.has(context) && this.contexts.size >= 5) {
            logger.warn(
                `Max reported statuses reached, github status will not be reported`,
            )
            return Promise.resolve()
        }
        this.contexts.add(context)

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
    fail({ message, url, filePath }) {
        return this.update(message, url, 'failure', filePath)
    }
    error({ message }) {
        return this.update(message, undefined, 'error')
    }
}

export default GitHubService
