// Keep in sync with the push paths in .github/workflows/website.yml.
const rootInputs = new Set([
  "packages/bundlewatch/package.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".nvmrc",
  ".github/workflows/website.yml",
  ".github/workflows/website-preview.yml",
  ".github/workflows/website-preview-deploy.yml",
]);

export function isWebsitePath(path) {
  return Boolean(path?.startsWith("packages/website/") || rootInputs.has(path));
}

export async function hasWebsiteChanges(pr, api) {
  // The files API caps results at 3,000. Build conservatively beyond that.
  if (pr.changed_files > 3000) return true;
  for (let page = 1; ; page++) {
    // eslint-disable-next-line no-await-in-loop
    const files = await api(`/pulls/${pr.number}/files?per_page=100&page=${page}`);
    if (files.some((file) => isWebsitePath(file.filename) || isWebsitePath(file.previous_filename)))
      return true;
    if (files.length < 100) return false;
  }
}

export async function sameWebsiteInputs(before, after, api) {
  if (before === after) return true;
  const trees = await Promise.all(
    [before, after].map((sha) => api(`/git/trees/${sha}?recursive=1`)),
  );
  if (trees.some((tree) => tree.truncated)) return false;
  // Compare snapshots, so force pushes and changes reverted in a PR work too.
  return inputs(trees[0]) === inputs(trees[1]);
}

function inputs(tree) {
  return JSON.stringify(
    tree.tree
      .filter((entry) => entry.type !== "tree" && isWebsitePath(entry.path))
      .map(({ path, sha, mode }) => [path, sha, mode])
      .toSorted(([a], [b]) => a.localeCompare(b)),
  );
}
