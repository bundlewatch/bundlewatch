import packageJson from '../package.json' with { type: 'json' }

export const VERSION: string = packageJson.version
export const USER_AGENT: string = `bundlewatch/${VERSION} (+https://bundlewatch.io)`
