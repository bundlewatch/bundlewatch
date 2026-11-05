import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type FileDetails, formatBytes, isFileError, parseBytes } from '@bundlewatch/core';

import { ArgumentError, parseUpdateMaxSizesArgs, UPDATE_MAX_SIZES } from './args.ts';
import { type FileConfig, resolveConfig } from './config.ts';
import { replaceJsonValues } from './json-edit.ts';
import { type ConfigSource, loadConfigWithSource } from './load-config.ts';
import { logger, paint } from './logger.ts';
import { type Measurement, measureEach } from './measure.ts';

export const UPDATE_MAX_SIZES_HELP: string = `Usage: bundlewatch ${UPDATE_MAX_SIZES} [options]

Raises each exceeded maxSize to fit the largest file it applies to, rounded up
to the next KB. Measures the files already built, never lowers a limit and
never contacts the BundleWatch service or GitHub. Without --write, only
prints the changes.

Options:
  --write              save the new values (JSON config files and package.json)
  --headroom <size>    room to add before rounding (e.g. 1KB), 0 by default
  --config <path>      file to read instead of automatic configuration discovery
  -h, --help           output usage information

  Examples:

   Preview the changes
     $ bundlewatch ${UPDATE_MAX_SIZES}

   Save them
     $ bundlewatch ${UPDATE_MAX_SIZES} --write

   Save them with 1 KB of extra room
     $ bundlewatch ${UPDATE_MAX_SIZES} --write --headroom 1KB
`;

const KB = 1024;

export type MaxSizeUpdate = {
  /** Index of the entry in `files`. */
  entry: number;
  path: string;
  /** As written in the configuration. */
  maxSize: string | number;
  newMaxSize: string | number;
  /** The largest file whose limit is this entry's `maxSize`. */
  largest: { filePath: string } & FileDetails;
};

// The units of maxSize, multiples of 1024. Stricter than maxSize itself,
// which reads `1k` as 1 byte.
const HEADROOM = /^\d+(?:\.\d+)? *(?:b|kb|mb|gb|tb|pb)?$/i;

/** `--headroom` in bytes. */
export const parseHeadroom = (value: string | undefined): number => {
  if (value === undefined) return 0;
  if (!HEADROOM.test(value)) {
    throw new ArgumentError(
      `--headroom must be a size such as 1KB or 512B, not '${value}'`,
      `bundlewatch ${UPDATE_MAX_SIZES} --help`,
    );
  }
  return parseBytes(value) as number;
};

// The spelling of a KB maxSize, such as `15kB` or `15 KB`, which the
// replacement keeps. Matches like bytes@3, which reads maxSize.
const KB_SPELLING = /^[+-]?\d+(?:\.\d+)?( *)(kb)$/i;

/** `bytes` written like `current`: a number stays a number of bytes. */
const formatMaxSize = (bytes: number, current: string | number): string | number => {
  if (typeof current === 'number') return bytes;
  const [, space = '', unit = 'kB'] = KB_SPELLING.exec(current) ?? [];
  return `${bytes / KB}${space}${unit}`;
};

/**
 * The entries whose `maxSize` a file exceeds, with new limits. When entries
 * match the same file, the check applies the last one, so only that one is
 * raised. Every measurement error is returned separately and blocks writes.
 */
export const planMaxSizeUpdates = (
  files: FileConfig[],
  measurements: Measurement[],
  headroom: number,
): { updates: MaxSizeUpdate[]; errors: Measurement[] } => {
  const latest = new Map(measurements.map((measurement) => [measurement.key, measurement]));
  const errors = measurements.filter(({ details }) => isFileError(details));

  const largest = new Map<number, MaxSizeUpdate['largest']>();
  for (const { entry, key, filePath, details } of measurements) {
    if (isFileError(details) || latest.get(key)?.entry !== entry) continue;
    const current = largest.get(entry);
    if (!current || details.size > current.size) largest.set(entry, { filePath, ...details });
  }

  const updates: MaxSizeUpdate[] = [];
  for (const [entry, file] of [...largest].toSorted(([a], [b]) => a - b)) {
    // `maxSize` is Infinity when there is no limit.
    if (file.maxSize === null || file.size <= file.maxSize) continue;
    const { path: pattern, maxSize } = files[entry] as FileConfig & { maxSize: string | number };
    const bytes = Math.ceil((file.size + headroom) / KB) * KB;
    updates.push({
      entry,
      path: pattern,
      maxSize,
      newMaxSize: formatMaxSize(bytes, maxSize),
      largest: file,
    });
  }
  return { updates, errors };
};

