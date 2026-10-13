import { html, type SafeHtml } from '../html.ts';

// Shared markup of the 0.x Mustache templates, with the dead
// cdn.rawgit.com and raw.githubusercontent.com assets moved to
// bundlewatch.io.

export const page = ({
  title,
  stylesheet,
  body,
}: {
  title: string;
  stylesheet: string;
  body: SafeHtml;
}): string =>
  html`<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <link rel="icon" href="https://bundlewatch.io/favicon.svg" type="image/svg+xml">
    <link href="${stylesheet}" rel="stylesheet" type="text/css">
</head>
<body>
${body}
</body>
</html>
`.value;

export const logoHeader: SafeHtml = html`<header>
        <div class="logo">
            <a target="_blank" rel="noopener" href="https://bundlewatch.io/">
                <img src="/static/logo.svg" alt="BundleWatch" height="100">
            </a>
        </div>
    </header>`;

export const footerLinks: SafeHtml = html`<div class="footer">
        <a href="https://github.com/bundlewatch/bundlewatch/blob/main/CONTRIBUTING.md">Start Contributing</a> |
        <a href="https://bundlewatch.io">BundleWatch.io</a> |
        <a href="https://github.com/bundlewatch/bundlewatch/issues">Report an Issue</a>
    </div>`;
