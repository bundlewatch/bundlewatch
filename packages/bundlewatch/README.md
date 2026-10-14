# bundlewatch

Keep watch of your bundle size.

bundlewatch checks file sizes so bundled browser assets don't suddenly grow. A sharp increase usually means something went wrong: a package that bloats the bundle, an incorrect import, or a missing minification step.

On pull requests, it compares each file with the target branch and reports the result as a GitHub status.

## Getting started

Requires Node.js 22.17 or later.

```sh
npm install --save-dev bundlewatch
```

Add your files to `package.json`:

```json
{
  "bundlewatch": {
    "files": [{ "path": "./dist/*.js", "maxSize": "100kB" }]
  }
}
```

Run `npx bundlewatch` after your build. It exits with code 1 when a file is over its `maxSize`.

## Reporting on pull requests

On GitHub Actions, give the workflow `statuses: write` and pass its token:

```yaml
- run: npx bundlewatch
  env:
    BUNDLEWATCH_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Other CI providers need a token from [service.bundlewatch.io/setup-github](https://service.bundlewatch.io/setup-github). See [using bundlewatch](https://bundlewatch.io/guide/using-bundlewatch/).

## Node.js API

```js
import bundlewatch, { STATUSES } from 'bundlewatch'

const results = await bundlewatch({
  files: [{ path: './dist/*.js', maxSize: '100kB' }],
})
console.log(results.status === STATUSES.FAIL)
```

CommonJS: `const bundlewatch = require('bundlewatch').default`. TypeScript types are included.

## Documentation

- [bundlewatch.io](https://bundlewatch.io): configuration, CLI and CI setup
- [Migrating from 0.x](https://bundlewatch.io/guide/migrating-to-v1/)
- [Source and issues](https://github.com/bundlewatch/bundlewatch)

## License

MIT
