import assert from "node:assert/strict";
import { test } from "node:test";

import { isWebsitePath, syncPreview } from "./sync-preview.mjs";

const repo = "/repos/bundlewatch/bundlewatch";
const ref = `${repo}/git/refs/heads/pr-12`;
const markerPath = "packages/website/docs/public/__preview.json";
const file = (path, sha = "same") => ({ path, sha, type: "blob", mode: "100644" });
const tree = (entries = [], truncated = false) => ({ tree: entries, truncated });

function fixture({
  pr = {},
  existing = null,
  pages = [[]],
  trees = {},
  markerSha = "old-head",
} = {}) {
  const calls = [];
  const api = async (method, path, body, allowMissing) => {
    calls.push({ method, path, body, allowMissing });
    if (method !== "GET") return { sha: "sanitized" };
    if (path === `${repo}/pulls/12`) {
      return {
        state: "open",
        base: { ref: "main", sha: "base" },
        head: { sha: "head" },
        changed_files: 1,
        ...pr,
      };
    }
    if (path === `${repo}/git/ref/heads/pr-12`) return existing;
    if (path.startsWith(`${repo}/pulls/12/files?`)) {
      return pages[Number(new URL(`https://api.github.com${path}`).searchParams.get("page")) - 1];
    }
    if (path.startsWith(`${repo}/git/trees/`)) return trees[path.split("/trees/")[1]] ?? tree();
    if (path.startsWith(`${repo}/contents/${markerPath}?`)) {
      return { content: Buffer.from(JSON.stringify({ sourceSha: markerSha })).toString("base64") };
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  };
  return {
    calls,
    run: () => syncPreview({ repository: "bundlewatch/bundlewatch", pullNumber: 12, api }),
    writes: () => calls.filter((call) => call.method !== "GET"),
  };
}

test("website inputs include shared build files, but exclude CLI and service source", () => {
  for (const path of [
    "packages/website/docs/.vitepress/config/index.mjs",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
    "packages/bundlewatch/package.json",
    "amplify.yml",
    "customHttp.yml",
    ".nvmrc",
    ".github/workflows/website.yml",
    ".github/workflows/website-preview.yml",
  ])
    assert.ok(isWebsitePath(path), path);
  for (const path of [
    "README.md",
    "packages/service/src/app.ts",
    "packages/bundlewatch/src/cli.ts",
    undefined,
  ]) {
    assert.equal(Boolean(isWebsitePath(path)), false, path);
  }
});

test("unrelated PRs never create a preview", async () => {
  const f = fixture({ pages: [[{ filename: "packages/service/src/app.ts" }]] });
  assert.equal((await f.run()).status, "skipped");
  assert.deepEqual(f.writes(), []);
});

test("checks later pages and renames out of the website; mirrors the live PR head", async () => {
  const f = fixture({
    pages: [
      Array.from({ length: 100 }, () => ({ filename: "packages/service/src/app.ts" })),
      [{ filename: "archive/page.md", previous_filename: "packages/website/docs/en/page.md" }],
    ],
  });
  assert.equal((await f.run()).status, "queued");
  assert.deepEqual(
    f.writes().filter(({ path }) => path === `${repo}/git/refs`),
    [
      {
        method: "POST",
        path: `${repo}/git/refs`,
        body: { ref: "refs/heads/pr-12", sha: "sanitized" },
        allowMissing: undefined,
      },
    ],
  );
});

test("closed, retargeted, and no-longer-relevant PRs remove only their own preview ref", async () => {
  await Promise.all(
    [{ state: "closed" }, { base: { ref: "develop" } }, {}].map(async (pr) => {
      const f = fixture({ pr, existing: { object: { sha: "old" } } });
      assert.equal((await f.run()).status, "removed");
      assert.deepEqual(f.writes(), [
        { method: "DELETE", path: ref, body: undefined, allowMissing: true },
      ]);
    }),
  );
});

test("unrelated follow-up commits do not advance an existing preview", async () => {
  const f = fixture({
    existing: { object: { sha: "old" } },
    pages: [[{ filename: "packages/website/docs/en/index.md" }]],
    trees: {
      "old?recursive=1": tree([
        file(markerPath),
        file("packages/website/docs/en/index.md"),
        file("packages/core/index.ts", "old"),
      ]),
      "sanitized?recursive=1": tree([
        file(markerPath, "new-marker"),
        file("packages/website/docs/en/index.md"),
        file("packages/core/index.ts", "new"),
      ]),
    },
  });
  assert.deepEqual(await f.run(), {
    status: "unchanged",
    branch: "pr-12",
    headSha: "head",
    deployedSha: "old-head",
  });
  assert.equal(
    f.writes().some(({ path }) => path === ref),
    false,
  );
});

test("changed inputs and truncated trees advance previews, including force-pushed PRs", async () => {
  await Promise.all(
    [tree([file("pnpm-lock.yaml", "new")]), tree([], true)].map(async (after) => {
      const f = fixture({
        existing: { object: { sha: "old" } },
        pages: [[{ filename: "pnpm-lock.yaml" }]],
        trees: {
          "old?recursive=1": tree([file("pnpm-lock.yaml", "old")]),
          "sanitized?recursive=1": after,
        },
      });
      assert.equal((await f.run()).status, "queued");
      assert.deepEqual(
        f.writes().filter(({ path }) => path === ref),
        [
          {
            method: "PATCH",
            path: ref,
            body: { sha: "sanitized", force: true },
            allowMissing: undefined,
          },
        ],
      );
    }),
  );
});

test("PRs beyond GitHub's file limit build conservatively", async () => {
  const f = fixture({ pr: { changed_files: 3001 } });
  assert.equal((await f.run()).status, "queued");
  assert.equal(
    f.calls.some(({ path }) => path.includes("/files?")),
    false,
  );
});

test("PR-supplied Actions definitions are replaced with the trusted base's definitions", async () => {
  const f = fixture({
    pages: [[{ filename: ".github/workflows/website.yml" }]],
    trees: {
      head: { sha: "head-tree", tree: [{ path: ".github", sha: "untrusted" }] },
      base: { sha: "base-tree", tree: [{ path: ".github", sha: "trusted" }] },
    },
  });
  await f.run();
  const writes = f.writes();
  assert.deepEqual(writes[0].body, {
    base_tree: "head-tree",
    tree: [
      {
        path: markerPath,
        mode: "100644",
        type: "blob",
        content: JSON.stringify({ sourceSha: "head" }),
      },
      { path: ".github", mode: "040000", type: "tree", sha: "trusted" },
    ],
  });
  assert.deepEqual(writes[1].body.parents, ["head"]);
  assert.deepEqual(writes[2].body, { ref: "refs/heads/pr-12", sha: "sanitized" });
});

test("existing previews without a revision marker are rebuilt once for deployment tracking", async () => {
  const f = fixture({
    existing: { object: { sha: "old" } },
    pages: [[{ filename: "pnpm-lock.yaml" }]],
  });
  assert.equal((await f.run()).status, "queued");
  assert.ok(f.writes().some(({ path }) => path === ref));
});

test("API errors fail the run instead of silently skipping deployment", async () => {
  await assert.rejects(
    syncPreview({
      repository: "bundlewatch/bundlewatch",
      pullNumber: 12,
      api: async () => {
        throw new Error("GitHub HTTP 403");
      },
    }),
    /HTTP 403/,
  );
});
