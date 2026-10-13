import { setTimeout as sleep } from "node:timers/promises";

export async function waitForPreview({
  url,
  sourceSha,
  fetchSite = fetch,
  pause = sleep,
  now = Date.now,
  timeoutMs = 15 * 60 * 1000,
}) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    try {
      // A unique query bypasses cached markers while a new build propagates.
      // eslint-disable-next-line no-await-in-loop
      const response = await fetchSite(
        `${url}/__preview.json?revision=${sourceSha}&time=${now()}`,
        {
          signal: AbortSignal.timeout(Math.min(10_000, deadline - now())),
          cache: "no-store",
        },
      );
      // eslint-disable-next-line no-await-in-loop
      if (response.ok && (await response.json()).sourceSha === sourceSha) return;
    } catch {
      // DNS, HTTP failures and the previous site's 404 page are expected
      // while Amplify creates the branch and publishes its first build.
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(Math.min(10_000, Math.max(0, deadline - now())));
  }
  throw new Error(
    "Amplify did not serve the expected preview revision within 15 minutes; check its build logs",
  );
}

export async function updatePreviewDeployment({
  repository,
  result,
  appId,
  logUrl,
  api,
  wait = waitForPreview,
}) {
  const repo = `/repos/${repository}`;
  const task = "deploy:website-preview";
  const deployments = [];
  for (let page = 1; ; page++) {
    // Fetch every page so closing a long-lived PR retires all its previews.
    // eslint-disable-next-line no-await-in-loop
    const batch = await api(
      "GET",
      `${repo}/deployments?environment=${result.branch}&task=${encodeURIComponent(task)}&per_page=100&page=${page}`,
    );
    deployments.push(...batch);
    if (batch.length < 100) break;
  }
  async function retirePrevious(keepId) {
    for (const deployment of deployments) {
      if (deployment.id === keepId) continue;
      // eslint-disable-next-line no-await-in-loop
      const statuses = await api("GET", `${repo}/deployments/${deployment.id}/statuses?per_page=1`);
      if (statuses[0]?.state === "inactive") continue;
      // eslint-disable-next-line no-await-in-loop
      await api("POST", `${repo}/deployments/${deployment.id}/statuses`, {
        state: "inactive",
        auto_inactive: false,
        description: "Preview removed or superseded",
        log_url: logUrl,
      });
    }
  }
  if (!["queued", "unchanged"].includes(result.status)) {
    await retirePrevious();
    return;
  }

  const url = `https://${result.branch}.${appId}.amplifyapp.com`;
  let deployment = deployments.find(
    ({ sha, payload }) => sha === result.headSha && payload?.sourceSha === result.deployedSha,
  );
  if (deployment) {
    const statuses = await api("GET", `${repo}/deployments/${deployment.id}/statuses?per_page=1`);
    if (statuses[0]?.state === "success") {
      await retirePrevious(deployment.id);
      return;
    }
  } else {
    deployment = await api("POST", `${repo}/deployments`, {
      // pull_request_target runs on main. Use the PR SHA explicitly so the
      // deployment appears on the PR, including one opened from a fork.
      ref: result.headSha,
      environment: result.branch,
      task,
      auto_merge: false,
      required_contexts: [],
      transient_environment: true,
      production_environment: false,
      payload: { sourceSha: result.deployedSha },
      description: "Amplify website preview",
    });
  }
  const status = (state, description) =>
    api("POST", `${repo}/deployments/${deployment.id}/statuses`, {
      state,
      description,
      environment_url: url,
      log_url: logUrl,
      auto_inactive: false,
    });
  await status("in_progress", "Waiting for Amplify to serve the preview revision");
  try {
    await wait({ url, sourceSha: result.deployedSha });
  } catch (error) {
    await status("failure", "Preview revision was not published; check Amplify build logs");
    throw error;
  }
  await status("success", "Preview is serving the requested website revision");
  await retirePrevious(deployment.id);
}
