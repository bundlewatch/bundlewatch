// Writes the documentation for LLMs and coding agents, following
// https://llmstxt.org: /llms.txt lists the pages, /llms-full.txt contains all
// of them, and every page is also available as Markdown at its URL plus `.md`.
// Only the English pages are included, in sidebar order.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SITE = "https://bundlewatch.io";

const SUMMARY =
  "BundleWatch checks the size of built browser assets in CI. It fails the build when a file is over its maxSize, compares each file with the last sizes saved for the base branch, and reports the result as a GitHub commit status with a link to a results page.";

const DETAILS = `Install it with \`npm install --save-dev bundlewatch\`, create \`bundlewatch.config.mjs\` with a default-exported configuration object containing a \`files\` array, and run \`npx bundlewatch --config bundlewatch.config.mjs\` after the build. Config files must be passed with \`--config\`; they are not discovered automatically. It requires Node.js 22.17 or later. On GitHub Actions, pass the workflow's token as \`BUNDLEWATCH_GITHUB_TOKEN\` and grant \`statuses: write\`.`;

const OPTIONAL = [
  ["Source code and issues", "https://github.com/bundlewatch/bundlewatch"],
  [
    "Compatibility contract with 0.x",
    "https://github.com/bundlewatch/bundlewatch/blob/main/CONTRACT.md",
  ],
  ["Release notes", "https://github.com/bundlewatch/bundlewatch/releases"],
];

/** Sidebar groups as `{ title, pages: [url paths] }`, without duplicates. */
const sections = (sidebar) => {
  const seen = new Set();
  const result = [];
  for (const { base, items } of Object.values(sidebar)) {
    // Groups without items are shortcuts to pages listed elsewhere.
    for (const group of items.filter((item) => item.items)) {
      const pages = group.items
        .map((item) => (item.base ?? group.base ?? base) + item.link)
        .filter((link) => !seen.has(link) && seen.add(link));
      if (pages.length > 0) {
        result.push({ title: group.text, pages });
      }
    }
  }
  return result;
};

const parsePage = (source) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  const field = (name) =>
    match && new RegExp(`^${name}:\\s*["']?(.*?)["']?\\s*$`, "m").exec(match[1])?.[1];
  const body = match ? source.slice(match[0].length) : source;
  return {
    title: field("title") ?? /^# (.+)$/m.exec(body)?.[1],
    description: field("description"),
    body,
  };
};

/** Absolute URL for a link in the page at `pagePath`. Pages lose `.md`. */
const absoluteUrl = (target, pagePath) => {
  if (/^[a-z]+:/i.test(target)) return target;
  const url = new URL(target, `${SITE}${pagePath}.md`);
  url.pathname = url.pathname.replace(/\.md$/, "");
  return url.href;
};

const CONTAINER = /^::: (tip|info|warning|danger|details)(?: (.*))?$/;

/** Turns VitePress Markdown into plain Markdown. */
const toPlainMarkdown = (body, pagePath) => {
  const lines = [];
  let fence = false;
  let quote = false;
  let comment = false;
  for (let line of body.split("\n")) {
    // HTML comments don't render, so they don't belong in the text either,
    // including ones that span several lines.
    if (comment) {
      const end = line.indexOf("-->");
      if (end === -1) continue;
      line = line.slice(end + 3);
      comment = false;
    }
    if (!fence) {
      line = line.replace(/<!--[\s\S]*?-->/g, "");
      const start = line.indexOf("<!--");
      if (start !== -1) {
        line = line.slice(0, start);
        comment = true;
      }
    }
    if (line.startsWith("```")) {
      if (!fence) {
        // ```js [bundlewatch.config.mjs] → a label, then ```js
        const [, lang, label] = /^```([\w-]*)(?::[\w-]+)?(?: \[(.+)\])?/.exec(line);
        if (label) lines.push(`${label}:`, "");
        line = `\`\`\`${lang}`;
      }
      fence = !fence;
    } else if (!fence) {
      const container = CONTAINER.exec(line);
      if (container) {
        const [, type, title] = container;
        lines.push(`> **${title ?? type[0].toUpperCase() + type.slice(1)}**`, ">");
        quote = true;
        continue;
      }
      if (line === "::: code-group" || line === ":::") {
        quote = false;
        continue;
      }
      if (/^<\/?div\b[^>]*>$/.test(line.trim()) || /^<a id="[^"]*"><\/a>$/.test(line)) continue;
      // Images are indented inside their <div>, which Markdown reads as code.
      if (/^\s*<img\b[^>]*>$/.test(line)) line = line.trim();
      line = line
        .replace(/^(#+ .*?) \{#[\w-]+\}$/, "$1")
        .replace(/<a id="[^"]*"><\/a>/g, "")
        .replace(/<img\b[^>]*>/g, (img) => {
          const alt = /alt="([^"]*)"/.exec(img)?.[1] ?? "";
          const src = /src="([^"]*)"/.exec(img)?.[1] ?? "";
          return `![${alt}](${absoluteUrl(src, pagePath)})`;
        })
        .replace(/\]\(([^)\s]+)\)/g, (_, target) => `](${absoluteUrl(target, pagePath)})`);
      if (line.trim() === "" && lines.at(-1)?.trim() === "") continue;
    }
    lines.push(quote ? (line ? `> ${line}` : ">") : line);
  }
  return `${lines.join("\n").trim()}\n`;
};

export const writeLlmsFiles = ({ srcDir, outDir, sidebar }) => {
  const header = `# BundleWatch\n\n> ${SUMMARY}\n\n${DETAILS}\n`;
  const index = [header];
  const full = [header];

  for (const { title, pages } of sections(sidebar)) {
    index.push(`## ${title}\n`);
    for (const pagePath of pages) {
      const page = parsePage(readFileSync(path.join(srcDir, "en", `${pagePath}.md`), "utf8"));
      const markdown = toPlainMarkdown(page.body, pagePath);
      const file = path.join(outDir, `${pagePath}.md`);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, markdown);

      const description = page.description ? `: ${page.description}` : "";
      index.push(`- [${page.title}](${SITE}${pagePath}.md)${description}`);
      full.push(`---\n\nSource: ${SITE}${pagePath}\n\n${markdown}`);
    }
    index.push("");
  }

  index.push("## Optional\n", ...OPTIONAL.map(([text, url]) => `- [${text}](${url})`), "");
  index.splice(
    1,
    0,
    `The whole documentation in one file: [llms-full.txt](${SITE}/llms-full.txt)\n`,
  );

  writeFileSync(path.join(outDir, "llms.txt"), index.join("\n"));
  writeFileSync(path.join(outDir, "llms-full.txt"), full.join("\n"));
};
