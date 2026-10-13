import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { amplifyClient, deployArtifact, waitForJob } from "./amplify-deploy.mjs";

const bytes = Buffer.from("opaque artifact bytes");
const artifact = { id: 100, digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };

test("the AWS client accepts empty delete responses but only ignores explicit not-found errors", () => {
  assert.deepEqual(amplifyClient("dtest", () => "")("delete-branch", { branchName: "pr-12" }), {});
  const missing = amplifyClient("dtest", () => {
    throw Object.assign(new Error("AWS failed"), { stderr: "NotFoundException" });
  });
  assert.equal(missing("get-branch", { branchName: "pr-12" }, true), null);
  assert.throws(() => missing("get-branch", { branchName: "pr-12" }), /AWS failed/);
  assert.throws(
    () =>
      amplifyClient("dtest", () => {
        throw new Error("AccessDenied");
      })("get-branch", { branchName: "pr-12" }, true),
    /AccessDenied/,
  );
});

function fixture({ body = bytes, status = "SUCCEED", activeJobId, uploadOk = true } = {}) {
  const calls = [];
  const amplify = (operation, parameters) => {
    calls.push({ operation, ...parameters });
    if (operation === "get-branch") return { branch: { activeJobId } };
    if (operation === "create-deployment") return { jobId: "new", zipUploadUrl: "https://upload" };
    if (operation === "get-job") return { job: { summary: { status } } };
    return {};
  };
  return {
    calls,
    deploy: (overrides = {}) =>
      deployArtifact({
        artifact,
        branchName: "pr-12",
        amplify,
        api: async (path, options) => {
          assert.equal(path, "/actions/artifacts/100/zip");
          assert.equal(options.raw, true);
          return body;
        },
        upload: async (url, options) => {
          calls.push({ operation: "upload" });
          assert.equal(url, "https://upload");
          assert.equal(options.body, bytes);
          return { ok: uploadOk, status: 503 };
        },
        pause: async () => {},
        ...overrides,
      }),
  };
}

test("uploads the exact artifact bytes and waits for Amplify before returning", async () => {
  const f = fixture();
  assert.equal(await f.deploy(), "new");
  assert.deepEqual(
    f.calls.map(({ operation }) => operation),
    ["get-branch", "create-deployment", "upload", "start-deployment", "get-job"],
  );
});

test("invalid destinations, digest mismatches, and expired artifacts make no AWS calls", async () => {
  for (const [options, pattern] of [
    [{ branchName: "production" }, /destination/],
    [{ artifact: { ...artifact, expired: true } }, /expired/],
  ]) {
    const f = fixture();
    // eslint-disable-next-line no-await-in-loop
    await assert.rejects(f.deploy(options), pattern);
    assert.deepEqual(f.calls, []);
  }
  const f = fixture({ body: Buffer.from("tampered") });
  await assert.rejects(f.deploy(), /digest mismatch/);
  assert.deepEqual(f.calls, []);
});

test("an existing Amplify job finishes before another deployment starts", async () => {
  const f = fixture({ activeJobId: "old" });
  await f.deploy();
  assert.deepEqual(f.calls[1], { operation: "get-job", branchName: "pr-12", jobId: "old" });
  assert.equal(f.calls[2].operation, "create-deployment");
});

test("upload and deployment failures stop the job and propagate the failure", async () => {
  for (const options of [{ uploadOk: false }, { status: "FAILED" }]) {
    const f = fixture(options);
    // eslint-disable-next-line no-await-in-loop
    await assert.rejects(f.deploy(), /failed|FAILED/);
    assert.equal(f.calls.at(-1).operation, "stop-job");
  }
});

test("a stuck deployment has a bounded wait and is stopped", async () => {
  const calls = [];
  await assert.rejects(
    waitForJob(
      (operation) => {
        calls.push(operation);
        return { job: { summary: { status: "RUNNING" } } };
      },
      "pr-12",
      "job",
      { pause: async () => {} },
    ),
    /timed out/,
  );
  assert.equal(calls.filter((operation) => operation === "get-job").length, 60);
  assert.equal(calls.at(-1), "stop-job");
});
