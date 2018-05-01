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
  <h1>bundlewatch</h1>
  <p>
    bundlewatch is a file size checker. Its main purpose is to ensure bundled browser assets don't jump in file size. <br />
    Sharp increases in bundlewatch can signal something is wrong: added a package that bloaded the slug, wrong import, forgot to minify.
  </p>
</div>

Inspired by [Siddharth Kshetrapal bundlesize](https://github.com/siddharthkp/bundlesize)

# Getting Started and Configuration
To get started with bundlewatch, head over to the [documentation on bundlewatch.io](http://bundlewatch.io/)



## Why the change in direction from bundlesize?
- bundlesize has entered maintenance mode, pull requests are left hanging, we wanted to reboost the community and start growing bundlewatch out
- Split store into seperate app -> bundlewatch/service with infrastructure as code
- Launched documentation website
- Enough test coverage to support CD
- Node API Support
- Lower the barrier to contributing, build a trusted community of contributors to have continous improvement


### Additional features:
- [x] Config validation to stop users guessing why bundlewatch won't work
- [x] Better details breakdown
- [x] Better comparisons between branches, support branches other than master
- [x] Support for your own server for storing data
- [x] New and improved CI behaviour
- [ ] Show history of bundlewatchs over time (Coming soon)


## Want to help?
[See the Contributing docs](CONTRIBUTING.md) or [Join us on Slack](https://join.slack.com/t/bundlewatch-bundlewatch/shared_invite/enQtMzUwNjYxNTMwMzcyLWE5NGI4MzZjMjM4MTRlYzllOTMwYzIzZWNjM2MyMjBmMzNjNGM0ZGVhODc2YjFkNzIwMzNkYjk3NzE0MjZkOTc) and start contributing


[npm]: https://img.shields.io/npm/v/bundlewatch.svg
[npm-url]: https://npmjs.com/package/bundlewatch

[node]: https://img.shields.io/node/v/bundlewatch.svg
[node-url]: https://nodejs.org

[bundlewatch]: https://img.shields.io/badge/bundle-watched-blue.svg
[bundlewatch-url]: http://bundlewatch.io

[deps]: https://img.shields.io/david/bundlewatch.svg
[deps-url]: https://david-dm.org/bundlewatch

[builds]: https://img.shields.io/circleci/project/github/bundlewatch/bundlewatch.svg
[builds-url]: https://circleci.com/gh/bundlewatch/bundlewatch

[licenses]: https://img.shields.io/npm/l/bundlewatch.svg
[licenses-url]: https://github.com/bundlewatch/bundlewatch/blob/master/LICENSE
