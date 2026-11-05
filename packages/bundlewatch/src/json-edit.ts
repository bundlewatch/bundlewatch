import { isDeepStrictEqual } from 'node:util';

// Replaces single values in JSON text and leaves every other byte alone:
// indentation, key order, escapes, number spellings and unrelated values
// stay as the user wrote them. Used for package.json too, so this must never
// reformat the file.

export type JsonPath = readonly (string | number)[];

export type JsonReplacement = {
  path: JsonPath;
  /** The value expected at `path`, so a file edited in the meantime isn't overwritten. */
  from: unknown;
  to: unknown;
};

type JsonNode = {
  start: number;
  end: number;
  /** Object members. With duplicate keys the last one wins, as in JSON.parse. */
  members?: Map<string, JsonNode>;
  items?: JsonNode[];
};

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);

const skipWhitespace = (text: string, position: number): number => {
  let index = position;
  while (WHITESPACE.has(text[index] as string)) index++;
  return index;
};

const expect = (text: string, index: number, char: string): number => {
  if (text[index] !== char) throw new Error(`Expected ${char} at offset ${index}`);
  return index + 1;
};

const stringEnd = (text: string, start: number): number => {
  let index = expect(text, start, '"');
  while (text[index] !== '"') {
    if (index >= text.length) throw new Error('Unterminated string');
    index += text[index] === '\\' ? 2 : 1;
  }
  return index + 1;
};

const parseNode = (text: string, position: number): JsonNode => {
  const start = skipWhitespace(text, position);
  const char = text[start];

  if (char === '{') {
    const members = new Map<string, JsonNode>();
    let index = skipWhitespace(text, start + 1);
    if (text[index] === '}') return { start, end: index + 1, members };
    while (true) {
      const keyStart = skipWhitespace(text, index);
      const keyEnd = stringEnd(text, keyStart);
      const key = JSON.parse(text.slice(keyStart, keyEnd)) as string;
      const value = parseNode(text, expect(text, skipWhitespace(text, keyEnd), ':'));
      members.set(key, value);
      index = skipWhitespace(text, value.end);
      if (text[index] === '}') return { start, end: index + 1, members };
      index = expect(text, index, ',');
    }
  }

  if (char === '[') {
    const items: JsonNode[] = [];
    let index = skipWhitespace(text, start + 1);
    if (text[index] === ']') return { start, end: index + 1, items };
    while (true) {
      const item = parseNode(text, index);
      items.push(item);
      index = skipWhitespace(text, item.end);
      if (text[index] === ']') return { start, end: index + 1, items };
      index = expect(text, index, ',');
    }
  }

  if (char === '"') return { start, end: stringEnd(text, start) };

  // Numbers, true, false and null.
  let end = start;
  while (end < text.length && /[\w.+-]/.test(text[end] as string)) end++;
  if (end === start) throw new Error(`Unexpected character at offset ${start}`);
  return { start, end };
};

const findNode = (root: JsonNode, path: JsonPath): JsonNode => {
  let node: JsonNode | undefined = root;
  for (const segment of path) {
    node = typeof segment === 'number' ? node?.items?.[segment] : node?.members?.get(segment);
  }
  if (!node) throw new Error(`Nothing at ${path.join('.')}`);
  return node;
};

const valueAt = (value: unknown, path: JsonPath): unknown =>
  path.reduce<unknown>(
    (current, segment) =>
      current !== null && typeof current === 'object' && Object.hasOwn(current, segment)
        ? (current as Record<string | number, unknown>)[segment]
        : undefined,
    value,
  );

const setValueAt = (value: unknown, path: JsonPath, replacement: unknown): void => {
  const parent = valueAt(value, path.slice(0, -1)) as Record<string | number, unknown>;
  parent[path.at(-1) as string | number] = replacement;
};

/** Sets the values at the given paths. Throws, without a partial result, if any is missing or changed. */
export const replaceJsonValues = (text: string, replacements: JsonReplacement[]): string => {
  const expected: unknown = JSON.parse(text);
  const root = parseNode(text, 0);

  const edits = replacements.map(({ path, from, to }) => {
    if (!isDeepStrictEqual(valueAt(expected, path), from)) {
      throw new Error(`${path.join('.')} is no longer ${JSON.stringify(from)}`);
    }
    setValueAt(expected, path, to);
    return { ...findNode(root, path), json: JSON.stringify(to) };
  });

  let result = text;
  for (const { start, end, json } of edits.toSorted((a, b) => b.start - a.start)) {
    result = result.slice(0, start) + json + result.slice(end);
  }

  // Everything except the replaced values must read back the same.
  if (!isDeepStrictEqual(JSON.parse(result), expected)) {
    throw new Error('The edited JSON does not match the expected values');
  }
  return result;
};
