#!/usr/bin/env node

import program from 'commander'
import chalk from 'chalk'

import determineConfig from './determineConfig'
import logger from '../logger'
import bundlewatchApi from '../app'

const main = async () => {
    const config = determineConfig(program)

    if (config.files && config.files.length > 0) {
        await bundlewatchApi(config)
        return 0
    }

    logger.error(`Configuration missing:
    Run ${chalk.italic('bundlewatch --help')} for examples and options
    Documentation available at: http://bundlewatch.io/`)
    return 1
}

const mainSafe = async () => {
    try {
        return await main()
    } catch (error) {
        if (error.type === 'ValidationError') {
            logger.fatal(error.message)
            return 1
        }

        logger.fatal(`Uncaught exception`, error)
        return 1
    }
}

program
    .usage('[options] <filePathGlobs ...>')
    .option(
        '--config [configFilePath]',
        'file to read configuration from, if used all options are blown away',
    )
    .option('--max-size [maxSize]', 'maximum size threshold (e.g. 3kb)')
    .option(
        '--compression [compression]',
        'specify which compression algorithm to use',
    )

program.on('--help', () => {
    logger.log('')
    logger.log('  Examples:')
    logger.log('')
    logger.log('   Read configuration from package.json')
    logger.log('     $ bundlewatch ')
    logger.log('')
    logger.log('   Read configuration from file')
    logger.log('     $ bundlewatch --config internals/bundlewatch.config.js')
    logger.log('')
    logger.log('   Use command line')
    logger.log('     $ bundlewatch --max-size 100KB ./src/*.js /lib/*.js')
    logger.log('')
    logger.log('')
})

program.parse(process.argv)

mainSafe().then(errorCode => {
    process.exitCode = errorCode
})