const compressionText = (compression: string): string =>
  compression === 'none' ? '(no compression)' : `(${compression})`;

const displayPath = (file: string, cwd: string): string =>
  path.relative(realpathSync(cwd), realpathSync(file));

const plural = (count: number): string =>
  count === 1 ? '1 maxSize value' : `${count} maxSize values`;

/** The JSON file's text with the new values; throws if they can't be set safely. */
const updatedText = (
  source: Extract<ConfigSource, { kind: 'json' }>,
  updates: MaxSizeUpdate[],
): string =>
  replaceJsonValues(
    readFileSync(source.file, 'utf8'),
    updates.map(({ entry, maxSize, newMaxSize }) => ({
      path: [...source.filesPath, entry, 'maxSize'],
      from: maxSize,
      to: newMaxSize,
    })),
  );

/** `bundlewatch update-max-sizes`. Returns the exit code. */
export const updateMaxSizes = async (argv: string[]): Promise<number> => {
  // Globs are relative to the current directory, like in the check.
  const cwd = process.cwd();
  const args = parseUpdateMaxSizesArgs(argv);
  if (args.help) {
    logger.log(UPDATE_MAX_SIZES_HELP);
    return 0;
  }
  const headroom = parseHeadroom(args.headroom);

  const { config, source } = await loadConfigWithSource({ globs: [], config: args.config }, cwd);
  if (
    !config.files ||
    config.files.length === 0 ||
    (source.kind !== 'json' && source.kind !== 'module')
  ) {
    logger.error(`Configuration missing:
    ${UPDATE_MAX_SIZES} reads maxSize values from a config file or package.json
    Run ${paint('italic', `bundlewatch ${UPDATE_MAX_SIZES} --help`)} for options`);
    return 1;
  }
  const name = displayPath(source.file, cwd);

  const resolved = resolveConfig(config, { ciWarnings: false });
  const { updates, errors } = planMaxSizeUpdates(resolved.files, measureEach(resolved), headroom);

  logger.log('');
  for (const { path: pattern, maxSize, newMaxSize, largest } of updates) {
    logger.log(
      `${paint('yellowBright', 'UPDATE')} ${paint('italic', pattern)}: ${maxSize} -> ${newMaxSize}, largest file ${largest.filePath} is ${formatBytes(largest.size)} ${compressionText(largest.compression)}`,
    );
  }
  if (updates.length > 0) logger.log('');

  if (errors.length > 0) {
    logger.error(`Some files could not be measured, so ${name} was not changed`);
    return 1;
  }
  if (updates.length === 0) {
    logger.log(`No file is over its maxSize, so ${name} was not changed.`);
    return 0;
  }
  if (source.kind === 'module') {
    const message = `${name} is not JSON, so ${UPDATE_MAX_SIZES} can't edit it: copy the new ${updates.length === 1 ? 'value' : 'values'} above into it by hand`;
    if (!args.write) {
      logger.log(`${message}.`);
      return 0;
    }
    logger.error(message);
    return 1;
  }
  if (!args.write) {
    logger.log(`Add --write to save ${plural(updates.length)} to ${name}.`);
    return 0;
  }

  let text: string;
  try {
    text = updatedText(source, updates);
  } catch (error) {
    logger.error(`Could not update ${name}, so it was not changed`, error);
    return 1;
  }
  writeFileSync(source.file, text);
  logger.log(`Updated ${plural(updates.length)} in ${name}.`);
  return 0;
};
