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



## Why BundleWatch over bundlesize?
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
