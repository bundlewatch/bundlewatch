// Writes the documentation for LLMs and coding agents, following
// https://llmstxt.org: /llms.txt lists the pages, /llms-full.txt contains all
// of them, and every page is also available as Markdown at its URL without the
// trailing slash, plus `.md` (/guide/getting-started.md). Only the English
// pages are included, in sidebar order.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sidebarTopics } from "./sidebar.mjs";

const CONTENT = fileURLToPath(new URL("content/docs/", import.meta.url));

const SITE = "https://bundlewatch.io";

const SUMMARY =
  "BundleWatch checks the size of built browser assets in CI. It fails the build when a file is over its maxSize, compares each file with the last sizes saved for the base branch, and reports the result as a GitHub commit status with a link to a results page.";

const DETAILS = `Install it with \`npm install --save-dev bundlewatch\`, list the files to check under a \`bundlewatch\` key in package.json, and run \`npx bundlewatch\` after the build. It requires Node.js 22.17 or later. On GitHub Actions, pass the workflow's token as \`BUNDLEWATCH_GITHUB_TOKEN\` and grant \`statuses: write\`.`;

const OPTIONAL = [
  ["Source code and issues", "https://github.com/bundlewatch/bundlewatch"],
  [
    "Compatibility contract with 0.x",
    "https://github.com/bundlewatch/bundlewatch/blob/main/CONTRACT.md",
  ],
  ["Release notes", "https://github.com/bundlewatch/bundlewatch/releases"],
];

/** Sidebar groups as `{ title, pages: [url paths] }`, without duplicates. */
const sections = () => {
  const seen = new Set();
  const result = [];
  for (const topic of sidebarTopics) {
    for (const group of topic.items.filter((item) => item.items)) {
      const pages = group.items
        .map((item) => `/${item.slug}`)
        .filter((link) => !seen.has(link) && seen.add(link));
      if (pages.length > 0) {
        result.push({ title: group.label, pages });
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

/** Absolute URL for a link in the page at `pagePath`. Pages lose `.md` and end in a slash. */
const absoluteUrl = (target, pagePath) => {
  if (/^[a-z]+:/i.test(target)) return target;
  const url = new URL(target, `${SITE}${pagePath}.md`);
  url.pathname = url.pathname.replace(/\.md$/, "");
  if (!/(\/|\.\w+)$/.test(url.pathname)) url.pathname += "/";
  return url.href;
};

const ASIDE = /^:::(note|tip|caution|danger)(?:\[(.*)\])?$/;
// The default titles, as they were with VitePress's containers.
const ASIDE_TITLES = { note: "Info", tip: "Tip", caution: "Warning", danger: "Danger" };

/** Turns Starlight Markdown and MDX into plain Markdown. */
const toPlainMarkdown = (body, pagePath) => {
  const lines = [];
  let fence = false;
  let quote = false;
  let comment = false;
  let tab;
  let details = false;
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
      line = line.replace(/<!--[\s\S]*?-->/g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      const start = line.indexOf("<!--");
      if (start !== -1) {
        line = line.slice(0, start);
        comment = true;
      }
    }
    if (line.startsWith("```")) {
      if (!fence) {
        // ```js title="bundlewatch.config.mjs" → a label, then ```js
        const [, lang] = /^```([\w-]*)/.exec(line);
        const label = / title="([^"]+)"/.exec(line)?.[1] ?? tab;
        tab = undefined;
        if (label) lines.push(`${label}:`, "");
        line = `\`\`\`${lang}`;
      }
      fence = !fence;
    } else if (!fence) {
      const aside = ASIDE.exec(line);
      if (aside) {
        const [, type, title] = aside;
        lines.push(`> **${title ?? ASIDE_TITLES[type]}**`, ">");
        quote = true;
        continue;
      }
      if (line === ":::" || line === "</details>") {
        quote = false;
        if (line === "</details>" && lines.at(-1) === ">") lines.pop();
        continue;
      }
      // <details><summary>Title</summary> (::: details in VitePress) reads like an aside.
      if (line === "<details>") continue;
      const summary = /^<summary>(.*)<\/summary>$/.exec(line);
      if (summary) {
        lines.push(`> **${summary[1]}**`, ">");
        quote = true;
        details = true;
        continue;
      }
      // MDX: imports and the <Tabs> around code blocks. A tab's label
      // becomes the label of its code block.
      if (/^import .* from "[^"]+";$/.test(line) || /^<\/?Tabs\b[^>]*>$/.test(line)) continue;
      if (line === "</TabItem>") continue;
      const tabItem = /^<TabItem label="([^"]+)">$/.exec(line);
      if (tabItem) {
        tab = tabItem[1];
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
      // The blank line after <summary>, which Markdown needs, is already there.
      if (details && line === "" && lines.at(-1) === ">") {
        details = false;
        continue;
      }
    }
    lines.push(quote ? (line ? `> ${line}` : ">") : line);
  }
  return `${lines.join("\n").trim()}\n`;
};

const source = (pagePath) => {
  for (const extension of [".md", ".mdx"]) {
    const file = path.join(CONTENT, `${pagePath}${extension}`);
    if (existsSync(file)) return readFileSync(file, "utf8");
  }
  throw new Error(`No source for ${pagePath}`);
};

export const writeLlmsFiles = ({ outDir: outUrl }) => {
  const outDir = fileURLToPath(outUrl);
  const header = `# BundleWatch\n\n> ${SUMMARY}\n\n${DETAILS}\n`;
  const index = [header];
  const full = [header];

  for (const { title, pages } of sections()) {
    index.push(`## ${title}\n`);
    for (const pagePath of pages) {
      const page = parsePage(source(pagePath));
      // Starlight shows the title as the heading: the body has no H1.
      const markdown = `# ${page.title}\n\n${toPlainMarkdown(page.body, pagePath)}`;
      const file = path.join(outDir, `${pagePath}.md`);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, markdown);

      const description = page.description ? `: ${page.description}` : "";
      index.push(`- [${page.title}](${SITE}${pagePath}.md)${description}`);
      full.push(`---\n\nSource: ${SITE}${pagePath}/\n\n${markdown}`);
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
