import { html } from '../html.ts';
import { logoHeader, page } from './layout.ts';
import { serverCommitFooter } from './results-page.ts';

/** What browsers get at /, instead of the JSON that monitors and scripts get. */
export const renderHomePage = ({
  serverCommitSha,
}: {
  serverCommitSha?: string | undefined;
}): string =>
  page({
    title: 'bundlewatch service | BundleWatch',
    stylesheet: '/static/results-styles.css',
    body: html`<article class="container">
    ${logoHeader}
    <div class="build-info">
        <span class="build-info-text big dark">bundlewatch service</span>
    </div>
    <p class="repo-info">
        This service stores the file sizes that bundlewatch compares each build with,
        and shows the results pages linked from GitHub statuses.
    </p>
    <p class="repo-info">
        To check your bundle sizes, see <a href="https://bundlewatch.io/guide/getting-started">Getting Started</a>.
        On CI providers other than GitHub Actions, <a href="/setup-github">create a token</a>.
    </p>
</article>

${serverCommitFooter(serverCommitSha)}`,
  });
