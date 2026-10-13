import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { publishPreview, resolvePreview, selectPreview } from "./preview.mjs";
import { hasWebsiteChanges, isWebsitePath, sameWebsiteInputs } from "./website-inputs.mjs";

const repository = "bundlewatch/bundlewatch";
const appId = "dtest";
const pr = {
  number: 12,
  state: "open",
  changed_files: 1,
  base: { ref: "main", repo: { full_name: repository } },
  head: { sha: "head", ref: "docs", repo: { id: 42 } },
};
const run = {
  id: 90,
  event: "pull_request",
  path: ".github/workflows/website-preview.yml",
  conclusion: "success",
  head_sha: "head",
  head_branch: "docs",
  head_repository: { id: 42 },
  pull_requests: [],
};
const artifact = { id: 100, name: "website-preview-12", workflow_run: { id: 90 } };
const file = (path, sha = "same") => ({ path, sha, type: "blob", mode: "100644" });

test("website inputs include shared files and all deployment workflows", () => {
  for (const path of [
    "packages/website/docs/en/index.md",
    "packages/bundlewatch/package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
    ".nvmrc",
    ".github/workflows/website.yml",
    ".github/workflows/website-preview.yml",
    ".github/workflows/website-preview-deploy.yml",
  ])
    assert.ok(isWebsitePath(path), path);
  for (const path of ["packages/service/src/app.ts", "packages/bundlewatch/src/cli.ts", undefined])
    assert.equal(isWebsitePath(path), false);
});

test("change detection handles pagination, renames out of the website, and the API limit", async () => {
  const calls = [];
  assert.equal(
    await hasWebsiteChanges(pr, async (path) => {
      calls.push(path);
      return calls.length === 1
        ? Array.from({ length: 100 }, () => ({ filename: "other" }))
        : [{ filename: "archive/page.md", previous_filename: "packages/website/docs/page.md" }];
    }),
    true,
  );
  assert.equal(calls.length, 2);
  assert.equal(await hasWebsiteChanges({ ...pr, changed_files: 3001 }, () => assert.fail()), true);
});

test("snapshot comparison ignores unrelated commits and detects shared inputs and truncated trees", async () => {
  const before = [file("pnpm-lock.yaml"), file("packages/service/src/app.ts", "old")];
  const api = async (path) => ({
    tree: path.includes("before")
      ? before
      : [file("pnpm-lock.yaml"), file("packages/service/src/app.ts", "new")],
  });
  assert.equal(await sameWebsiteInputs("before", "after", api), true);
  assert.equal(
    await sameWebsiteInputs("before", "after", async (path) => ({
      tree: path.includes("before") ? before : [file("pnpm-lock.yaml", "new")],
    })),
    false,
  );
  assert.equal(
    await sameWebsiteInputs("before", "after", async () => ({ tree: [], truncated: true })),
    false,
  );
});

test("preview filtering skips unrelated PRs and unchanged inputs, but retries failed deployments", async () => {
  assert.equal(await selectPreview(pr, appId, async () => [{ filename: "README.md" }]), "remove");
  assert.equal(
    await selectPreview({ ...pr, state: "closed" }, appId, () => assert.fail()),
    "remove",
  );
  assert.equal(
    await selectPreview({ ...pr, base: { ref: "develop" } }, appId, () => assert.fail()),
    "remove",
  );
  let state = "success";
  const api = async (path) => {
    if (path.includes("/files?")) return [{ filename: "pnpm-lock.yaml" }];
    if (path.startsWith("/deployments?")) return [{ id: 1, sha: "head", payload: { appId } }];
    if (path.includes("/statuses")) return [{ state }];
    assert.fail(path);
  };
  assert.equal(await selectPreview(pr, appId, api), "unchanged");
  state = "failure";
  assert.equal(await selectPreview(pr, appId, api), "build");
  assert.equal(await selectPreview(pr, "dnewapp", api), "build");
});

