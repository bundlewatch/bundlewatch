import assert from "node:assert/strict";
import { test } from "node:test";

import { shared } from "../docs/.vitepress/config/shared.mjs";

test("canonical links use clean public routes and preserve each page's language", () => {
  for (const [relativePath, filePath, canonical] of [
    ["index.md", "en/index.md", "https://bundlewatch.io/"],
    [
      "guide/getting-started.md",
      "en/guide/getting-started.md",
      "https://bundlewatch.io/guide/getting-started",
    ],
    ["fr/index.md", "fr/index.md", "https://bundlewatch.io/fr/"],
    [
      "fr/guide/getting-started.md",
      "fr/guide/getting-started.md",
      "https://bundlewatch.io/fr/guide/getting-started",
    ],
    ["zh/index.md", "zh/index.md", "https://bundlewatch.io/zh/"],
    ["zh/reference/cli.md", "zh/reference/cli.md", "https://bundlewatch.io/zh/reference/cli"],
    ["guide/index.md", "en/guide/index.md", "https://bundlewatch.io/guide/"],
    ["guide/reindex.md", "en/guide/reindex.md", "https://bundlewatch.io/guide/reindex"],
  ]) {
    const pageData = { relativePath, filePath, frontmatter: {} };
    shared.transformPageData(pageData);
    assert.deepEqual(
      pageData.frontmatter.head,
      [["link", { rel: "canonical", href: canonical }]],
      filePath,
    );
  }
});

test("canonical generation preserves other page metadata and replaces duplicate canonicals", () => {
  const description = ["meta", { name: "description", content: "A guide" }];
  const alternate = [
    "link",
    { rel: "alternate", href: "https://bundlewatch.io/fr/guide/getting-started" },
  ];
  const pageData = {
    relativePath: "guide/getting-started.md",
    frontmatter: {
      title: "Getting started",
      head: [
        description,
        [
          "link",
          { rel: "canonical", href: "https://bundlewatch.io/en/guide/getting-started.html" },
        ],
        alternate,
        ["link", { rel: "canonical", href: "https://bundlewatch.io/" }],
      ],
    },
  };
  shared.transformPageData(pageData);
  shared.transformPageData(pageData);
  assert.equal(pageData.frontmatter.title, "Getting started");
  assert.deepEqual(pageData.frontmatter.head, [
    description,
    alternate,
    ["link", { rel: "canonical", href: "https://bundlewatch.io/guide/getting-started" }],
  ]);
});

test("error pages do not receive canonical links", () => {
  for (const relativePath of ["404.md", "fr/404.md", "zh/404.md"]) {
    const pageData = { relativePath, frontmatter: {} };
    shared.transformPageData(pageData);
    assert.deepEqual(pageData.frontmatter, {}, relativePath);
  }
});
