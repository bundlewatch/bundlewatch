import { html, SafeHtml } from '../html.ts';
import { MARK_PATHS, NAME_PATHS } from '../static/logo.ts';

// The frame every page shares: the logo in the left margin, the content,
// and a footer with links and the deployed commit.

/**
 * The hexagon alone. `isolation` keeps the yellow layer's multiply blend
 * inside the logo, whatever is behind it.
 */
export const mark = (height: number): SafeHtml =>
  html`<svg class="bw-mark" viewBox="0 0 47.11 52.64" width="${Math.round((height * 47.11) / 52.64)}" height="${height}" aria-hidden="true" style="isolation:isolate"><path fill="#ffcd52" style="mix-blend-mode:multiply" d="${MARK_PATHS.yellow}"/><path fill="#d54400" d="${MARK_PATHS.orange}"/><path fill="#000051" d="${MARK_PATHS.navy}"/></svg>`;

/** The name alone, in the text color. */
const wordmark = (height: number): SafeHtml =>
  html`<svg class="bw-wordmark" viewBox="61 8.9 236 32.5" width="${Math.round((height * 236) / 32.5)}" height="${height}" role="img" aria-label="BundleWatch" fill="currentColor">${NAME_PATHS.map((d) => html`<path d="${d}"/>`)}</svg>`;

const footer = (serverCommitSha: string | undefined): SafeHtml => html`<footer>
        ${wordmark(15)}
        <a href="https://bundlewatch.io">bundlewatch.io</a>
        <a href="https://github.com/bundlewatch/bundlewatch/issues">Report an issue</a>
        <a href="https://github.com/bundlewatch/bundlewatch/blob/main/CONTRIBUTING.md">Contribute</a>
        ${
          serverCommitSha &&
          html`<span class="sha">service <a href="https://github.com/bundlewatch/bundlewatch/commit/${encodeURIComponent(serverCommitSha)}">${serverCommitSha.slice(0, 7)}</a></span>`
        }
    </footer>`;

export const page = ({
  title,
  description,
  stylesheet,
  body,
  serverCommitSha,
  script,
}: {
  title: string;
  /** Shown in link previews, for example in chat apps. */
  description?: string | undefined;
  stylesheet: string;
  body: SafeHtml;
  serverCommitSha?: string | undefined;
  /** Inline, so the page's Content-Security-Policy must allow its hash. */
  script?: string | undefined;
}): string =>
  html`<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    ${description && html`<meta name="description" content="${description}">`}
    <link rel="icon" href="https://bundlewatch.io/favicon.svg" type="image/svg+xml">
    <link href="${stylesheet}" rel="stylesheet" type="text/css">
</head>
<body>
<div class="page">
    <div class="rail"><a href="https://bundlewatch.io/" aria-label="BundleWatch">${mark(48)}</a></div>
    <div>
    <main>
${body}
    </main>
    ${footer(serverCommitSha)}
    </div>
</div>
${script && html`<script>${new SafeHtml(script)}</script>`}
</body>
</html>
`.value;
