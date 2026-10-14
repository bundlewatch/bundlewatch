// Fails the build on a link to a heading that doesn't exist, such as
// `./using-bundlewatch.md#github-action`. VitePress checks that the linked page
// exists, but not the part after `#`. This reads the built pages: every element
// `id` is a target, and every link with a `#` must point at one.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
  );

/** The URL of a built page: `guide/x.html` → `/guide/x`, `fr/index.html` → `/fr/`. */
const pageUrl = (file) => `/${file.replace(/\.html$/, "").replace(/(^|\/)index$/, "$1")}`;

export const checkAnchors = (outDir) => {
  const pages = new Map();
  for (const file of walk(outDir).filter((name) => name.endsWith(".html"))) {
    const relative = path.relative(outDir, file).split(path.sep).join("/");
    // VitePress writes the 404 page empty: it is drawn in the browser.
    if (relative === "404.html") continue;
    const html = readFileSync(file, "utf8");
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id));
    pages.set(pageUrl(relative), { relative, html, ids });
  }

  const problems = [];
  for (const [url, { relative, html }] of pages) {
    for (const [, href] of html.matchAll(/<a\b[^>]*?\shref="([^"]*#[^"]*)"/g)) {
      if (/^([a-z]+:|\/\/)/i.test(href)) continue;
      const target = new URL(href.replaceAll("&amp;", "&"), `https://site${url}`);
      // Other files, such as the Markdown copies, have no headings to check.
      if (/\.\w+$/.test(target.pathname)) continue;
      const page = pages.get(target.pathname);
      const id = decodeURIComponent(target.hash.slice(1));
      if (!page) problems.push(`${relative}: ${href} (no such page)`);
      else if (id && !page.ids.has(id)) problems.push(`${relative}: ${href}`);
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Links to headings that don't exist:\n${[...new Set(problems)].map((p) => `  ${p}`).join("\n")}`,
    );
  }
};
