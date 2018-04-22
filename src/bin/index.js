#!/usr/bin/env node

import program from 'commander'
import chalk from 'chalk'

import determineConfig from './determineConfig'
import logger from '../logger'
import bundlesizeApi from '../app'

const prettyPrintResults = fullResults => {
    fullResults.forEach(result => {
        if (result.error) {
            logger.log(`${chalk.red('ERROR')} ${result.error}`)
            return
        }

        if (result.isFail) {
            logger.log(`${chalk.redBright('FAIL')} ${result.message}`)
            return
        }

        logger.log(`${chalk.greenBright('PASS')} ${result.message}`)
    })
}

const main = async () => {
    const config = determineConfig(program)

    if (config.files && config.files.length > 0) {
        const results = await bundlesizeApi(config)

        prettyPrintResults(results.fullResults)
        logger.log('')

        if (results.isFail) {
            logger.log(chalk.redBright(`bundlesize FAIL`))
            logger.log('')
            return 1
        }

        logger.log(chalk.greenBright(`bundlesize PASS`))
        logger.log('')

        return 0
    }

    logger.error(`Configuration missing:
    Run ${chalk.italic('bundlesize --help')} for examples and options
    Documentation available at: https://github.com/bundlesize/bundlesize#configuration`)
    return 1
}

const mainSafe = async () => {
    try {
        const errorCode = await main()
        return errorCode
    } catch (error) {
        if (error.type === 'ValidationError') {
            logger.error(error.message)
            return 1
        }

        logger.error(`Uncaught exception`, error)
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
    logger.log('     $ bundlesize ')
    logger.log('')
    logger.log('   Read configuration from file')
    logger.log('     $ bundlesize --config internals/bundlesize.config.js')
    logger.log('')
    logger.log('   Use command line')
    logger.log('     $ bundlesize --max-size 100KB ./src/*.js /lib/*.js')
    logger.log('')
    logger.log('')
})

program.parse(process.argv)

logger.log('')
process.exitCode = mainSafe()
