<div align="center">
  <a href="http://bundlesize.io">
    <img src="https://cdn.rawgit.com/bundlesize/bundlesize.io/master/docs/_assets/logo-large.svg" height="100px">
  </a>
  <br>
  <br>

[![npm][npm]][npm-url]
[![bundlesize][bundlesize]][bundlesize-url]

[![node][node]][node-url]
[![deps][deps]][deps-url]
[![builds][builds]][builds-url]
[![licenses][licenses]][licenses-url]


  <br>
	<a href="https://npmcharts.com/compare/@bundlesize/bundlesize?minimal=true">
		<img src="https://img.shields.io/npm/dm/@bundlesize/bundlesize.svg">
	</a>
	<a href="https://github.com/bundlesize/bundlesize/graphs/contributors">
		<img src="https://img.shields.io/github/contributors/bundlesize/bundlesize.svg">
	</a>
  <h1>bundlesize</h1>
  <p>
    bundlesize is a file size checker. Its main purpose is to ensure bundled browser assets don't jump in file size. <br />
    Sharp increases in bundlesize can signal something is wrong: added a package that bloaded the slug, wrong import, forgot to minify.
  </p>
</div>

Inspired by [Siddharth Kshetrapal original Bundlesize](https://github.com/siddharthkp/bundlesize)

# Getting Started and Configuration
To get started with bundlesize, head over to the [documentation on bundlesize.io](http://bundlesize.io/)



## Why the change in direction from the original?
- The original bundlesize has entered maintenance mode, pull requests are left hanging, we wanted to reboost the community and start growing bundlesize out
- Split store into seperate app -> bundlesize/service with infrastructure as code
- Launched documentation website
- Enough test coverage to support CD
- Node API Support
- Lower the barrier to contributing, build a trusted community of contributors to have continous improvement


### Additional features:
- [x] Config validation to stop users guessing why bundlesize won't work
- [x] Better details breakdown
- [x] Better comparisons between branches, support branches other than master
- [x] Support for your own server for storing data
- [x] New and improved CI behaviour
- [ ] Show history of bundlesizes over time (Coming soon)


## Want to help?
[See the Contributing docs](_CONTRIBUTING.md) or [Join us on Slack](https://join.slack.com/t/bundlesize-bundlesize/shared_invite/enQtMzUwNjYxNTMwMzcyLWE5NGI4MzZjMjM4MTRlYzllOTMwYzIzZWNjM2MyMjBmMzNjNGM0ZGVhODc2YjFkNzIwMzNkYjk3NzE0MjZkOTc) and start contributing


[npm]: https://img.shields.io/npm/v/@bundlesize/bundlesize.svg
[npm-url]: https://npmjs.com/package/@bundlesize/bundlesize

[node]: https://img.shields.io/node/v/@bundlesize/bundlesize.svg
[node-url]: https://nodejs.org

[bundlesize]: https://img.shields.io/badge/bundlesize-checked-green.svg
[bundlesize-url]: http://bundlesize.io

[deps]: https://img.shields.io/david/bundlesize/bundlesize.svg
[deps-url]: https://david-dm.org/bundlesize/bundlesize

[builds]: https://img.shields.io/circleci/project/github/bundlesize/bundlesize.svg
[builds-url]: https://circleci.com/gh/bundlesize/bundlesize

[licenses]: https://img.shields.io/npm/l/@bundlesize/bundlesize.svg
[licenses-url]: https://github.com/bundlesize/bundlesize/blob/master/LICENSE
