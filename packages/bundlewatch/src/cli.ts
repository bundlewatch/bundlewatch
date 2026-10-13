#!/usr/bin/env node

import { type FileResult, STATUSES } from '@bundlewatch/core';

import { ArgumentError, parseCliArgs } from './args.ts';
import { ValidationError } from './errors.ts';
import bundlewatch from './index.ts';
import { loadConfig } from './load-config.ts';
import { logger, paint } from './logger.ts';
import { VERSION } from './version.ts';

const HELP = `Usage: bundlewatch [options] <filePathGlobs ...>

Options:
  --config [configFilePath]    file to read configuration from, if used all options are blown away
  --max-size [maxSize]         maximum size threshold (e.g. 3kb)
  --compression [compression]  specify which compression algorithm to use
  --normalize [regex]          normalize filenames via regex, any match will be removed
  -V, --version                output the version number
  -h, --help                   output usage information

  Examples:

   Read configuration from package.json
     $ bundlewatch

   Read configuration from file
     $ bundlewatch --config internals/bundlewatch.config.js

   Use command line
     $ bundlewatch --max-size 100KB ./src/*.js /lib/*.js
`;

const printResults = (fullResults: FileResult[]): void => {
  logger.log('');
  for (const result of fullResults) {
    const filePath = `${paint('italic', result.filePath)}:`;
    if (result.error) {
      logger.log(`${paint('red', 'ERROR')} ${filePath} ${result.error}`);
    } else if (result.status === STATUSES.FAIL) {
      logger.log(`${paint('redBright', 'FAIL')} ${filePath} ${result.message}`);
    } else if (result.status === STATUSES.WARN) {
      logger.log(`${paint('yellowBright', 'WARN')} ${filePath} ${result.message}`);
    } else {
      logger.log(`${paint('greenBright', 'PASS')} ${filePath} ${result.message}`);
    }
  }
  logger.log('');
};

const main = async (argv: string[]): Promise<number> => {
  const { values, positionals } = parseCliArgs(argv);

  if (values.help) {
    logger.log(HELP);
    return 0;
  }
  if (values.version) {
    logger.log(VERSION);
    return 0;
  }

  const config = await loadConfig({
    globs: positionals,
    config: values.config,
    maxSize: values['max-size'],
    compression: values.compression,
    normalize: values.normalize,
  });

  if (!config.files || config.files.length === 0) {
    logger.error(`Configuration missing:
    Run ${paint('italic', 'bundlewatch --help')} for examples and options
    Documentation available at: https://bundlewatch.io/`);
    return 1;
  }

  const results = await bundlewatch(config);

  if (results.url) {
    logger.log('');
    logger.log(`${paint('cyanBright', 'Result breakdown at:')} ${results.url}`);
  }
  printResults(results.fullResults);

  if (results.status === STATUSES.FAIL) {
    logger.log(paint('redBright', 'bundlewatch FAIL'));
    logger.log(results.summary);
    logger.log('');
    return 1;
  }
  if (results.status === STATUSES.WARN) {
    logger.log(paint('redBright', 'bundlewatch WARN'));
    logger.log(results.summary);
    logger.log('');
    return 0;
  }
  logger.log(paint('greenBright', 'bundlewatch PASS'));
  logger.log(results.summary);
  logger.log('');
  return 0;
};

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  if (error instanceof ValidationError) {
    logger.fatal(error.message);
  } else if (error instanceof ArgumentError) {
    logger.error(`${error.message}\n    Run bundlewatch --help for usage`);
  } else {
    logger.fatal('Uncaught exception', error);
  }
  process.exitCode = 1;
}
