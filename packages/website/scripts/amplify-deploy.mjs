import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

import { github, output, summary } from "./github.mjs";

export function amplifyClient(appId, execute = execFileSync) {
  if (!/^d[a-z0-9]+$/.test(appId ?? "")) throw new Error("Invalid AMPLIFY_APP_ID");
  return (operation, parameters, allowMissing = false) => {
    try {
      const response = execute(
        "aws",
        [
          "amplify",
          operation,
          "--cli-input-json",
          JSON.stringify({ appId, ...parameters }),
          "--output",
          "json",
          "--no-cli-pager",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      return response.trim() ? JSON.parse(response) : {};
    } catch (error) {
      if (allowMissing && error.stderr?.includes("NotFoundException")) return null;
      throw error;
    }
  };
}

export async function waitForJob(
  amplify,
  branchName,
  jobId,
  { pause = sleep, requireSuccess = true } = {},
) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const job = amplify("get-job", { branchName, jobId }, !requireSuccess);
    // A branch can retain an activeJobId after that old job was deleted.
    if (!job && !requireSuccess) return;
    const { status } = job.job.summary;
    if (["SUCCEED", "FAILED", "CANCELLED"].includes(status)) {
      if (requireSuccess && status !== "SUCCEED")
        throw new Error(`Amplify job ${jobId}: ${status}`);
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(10_000);
  }
  amplify("stop-job", { branchName, jobId });
  throw new Error(`Amplify job ${jobId} timed out after 10 minutes`);
}

export async function deployArtifact({
  artifact,
  branchName,
  amplify,
  api = github,
  upload = fetch,
  pause = sleep,
}) {
  if (!/^(main|pr-[1-9]\d*)$/.test(branchName)) throw new Error("Invalid deployment destination");
  if (artifact.expired || !/^sha256:[a-f0-9]{64}$/.test(artifact.digest ?? ""))
    throw new Error("Artifact expired or has no SHA-256 digest");
  // The artifact API returns a ZIP of the site's files. Never extract or run it
  // on this credentialed runner; send the verified bytes straight to Amplify.
  const zip = await api(`/actions/artifacts/${artifact.id}/zip`, { raw: true });
  const digest = `sha256:${createHash("sha256").update(zip).digest("hex")}`;
  if (digest !== artifact.digest) throw new Error("Artifact digest mismatch");

  let branch = amplify("get-branch", { branchName }, true)?.branch;
  if (!branch) {
    if (branchName === "main")
      throw new Error("Production destination is missing; check CloudFormation");
    branch = amplify("create-branch", {
      branchName,
      stage: "PULL_REQUEST",
      enableAutoBuild: false,
      enablePullRequestPreview: false,
    }).branch;
  }
  // An interrupted Actions run can leave a job running in AWS. Wait for it
  // before submitting another deployment to this destination.
  if (branch.activeJobId)
    await waitForJob(amplify, branchName, branch.activeJobId, { pause, requireSuccess: false });

  const { jobId, zipUploadUrl } = amplify("create-deployment", { branchName });
  try {
    const response = await upload(zipUploadUrl, {
      method: "PUT",
      body: zip,
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Artifact upload failed: HTTP ${response.status}`);
    amplify("start-deployment", { branchName, jobId });
    await waitForJob(amplify, branchName, jobId, { pause });
  } catch (error) {
    // Also release jobs created before an upload or start failed.
    try {
      amplify("stop-job", { branchName, jobId });
    } catch {
      /* Preserve the deployment error. */
    }
    throw error;
  }
  return jobId;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const artifactId = process.env.ARTIFACT_ID;
  if (!/^\d+$/.test(artifactId ?? "")) throw new Error("ARTIFACT_ID is required");
  const artifact = await github(`/actions/artifacts/${artifactId}`);
  if (artifact.workflow_run?.id !== Number(process.env.GITHUB_RUN_ID))
    throw new Error("Production artifact belongs to another workflow run");
  await deployArtifact({
    artifact,
    branchName: "main",
    amplify: amplifyClient(process.env.AMPLIFY_APP_ID),
  });
  const url = `https://main.${process.env.AMPLIFY_APP_ID}.amplifyapp.com`;
  output("url", url);
  summary(`Website deployed: [Open site](${url})`);
}
