import fs from 'fs'
import readPkgUp from 'read-pkg-up'

import ValidationError from '../app/errors/ValidationError'
import logger from '../logger'

const readConfigFile = configFilePath => {
    try {
        return fs.readFileSync(configFilePath, 'utf8')
    } catch (error) {
        logger.error(`Exception while trying to read config file`, error)
        return null
    }
}

const getConfigFileJson = configFilePath => {
    // TODO more advanced, execute JS file etc
    const configFileContents = readConfigFile(configFilePath)
    if (!configFileContents) {
        throw new ValidationError(
            `Could not find config file: ${configFilePath} from ${process.cwd()}`,
        )
    }
    try {
        return JSON.parse(configFileContents)
    } catch (error) {
        logger.error(`Exception while parsing config`, configFilePath)
        throw new ValidationError(
            `Could not parse config file: ${configFilePath}`,
        )
    }
}

const determineConfig = cliOptions => {
    const pkgJson = readPkgUp.sync().pkg
    let pkgJsonBundlesize = pkgJson.bundlesize

    if (cliOptions.args && cliOptions.args.length > 0) {
        if (pkgJsonBundlesize) {
            logger.warn(
                `CLI files supplied, config in package.json will be ignored`,
            )
        }
        if (cliOptions.configFilePath) {
            logger.warn(
                `CLI files supplied, configFilePath will be ignored (this must be used on its own)`,
            )
        }

        const files = cliOptions.args.map(filePathGlob => {
            return {
                path: filePathGlob,
                maxSize: cliOptions.maxSize,
            }
        })

        return {
            files,
            defaultCompression: cliOptions.compression || 'gzip',
        }
    }

    if (cliOptions.configFilePath) {
        if (pkgJsonBundlesize) {
            logger.warn(
                `configFilePath supplied, config in package.json will be ignored`,
            )
            return getConfigFileJson(cliOptions.configFilePath)
        }
    }

    if (pkgJsonBundlesize) {
        if (Array.isArray(pkgJsonBundlesize)) {
            return {
                files: pkgJsonBundlesize,
            }
        }
        return pkgJsonBundlesize
    }

    return {}
}

export default determineConfig
