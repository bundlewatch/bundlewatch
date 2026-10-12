// Checks a deployed copy of the site, such as a pull request preview, the
// Amplify URL before the domain moves, or https://bundlewatch.io:
//
//   node packages/website/scripts/check-deployment.mjs https://main.d1abc2def3.amplifyapp.com
//
// Every page in the sitemap must load at its clean URL without a redirect,
// the files for LLMs must have the right type, unknown paths must get the
// 404 page, and the headers from customHttp.yml must be there.

const [input] = process.argv.slice(2);
if (!URL.canParse(input)) {
  console.error("Usage: node check-deployment.mjs <site URL>");
  process.exit(1);
}
const site = new URL(input);

// A preview's sitemap comes from the pull request: never follow it to
// another host, e.g. with a <loc> of https://bundlewatch.io//example.com/.
const onSite = (path) => new URL(path, site).origin === site.origin;

const get = (path) => {
  if (!onSite(path)) {
    throw new Error(`${path} is not on ${site.origin}`);
  }
  return fetch(new URL(path, site), { redirect: "manual" });
};

/** Requests `path` and lists how the response differs from `expected`. */
const check = async (path, expected) => {
  const response = await get(path);
  const problems = [];
  if (response.status !== expected.status) {
    const location = response.headers.get("location");
    problems.push(`status ${response.status}${location ? ` → ${location}` : ""}`);
  }
  const type = response.headers.get("content-type") ?? "";
  if (expected.type && !type.startsWith(expected.type)) {
    problems.push(`content-type "${type}"`);
  }
  for (const [name, value] of Object.entries(expected.headers ?? {})) {
    const actual = response.headers.get(name);
    if (!actual?.includes(value)) problems.push(`${name} "${actual ?? ""}"`);
  }
  return { path, problems, response };
};

const sitemap = await (await get("/sitemap.xml")).text();
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  ([, loc]) => new URL(loc).pathname,
);
const pages = locations.filter(onSite);

const html = { status: 200, type: "text/html" };
const results = await Promise.all([
  check("/", {
    ...html,
    headers: { "strict-transport-security": "max-age=", "access-control-allow-origin": "*" },
  }),
  ...pages.filter((path) => path !== "/").map((path) => check(path, html)),
  check("/llms.txt", { status: 200, type: "text/plain" }),
  check("/llms-full.txt", { status: 200, type: "text/plain" }),
  check("/guide/getting-started.md", { status: 200, type: "text/markdown" }),
  check("/this-page-does-not-exist", { status: 404, type: "text/html" }),
]);

const asset = /\/assets\/[^"]+\.js/.exec(await results[0].response.text())?.[0];
if (asset) {
  results.push(await check(asset, { status: 200, headers: { "cache-control": "immutable" } }));
}
if (pages.length === 0) {
  results.push({ path: "/sitemap.xml", problems: ["no pages listed"] });
}
for (const path of locations.filter((location) => !onSite(location))) {
  results.push({ path, problems: ["sitemap entry points to another host, not requested"] });
}

const failures = results.filter(({ problems }) => problems.length > 0);
for (const { path, problems } of results) {
  console.log(`${problems.length > 0 ? "FAIL" : "ok  "} ${path} ${problems.join(", ")}`);
}
console.log(failures.length === 0 ? "\nAll checks passed." : `\n${failures.length} checks failed.`);
process.exitCode = failures.length === 0 ? 0 : 1;
