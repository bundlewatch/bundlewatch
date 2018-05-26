import axios from 'axios'

import logger from '../../../logger'

const getContextForFilePath = filePath => {
    let context = 'bundlewatch'
    if (filePath) {
        const TRUNCATE_TO_LENGTH = 35
        if (filePath.length > TRUNCATE_TO_LENGTH) {
            context +=
                ' *' +
                filePath.substring(
                    filePath.length - TRUNCATE_TO_LENGTH - 2,
                    filePath.length,
                )
        } else {
            context += ' ' + filePath
        }
    }
    return context
}

class GitHubService {
    constructor({ repoOwner, repoName, commitSha, githubAccessToken }) {
        this.repoOwner = repoOwner
        this.repoName = repoName
        this.commitSha = commitSha
        this.githubAccessToken = githubAccessToken
        this.contexts = new Set()
    }

    get repo() {
        return `${this.repoOwner}/${this.repoName}`
    }

    get enabled() {
        if (
            this.githubAccessToken &&
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

        const context = getContextForFilePath(filePath)

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
            timeout: 5000,
            headers: {
                Authorization: `token ${this.githubAccessToken}`,
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

    createIssueComment({ body }) {
        return axios({
            method: 'POST',
            url: `https://api.github.com/repos/${this.repo}/issues/25/comments`,
            responseType: 'json',
            data: {
                body,
            },
            timeout: 5000,
            headers: {
                Authorization: `token ${this.githubAccessToken}`,
            },
        }).catch(error => {
            console.error(error)
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
