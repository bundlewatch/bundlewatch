import { appendFileSync } from "node:fs";

export async function github(path, { method = "GET", body, raw = false } = {}) {
  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
  if (raw) return Buffer.from(await response.arrayBuffer());
  return response.status === 204 ? null : response.json();
}

export async function pages(path, api = github, field) {
  const results = [];
  for (let page = 1; ; page++) {
    // eslint-disable-next-line no-await-in-loop
    const response = await api(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    const batch = field ? response[field] : response;
    results.push(...batch);
    if (batch.length < 100) return results;
  }
}

export function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

export function summary(message) {
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n`);
}
