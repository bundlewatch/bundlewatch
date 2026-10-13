import { html } from '../html.ts';
import { page } from './layout.ts';
import { type Authorization, ciPaths, finePrint, statusPreview } from './setup-github-page.ts';

/**
 * What browsers get at /, instead of the JSON that monitors and scripts get:
 * what the service does, then the same start as /setup-github.
 */
export const renderHomePage = ({
  serverCommitSha,
  ...authorization
}: Authorization & { serverCommitSha?: string | undefined }): string =>
  page({
    title: 'bundlewatch service | BundleWatch',
    stylesheet: '/static/results-styles.css',
    serverCommitSha,
    body: html`<h1>bundlewatch service</h1>
    <p class="lede">This service stores the file sizes that bundlewatch compares each build with, and shows the results pages linked from its GitHub statuses:</p>
    ${statusPreview}
    ${ciPaths(authorization)}
    ${finePrint(
      authorization.githubWebUrl,
      html`<dt>Guide</dt><dd><a href="https://bundlewatch.io/guide/getting-started">Getting Started</a>, on bundlewatch.io.</dd>`,
    )}`,
  });
