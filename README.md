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
[![deps][deps]][deps-url]
[![dev-deps][dev-deps]][dev-deps-url]
[![builds][builds]][builds-url]
[![test][test]][test-url]

  <br>
	<a href="https://npmcharts.com/compare/bundlewatch?minimal=true">
		<img src="https://img.shields.io/npm/dm/bundlewatch.svg">
	</a>
	<a href="https://github.com/bundlewatch/bundlewatch/graphs/contributors">
		<img src="https://img.shields.io/github/contributors/bundlewatch/bundlewatch.svg">
	</a>
    <a href="https://github.com/bundlewatch/bundlewatch/blob/master/LICENSE">
		<img src="https://img.shields.io/npm/l/bundlewatch.svg">
	</a>
  <h1>BundleWatch</h1>
  <p>
    BundleWatch checks file sizes, ensuring bundled browser assets don't jump in file size. <br />
    Sharp increases in BundleWatch can signal that something is wrong - adding a package that bloats the slug, a wrong import, or forgetting to minify.
  </p>
</div>

Inspired by [Siddharth Kshetrapal bundlesize](https://github.com/siddharthkp/bundlesize)

# Getting Started:
Install the BundleWatch package:
- NPM: `npm install bundlewatch --save-dev`
- Yarn: `yarn add bundlewatch --dev`

Add some basic configuration to your `package.json`
```json
{
    "name": "my package name",
    "version": "0.0.1",
    "bundlewatch" : {
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
- NPM: `npm run bundlewatch`
- Yarn: `yarn run bundlewatch`

This will give you command line output. If you want BundleWatch to report build status on your pull requests, see below.


# Adding Build Status:
BundleWatch can report its status on your GitHub Pull Requests.

<div align="center">
    <img alt="build status preview" src="https://raw.githubusercontent.com/bundlewatch/bundlewatch.io/master/docs/_assets/build-status-preview.png" width="700px">
</div>

## CI Auth Variables Needed by BundleWatch:
- `BUNDLEWATCH_GITHUB_TOKEN`

You will need to give BundleWatch access to your GitHub Statuses, which can be done by heading to:
https://service.bundlewatch.io/setup-github

This will give you your `BUNDLEWATCH_GITHUB_TOKEN`. You will need to set this as an environment variable in CI.


## CI Variables Needed by BundleWatch:
The most efficient way to get this running is to ensure that some environment variables are available for BundleWatch to find.
- `CI_REPO_OWNER` github.com/**facebook**/react
- `CI_REPO_NAME`  github.com/facebook/**react**
- `CI_COMMIT_SHA`
- `CI_BRANCH`

If you're using, _Travis_, _CircleCI_, _Wrecker_, _Drone_ or _GitHub Actions_ these should all work out of the box.

> Have a look at the source code to see which variables are automatically found: https://github.com/bundlewatch/bundlewatch/blob/master/src/app/config/getCIVars.js





## Viewing the results breakdown
After setting up the above you will have BuildStatus on your Pull Requests. Clicking the _details_ link on the reported status will show you a results file breakdown.
<div align="center">
    <img alt="build results preview" src="https://raw.githubusercontent.com/bundlewatch/bundlewatch.io/master/docs/_assets/build-results-preview.png" width="700px">
</div>


<hr>



# Additional Documentation:
Full [documentation available on bundlewatch.io](https://bundlewatch.io/)



# I use bundlesize, why should I switch to BundleWatch?
- Bundlesize has entered maintenance mode and pull requests are left hanging, so we wanted to reboot the community through creating BundleWatch
- New [BundleWatch service](https://github.com/bundlewatch/service) with infrastructure as code
- Launched [bundlewatch.io documentation website](https://bundlewatch.io)
- Enough test coverage to support CD
- Node API Support
- Lower barrier to contributing (automated testing and publishing), build a trusted community of contributors to have continuous improvement

### Additional Features:
- [x] Config validation to stop users from guessing why BundleWatch won't work
- [x] Support for config file path
- [x] Better results breakdown page
- [x] Better comparisons between branches, support branches other than master
- [x] Support for your own server for storing data
- [x] New and improved CI behaviour
- [ ] Show history of BundleWatchs over time (coming soon)

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
<table><tr><td align="center"><a href="https://jakebolam.com"><img src="https://avatars2.githubusercontent.com/u/3534236?v=4" width="100px;" alt="Jake Bolam"/><br /><sub><b>Jake Bolam</b></sub></a><br /><a href="https://github.com/bundlewatch/bundlewatch/commits?author=jakebolam" title="Code">💻</a></td><td align="center"><a href="https://opensource.tophat.com"><img src="https://avatars0.githubusercontent.com/u/6020693?v=4" width="100px;" alt="Shouvik DCosta"/><br /><sub><b>Shouvik DCosta</b></sub></a><br /><a href="https://github.com/bundlewatch/bundlewatch/commits?author=sdcosta" title="Code">💻</a></td><td align="center"><a href="http://www.tylerbenning.com"><img src="https://avatars2.githubusercontent.com/u/7265547?v=4" width="100px;" alt="Tyler Benning"/><br /><sub><b>Tyler Benning</b></sub></a><br /><a href="#design-tbenning" title="Design">🎨</a></td><td align="center"><a href="http://www.6ixsushi.com"><img src="https://avatars3.githubusercontent.com/u/20323414?v=4" width="100px;" alt="Leila Rosenthal"/><br /><sub><b>Leila Rosenthal</b></sub></a><br /><a href="https://github.com/bundlewatch/bundlewatch/commits?author=leilarosenthal" title="Documentation">📖</a></td><td align="center"><a href="https://github.com/francoiscampbell"><img src="https://avatars3.githubusercontent.com/u/3876970?v=4" width="100px;" alt="Francois Campbell"/><br /><sub><b>Francois Campbell</b></sub></a><br /><a href="https://github.com/bundlewatch/bundlewatch/commits?author=francoiscampbell" title="Code">💻</a></td><td align="center"><a href="http://emmanuel.ogbizi.com"><img src="https://avatars0.githubusercontent.com/u/2528959?v=4" width="100px;" alt="Emmanuel Ogbizi"/><br /><sub><b>Emmanuel Ogbizi</b></sub></a><br /><a href="#maintenance-iamogbz" title="Maintenance">🚧</a> <a href="https://github.com/bundlewatch/bundlewatch/commits?author=iamogbz" title="Code">💻</a> <a href="#security-iamogbz" title="Security">🛡️</a></td><td align="center"><a href="https://pascal-iske.de"><img src="https://avatars2.githubusercontent.com/u/7473880?v=4" width="100px;" alt="Pascal Iske"/><br /><sub><b>Pascal Iske</b></sub></a><br /><a href="https://github.com/bundlewatch/bundlewatch/issues?q=author%3Apascaliske" title="Bug reports">🐛</a></td></tr></table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## Want to Help? Become a Contributor
Contributions of any kind are welcome! [See the Contributing docs](CONTRIBUTING.md) or [Join us on Slack](https://join.slack.com/t/bundlewatch/shared_invite/enQtMzUwNjYxNTMwMzcyLWE5NGI4MzZjMjM4MTRlYzllOTMwYzIzZWNjM2MyMjBmMzNjNGM0ZGVhODc2YjFkNzIwMzNkYjk3NzE0MjZkOTc) and start contributing.

[npm]: https://img.shields.io/npm/v/bundlewatch.svg
[npm-url]: https://npmjs.com/package/bundlewatch

[node]: https://img.shields.io/node/v/bundlewatch.svg
[node-url]: https://nodejs.org

[bundlewatch]: https://img.shields.io/badge/bundle-watched-blue.svg
[bundlewatch-url]: https://bundlewatch.io

[deps]: https://david-dm.org/bundlewatch/bundlewatch/status.svg
[deps-url]: https://david-dm.org/bundlewatch/bundlewatch

[dev-deps]: https://david-dm.org/bundlewatch/bundlewatch/dev-status.svg
[dev-deps-url]: https://david-dm.org/bundlewatch/bundlewatch?type=dev

[test]: https://coveralls.io/repos/github/bundlewatch/bundlewatch/badge.svg?branch=master
[test-url]: https://coveralls.io/github/bundlewatch/bundlewatch?branch=master

[builds]: https://img.shields.io/circleci/project/github/bundlewatch/bundlewatch/master.svg
[builds-url]: https://circleci.com/gh/bundlewatch/bundlewatch

