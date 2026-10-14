import { formatBytes, getOverallDifference } from '@bundlewatch/core';

import { html, type SafeHtml } from '../html.ts';
import type { ResultsData, ResultsFile } from '../validators.ts';
import { page } from './layout.ts';

// The page behind each GitHub status's "Details" link. People arrive from a
// pull request, so it leads with what the commit changed: a headline, the
// totals, then every file's change on one scale, largest first, next to its
// limit. Before the base branch has sizes, it shows size against limit.
//
// The data comes from a `d` parameter anyone can craft, or from a stored
// short link, in every shape 0.x CLIs sent: an unlimited maxSize as
// Infinity or null, baseBranchSize 0 for "no size on the base branch",
// error entries, and any status string.

type Kind = 'over' | 'warn' | 'ok' | 'removed' | 'error';

export type FileView = {
  path: string;
  /** `./dist/` of `./dist/vendor.js`. */
  dir: string;
  name: string;
  kind: Kind;
  /** 0 for error entries and removed files. */
  size: number;
  /** null when the base branch has no size for the file. */
  base: number | null;
  /** null when the file has no limit. */
  max: number | null;
  /** What the commit added (positive) or removed; null when unknown. */
  change: number | null;
  /** Measured now, and missing from a base branch that has sizes. */
  isNew: boolean;
  error: string | undefined;
};

export type ReportView = {
  prefix?: string | undefined;
  status: string;
  summary: string;
  repo: { slug: string; url: string } | undefined;
  branch: string | undefined;
  baseBranch: string | undefined;
  shortSha: string | undefined;
  commitUrl: string | undefined;
  files: FileView[];
  /** False until a build of the base branch saves sizes. */
  hasBaseline: boolean;
  added: number;
  removed: number;
  percentageChange: number | null;
};

const kindOf = (file: ResultsFile): Kind => {
  if (file.error !== undefined) return 'error';
  if (file.status === 'fail') return 'over';
  if (file.status === 'warn') return 'warn';
  if (file.status === 'pass') return 'ok';
  // 0.x showed every unknown status as removed.
  return 'removed';
};

const toFileView = (file: ResultsFile, hasBaseline: boolean): FileView => {
  const kind = kindOf(file);
  const measured = kind !== 'error' && kind !== 'removed';
  const size = file.size ?? 0;
  const base =
    file.baseBranchSize !== undefined && file.baseBranchSize > 0 ? file.baseBranchSize : null;
  // Unlimited is Infinity in 0.x links and null in JSON. Removed files carry 0.
  const max =
    measured &&
    typeof file.maxSize === 'number' &&
    Number.isFinite(file.maxSize) &&
    file.maxSize > 0
      ? file.maxSize
      : null;
  let change: number | null = null;
  if (kind === 'removed') change = base === null ? null : -base;
  else if (measured && base !== null) change = size - base;
  else if (measured && hasBaseline) change = size;
  const slash = file.filePath.lastIndexOf('/');
  return {
    path: file.filePath,
    dir: file.filePath.slice(0, slash + 1),
    name: file.filePath.slice(slash + 1),
    kind,
    size,
    base,
    max,
    change,
    isNew: measured && base === null && hasBaseline,
    error: file.error,
  };
};

export const toReportView = ({ details, results }: ResultsData): ReportView => {
  const { repoOwner, repoName, repoCurrentBranch, repoBranchBase, commitSha } = details;
  const repoUrl =
    repoOwner && repoName
      ? `https://github.com/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}`
      : undefined;
  const hasBaseline = results.fullResults.some(
    ({ baseBranchSize }) => baseBranchSize !== undefined && baseBranchSize > 0,
  );
  // The same totals as the summary on the GitHub status.
  const { totalAdded, totalRemoved, percentageChange } = getOverallDifference(results.fullResults);
  return {
    status: results.status,
    ...(details.prefix === undefined ? {} : { prefix: details.prefix }),
    summary: results.summary,
    repo: repoUrl ? { slug: `${repoOwner}/${repoName}`, url: repoUrl } : undefined,
    branch: repoCurrentBranch,
    baseBranch: repoBranchBase,
    shortSha: commitSha?.slice(0, 7),
    commitUrl:
      repoUrl && commitSha ? `${repoUrl}/commit/${encodeURIComponent(commitSha)}` : undefined,
    files: results.fullResults.map((file) => toFileView(file, hasBaseline)),
    hasBaseline,
    added: totalAdded,
    removed: totalRemoved,
    percentageChange,
  };
};

