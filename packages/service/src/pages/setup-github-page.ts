import { createHash } from 'node:crypto';

import { html, type SafeHtml } from '../html.ts';
import { copyIcon, githubIcon } from './icons.ts';
import { mark, page } from './layout.ts';

// /setup-github: a GitHub token for CI providers other than GitHub Actions.
// It starts with where the CI runs, since GitHub Actions needs no token.

const ACTIONS_GUIDE = 'https://bundlewatch.io/guide/using-bundlewatch#github-actions';

/** Why the page asks to authorize again. */
export type SetupFailure =
  /** The state didn't match: too slow, or another browser. */
  | { kind: 'expired' }
  /** GitHub didn't exchange the code: its description, or an HTTP status. */
  | { kind: 'exchange'; error: unknown };

const failureText = (failure: SetupFailure): { title: string; detail: string } => {
  if (failure.kind === 'expired') {
    return {
      title: 'That authorization expired',
      detail:
        'It took more than ten minutes, or started in another browser. Authorize again to get your token.',
    };
  }
  let reason = 'GitHub didn’t return a token.';
  if (typeof failure.error === 'string') reason = failure.error;
  else if (typeof failure.error === 'number')
    reason = `GitHub answered with HTTP ${failure.error}.`;
  // GitHub's descriptions end with a period, ours don't always.
  const sentence = /[.!?]$/.test(reason) ? reason : `${reason}.`;
  return {
    title: 'GitHub didn’t issue a token',
    detail: `${sentence} Authorize again to get a new one.`,
  };
};

/**
 * The page's only script: the Copy buttons. The token page's
 * Content-Security-Policy allows it by hash (COPY_SCRIPT_HASH). The buttons
 * stay hidden without it, and a click on a box still selects all of it.
 * The Clipboard API needs HTTPS; over plain HTTP, such as a local server,
 * the script selects the text and falls back to execCommand.
 */
const COPY_SCRIPT = `for (const button of document.querySelectorAll('[data-copy]')) {
  const source = document.getElementById(button.dataset.copy);
  const label = button.querySelector('span');
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source.textContent);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(source);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      document.execCommand('copy');
    }
    button.classList.add('done');
    label.textContent = 'Copied';
    setTimeout(() => {
      button.classList.remove('done');
      label.textContent = 'Copy';
    }, 2000);
  });
}`;

export const COPY_SCRIPT_HASH: string = createHash('sha256').update(COPY_SCRIPT).digest('base64');

/** A whole-line box with its own Copy button. */
const copyBox = (id: string, label: string, value: string): SafeHtml =>
  html`<span class="label" id="${id}-label">${label}</span>
        <div class="copy-box"><code id="${id}" aria-labelledby="${id}-label">${value}</code><button type="button" data-copy="${id}" aria-label="Copy the ${label.toLowerCase()}" hidden>${copyIcon}<span>Copy</span></button></div>`;

const scopeAndRevoke = (githubWebUrl: string): SafeHtml => html`<dl class="fine">
        <dt>Scope</dt><dd><code>repo:status</code>: commit statuses, not your code.</dd>
        <dt>Revoke</dt><dd>Any time, from <a href="${githubWebUrl}/settings/applications">your GitHub settings</a>.</dd>
    </dl>`;

const tokenBody = (token: string, githubWebUrl: string): SafeHtml => html`<h1>Your token</h1>
    <p class="lede">Add it to your CI as a secret environment variable. This page won’t show the token again.</p>
    <div class="copy-fields">
        ${copyBox('copy-name', 'Name', 'BUNDLEWATCH_GITHUB_TOKEN')}
        ${copyBox('copy-value', 'Value', token)}
    </div>
    <ol class="steps">
        <li>Paste both into your CI provider’s secret settings. Never commit the token.</li>
        <li>Run <code>npx bundlewatch</code> after your build.</li>
        <li>The next pull request gets a <b>bundlewatch</b> status.</li>
    </ol>
    ${scopeAndRevoke(githubWebUrl)}`;

const authorizeBody = (
  authorizeUrl: string,
  githubWebUrl: string,
  failure: SetupFailure | undefined,
): SafeHtml => {
  const problem = failure && failureText(failure);
  return html`<h1>${problem ? problem.title : 'Get a GitHub token for BundleWatch'}</h1>
    <p class="lede">${problem ? problem.detail : 'BundleWatch reports the size of your files on each pull request, as a commit status:'}</p>
    ${
      !problem &&
      html`<div class="preview" role="img" aria-label="The bundlewatch status on a pull request">
        <div><span class="ok">✓</span>${mark(16)}<b>bundlewatch</b><span class="desc">— Everything is in check (+1.41KB, -0B, +4.8%)</span><span class="details">Details</span></div>
    </div>`
    }
    <section>
        <div class="paths">
            <div>
                <h2>On GitHub Actions</h2>
                <p>You don’t need a token. Give the workflow <code>statuses: write</code> and BundleWatch uses its own <code>GITHUB_TOKEN</code>.</p>
                <p><a class="more" href="${ACTIONS_GUIDE}">Set up the workflow →</a></p>
            </div>
            <div>
                <h2>Anywhere else</h2>
                <p>Authorize BundleWatch on GitHub, signed in with an account that has push access to the repository. You come back here with a token.</p>
                <p><a class="button" href="${authorizeUrl}">${githubIcon}${problem ? 'Authorize again' : 'Authorize on GitHub'}</a></p>
            </div>
        </div>
    </section>
    ${scopeAndRevoke(githubWebUrl)}`;
};

export const renderSetupGithubPage = ({
  token,
  clientId,
  githubWebUrl,
  state,
  failure,
  serverCommitSha,
}: {
  token?: string | undefined;
  clientId?: string | undefined;
  githubWebUrl: string;
  /** Sent to GitHub and checked when it redirects back. */
  state?: string | undefined;
  failure?: SetupFailure | undefined;
  serverCommitSha?: string | undefined;
}): string => {
  const authorizeUrl = `${githubWebUrl}/login/oauth/authorize?scope=repo%3Astatus&client_id=${encodeURIComponent(clientId ?? '')}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
  return page({
    title: token ? 'Your token | BundleWatch' : 'Get a GitHub token | BundleWatch',
    stylesheet: '/static/setup-github-styles.css',
    serverCommitSha,
    body: token
      ? tokenBody(token, githubWebUrl)
      : authorizeBody(authorizeUrl, githubWebUrl, failure),
    script: token ? COPY_SCRIPT : undefined,
  });
};
