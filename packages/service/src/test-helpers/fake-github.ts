import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

export type RecordedRequest = {
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: string;
};

export type FakeResponse = {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  delayMs?: number;
  bodyDelayMs?: number;
};

/** Keyed by `METHOD /path?query`. Unknown requests get a 404. */
export type FakeRoutes = Record<
  string,
  FakeResponse | ((request: RecordedRequest) => FakeResponse)
>;

export type FakeGitHub = {
  url: string;
  requests: RecordedRequest[];
  /** Replaces the routes and forgets recorded requests. */
  reset(routes?: FakeRoutes): void;
  close(): Promise<void>;
};

/** A local stand-in for api.github.com and github.com/login/oauth. */
export const startFakeGitHub = async (): Promise<FakeGitHub> => {
  const requests: RecordedRequest[] = [];
  let routes: FakeRoutes = {};
  const server = createServer(async (incoming, outgoing) => {
    let body = '';
    for await (const chunk of incoming) body += chunk;
    const request = {
      method: incoming.method ?? 'GET',
      path: incoming.url ?? '/',
      headers: incoming.headers,
      body,
    };
    requests.push(request);
    const route = routes[`${request.method} ${request.path}`];
    const response = (typeof route === 'function' ? route(request) : route) ?? {
      status: 404,
      body: { message: 'Not Found' },
    };
    if (response.delayMs) await sleep(response.delayMs);
    outgoing.writeHead(response.status ?? 200, {
      'content-type': 'application/json',
      ...response.headers,
    });
    if (response.bodyDelayMs) {
      outgoing.flushHeaders();
      await sleep(response.bodyDelayMs);
    }
    outgoing.end(response.body === undefined ? '' : JSON.stringify(response.body));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    reset(next = {}) {
      routes = next;
      requests.length = 0;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

/** A URL nothing listens on, for network errors. */
export const unreachableUrl = async (): Promise<string> => {
  const fake = await startFakeGitHub();
  await fake.close();
  return fake.url;
};
