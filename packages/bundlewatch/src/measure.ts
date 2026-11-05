import { readFileSync } from 'node:fs';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

import { type FileDetailsByPath, parseBytes } from '@bundlewatch/core';
import glob from 'glob';

import type { FileConfig } from './config.ts';
import { logger } from './logger.ts';

// Matched paths become the keys of saved baselines, so they must be exactly
// what 0.x produced: same spelling (`./dist/a.js`), order, escapes, symlink
// and dotfile handling on every platform. That is only guaranteed by glob@7,
// the version 0.x used; newer globs and fs.globSync all differ somewhere.
export const globFiles = (pattern: string, cwd: string = process.cwd()): string[] =>
  glob.sync(pattern, { cwd });

/** Same settings as gzip-size@6 and brotli-size@4, which 0.x used. */
export const compressedSize = (data: Buffer, compression: string): number => {
  switch (compression) {
    case 'gzip':
      return gzipSync(data, { level: 9 }).length;
    case 'brotli':
      return brotliCompressSync(data, {
        params: {
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_DEFAULT_MODE,
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
          [constants.BROTLI_PARAM_SIZE_HINT]: data.byteLength,
        },
      }).byteLength;
    default:
      return data.byteLength;
  }
};

// Removes every segment that `split` produces, captured groups included.
// Odd, but it is what 0.x did and existing baselines depend on it.
const normalizeFilename = (filePath: string, normalize: RegExp | null): string => {
  if (!normalize?.test(filePath)) {
    return filePath;
  }
  return filePath
    .split(normalize)
    .reduce((normalized, segment) => normalized.replace(String(segment), ''), filePath);
};

// Missing, unparseable and zero limits all mean no limit, as in 0.x, where a
// numeric 0 never failed either.
const parseMaxSize = (maxSize: FileConfig['maxSize']): number =>
  (maxSize === undefined ? null : parseBytes(maxSize)) || Number.POSITIVE_INFINITY;

type MeasureOptions = {
  files: FileConfig[];
  defaultCompression: string;
  normalizeFilenames: RegExp | null;
};

/** One file matched by a `files` entry, or the error of a pattern or file. */
export type Measurement = {
  /** Index of the `files` entry that matched the file. */
  entry: number;
  /** Path as the glob returned it, or the pattern when it matched nothing. */
  filePath: string;
  /** Name in results and baselines: the normalized path, or `filePath` on error. */
  key: string;
  details: FileDetailsByPath[string];
};

/** Every measurement in order. A later one with the same key replaces an earlier one. */
export const measureEach = ({
  files,
  defaultCompression,
  normalizeFilenames,
}: MeasureOptions): Measurement[] => {
  const measurements: Measurement[] = [];

  for (const [entry, file] of files.entries()) {
    const paths = globFiles(file.path);
    if (paths.length === 0) {
      const error = `There is no matching file for ${file.path}`;
      logger.error(error);
      measurements.push({ entry, filePath: file.path, key: file.path, details: { error } });
      continue;
    }

    for (const filePath of paths) {
      const compression = file.compression || defaultCompression;
      let data: Buffer;
      try {
        data = readFileSync(filePath);
      } catch (error) {
        const message = `Could not read file ${filePath}`;
        logger.error(message, error);
        measurements.push({ entry, filePath, key: filePath, details: { error: message } });
        continue;
      }
      measurements.push({
        entry,
        filePath,
        key: normalizeFilename(filePath, normalizeFilenames),
        details: {
          maxSize: parseMaxSize(file.maxSize),
          size: compressedSize(data, compression),
          compression,
        },
      });
    }
  }

  return measurements;
};

export const measureFiles = (options: MeasureOptions): FileDetailsByPath =>
  // A Map, so a file named `__proto__` is stored rather than lost.
  Object.fromEntries(
    new Map(measureEach(options).map(({ key, details }) => [key, details] as const)),
  );