test("without the app ID, as in a fork PR's build, website PRs build instead of trusting a preview", async () => {
  const lookups = [];
  const api = async (path) => {
    lookups.push(path);
    return [{ filename: "packages/website/docs/en/index.md" }];
  };
  assert.equal(await selectPreview(pr, "", api), "build");
  assert.equal(await selectPreview(pr, undefined, api), "build");
  // Only changed files were read: without the app ID, no deployment can count as current.
  assert.ok(lookups.every((path) => path.includes("/files?")));
  assert.equal(await selectPreview(pr, "", async () => [{ filename: "README.md" }]), "remove");
});

test("PR builds aren't gated on repository variables, which fork PRs may not receive", () => {
  const workflow = readFileSync(
    new URL("../../../.github/workflows/website-preview.yml", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(workflow, /^\s*if:.*\bvars\./m);
});

function fixture({
  pull = pr,
  build = run,
  site = artifact,
  deployments = [],
  deployError,
  afterDeploy = pull,
} = {}) {
  const writes = [];
  const aws = [];
  let uploaded = false;
  const api = async (path, options = {}) => {
    if (options.method === "POST") {
      writes.push({ path, body: options.body });
      return { id: 55 };
    }
    if (path === "/pulls/12") return uploaded ? afterDeploy : pull;
    if (path === "/actions/runs/90") return build;
    if (path.startsWith("/actions/runs/90/artifacts?")) return { artifacts: site ? [site] : [] };
    if (path === "/actions/artifacts/100") return site;
    if (path.startsWith("/commits/head/pulls?")) return [{ number: 12 }];
    if (path.includes("/files?")) return [{ filename: "pnpm-lock.yaml" }];
    if (path.startsWith("/deployments?")) {
      const query = new URL(path, "https://api.github.com").searchParams;
      return deployments
        .map((deployment) => ({
          environment: "website-preview",
          task: "deploy:website-preview:12",
          ...deployment,
        }))
        .filter(
          (deployment) =>
            deployment.environment === query.get("environment") &&
            deployment.task === query.get("task"),
        );
    }
    if (path.includes("/statuses?")) return [{ state: "success" }];
    assert.fail(path);
  };
  return {
    api,
    writes,
    aws,
    resolve: () => resolvePreview({ workflow_run: { id: 90 } }, repository, api),
    publish: () =>
      publishPreview({
        number: 12,
        runId: 90,
        artifactId: site?.id,
        appId,
        repository,
        logUrl: "https://logs",
        api,
        amplify: (operation, parameters) => {
          aws.push({ operation, ...parameters });
          return operation === "get-branch" ? { branch: {} } : {};
        },
        deploy: async (options) => {
          assert.equal(options.branchName, "pr-12");
          assert.equal(options.artifact.id, 100);
          if (deployError) throw deployError;
          uploaded = true;
        },
      }),
  };
}

test("resolves fork builds even when GitHub omits the PR association", async () => {
  assert.deepEqual(await fixture().resolve(), { number: 12, runId: 90, artifactId: 100 });
  assert.deepEqual(await fixture({ site: null }).resolve(), {
    number: 12,
    runId: 90,
    artifactId: undefined,
  });
});

test("rejects spoofed workflow names, wrong events, fork identities, and stale heads", async () => {
  for (const changes of [
    { path: ".github/workflows/evil.yml" },
    { event: "push" },
    { conclusion: "failure" },
    { head_sha: "old" },
    { head_branch: "other" },
    { head_repository: { id: 99 } },
  ]) {
    // eslint-disable-next-line no-await-in-loop
    assert.equal(await fixture({ build: { ...run, ...changes } }).resolve(), null);
  }
});

test("publishes a deployment on the original PR SHA and succeeds only after upload completes", async () => {
  const f = fixture();
  assert.match(await f.publish(), /https:\/\/pr-12.dtest.amplifyapp.com/);
  assert.equal(f.writes[0].body.ref, "head");
  assert.equal(f.writes[0].body.environment, "website-preview");
  assert.equal(f.writes[0].body.task, "deploy:website-preview:12");
  assert.equal(f.writes[0].body.payload.pullNumber, 12);
  assert.equal(f.writes[0].body.auto_merge, false);
  assert.deepEqual(f.writes[0].body.required_contexts, []);
  assert.deepEqual(
    f.writes.slice(1).map(({ body }) => body.state),
    ["in_progress", "success"],
  );
  assert.deepEqual(f.aws, []); // Only the artifact deployer needs AWS.
  assert.ok(f.writes.slice(1).every(({ body }) => body.auto_inactive === false));
});

test("publishing and closing one PR leave other previews in the shared environment active", async () => {
  const deployments = [
    { id: 9, payload: { appId: "dpreviousapp" } },
    { id: 10, task: "deploy:website-preview:13", sha: "head", payload: { appId } },
  ];
  const published = fixture({ deployments });
  assert.match(await published.publish(), /Website deployed/);
  const closed = fixture({ pull: { ...pr, state: "closed" }, deployments });
  assert.equal(await closed.publish(), "Preview removed");
  for (const f of [published, closed]) {
    assert.ok(
      f.writes.some(
        ({ path, body }) => path === "/deployments/9/statuses" && body.state === "inactive",
      ),
    );
    assert.ok(!f.writes.some(({ path }) => path === "/deployments/10/statuses"));
    assert.ok(
      f.writes
        .filter(({ path }) => path.includes("/statuses"))
        .every(({ body }) => body.auto_inactive === false),
    );
  }
});

test("after AMPLIFY_APP_ID changes, a current preview on the old app is published to the new one", async () => {
  // Same PR SHA and a success status: only the app ID shows this preview is stale.
  const f = fixture({ deployments: [{ id: 9, sha: "head", payload: { appId: "dpreviousapp" } }] });
  assert.match(await f.publish(), /Website deployed: .*pr-12.dtest/);
  assert.equal(f.writes[0].path, "/deployments");
  assert.ok(
    f.writes.some(
      ({ path, body }) => path === "/deployments/9/statuses" && body.state === "inactive",
    ),
  );
});

test("publisher rejects an artifact from a different run before any mutations", async () => {
  const f = fixture({ site: { ...artifact, workflow_run: { id: 999 } } });
  await assert.rejects(f.publish(), /does not belong/);
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.aws, []);
});

test("queued stale publishers cannot deploy old artifacts", async () => {
  const f = fixture({ build: { ...run, head_sha: "old" } });
  assert.match(await f.publish(), /Superseded/);
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.aws, []);
});

