/** Application names are stable, lowercase ASCII identifiers; never normalized. */
export const PREFIX_RULE =
  'must be 1-64 lowercase ASCII letters, digits, hyphens or underscores, starting with a letter or digit';

// Unlike $, the final assertion cannot match before a trailing newline.
export const isValidPrefix = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}(?![\s\S])/.test(value);

/** Omission selects the legacy namespace. Empty strings and null are invalid. */
export const validatePrefix = (value: unknown): void => {
  if (value !== undefined && !isValidPrefix(value)) {
    throw new Error(`prefix ${PREFIX_RULE}`);
  }
};
