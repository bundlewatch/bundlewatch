<div align="center">
  <a href="http://bundlewatch.io">
    <img src="https://cdn.rawgit.com/bundlewatch/bundlewatch.io/master/docs/_assets/logo-large.svg" height="100px">
  </a>
  <br>
  <br>

[![npm][npm]][npm-url]
[![bundlewatch][bundlewatch]][bundlewatch-url]

[![node][node]][node-url]
[![deps][deps]][deps-url]
[![builds][builds]][builds-url]
[![licenses][licenses]][licenses-url]


  <br>
	<a href="https://npmcharts.com/compare/bundlewatch?minimal=true">
		<img src="https://img.shields.io/npm/dm/bundlewatch.svg">
	</a>
	<a href="https://github.com/bundlewatch/bundlewatch/graphs/contributors">
		<img src="https://img.shields.io/github/contributors/bundlewatch/bundlewatch.svg">
	</a>
  <h1>BundleWatch</h1>
  <p>
    BundleWatch is a file size checker. Its main purpose is to ensure bundled browser assets don't jump in file size. <br />
    Sharp increases in BundleWatch can signal that something is wrong: adding a package that bloated the slug, a wrong import, forgetting to minify.
  </p>
</div>

Inspired by [Siddharth Kshetrapal bundlesize](https://github.com/siddharthkp/bundlesize)

# Getting Started and Configuration
To get started with BundleWatch, head over to the [documentation on bundlewatch.io](http://bundlewatch.io/)




## Installation
- NPM: `npm install bundlewatch --save-dev`
- Yarn: `yarn add bundlewatch --dev`


## Basic Usage
```bash
$yarn run bundlewatch --max-size 100kb ./webpack-build/*.js

Result breakdown at: https://ja2r7.app.goo.gl/aDzEQjBVMXxrCgaa7

PASS ./webpack-build/app.js: 30.71KB < 100KB (gzip)
FAIL ./webpack-build/vendor.js: 198.6KB > 100KB (gzip)

BundleWatch FAIL
```
As seen above, BundleWatch is running the files through a maxSize check.


?> BundleWatch can do a lot more, too! [check out the-best-parts of BundleWatch](getting-started/the-best-parts.md?id=the-best-parts)


# The Best Parts
BundleWatch reports when files are over maxSize, but can also:
- Report build statuses back to GitHub
- Show how many files have changed (against develop, master etc)

## Build Status and Diffing
Let's run through getting setup up with build status:
![build status preview](https://raw.githubusercontent.com/bundlewatch/bundlewatch.io/master/docs/_assets/build-status-preview.png)
### CI Variables needed by bundlewatch
The most efficient way to get this running is to ensure that some environment variables are available for BundleWatch to find.
- `CI_REPO_OWNER` github.com/**facebook**/react
- `CI_REPO_NAME`  github.com/facebook/**react**
- `CI_BRANCH`
- `CI_COMMIT_SHA`

If you're using, _Travis_, _CircleCI_ or _Wrecker_ these should all work out of the box.

!> Have a look at the source code to see which variables are automatically found: https://github.com/bundlewatch/bundlewatch/blob/master/src/app/config/ciEnv.js#L36-L39

> If CI variables aren't for you, you can also set them using config files or the Node API.

### CI Auth Variables Needed by BundleWatch
- `BUNDLEWATCH_GITHUB_TOKEN`

You will need to give BundleWatch access to your GitHub Statuses, which can be done by heading to:
https://service.bundlewatch.io/setup-github

This will give you your `BUNDLEWATCH_GITHUB_TOKEN`. You will need to set this as an environment variable in CI.

!> Ensure you keep this token secret, so rouge parties can't write to your repo statuses.


## Diffing Against Branches Other Than Master
After setting up the above, BundleWatch will automatically diff against master.
![build results preview](https://raw.githubusercontent.com/bundlewatch/bundlewatch.io/master/docs/_assets/build-results-preview.png)
If you want to set up diffing for other branches (e.g. develop) there is one more CI variable that is required.
- `CI_BRANCH_BASE`






## I use to use bundlesize, why should I switch to BundleWatch?
- Bundlesize has entered maintenance mode and pull requests are left hanging, so we wanted to reboot the community through creating BundleWatch
- [BundleWatch/service](https://github.com/bundlewatch/service) with infrastructure as code
- Launched documentation website
- Enough test coverage to support CD
- Node API Support
- Lower barrier to contributing, build a trusted community of contributors to have continuous improvement

### Additional Features:
- [x] Config validation to stop users from guessing why BundleWatch won't work
- [x] Better results breakdown page [see diffing against branches](http://bundlewatch.io/#/getting-started/the-best-parts?id=diffing-against-branches-other-than-master)
- [x] Better comparisons between branches, support branches other than master
- [x] Support for your own server for storing data
- [x] New and improved CI behaviour
- [ ] Show history of BundleWatchs over time (coming soon)



## Want to help?
[See the Contributing docs](CONTRIBUTING.md) or [Join us on Slack](https://join.slack.com/t/bundlewatch/shared_invite/enQtMzUwNjYxNTMwMzcyLWE5NGI4MzZjMjM4MTRlYzllOTMwYzIzZWNjM2MyMjBmMzNjNGM0ZGVhODc2YjFkNzIwMzNkYjk3NzE0MjZkOTc) and start contributing


[npm]: https://img.shields.io/npm/v/bundlewatch.svg
[npm-url]: https://npmjs.com/package/bundlewatch

[node]: https://img.shields.io/node/v/bundlewatch.svg
[node-url]: https://nodejs.org

[bundlewatch]: https://img.shields.io/badge/bundle-watched-blue.svg
[bundlewatch-url]: http://bundlewatch.io

[deps]: https://img.shields.io/david/bundlewatch/bundlewatch.svg
[deps-url]: https://david-dm.org/bundlewatch/bundlewatch

[builds]: https://img.shields.io/circleci/project/github/bundlewatch/bundlewatch.svg
[builds-url]: https://circleci.com/gh/bundlewatch/bundlewatch

[licenses]: https://img.shields.io/npm/l/bundlewatch.svg
[licenses-url]: https://github.com/bundlewatch/bundlewatch/blob/master/LICENSE