test("a failed Amplify deployment is reported as failure on GitHub", async () => {
  const f = fixture({ deployError: new Error("Amplify FAILED") });
  await assert.rejects(f.publish(), /Amplify FAILED/);
  assert.deepEqual(
    f.writes.slice(1).map(({ body }) => body.state),
    ["in_progress", "failure"],
  );
});

test("closed and retargeted PRs delete only their own hosting destination and retire deployments", async () => {
  for (const pull of [
    { ...pr, state: "closed" },
    { ...pr, base: { ...pr.base, ref: "develop" } },
  ]) {
    const f = fixture({ pull, site: null, deployments: [{ id: 9 }] });
    // eslint-disable-next-line no-await-in-loop
    assert.equal(await f.publish(), "Preview removed");
    assert.deepEqual(f.aws, [
      { operation: "get-branch", branchName: "pr-12" },
      { operation: "delete-branch", branchName: "pr-12" },
    ]);
    assert.deepEqual(
      f.writes.map(({ body }) => body.state),
      ["inactive"],
    );
  }
});

test("a PR closed while uploading is removed instead of marked successful", async () => {
  const f = fixture({ afterDeploy: { ...pr, state: "closed" } });
  assert.equal(await f.publish(), "Preview removed");
  assert.ok(f.aws.some(({ operation }) => operation === "delete-branch"));
  assert.ok(!f.writes.some(({ body }) => body.state === "success"));
});
