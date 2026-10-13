import assert from "node:assert/strict";
import { test } from "node:test";

import { updatePreviewDeployment, waitForPreview } from "./preview-deployment.mjs";

const repo = "/repos/bundlewatch/bundlewatch";
const url = "https://pr-12.d123.amplifyapp.com";
const active = {
  branch: "pr-12",
  status: "queued",
  headSha: "pr-head",
  deployedSha: "published-head",
};

function fixture({ result = active, deployments = [], states = {}, wait = async () => {} } = {}) {
  const calls = [];
  const waits = [];
  const api = async (method, path, body) => {
    calls.push({ method, path, body });
    if (method === "GET" && path.includes("/deployments?")) return deployments;
    if (method === "GET" && path.endsWith("/statuses?per_page=1")) {
      return [{ state: states[path.split("/").at(-2)] ?? "in_progress" }];
    }
    if (method === "POST" && path === `${repo}/deployments`) return { id: 42 };
    if (method === "POST" && path.endsWith("/statuses")) return {};
    throw new Error(`Unexpected request: ${method} ${path}`);
  };
  return {
    calls,
    waits,
    run: () =>
      updatePreviewDeployment({
        repository: "bundlewatch/bundlewatch",
        result,
        appId: "d123",
        logUrl: "https://github.com/bundlewatch/bundlewatch/actions/runs/1",
        api,
        wait: async (options) => {
          waits.push(options);
          await wait(options);
        },
      }),
  };
}

test("links a deployment to the original PR commit and waits before publishing success", async () => {
  const f = fixture({
    wait: async () => {
      assert.deepEqual(
        f.calls.filter(({ path }) => path.endsWith("/statuses")).map(({ body }) => body.state),
        ["in_progress"],
      );
    },
  });
  await f.run();
  const creation = f.calls.find(
    ({ method, path }) => method === "POST" && path === `${repo}/deployments`,
  ).body;
  assert.equal(creation.ref, "pr-head");
  assert.equal(creation.environment, "pr-12");
  assert.equal(creation.auto_merge, false);
  assert.deepEqual(creation.required_contexts, []);
  assert.equal(creation.transient_environment, true);
  assert.equal(creation.production_environment, false);
  assert.deepEqual(f.waits, [{ url, sourceSha: "published-head" }]);
  const statuses = f.calls.filter(({ path }) => path.endsWith("/statuses")).map(({ body }) => body);
  assert.deepEqual(
    statuses.map(({ state }) => state),
    ["in_progress", "success"],
  );
  assert.ok(statuses.every(({ environment_url }) => environment_url === url));
});

test("a failed preview wait records failure and fails the workflow", async () => {
  const f = fixture({
    wait: async () => {
      throw new Error("not published");
    },
  });
  await assert.rejects(f.run(), /not published/);
  assert.equal(f.calls.at(-1).body.state, "failure");
});

test("unrelated PRs create no deployment", async () => {
  const f = fixture({ result: { branch: "pr-12", status: "skipped" } });
  await f.run();
  assert.ok(f.calls.every(({ method }) => method === "GET"));
  assert.deepEqual(f.waits, []);
});

test("closing a PR retires its deployments, including pending ones", async () => {
  const f = fixture({
    result: { branch: "pr-12", status: "removed" },
    deployments: [{ id: 1 }, { id: 2 }],
    states: { 1: "success", 2: "inactive" },
  });
  await f.run();
  const writes = f.calls.filter(({ method }) => method === "POST");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, `${repo}/deployments/1/statuses`);
  assert.equal(writes[0].body.state, "inactive");
});

test("reruns reuse an already successful deployment without another wait", async () => {
  const f = fixture({
    deployments: [{ id: 1, sha: "pr-head", payload: { sourceSha: "published-head" } }],
    states: { 1: "success" },
  });
  await f.run();
  assert.ok(f.calls.every(({ method }) => method === "GET"));
  assert.deepEqual(f.waits, []);
});

test("reruns resume a pending deployment instead of creating a duplicate", async () => {
  const f = fixture({
    deployments: [{ id: 7, sha: "pr-head", payload: { sourceSha: "published-head" } }],
  });
  await f.run();
  assert.equal(
    f.calls.some(({ method, path }) => method === "POST" && path === `${repo}/deployments`),
    false,
  );
  assert.equal(f.calls.at(-1).path, `${repo}/deployments/7/statuses`);
  assert.equal(f.calls.at(-1).body.state, "success");
});

test("cleanup includes deployments beyond the first page and stays scoped to the PR", async () => {
  const retired = [];
  await updatePreviewDeployment({
    repository: "bundlewatch/bundlewatch",
    result: { branch: "pr-12", status: "removed" },
    api: async (method, path, body) => {
      if (path.includes("/deployments?")) {
        assert.ok(path.includes("environment=pr-12&task=deploy%3Awebsite-preview"));
        return path.endsWith("page=1")
          ? Array.from({ length: 100 }, (_, id) => ({ id }))
          : [{ id: 100 }];
      }
      if (method === "GET") return [{ state: "success" }];
      assert.equal(body.state, "inactive");
      retired.push(path);
      return {};
    },
  });
  assert.equal(retired.length, 101);
  assert.equal(retired.at(-1), `${repo}/deployments/100/statuses`);
});

test("unchanged site inputs attach the existing artifact to the latest PR commit", async () => {
  const f = fixture({
    result: { ...active, status: "unchanged" },
    deployments: [{ id: 1, sha: "previous-head" }],
  });
  await f.run();
  assert.deepEqual(f.waits, [{ url, sourceSha: "published-head" }]);
  assert.equal(f.calls.at(-1).path, `${repo}/deployments/1/statuses`);
  assert.equal(f.calls.at(-1).body.state, "inactive");
});

test("the monitor ignores stale pages and temporary errors until the exact source revision appears", async () => {
  let time = 0;
  const responses = [
    new Error("DNS"),
    { ok: false },
    { ok: true, json: async () => ({ sourceSha: "old" }) },
    { ok: true, json: async () => ({ sourceSha: "expected" }) },
  ];
  const requests = [];
  await waitForPreview({
    url,
    sourceSha: "expected",
    now: () => time,
    pause: async (ms) => {
      time += ms;
    },
    fetchSite: async (address) => {
      requests.push(address);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    },
  });
  assert.equal(requests.length, 4);
  assert.equal(new Set(requests).size, 4);
  assert.ok(
    requests.every((address) =>
      address.startsWith(`${url}/__preview.json?revision=expected&time=`),
    ),
  );
});

test("an old deployment's HTTP 200 cannot satisfy the monitor and waiting is bounded", async () => {
  let time = 0;
  await assert.rejects(
    waitForPreview({
      url,
      sourceSha: "expected",
      timeoutMs: 25_000,
      now: () => time,
      pause: async (ms) => {
        time += ms;
      },
      fetchSite: async () => ({ ok: true, json: async () => ({ sourceSha: "old" }) }),
    }),
    /expected preview revision/,
  );
  assert.equal(time, 25_000);
});
