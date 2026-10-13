import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer, type RequestListener } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

import { decodeResultsData } from '@bundlewatch/core';

const require = createRequire(import.meta.url);

const legacyBin = (alias: string): string =>
  path.join(path.dirname(require.resolve(`${alias}/package.json`)), 'lib/bin/index.js');

/** 0.x releases still in use, by weekly npm downloads. 0.4.0–0.4.2 are identical. */
export const LEGACY_CLIS: Record<string, string> = {
  '0.4.2': legacyBin('bundlewatch-legacy'),
  '0.3.3': legacyBin('bundlewatch-0.3.3'),
  '0.3.1': legacyBin('bundlewatch-0.3.1'),
  '0.2.7': legacyBin('bundlewatch-0.2.7'),
};
export const LEGACY_CLI: string = LEGACY_CLIS['0.4.2'] as string;
export const NEW_CLI: string = path.join(
  path.dirname(require.resolve('bundlewatch/package.json')),
  'dist/cli.js',
);
const FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../bundlewatch/src/__fixtures__',
);

/** A request as both CLIs would send it, with transport details stripped. */
export type Captured = {
  target: 'service' | 'github';
  path: string;
  body: unknown;
};

export type World = {
  url: string;
  baseline: Record<string, unknown> | undefined;
  captured: Captured[];
  authorizations?: Array<string | undefined>;
  close: () => Promise<void>;
};

/**
 * One local server playing every remote party: the bundlewatch service (as
 * a 0.x service, without short links), the GitHub API and Firebase. 0.x
 * CLIs reach GitHub and Firebase through it as an HTTP proxy; the new CLI
 * through GITHUB_API_URL.
 */
export const startWorld = async (): Promise<World> => {
  const world = { baseline: undefined, captured: [] } as unknown as World;
  const listener: RequestListener = async (request, response) => {
    world.authorizations?.push(request.headers.authorization);
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'local'}`);
    const body = raw ? JSON.parse(raw) : undefined;
    const reply = (status: number, data?: unknown): void => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(data === undefined ? '' : JSON.stringify(data));
    };

    if (url.hostname === 'firebasedynamiclinks.googleapis.com') {
      reply(400, { error: { message: 'Dynamic Links are shut down' } });
      return;
    }
    const githubPath =
      url.hostname === 'api.github.com'
        ? url.pathname
        : url.pathname.replace(/^\/github(?=\/)/, '');
    if (url.hostname === 'api.github.com' || url.pathname.startsWith('/github/')) {
      world.captured.push({ target: 'github', path: githubPath, body });
      reply(201, {});
      return;
    }

    world.captured.push({ target: 'service', path: url.pathname, body });
    if (url.pathname === '/store/lookup') {
      if (world.baseline) reply(200, { fileDetailsByPath: world.baseline });
      else reply(404);
    } else if (url.pathname === '/store') {
      reply(200, body);
    } else {
      reply(404, { error: 'Not found' });
    }
  };
  const server = createServer(listener);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  world.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  world.close = async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return world;
};

/** A fresh project directory containing the fixture images and `files`. */
export const createProject = (files: Record<string, string | null> = {}): string => {
  const directory = mkdtempSync(path.join(tmpdir(), 'bundlewatch-contract-'));
  for (const name of ['test-file-1.jpg', 'test-file-2.jpg']) {
    mkdirSync(path.join(directory, 'images'), { recursive: true });
    copyFileSync(path.join(FIXTURES, name), path.join(directory, 'images', name));
  }
  // 0.x crashed without a package.json (bundlewatch#434); see contract.test.ts.
  const withPackage = { 'package.json': '{"name":"fixture"}', ...files };
  for (const [name, contents] of Object.entries(withPackage)) {
    if (contents === null) continue;
    mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
    writeFileSync(path.join(directory, name), contents);
  }
  return directory;
};

export type Outcome = {
  status: number | null;
  stdout: string[];
  stderr: string[];
  requests: Captured[];
};

/** Replaces a `/results?d=…` link with the data it carries, so encodings can differ. */
const decodeLinks = (text: string): string =>
  text.replace(/https?:\/\/[^\s"]+\/results\?d=([^\s"]+)/g, (_, data: string) =>
    JSON.stringify({
      resultsLink: normalizePayload(decodeResultsData(decodeURIComponent(data))),
    }),
  );

/** 0.x sent an unlimited maxSize as Infinity, 1.0 sends null (MIGRATION.md). */
const normalizePayload = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (_, v) => (v === Number.POSITIVE_INFINITY ? null : v)));

const RESULTS_LINK = /^https?:\/\/[^\s"]+\/results\?d=([^\s"]+)$/;

const normalizeBody = (body: unknown): unknown => {
  if (body && typeof body === 'object' && 'target_url' in body) {
    const { target_url, ...rest } = body as { target_url: string };
    const data = RESULTS_LINK.exec(target_url)?.[1];
    return {
      ...rest,
      target_url: data
        ? {
            resultsLink: normalizePayload(decodeResultsData(decodeURIComponent(data))),
          }
        : target_url,
    };
  }
  return normalizePayload(body);
};

const lines = (output: string): string[] =>
  decodeLinks(stripVTControlCharacters(output))
    .split('\n')
    .map((line) => line.trimEnd());

const isPerFile = (request: Captured): boolean =>
  request.target === 'github' && (request.body as { context?: string }).context !== 'bundlewatch';

/** `legacy` is 0.4.2; other 0.x versions are named by their version. */
export const runCli = async (
  cli: 'legacy' | 'new' | keyof typeof LEGACY_CLIS,
  world: World,
  cwd: string,
  args: string[],
  env: Record<string, string>,
): Promise<Outcome> => {
  world.captured.length = 0;
  // 0.x's axios sends HTTPS requests to an HTTP proxy as absolute URLs,
  // so the fake captures its GitHub and Firebase calls as a proxy. The new
  // CLI reads no proxy variables; it reaches the fake GitHub directly.
  const routing =
    cli === 'new'
      ? { GITHUB_API_URL: `${world.url}/github` }
      : { https_proxy: world.url, HTTPS_PROXY: world.url };
  const child = spawn(
    cli === 'new' ? (process.env.BUNDLEWATCH_TEST_NODE ?? process.execPath) : process.execPath,
    [
      cli === 'new' ? NEW_CLI : cli === 'legacy' ? LEGACY_CLI : (LEGACY_CLIS[cli] as string),
      ...args,
    ],
    {
      cwd,
      env: {
        PATH: process.env.PATH ?? '',
        HOME: cwd,
        NO_COLOR: '1',
        ...routing,
        ...env,
      },
    },
  );
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const status = await new Promise<number | null>((resolve) => child.on('close', resolve));

  const requests = world.captured.map((request) => ({
    ...request,
    body: normalizeBody(request.body),
  }));
  // Per-file GitHub statuses are sent last and concurrently; their order
  // is not part of the contract.
  const perFile = requests
    .filter(isPerFile)
    .toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {
    status,
    stdout: lines(stdout),
    stderr: lines(stderr),
    requests: [...requests.filter((request) => !isPerFile(request)), ...perFile],
  };
};
