import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { BundlewatchConfig, FileConfig } from './config.ts';
import { ValidationError } from './errors.ts';
import { logger } from './logger.ts';

/** `true` is an option given without a value, as commander allowed. */
export type CliOptions = {
  globs: string[];
  config?: string | true | undefined;
  maxSize?: string | true | undefined;
  compression?: string | true | undefined;
  normalize?: string | true | undefined;
};

const MODULE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts']);

/** The `bundlewatch` key of the nearest package.json, walking up from `cwd`. */
const findPackageConfig = (cwd: string): unknown => {
  let directory = cwd;
  while (true) {
    const file = path.join(directory, 'package.json');
    if (existsSync(file)) {
      try {
        return JSON.parse(readFileSync(file, 'utf8'))?.bundlewatch;
      } catch (error) {
        logger.error('Exception while parsing package.json', error);
        throw new ValidationError(`Could not parse ${file}`);
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
};

const loadConfigFile = async (configPath: string, cwd: string): Promise<BundlewatchConfig> => {
  const fullPath = path.resolve(realpathSync(cwd), configPath);

  if (MODULE_EXTENSIONS.has(path.extname(fullPath))) {
    try {
      const module = await import(pathToFileURL(fullPath).href);
      // A config with only named exports is the module namespace.
      return module.default ?? { ...module };
    } catch (error) {
      logger.error('Exception while loading JS config', error);
      throw new ValidationError(`Exception while loading JS config: ${fullPath}`);
    }
  }

  let contents: string;
  try {
    contents = readFileSync(fullPath, 'utf8');
  } catch (error) {
    logger.error('Exception while trying to read JSON config file', error);
    throw new ValidationError(`Could not find JSON config file: ${configPath}`);
  }
  try {
    return JSON.parse(contents);
  } catch (error) {
    logger.error('Exception while parsing JSON config', error);
    throw new ValidationError(`Could not parse JSON config file: ${configPath}`);
  }
};

/** CLI globs win over --config, which wins over package.json. */
export const loadConfig = async (
  options: CliOptions,
  cwd: string = process.cwd(),
): Promise<BundlewatchConfig> => {
  const packageConfig = findPackageConfig(cwd);

  if (options.globs.length > 0) {
    if (packageConfig) {
      logger.warn('CLI files supplied, config in package.json will be ignored');
    }
    if (options.config) {
      logger.warn(
        'CLI files supplied, configFilePath will be ignored (this must be used on its own)',
      );
    }
    return {
      files: options.globs.map((glob) => ({
        path: glob,
        // A bare --max-size meant no limit in 0.x.
        maxSize: options.maxSize === true ? undefined : options.maxSize,
      })),
      defaultCompression: (options.compression ||
        'gzip') as BundlewatchConfig['defaultCompression'],
      normalizeFilenames: options.normalize as string | undefined,
    };
  }

  if (options.config === true) {
    throw new ValidationError('--config needs the path of a config file');
  }
  if (options.config) {
    if (packageConfig) {
      logger.warn('configFilePath supplied, config in package.json will be ignored');
    }
    return loadConfigFile(options.config, cwd);
  }

  if (Array.isArray(packageConfig)) {
    return { files: packageConfig as FileConfig[] };
  }
  return (packageConfig as BundlewatchConfig | undefined) ?? {};
};
