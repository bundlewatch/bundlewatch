import ValidationError from '../errors/ValidationError'

import logger from '../../logger'

const COMPRESSION_TYPES = ['gzip', 'brotli', 'none']

const ensureFilesValid = (config) => {
    if (!Array.isArray(config.files)) {
        throw new ValidationError('config.files must be an Array')
    }
    // TODO: more validation per file, path, maxSize, compression etc
    // const FILE_TYPE = {
    //     path: '', // required
    //     maxSize, // basically required (defaults to Infinity)
    //     compression, // optional
    // }

    return config
}

const ensureDefaultCompressionValid = (config) => {
    if (!COMPRESSION_TYPES.includes(config.defaultCompression)) {
        throw new ValidationError('config.compression must be a valid type')
    }

    return config
}

const ensureNormalizeFilenamesValid = (config) => {
    const input = config.normalizeFilenames
    if (input == null) return config

    if (typeof input === 'string') {
        try {
            // eslint-disable-next-line no-param-reassign
            config.normalizeFilenames = new RegExp(input)
        } catch (e) {
            throw new Error(
                `config.normalizeFilenames (${input}) is not a valid RegExp.`,
            )
        }
    } else if (!(input instanceof RegExp)) {
        throw new Error(
            `config.normalizeFilenames (${input}) is not a valid RegExp.`,
        )
    }

    return config
}

const ensureCiValid = (config) => {
    if (!Array.isArray(config.ci.trackBranches)) {
        throw new ValidationError('config.ci.trackBranches must be an Array')
    }

    const requiredOptionsToConnectToBuild = [
        'githubAccessToken',
        'repoOwner',
        'repoName',
        'commitSha',
    ]
    const missingOptions = requiredOptionsToConnectToBuild.reduce(
        (optionAccumulator, option) => {
            if (!config.ci[option]) {
                optionAccumulator.push(option)
            }
            return optionAccumulator
        },
        [],
    )

    if (missingOptions.length === 0) {
        if (!config.bundlewatchServiceHost) {
            logger.warn(`bundlewatchServiceHost was not supplied, bundlewatch comparisons unavilable:
    Learn more at: https://bundlewatch.io/
            `)
        } else {
            if (!config.ci.repoBranchBase) {
                logger.warn(`The ci.repoBranchCase was not supplied, bundlewatch comparisons unavailable:
    Learn more at: https://bundlewatch.io/
                `)
            }
            if (!config.ci.repoCurrentBranch) {
                logger.warn(`The ci.repoCurrentBranch was not supplied, bundlewatch results with not be saved:
    Learn more at: https://bundlewatch.io/
            `)
            }
        }
    } else {
        logger.warn(`Some CI configuration options were not found (${missingOptions.join(
            ', ',
        )}):
    bundlewatch will be unable to report build status, or save comparison data
    Learn more at: https://bundlewatch.io/
        `)
    }

    return config
}

const validators = [
    ensureFilesValid,
    ensureDefaultCompressionValid,
    ensureNormalizeFilenamesValid,
    ensureCiValid,
]

// Runs and returns the result of each validator
const ensureValid = (config) =>
    validators.reduce((c, validator) => validator(c), config)

export default ensureValid
