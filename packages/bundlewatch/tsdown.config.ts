import { defineConfig } from 'tsdown';

// @bundlewatch/core is a dev dependency, so it is bundled; jsonpack
// and glob stay regular dependencies. The Node target comes from `engines.node`.
const shared = {
  platform: 'node',
  fixedExtension: false,
  hash: false,
  dts: true,
} as const;

export default defineConfig([
  { ...shared, entry: ['src/index.ts', 'src/cli.ts'], format: 'esm' },
  // `require('bundlewatch')` without relying on Node's require(esm), which
  // older TypeScript settings and test runners such as Jest don't support.
  {
    ...shared,
    entry: ['src/index.ts'],
    format: 'cjs',
    clean: false,
    // `exports.default` and `exports.STATUSES`, the shape 0.x had.
    outputOptions: { exports: 'named' },
  },
]);