// Widths end up in style attributes. NaN and Infinity can come out of the
// arithmetic for odd inputs.
export const cssPercentage = (value: number): string =>
  Number.isFinite(value) ? String(Math.min(100, Math.max(0, value))) : '0';

const bytes = (value: number): string => formatBytes(value) ?? '';

/** `+1.41KB`, `−23.13KB` with a true minus, `±0B`. */
const signedBytes = (value: number): string => {
  if (value === 0) return '±0B';
  return value > 0 ? `+${bytes(value)}` : `−${bytes(-value)}`;
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

const NO_MATCH = 'There is no matching file for ';

/** The CLI's "There is no matching file for <pattern>" says the pattern twice. */
const errorText = (error: string | undefined): string =>
  error === undefined || error.startsWith(NO_MATCH) ? 'No file matches this pattern' : error;

/** The page's verdict, more specific than the status summary. */
export const headline = (view: ReportView): string => {
  const parts: string[] = [];
  const over = view.files.filter((file) => file.kind === 'over');
  const [onlyOver] = over;
  if (over.length === 1 && onlyOver) {
    parts.push(
      onlyOver.max !== null && onlyOver.size > onlyOver.max
        ? `${onlyOver.name} is ${bytes(onlyOver.size - onlyOver.max)} over its ${bytes(onlyOver.max)} limit`
        : `${onlyOver.name} is over its limit`,
    );
  } else if (over.length > 1) {
    parts.push(`${over.length} files are over their limits`);
  }
  const errors = view.files.filter((file) => file.kind === 'error');
  const [onlyError] = errors;
  const allNoMatch = errors.every((file) => file.error?.startsWith(NO_MATCH));
  if (errors.length === 1 && onlyError) {
    parts.push(
      allNoMatch ? `${onlyError.path} matched no files` : `${onlyError.path} couldn’t be measured`,
    );
  } else if (errors.length > 1) {
    parts.push(
      allNoMatch
        ? `${errors.length} patterns matched no files`
        : `${errors.length} files couldn’t be measured`,
    );
  }
  const warnings = view.files.filter((file) => file.kind === 'warn').length;
  if (warnings > 0) parts.push(`${plural(warnings, 'file has', 'files have')} a warning`);
  if (parts.length > 0) return `${parts.join(', and ')}.`;
  // A failure the files don't explain: fall back to the status's words.
  if (view.status === 'fail') return view.summary;
  const measured = view.files.filter((file) => file.kind === 'ok').length;
  if (measured === 0) return 'There are no files to measure.';
  if (measured === 1) return 'The file is within its limit.';
  return `All ${measured} files are within their limits.`;
};

const lede = (view: ReportView): SafeHtml | '' => {
  const base = view.baseBranch ?? 'the base branch';
  if (view.files.length === 0) return '';
  if (!view.hasBaseline) {
    return html`<p class="lede">There are no sizes saved for <b>${base}</b> yet, so there’s nothing to compare with. Builds of <b>${base}</b> save them; after that, each pull request shows what it changes.</p>`;
  }
  if (view.added === 0 && view.removed === 0) {
    return html`<p class="lede">This commit doesn’t change any file’s size compared with <b>${base}</b>.</p>`;
  }
  const amounts: SafeHtml[] = [];
  if (view.added > 0) amounts.push(html`adds <b>${bytes(view.added)}</b>`);
  if (view.removed > 0) amounts.push(html`removes <b>${bytes(view.removed)}</b>`);
  let net: SafeHtml | '' = '';
  const change = view.percentageChange;
  if (change !== null && Number.isFinite(change)) {
    net =
      Math.abs(change) < 0.05
        ? html`, about the same size as on <b>${base}</b>`
        : html`: the files are <b>${Math.abs(change).toFixed(1)}% ${change < 0 ? 'smaller' : 'larger'}</b> than on <b>${base}</b>`;
  }
  return html`<p class="lede">This commit ${amounts.map((part, i) => (i === 0 ? part : html` and ${part}`))}${net}.</p>`;
};

const crumbs = (view: ReportView): SafeHtml | '' => {
  const parts: SafeHtml[] = [];
  if (view.repo) parts.push(html`<a href="${view.repo.url}">${view.repo.slug}</a>`);
  if (view.prefix) parts.push(html`<span>Application: <b>${view.prefix}</b></span>`);
  if (view.branch) {
    parts.push(html`<b>${view.branch}</b>${view.baseBranch && html` into ${view.baseBranch}`}`);
  }
  if (view.shortSha) {
    parts.push(
      view.commitUrl
        ? html`<a class="mono" href="${view.commitUrl}">${view.shortSha}</a>`
        : html`<span class="mono">${view.shortSha}</span>`,
    );
  }
  if (parts.length === 0) return '';
  return html`<p class="crumbs">${parts.map((part, i) => (i === 0 ? part : html`<span class="sep">·</span>${part}`))}</p>`;
};

const flag = (status: string): SafeHtml | '' => {
  if (status === 'fail')
    return html`<span class="flag fail" role="img" aria-label="Failed"></span>`;
  if (status === 'warn')
    return html`<span class="flag warn" role="img" aria-label="Warning"></span>`;
  return '';
};

/** Where the limit tick sits in every gauge, so they line up. */
const TICK = 75;
/** From here, a file within its limit is flagged as close to it. */
const NEAR = 0.9;

const gauge = (size: number, max: number): SafeHtml => {
  const within = (Math.min(Math.max(size, 0), max) / max) * TICK;
  // Past the tick, up to the end of the track.
  const past = Math.min((Math.max(0, size - max) / max) * TICK, 100 - TICK);
  return html`<span class="gauge" aria-hidden="true"><i style="width:${cssPercentage(within)}%"></i>${
    past > 0 && html`<i class="past" style="left:${TICK}%;width:${cssPercentage(past)}%"></i>`
  }<span class="tick" style="left:${TICK}%"></span></span>`;
};

/** "9.77KB over the 200KB limit". */
const limitCell = (file: FileView, withGauge: boolean): SafeHtml => {
  if (file.kind === 'removed' || file.kind === 'error') return html`<span class="limit">—</span>`;
  if (file.max === null) return html`<span class="limit">No limit</span>`;
  const gap = file.size - file.max;
  let state = '';
  if (gap > 0) state = ' over';
  else if (file.size / file.max >= NEAR) state = ' near';
  let amount = 'Exactly at';
  if (gap > 0) amount = `${bytes(gap)} over`;
  else if (gap < 0) amount = `${bytes(-gap)} under`;
  return html`<span class="limit${state}">${withGauge ? gauge(file.size, file.max) : ''}<b>${amount}</b> the ${bytes(file.max)} limit</span>`;
};

/** A file's path, split at the last slash; long directories break after slashes. */
const fileCell = (file: FileView): SafeHtml => {
  const dir =
    file.dir &&
    html`<span class="dir">${file.dir
      .split('/')
      .slice(0, -1)
      .map((part) => html`${part}/<wbr>`)}</span>`;
  return html`<span class="file"><span class="name">${file.name}</span>${dir}</span>`;
};

const changeBar = (file: FileView, change: number, scale: number): SafeHtml => {
  let cls = change > 0 ? 'grow' : 'shrink';
  if (file.kind === 'removed') cls = 'gone';
  else if (file.isNew) cls = 'new';
  const width = Math.min(50, (Math.abs(change) / scale) * 50);
  return html`<div class="div" aria-hidden="true"><i class="${cls}" style="width:${cssPercentage(width)}%"></i></div>`;
};

const changeRow = (file: FileView, change: number, scale: number): SafeHtml => {
  let note = `${bytes(file.size)} now`;
  if (file.kind === 'removed') note = 'removed';
  else if (file.isNew) note = 'new file';
  return html`<li class="r ${file.kind}">
            ${fileCell(file)}
            ${changeBar(file, change, scale)}
            <span class="delta">${signedBytes(change)}<small>${note}</small></span>
            ${limitCell(file, true)}
        </li>`;
};

const sizeRow = (file: FileView): SafeHtml => {
  let bar = html`<div class="size empty" aria-hidden="true"></div>`;
  if (file.max !== null) {
    const scale = Math.max(file.size, file.max);
    bar = html`<div class="size" aria-hidden="true"><i style="width:${cssPercentage((file.size / scale) * 100)}%"></i><span class="cap" style="left:${cssPercentage((file.max / scale) * 100)}%"></span></div>`;
  }
  return html`<li class="r ${file.kind}">
            ${fileCell(file)}
            ${bar}
            <span class="delta">${bytes(file.size)}</span>
            ${limitCell(file, false)}
        </li>`;
};

const quietLimit = (file: FileView): string => {
  if (file.max === null) return 'no limit';
  const gap = file.size - file.max;
  if (gap === 0) return `exactly at the ${bytes(file.max)} limit`;
  return `${bytes(Math.abs(gap))} ${gap > 0 ? 'over' : 'under'} the ${bytes(file.max)} limit`;
};

const allFiles = (view: ReportView): SafeHtml => {
  const dash = html`<span class="none">—</span>`;
  return html`<details><summary>All ${plural(view.files.length, 'file', 'files')}</summary>
        <table>
            <thead><tr><th>File</th><th>Size</th><th>${view.baseBranch ?? 'Base'}</th><th>Change</th><th>Limit</th></tr></thead>
            <tbody>${view.files.map(
              (file) => html`
                <tr>
                    <td>${file.path}${file.kind === 'error' && html` <span class="none">· ${errorText(file.error)}</span>`}</td>
                    <td>${file.kind === 'error' || file.kind === 'removed' ? dash : bytes(file.size)}</td>
                    <td>${file.base === null ? dash : bytes(file.base)}</td>
                    <td>${file.change === null ? dash : signedBytes(file.change)}</td>
                    <td>${file.max === null ? dash : bytes(file.max)}</td>
                </tr>`,
            )}
            </tbody>
        </table>
    </details>`;
};

const changes = (view: ReportView): SafeHtml => {
  const changed: [FileView, number][] = [];
  const same: FileView[] = [];
  for (const file of view.files) {
    if (file.change === 0) same.push(file);
    else if (file.change !== null) changed.push([file, file.change]);
  }
  changed.sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
  const scale = Math.max(1, ...changed.map(([, change]) => Math.abs(change)));
  const unchanged =
    same.length > 0 &&
    html`<details${changed.length === 0 ? html` open` : ''}><summary>${same.length === 1 ? '1 file didn’t change' : `${same.length} files didn’t change`}</summary>
        <ul class="quiet">${same.map(
          (file) =>
            html`<li><b>${file.name}</b> ${file.dir} · ${bytes(file.size)}, ${quietLimit(file)}</li>`,
        )}</ul>
    </details>`;
  return html`<section>
    ${
      changed.length > 0 &&
      html`<div class="r cols"><h2>Changes from ${view.baseBranch ?? 'the base branch'}</h2><span class="axis"><span>← smaller</span><span>larger →</span></span><span class="num">Change</span><span class="lim">Limit</span></div>
    <ol class="rows">${changed.map(([file, change]) => changeRow(file, change, scale))}
    </ol>`
    }
    ${unchanged}
    ${allFiles(view)}
</section>`;
};

/** Size against limit; files without a limit go last. */
const load = (file: FileView): number => (file.max === null ? -1 : file.size / file.max);

const sizes = (view: ReportView): SafeHtml => {
  const ranked = view.files
    .filter((file) => file.kind !== 'error' && file.kind !== 'removed')
    .toSorted((a, b) => load(b) - load(a));
  return html`<section>
    ${
      ranked.length > 0 &&
      html`<div class="r cols"><h2>Size against limit</h2><span class="axis"><span></span><span><span class="legend-cap"></span>limit</span></span><span class="num">Size</span><span class="lim">Limit</span></div>
    <ol class="rows">${ranked.map(sizeRow)}
    </ol>`
    }
    ${allFiles(view)}
</section>`;
};

export const renderResultsPage = ({
  payload,
  serverCommitSha,
}: {
  payload: ResultsData;
  serverCommitSha?: string | undefined;
}): string => {
  const view = toReportView(payload);
  const errors = view.files.filter((file) => file.kind === 'error');
  let files: SafeHtml | '' = '';
  if (view.files.length > 0) files = view.hasBaseline ? changes(view) : sizes(view);
  return page({
    title: `${view.prefix ? `${view.prefix} | ` : ''}${headline(view)} | BundleWatch`,
    // The GitHub status's own words.
    description: view.summary,
    stylesheet: '/static/results-styles.css',
    serverCommitSha,
    body: html`${crumbs(view)}
    <h1>${flag(view.status)}${headline(view)}</h1>
    ${lede(view)}
    ${
      errors.length > 0 &&
      html`<ul class="errors">${errors.map(
        (file) =>
          html`<li><span><span class="path">${file.path}</span> · ${errorText(file.error)}</span></li>`,
      )}</ul>`
    }
    ${files}`,
  });
};

export const renderResultsNotFoundPage = ({
  serverCommitSha,
}: {
  serverCommitSha?: string | undefined;
}): string =>
  page({
    title: 'Results not found | BundleWatch',
    stylesheet: '/static/results-styles.css',
    serverCommitSha,
    body: html`<h1>Results not found</h1>
    <p class="lede">This results link doesn’t exist or has expired.</p>`,
  });
