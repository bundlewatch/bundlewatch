<div align="center">
  <a href="http://bundlewatch.io">
    <img src="https://cdn.rawgit.com/bundlewatch/bundlewatch.io/master/docs/_assets/logo-large.svg" height="100px">
  </a>
  <br>
  <br>

Keep watch of your bundle size.

[![Version](https://badge.fury.io/js/bundlewatch.svg)](https://www.npmjs.org/package/bundlewatch)
[![Monthly Downloads](https://img.shields.io/npm/dm/bundlewatch)](https://www.npmjs.org/package/bundlewatch)
[![CodeCov](https://coveralls.io/repos/github/bundlewatch/bundlewatch/badge.svg?branch=master)](https://coveralls.io/github/bundlewatch/bundlewatch?branch=master)
[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/bundlewatch/bundlewatch/blob/master/LICENSE)

</div>

<hr />

BundleWatch checks file sizes, ensuring bundled browser assets don't jump in file size.

Sharp increases in BundleWatch can signal that something is wrong, such as adding a package that bloats the slug, an incorrect import, or forgetting to minify.

Inspired by [Siddharth Kshetrapal's `bundlesize`][bundlesize]

## Getting Started

Install the BundleWatch package:

```sh
npm install bundlewatch --save-dev
```

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

> [!NOTE]
> You can also use a `bundlewatch.config.js` file instead of the `package.json` field. See the [documentation][bundlewatch-docs-url] for more details.

### Usage

```sh
npm run bundlewatch
```

This will give you command line output. If you want BundleWatch to report build status on your pull requests, see below.

## Adding Build Status

BundleWatch can report its status on your GitHub Pull Requests.

<div align="center">
    <img alt="build status preview" src="https://raw.githubusercontent.com/bundlewatch/bundlewatch.io/master/docs/_assets/build-status-preview.png" width="700px">
</div>

### CI Auth Variables Needed by BundleWatch

-   `BUNDLEWATCH_GITHUB_TOKEN`

You will need to give BundleWatch access to your GitHub Statuses, which can be done by heading to:
[https://service.bundlewatch.io/setup-github][setup-github-url]

This will give you your `BUNDLEWATCH_GITHUB_TOKEN`. You will need to set this as an environment variable in CI.

### CI Variables Needed by BundleWatch

The most efficient way to get this running is to ensure that some environment variables are available for BundleWatch to find.

-   `CI_REPO_OWNER` github.com/**facebook**/react
-   `CI_REPO_NAME` github.com/facebook/**react**
-   `CI_COMMIT_SHA`
-   `CI_BRANCH`

If you're using, _Travis_, _CircleCI_, _Wrecker_, _Drone_ or _GitHub Actions_ these should all work out of the box.

> [!TIP]
> Have a look at the source code to see which variables are automatically found: [`getCIVars`][get-ci-vars-source]

### Viewing the results breakdown

After setting up the above you will have BuildStatus on your Pull Requests. Clicking the _details_ link on the reported status will show you a results file breakdown.

<div align="center">
    <img alt="build results preview" src="https://raw.githubusercontent.com/bundlewatch/bundlewatch.io/master/docs/_assets/build-results-preview.png" width="700px">
</div>

---

## Additional Documentation

Full [documentation available on bundlewatch.io][bundlewatch-docs-url]

### I use bundlesize, why should I switch to BundleWatch

-   Bundlesize has entered maintenance mode and pull requests are left hanging, so we wanted to reboot the community through creating BundleWatch
-   New [BundleWatch service][bundlewatch-service] with infrastructure as code
-   Launched [bundlewatch.io documentation website][bundlewatch-docs-url]
-   Enough test coverage to support CD
-   Node API Support
-   Lower barrier to contributing (automated testing and publishing), build a trusted community of contributors to have continuous improvement

### Additional Features

-   [x] Config validation to stop users from guessing why BundleWatch won't work
-   [x] Support for config file path
-   [x] Better results breakdown page
-   [x] Better comparisons between branches, support branches other than master
-   [x] Support for your own server for storing data
-   [x] New and improved CI behaviour
-   [ ] Show history of BundleWatchs over time

### Contributors

<a href="https://github.com/bundlewatch/bundlewatch/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=bundlewatch/bundlewatch" />
</a>

### Want to Help? Become a Contributor

Contributions of any kind are welcome!
[See the Contributing docs][contrib-docs-url].

[bundlesize]: https://github.com/siddharthkp/bundlesize
[bundlewatch-docs-url]: https://bundlewatch.io/
[bundlewatch-service]: https://github.com/bundlewatch/service
[contrib-docs-url]: https://github.com/bundlewatch/bundlewatch/blob/master/CONTRIBUTING.md
[get-ci-vars-source]: https://github.com/bundlewatch/bundlewatch/blob/master/src/app/config/getCIVars.js
[setup-github-url]: https://service.bundlewatch.io/setup-github
