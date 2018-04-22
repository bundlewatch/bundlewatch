// // https://developer.github.com/v3/repos/statuses/
//
//
//
//
//
// class Build {
//   constructor(meta) {
//     meta.context = meta.label
//     meta.target_url = meta.url
//     this.meta = meta
//   }
//   start (message, url) {return update(this.meta, message, url, 'pending')}
//   pass  (message, url) {return update(this.meta, message, url, 'success')}
//   fail  (message, url) {return update(this.meta, message, url, 'failure')}
//   error (message, url) {return update(this.meta, message, url, 'error')}
// }
//
// const update = (build, message, url, status) => new Promise((resolve, reject) => {
//   axios({
//     method: 'POST',
//     url: `https://api.github.com/repos/${build.repo}/statuses/${build.sha}`,
//     responseType: 'json',
//     data: {
//       state: status,
//       target_url: url || build.url,
//       description: message || build.description,
//       context: build.context
//     },
//     headers: {'Authorization': `token ${build.token}`}
//   })
//   .then(({status, data}) => resolve({status, data}))
//   .catch(({response = {status: 500}}) => reject({
//       status: response.status,
//       error: response.data
//     }))
// })
//
//
//
// // const prettycli = require('prettycli')
// // const { repo, sha } = require('ci-env')
// // const token = require('./token')
// // const debug = require('./debug')
// //
// // let pass = () => {} // noop
// // let fail = () => process.exit(1)
// // let error = () => process.exit(1)
// //
// // const label = 'bundlesize'
// // const description = 'Checking output size...'
// // const meta = { repo, sha, token, label, description }
// //
// // const github = new Build(meta)
// //
// // debug('token exists', !!token)
// // debug('repo', repo)
// // debug('sha', sha)
// //
// // if (token) {
// //     const handleError = err => {
// //         const message = `Could not add github status.
// //         ${err.status}: ${err.error.message}`
// //
// //         prettycli.error(message, { silent: true, label: 'ERROR' })
// //     }
// //
// //     github.start().catch(handleError)
// //     pass = (message, url) => github.pass(message, url).catch(handleError)
// //     fail = (message, url) => github.fail(message, url).catch(handleError)
// //     error = (message, url) => github.error(message, url).catch(handleError)
// // }
// //
// // module.exports = { pass, fail, error }
//
//
// // const setBuildStatus = ({
// //     url,
// //     files,
// //     globalMessage,
// //     fail,
// //     event: currentEvent,
// //     branch: currentBranch,
// // }) => {
// //     if (fail) build.fail(globalMessage || 'bundle size > maxSize', url)
// //     else {
// //         if (currentEvent === 'push' && currentBranch === 'master') {
// //             const values = []
// //             files.map(file => values.push({ path: file.path, size: file.size }))
// //             api.set(values)
// //         }
// //         build.pass(globalMessage || 'Good job! bundle size < maxSize', url)
// //     }
// //
// //     debug('global message', globalMessage)
// // }
//
//
//
// //
// //
// //
// // const report = ({ files, globalMessage, fail }) => {
// //     /* prepare the build page */
// //     const params = encodeURIComponent(
// //         JSON.stringify({ files, repo, branch, commitMessage, sha }),
// //     )
// //     let url = `https://bundlesize-store.now.sh/build?info=${params}`
// //
// //     debug('url', url)
// //
// //
// // }
