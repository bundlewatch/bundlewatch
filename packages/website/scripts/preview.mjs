import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { amplifyClient, deployArtifact, waitForJob } from "./amplify-deploy.mjs";
import { github, output, pages, summary } from "./github.mjs";
import { hasWebsiteChanges, sameWebsiteInputs } from "./website-inputs.mjs";

const environment = "website-preview";
const taskFor = (number) => `deploy:website-preview:${number}`;
const workflowPath = ".github/workflows/website-preview.yml";
const deploymentsFor = (number, api) =>
  pages(`/deployments?environment=${environment}&task=${encodeURIComponent(taskFor(number))}`, api);

export async function selectPreview(pr, appId, api = github) {
  if (pr.state !== "open" || pr.base.ref !== "main" || !(await hasWebsiteChanges(pr, api)))
    return "remove";
  const deployments = await deploymentsFor(pr.number, api);
  const latest = deployments.find((deployment) => deployment.payload?.appId === appId);
  if (latest) {
    const [status] = await api(`/deployments/${latest.id}/statuses?per_page=1`);
    if (status?.state === "success" && (await sameWebsiteInputs(latest.sha, pr.head.sha, api)))
      return "unchanged";
  }
  return "build";
}

function matchesRun(pr, run, repository) {
  return (
    pr.base.repo.full_name === repository &&
    pr.head.sha === run.head_sha &&
    pr.head.ref === run.head_branch &&
    pr.head.repo?.id === run.head_repository?.id
  );
}

export function isPreviewRun(run) {
  return run.event === "pull_request" && run.path === workflowPath && run.conclusion === "success";
}

// An artifact's name supplies only a candidate PR number. All authority comes
// from GitHub's run/PR records, never from files inside the untrusted artifact.
export async function resolvePreview(event, repository, api = github) {
  if (!event.workflow_run) return { number: event.pull_request.number };
  const run = await api(`/actions/runs/${event.workflow_run.id}`);
  if (!isPreviewRun(run)) return null;
  const artifacts = await pages(`/actions/runs/${run.id}/artifacts`, api, "artifacts");
  const sites = artifacts.filter((artifact) => /^website-preview-[1-9]\d*$/.test(artifact.name));
  if (sites.length > 1) throw new Error("Expected one website artifact per run");
  const artifact = sites[0];
  // Fork workflow_run payloads can have an empty pull_requests array. The
  // artifact name covers builds; commit association covers skipped builds
  // that may need to remove a preview after its website changes were reverted.
  const candidates = artifact
    ? [{ number: Number(artifact.name.slice("website-preview-".length)) }]
    : run.pull_requests?.length
      ? run.pull_requests
      : await pages(`/commits/${run.head_sha}/pulls`, api);
  const prs = await Promise.all(candidates.map(({ number }) => api(`/pulls/${number}`)));
  const matches = prs.filter((pr) => matchesRun(pr, run, repository));
  if (matches.length !== 1) return null; // A superseded run must not deploy.
  return { number: matches[0].number, runId: run.id, artifactId: artifact?.id };
}

export async function publishPreview({
  number,
  runId,
  artifactId,
  appId,
  repository,
  logUrl,
  api = github,
  amplify,
  deploy = deployArtifact,
}) {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid PR number");
  const branchName = `pr-${number}`;
  const url = `https://${branchName}.${appId}.amplifyapp.com`;
  const pr = await api(`/pulls/${number}`);
  const action = await selectPreview(pr, appId, api);

  async function retire(keepId) {
    const deployments = await deploymentsFor(number, api);
    for (const deployment of deployments) {
      if (deployment.id === keepId) continue;
      // eslint-disable-next-line no-await-in-loop
      const [status] = await api(`/deployments/${deployment.id}/statuses?per_page=1`);
      if (status?.state === "inactive") continue;
      // eslint-disable-next-line no-await-in-loop
      await api(`/deployments/${deployment.id}/statuses`, {
        method: "POST",
        body: {
          state: "inactive",
          auto_inactive: false,
          log_url: logUrl,
        },
      });
    }
  }

  async function remove() {
    const branch = amplify("get-branch", { branchName }, true)?.branch;
    if (branch) {
      if (branch.activeJobId) {
        const job = amplify("get-job", { branchName, jobId: branch.activeJobId }, true);
        if (job && !["SUCCEED", "FAILED", "CANCELLED"].includes(job.job.summary.status)) {
          amplify("stop-job", { branchName, jobId: branch.activeJobId });
          await waitForJob(amplify, branchName, branch.activeJobId, { requireSuccess: false });
        }
      }
      amplify("delete-branch", { branchName });
    }
    await retire();
    return "Preview removed";
  }

  if (action === "remove") return remove();
  if (action === "unchanged") return `Website unchanged: [Open preview](${url})`;
  if (!artifactId) return "No website artifact to publish";

  const [run, artifact] = await Promise.all([
    api(`/actions/runs/${runId}`),
    api(`/actions/artifacts/${artifactId}`),
  ]);
  if (!isPreviewRun(run) || !matchesRun(pr, run, repository))
    return "Superseded preview build skipped";
  if (artifact.workflow_run?.id !== run.id || artifact.name !== `website-preview-${number}`)
    throw new Error("Artifact does not belong to this PR build");

  const deployment = await api("/deployments", {
    method: "POST",
    body: {
      ref: pr.head.sha,
      environment,
      task: taskFor(number),
      auto_merge: false,
      required_contexts: [],
      transient_environment: true,
      production_environment: false,
      payload: { appId, pullNumber: number },
      description: `Amplify website preview for PR #${number}`,
    },
  });
  const status = (state) =>
    api(`/deployments/${deployment.id}/statuses`, {
      method: "POST",
      body: {
        state,
        environment_url: url,
        log_url: logUrl,
        auto_inactive: false,
      },
    });
  await status("in_progress");
  try {
    await deploy({ artifact, branchName, amplify, api });
    const current = await api(`/pulls/${number}`);
    if (current.state !== "open" || current.base.ref !== "main") return await remove();
    if (current.head.sha !== pr.head.sha) {
      await status("inactive");
      return "PR changed during deployment; its latest build will publish the preview";
    }
    await status("success");
    await retire(deployment.id);
  } catch (error) {
    await status("failure");
    throw error;
  }
  return `Website deployed: [Open preview](${url})`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const appId = process.env.AMPLIFY_APP_ID;
  const repository = process.env.GITHUB_REPOSITORY;
  switch (process.argv[2]) {
    case "build": {
      const pr = await github(`/pulls/${event.pull_request.number}`);
      const action =
        pr.head.sha === event.pull_request.head.sha ? await selectPreview(pr, appId) : "superseded";
      output("build", action === "build");
      summary(`Website preview: ${action}`);
      break;
    }
    case "resolve": {
      const result = await resolvePreview(event, repository);
      if (result) {
        output("number", result.number);
        output("run-id", result.runId ?? "");
        output("artifact-id", result.artifactId ?? "");
      }
      break;
    }
    case "publish":
      summary(
        await publishPreview({
          number: Number(process.env.PULL_NUMBER),
          runId: Number(process.env.BUILD_RUN_ID),
          artifactId: Number(process.env.ARTIFACT_ID),
          appId,
          repository,
          logUrl: `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`,
          amplify: amplifyClient(appId),
        }),
      );
      break;
    default:
      throw new Error("Expected build, resolve, or publish");
  }
}
