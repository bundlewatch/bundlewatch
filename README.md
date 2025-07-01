<div align="center">
  <a href="http://bundlewatch.io">
    <img src="https://cdn.rawgit.com/bundlewatch/bundlewatch.io/master/docs/_assets/logo-large.svg" height="100px">
  </a>
  <br>
  <br>

[![npm][npm]][npm-url]
[![bundlewatch][bundlewatch]][bundlewatch-url]
[![All Contributors](https://img.shields.io/badge/all_contributors-7-orange.svg?style=flat-square)](#contributors)

[![node][node]][node-url]
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/bundlewatch)
[![builds][builds]][builds-url]
[![test][test]][test-url]

  <br>

[![npm-chart][npm-chart]][npm-chart-url]
[![contributors][contrib]][contrib-url]
[![license][license]][license-url]

  <h1>BundleWatch</h1>
  <p>
    BundleWatch checks file sizes, ensuring bundled browser assets don't jump in file size.<br />
    Sharp increases in BundleWatch can signal that something is wrong - adding a package that bloats the slug, a wrong import, or forgetting to minify.
  </p>
</div>

Inspired by [Siddharth Kshetrapal bundlesize][bundlesize]

# Getting Started

Install the BundleWatch package:

-   NPM: `npm install bundlewatch --save-dev`
-   Yarn: `yarn add bundlewatch --dev`

Add some basic configuration to your `package.json`

```json
{
    "name": "my package name",
    "version": "0.0.1",
    "bundlewatch": {
        "files": [
            {
                "path": "myfolder/*.js",
                "maxSize": "100kB"
            }
        ]
    }
}
```

Usage:

-   NPM: `npm run bundlewatch`
-   Yarn: `yarn run bundlewatch`

This will give you command line output. If you want BundleWatch to report build status on your pull requests, see below.

# Adding Build Status

BundleWatch can report its status on your GitHub Pull Requests.

<div align="center">
    <img alt="build status preview" src="https://raw.githubusercontent.com/bundlewatch/bundlewatch.io/master/docs/_assets/build-status-preview.png" width="700px">
</div>

## CI Auth Variables Needed by BundleWatch

-   `BUNDLEWATCH_GITHUB_TOKEN`

You will need to give BundleWatch access to your GitHub Statuses, which can be done by heading to:
[https://service.bundlewatch.io/setup-github][setup-github-url]

This will give you your `BUNDLEWATCH_GITHUB_TOKEN`. You will need to set this as an environment variable in CI.

## CI Variables Needed by BundleWatch

The most efficient way to get this running is to ensure that some environment variables are available for BundleWatch to find.

-   `CI_REPO_OWNER` github.com/**facebook**/react
-   `CI_REPO_NAME` github.com/facebook/**react**
-   `CI_COMMIT_SHA`
-   `CI_BRANCH`

If you're using, _Travis_, _CircleCI_, _Wrecker_, _Drone_ or _GitHub Actions_ these should all work out of the box.

> Have a look at the source code to see which variables are automatically found: [`getCIVars`][get-ci-vars-source]

## Viewing the results breakdown

After setting up the above you will have BuildStatus on your Pull Requests. Clicking the _details_ link on the reported status will show you a results file breakdown.

<div align="center">
    <img alt="build results preview" src="https://raw.githubusercontent.com/bundlewatch/bundlewatch.io/master/docs/_assets/build-results-preview.png" width="700px">
</div>

---

# Additional Documentation

Full [documentation available on bundlewatch.io][bundlewatch-docs-url]

## I use bundlesize, why should I switch to BundleWatch

-   Bundlesize has entered maintenance mode and pull requests are left hanging, so we wanted to reboot the community through creating BundleWatch
-   New [BundleWatch service][bundlewatch-service] with infrastructure as code
-   Launched [bundlewatch.io documentation website][bundlewatch-docs-url]
-   Enough test coverage to support CD
-   Node API Support
-   Lower barrier to contributing (automated testing and publishing), build a trusted community of contributors to have continuous improvement

## Additional Features

-   [x] Config validation to stop users from guessing why BundleWatch won't work
-   [x] Support for config file path
-   [x] Better results breakdown page
-   [x] Better comparisons between branches, support branches other than master
-   [x] Support for your own server for storing data
-   [x] New and improved CI behaviour
-   [ ] Show history of BundleWatchs over time

## Contributors

<a href="https://github.com/bundlewatch/bundlewatch/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=bundlewatch/bundlewatch" />
</a>

## Want to Help? Become a Contributor

Contributions of any kind are welcome!
[See the Contributing docs][contrib-docs-url].

[builds]: https://img.shields.io/circleci/project/github/bundlewatch/bundlewatch/master.svg
[builds-url]: https://circleci.com/gh/bundlewatch/bundlewatch
[bundlesize]: https://github.com/siddharthkp/bundlesize
[bundlewatch]: https://img.shields.io/badge/bundle-watched-blue.svg
[bundlewatch-url]: https://bundlewatch.io
[bundlewatch-docs-url]: https://bundlewatch.io/
[bundlewatch-service]: https://github.com/bundlewatch/service
[contrib]: https://img.shields.io/github/contributors/bundlewatch/bundlewatch.svg
[contrib-docs-url]: https://github.com/bundlewatch/bundlewatch/blob/master/CONTRIBUTING.md
[contrib-url]: https://github.com/bundlewatch/bundlewatch/graphs/contributors
[get-ci-vars-source]: https://github.com/bundlewatch/bundlewatch/blob/master/src/app/config/getCIVars.js
[node]: https://img.shields.io/node/v/bundlewatch.svg
[node-url]: https://nodejs.org
[npm]: https://img.shields.io/npm/v/bundlewatch.svg
[npm-chart]: https://img.shields.io/npm/dm/bundlewatch.svg
[npm-chart-url]: https://npmcharts.com/compare/bundlewatch?minimal=true
[npm-url]: https://npmjs.com/package/bundlewatch
[license]: https://img.shields.io/npm/l/bundlewatch.svg
[license-url]: https://github.com/bundlewatch/bundlewatch/blob/master/LICENSE
[setup-github-url]: https://service.bundlewatch.io/setup-github
[slack-invite-url]: https://join.slack.com/t/bundlewatch/shared_invite/zt-dtm41j6u-x4OTIvv033aT0rSCuIB~1w
[test]: https://coveralls.io/repos/github/bundlewatch/bundlewatch/badge.svg?branch=master
[test-url]: https://coveralls.io/github/bundlewatch/bundlewatch?branch=master
