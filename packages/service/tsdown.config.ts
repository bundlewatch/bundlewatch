import { defineConfig } from 'tsdown';

// One self-contained ESM file for the Lambda nodejs24.x runtime: the AWS
// SDK and @bundlewatch/core are bundled rather than taken from the runtime,
// so the deployed code is exactly what was tested.
export default defineConfig({
  entry: { lambda: 'src/lambda.ts' },
  outDir: 'dist',
  format: 'esm',
  platform: 'node',
  target: 'node24',
  fixedExtension: true,
  dts: false,
  clean: true,
  deps: { alwaysBundle: [/.*/], onlyBundle: false },
  // The AWS SDK imports some modules dynamically; keep them in the file.
  outputOptions: { codeSplitting: false },
});
