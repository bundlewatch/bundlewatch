import { html } from '../html.ts';
import { page } from './layout.ts';

/** What browsers get at /, instead of the JSON that monitors and scripts get. */
export const renderHomePage = ({
  serverCommitSha,
}: {
  serverCommitSha?: string | undefined;
}): string =>
  page({
    title: 'bundlewatch service | BundleWatch',
    stylesheet: '/static/results-styles.css',
    serverCommitSha,
    body: html`<h1>bundlewatch service</h1>
    <div class="prose">
        <p class="lede">
            This service stores the file sizes that bundlewatch compares each build with,
            and shows the results pages linked from GitHub statuses.
        </p>
        <p>
            To check your bundle sizes, see <a href="https://bundlewatch.io/guide/getting-started">Getting Started</a>.
            On CI providers other than GitHub Actions, <a href="/setup-github">create a token</a>.
        </p>
    </div>`,
  });
