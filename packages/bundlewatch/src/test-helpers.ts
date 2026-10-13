import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

export type RecordedRequest = {
  method: string;
  path: string;
  headers: IncomingMessage['headers'];
  body: unknown;
};

type Reply = { status: number; body?: unknown };
type Route = (request: RecordedRequest) => Reply;

/** A local HTTP server standing in for the bundlewatch service and the GitHub API. */
export const startFakeServer = async (
  routes: Record<string, Route>,
): Promise<{
  url: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}> => {
  const requests: RecordedRequest[] = [];
  const server = createServer(async (incoming, outgoing) => {
    let raw = '';
    for await (const chunk of incoming) raw += chunk;
    const request: RecordedRequest = {
      method: incoming.method ?? '',
      path: incoming.url ?? '',
      headers: incoming.headers,
      body: raw ? JSON.parse(raw) : undefined,
    };
    requests.push(request);

    const route =
      routes[`${request.method} ${request.path}`] ??
      Object.entries(routes).find(([key]) => {
        const [method, pattern = ''] = key.split(' ');
        return (
          method === request.method &&
          pattern.endsWith('*') &&
          request.path.startsWith(pattern.slice(0, -1))
        );
      })?.[1];
    const reply = route ? route(request) : { status: 404, body: { message: 'Not Found' } };
    outgoing.writeHead(reply.status, { 'content-type': 'application/json' });
    outgoing.end(reply.body === undefined ? '' : JSON.stringify(reply.body));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
};

const CI_VARIABLE =
  /^(CI|CI_.*|GIT_.*|GITHUB_.*|BUNDLEWATCH_.*|TRAVIS.*|CIRCLE.*|WERCKER.*|DRONE.*|GITLAB_CI|CF_.*|NETLIFY|NOW_.*|BUDDY.*|REPOSITORY_URL|COMMIT_REF|HEAD|PULL_REQUEST|REVIEW_ID)$/;

/** Runs `fn` with CI detection variables cleared, so tests behave the same on any CI. */
export const withEnv = async <T>(
  env: Record<string, string>,
  fn: () => Promise<T> | T,
): Promise<T> => {
  const saved = { ...process.env };
  for (const key of Object.keys(process.env)) {
    if (CI_VARIABLE.test(key)) delete process.env[key];
  }
  // Tests that post statuses pass their fake server. Without one, a status
  // fails to connect instead of reaching the real GitHub API.
  process.env.GITHUB_API_URL = 'http://127.0.0.1:1';
  Object.assign(process.env, env);
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, saved);
  }
};
