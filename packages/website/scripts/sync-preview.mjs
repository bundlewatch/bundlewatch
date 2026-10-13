import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Keep in sync with the push paths in .github/workflows/website.yml.
const rootInputs = new Set([
  "packages/bundlewatch/package.json",
  "amplify.yml",
  "customHttp.yml",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".nvmrc",
  ".github/workflows/website.yml",
  ".github/workflows/website-preview.yml",
]);

export function isWebsitePath(path) {
  return path?.startsWith("packages/website/") || rootInputs.has(path);
}

function githubTree(tree) {
  return tree.tree.find((entry) => entry.path === ".github");
}

// api returns null only for explicitly allowed 404s. Never treat an API
// failure as "no website changes" or "branch missing".
export async function syncPreview({ repository, pullNumber, api }) {
  if (!Number.isSafeInteger(pullNumber) || pullNumber < 1) {
    throw new Error("PULL_NUMBER must be a positive integer");
  }
  const repo = `/repos/${repository}`;
  const branch = `pr-${pullNumber}`;
  const ref = `${repo}/git/refs/heads/${branch}`;
  // Read live state, so queued synchronize/close events cannot revive a
  // closed PR or roll a preview back to an earlier commit.
  const pr = await api("GET", `${repo}/pulls/${pullNumber}`);
  const existing = await api("GET", `${repo}/git/ref/heads/${branch}`, undefined, true);

  async function removePreview() {
    if (existing) await api("DELETE", ref, undefined, true);
    return { branch, status: existing ? "removed" : "skipped" };
  }

  if (pr.state !== "open" || pr.base.ref !== "main") return removePreview();

  // GitHub caps the files API at 3,000 files. Build conservatively if the
  // complete set cannot be inspected. Renames out of the website also count.
  let relevant = pr.changed_files > 3000;
  for (let page = 1; !relevant; page++) {
    // Stop as soon as a relevant file is found; the next page depends on this one.
    // eslint-disable-next-line no-await-in-loop
    const files = await api("GET", `${repo}/pulls/${pullNumber}/files?per_page=100&page=${page}`);
    relevant = files.some(
      (file) => isWebsitePath(file.filename) || isWebsitePath(file.previous_filename),
    );
    if (files.length < 100) break;
  }
  if (!relevant) return removePreview();

  // Keep Actions definitions from main. GITHUB_TOKEN cannot introduce new
  // workflow files, and preview branches must never carry PR-supplied Actions
  // definitions. Only Amplify executes the untrusted source.
  const [headTree, baseTree] = await Promise.all([
    api("GET", `${repo}/git/trees/${pr.head.sha}`),
    api("GET", `${repo}/git/trees/${pr.base.sha}`),
  ]);
  let previewSha = pr.head.sha;
  if (githubTree(headTree)?.sha !== githubTree(baseTree)?.sha) {
    const tree = await api("POST", `${repo}/git/trees`, {
      base_tree: headTree.sha,
      tree: [
        { path: ".github", mode: "040000", type: "tree", sha: githubTree(baseTree)?.sha ?? null },
      ],
    });
    const commit = await api("POST", `${repo}/git/commits`, {
      message: `Website preview for #${pullNumber} at ${pr.head.sha}`,
      tree: tree.sha,
      parents: [pr.head.sha],
    });
    previewSha = commit.sha;
  }
  if (existing?.object.sha === previewSha) return { branch, status: "unchanged" };

  if (existing) {
    // A PR can contain website changes followed by unrelated commits. Only
    // advance the preview when the website's actual inputs change again.
    const [before, after] = await Promise.all([
      api("GET", `${repo}/git/trees/${existing.object.sha}?recursive=1`),
      api("GET", `${repo}/git/trees/${previewSha}?recursive=1`),
    ]);
    const inputs = (tree) =>
      JSON.stringify(
        tree.tree
          .filter((entry) => entry.type !== "tree" && isWebsitePath(entry.path))
          .map(({ path, sha, mode }) => [path, sha, mode])
          .toSorted(([a], [b]) => a.localeCompare(b)),
      );
    if (!before.truncated && !after.truncated && inputs(before) === inputs(after)) {
      return { branch, status: "unchanged" };
    }
    await api("PATCH", ref, { sha: previewSha, force: true });
  } else {
    // The PR head object is available in the base repository's Git network,
    // including fork PRs. No PR code is checked out or run by this script.
    await api("POST", `${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: previewSha });
  }
  return { branch, status: "queued" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) throw new Error("GH_TOKEN and GITHUB_REPOSITORY are required");
  const result = await syncPreview({
    repository,
    pullNumber: Number(process.env.PULL_NUMBER),
    async api(method, path, body, allowMissing = false) {
      const response = await fetch(`https://api.github.com${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (allowMissing && response.status === 404) return null;
      if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
      return response.status === 204 ? null : response.json();
    },
  });
  let summary = `Website preview: ${result.status} (${result.branch}).\n`;
  const appId = process.env.AMPLIFY_APP_ID;
  if (["queued", "unchanged"].includes(result.status) && /^d[a-z0-9]+$/.test(appId ?? "")) {
    summary += `\nPreview URL (available after Amplify finishes building): https://${result.branch}.${appId}.amplifyapp.com\n`;
  }
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
