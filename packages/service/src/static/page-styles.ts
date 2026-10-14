// The one stylesheet of every page: results, home and token. Served at the
// two paths the 0.x pages linked, /static/results-styles.css and
// /static/setup-github-styles.css. Colors are the logo's: navy, orange and
// yellow. Yellow is too light for text on white (1.45:1), so it only fills
// marks next to labeled numbers.

import { FONT_FACES } from './fonts.ts';

const MONO = `'Source Code Pro', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`;

export const PAGE_CSS: string = `${FONT_FACES}
:root {
    --navy: #000051;
    --orange: #d54400;
    --yellow: #ffcd52;
    --text: #24244f;
    --muted: #66668c;
    --rule: #e2e2ec;
    --freed: #b9b9d4;
    --track: #eeeef5;
}
* {
    box-sizing: border-box;
}
html {
    -webkit-text-size-adjust: 100%;
}
body {
    margin: 0;
    background: #fff;
    color: var(--text);
    font: 17px/1.5 'Source Sans Pro', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
a {
    color: inherit;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
}
a:hover {
    color: var(--orange);
}
code,
.mono {
    font-family: ${MONO};
    font-size: 0.86em;
}
p code,
dd code {
    white-space: nowrap;
}

/* The logo sits in the left margin. Its pointed top reads low, so its tip
   rises a little above the first line of text. */
.page {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 0 44px;
    max-width: 1080px;
    margin: 0 auto;
    padding: 44px 32px 0;
}
.rail {
    margin-top: -4px;
}
.rail a {
    position: sticky;
    top: 40px;
    display: block;
}

.crumbs {
    margin: 0 0 22px;
    font-size: 15px;
    color: var(--muted);
}
.crumbs b {
    color: var(--navy);
    font-weight: 600;
}
.crumbs .sep {
    padding: 0 6px;
    color: #b5b5cc;
}
h1 {
    margin: 0;
    max-width: 21em;
    font-size: 40px;
    line-height: 1.12;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: var(--navy);
    overflow-wrap: break-word;
}
.flag {
    display: inline-block;
    width: 0.56em;
    height: 0.56em;
    margin-right: 0.3em;
    vertical-align: 0.08em;
    border-radius: 2px;
    transform: rotate(45deg) scale(0.86);
}
.flag.fail {
    background: var(--orange);
}
.flag.warn {
    background: var(--yellow);
}
.lede {
    margin: 14px 0 0;
    max-width: 40em;
    font-size: 20px;
}
.lede b {
    font-weight: 600;
    color: var(--navy);
}
.prose p {
    max-width: 40em;
}

.errors {
    margin: 26px 0 0;
    padding: 0;
    list-style: none;
}
.errors li {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 6px 0;
}
.errors li::before {
    content: '';
    flex: none;
    width: 9px;
    height: 9px;
    background: var(--orange);
    transform: rotate(45deg);
}
.errors .path {
    font-family: ${MONO};
    font-size: 15px;
    color: var(--navy);
    overflow-wrap: anywhere;
}

/* Files */
section {
    margin-top: 48px;
}
.rows {
    margin: 0;
    padding: 0;
    list-style: none;
    font-variant-numeric: tabular-nums;
}
.r {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(140px, 1fr) 6.5rem 12.5rem;
    gap: 0 22px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--rule);
}
.r.cols {
    align-items: end;
    padding: 0 0 8px;
    border-bottom: 2px solid var(--navy);
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
}
.r.cols h2 {
    margin: 0;
    font-size: 15px;
    color: var(--navy);
}
.r.cols .axis {
    display: flex;
    justify-content: space-between;
    font-weight: 400;
}
.r.cols .num {
    text-align: right;
}
.r .file {
    min-width: 0;
}
.r .name {
    display: block;
    font-weight: 600;
    color: var(--navy);
    overflow-wrap: anywhere;
    line-height: 1.25;
}
.r .dir {
    display: block;
    font-size: 14px;
    color: var(--muted);
    overflow-wrap: break-word;
}
.r.removed .name {
    text-decoration: line-through;
    text-decoration-color: var(--muted);
    font-weight: 400;
    color: var(--muted);
}
.r .delta {
    text-align: right;
    color: var(--navy);
}
.r .delta small {
    display: block;
    font-size: 13px;
    color: var(--muted);
}

/* Change from the base branch: growth right, savings left, on one scale. */
.div {
    position: relative;
    height: 28px;
}
.div::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
    background: #c9c9da;
}
.div i {
    position: absolute;
    top: 7px;
    height: 14px;
    min-width: 2px;
}
.div .grow {
    left: 50%;
    background: var(--orange);
    border-radius: 0 3px 3px 0;
}
.div .new {
    left: 50%;
    background: #efae8c;
    border-radius: 0 3px 3px 0;
}
.div .shrink {
    right: 50%;
    background: var(--navy);
    border-radius: 3px 0 0 3px;
}
.div .gone {
    right: 50%;
    background: var(--freed);
    border-radius: 3px 0 0 3px;
}

/* Size against the limit, before the base branch has sizes. */
.size {
    position: relative;
    height: 28px;
}
.size::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 12px;
    height: 4px;
    background: var(--track);
    border-radius: 2px;
}
.size.empty::before {
    display: none;
}
.size i {
    position: absolute;
    left: 0;
    top: 7px;
    height: 14px;
    background: var(--navy);
    border-radius: 0 3px 3px 0;
}
.size .cap,
.legend-cap {
    position: absolute;
    top: 3px;
    bottom: 3px;
    width: 2px;
    margin-left: -1px;
    background: var(--navy);
}
.legend-cap {
    position: static;
    display: inline-block;
    height: 12px;
    margin: 0 6px 0 0;
    vertical-align: -1px;
}

/* The limit: "9.77KB over the 200KB limit". The gauge's limit tick sits
   at the same x on every row, so the eye can run down one line. */
.limit {
    font-size: 14px;
    line-height: 1.3;
    color: var(--muted);
}
.limit b {
    color: var(--navy);
    font-weight: 600;
}
.limit.over b::before,
.limit.near b::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 7px;
    vertical-align: 0.1em;
    transform: rotate(45deg);
}
.limit.over b::before {
    background: var(--orange);
}
.limit.near b::before {
    background: var(--yellow);
}
.gauge {
    position: relative;
    display: block;
    height: 12px;
    margin-bottom: 5px;
}
.gauge::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 4px;
    height: 4px;
    background: var(--track);
    border-radius: 2px;
}
.gauge i {
    position: absolute;
    left: 0;
    top: 3px;
    height: 6px;
    background: var(--navy);
    border-radius: 1px;
}
.gauge i.past {
    background: var(--orange);
    border-left: 2px solid #fff;
}
.gauge .tick {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--navy);
}

details {
    margin-top: 18px;
}
summary {
    cursor: pointer;
    color: var(--navy);
    font-weight: 600;
    font-size: 15px;
    list-style: none;
}
summary::-webkit-details-marker {
    display: none;
}
summary::before {
    content: '+';
    display: inline-block;
    width: 1.1em;
    font-family: ${MONO};
    color: var(--muted);
}
details[open] > summary::before {
    content: '\\2212';
}
.quiet {
    margin: 6px 0 0 1.1em;
    padding: 0;
    list-style: none;
    font-size: 15px;
    color: var(--muted);
}
.quiet li {
    padding: 3px 0;
}
.quiet b {
    color: var(--navy);
    font-weight: 600;
}
table {
    width: 100%;
    margin-top: 10px;
    border-collapse: collapse;
    font-size: 15px;
    font-variant-numeric: tabular-nums;
}
th {
    text-align: right;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    padding: 6px 0 6px 18px;
    border-bottom: 1px solid var(--navy);
}
td {
    text-align: right;
    padding: 7px 0 7px 18px;
    border-bottom: 1px solid var(--rule);
    white-space: nowrap;
    color: var(--navy);
}
th:first-child,
td:first-child {
    text-align: left;
    padding-left: 0;
    white-space: normal;
    overflow-wrap: anywhere;
}
.none {
    color: var(--muted);
}

footer {
    margin-top: 80px;
    padding: 22px 0 48px;
    border-top: 1px solid var(--rule);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 24px;
    font-size: 14px;
    color: var(--muted);
}
footer .bw-wordmark {
    color: var(--navy);
}
footer .sha {
    margin-left: auto;
    font-family: ${MONO};
    font-size: 13px;
}

/* Token page */
.preview {
    margin: 22px 0 0;
    max-width: 640px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font: 14px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
    color: #1f2328;
}
.preview div {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
}
.preview .ok {
    color: #1a7f37;
    font-weight: 700;
}
.preview .bw-mark {
    flex: none;
}
.preview .desc {
    color: #59636e;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.preview .details {
    color: #0969da;
}
.paths {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 2px solid var(--navy);
}
.paths > div {
    padding: 20px 28px 4px 0;
}
.paths > div + div {
    padding: 20px 0 4px 28px;
    border-left: 1px solid var(--rule);
}
.paths h2 {
    margin: 0 0 6px;
    font-size: 21px;
    font-weight: 600;
    color: var(--navy);
}
.paths p {
    margin: 0 0 16px;
}
.button {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 11px 20px;
    border-radius: 4px;
    background: var(--orange);
    color: #fff;
    font-weight: 600;
    text-decoration: none;
}
.button:hover {
    background: #b83b00;
    color: #fff;
}
.button svg {
    fill: currentColor;
}
.more {
    font-weight: 600;
    color: var(--navy);
}
.fine {
    margin: 34px 0 0;
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 8px 24px;
    font-size: 15px;
}
.fine dt {
    color: var(--navy);
    font-weight: 600;
}
.fine dd {
    margin: 0;
    color: var(--muted);
}
.copy-fields {
    margin: 28px 0 0;
    max-width: 720px;
}
.copy-fields .label {
    display: block;
    margin: 18px 0 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--navy);
}
.copy-fields .label:first-child {
    margin-top: 0;
}
.copy-box {
    display: flex;
    align-items: stretch;
    border: 1px solid #c4c4d8;
    border-radius: 4px;
    background: #fff;
}
.copy-box code {
    flex: 1;
    min-width: 0;
    padding: 12px 14px;
    font-size: 17px;
    line-height: 1.4;
    color: var(--navy);
    overflow-wrap: anywhere;
    user-select: all;
    -webkit-user-select: all;
    cursor: text;
}
.copy-box button {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 7.2em;
    padding: 0 16px;
    border: 0;
    border-left: 1px solid #c4c4d8;
    border-radius: 0 3px 3px 0;
    background: #f3f3f8;
    color: var(--navy);
    font: 600 15px 'Source Sans Pro', system-ui, sans-serif;
    cursor: pointer;
}
.copy-box button:hover,
.copy-box button.done {
    background: var(--navy);
    color: #fff;
}
.copy-box button:focus-visible {
    outline: 2px solid var(--orange);
    outline-offset: 2px;
}
.copy-box button[hidden] {
    display: none;
}
.copy-box button svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
}
.steps {
    margin: 28px 0 0;
    padding: 0 0 0 1.3em;
    max-width: 40em;
}
.steps li {
    padding: 4px 0;
}
.steps li::marker {
    color: var(--muted);
    font-weight: 600;
}

@media (max-width: 780px) {
    /* minmax(0, …): a plain 1fr column grows to its widest unbreakable
       line, and phones then zoom out to fit the page. */
    .page {
        grid-template-columns: minmax(0, 1fr);
        padding: 22px 18px 0;
    }
    .rail {
        margin-top: 0;
        padding: 0 0 18px;
    }
    h1 {
        font-size: 28px;
    }
    .lede {
        font-size: 18px;
    }
    .r {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 4px 16px;
    }
    .r .div,
    .r .size {
        grid-column: 1 / -1;
        grid-row: 2;
    }
    .r .limit {
        grid-column: 1 / -1;
    }
    .r.cols .axis,
    .r.cols .num,
    .r.cols .lim {
        display: none;
    }
    /* The status's description goes under its name, as a whole line. */
    .preview div {
        display: grid;
        grid-template-columns: auto auto minmax(0, 1fr) auto;
        gap: 2px 10px;
    }
    .preview .desc {
        grid-column: 3 / -1;
        grid-row: 2;
        white-space: normal;
    }
    .preview .dash {
        display: none;
    }
    .paths {
        grid-template-columns: 1fr;
    }
    .paths > div,
    .paths > div + div {
        padding: 20px 0 4px;
    }
    .paths > div + div {
        border-left: 0;
        border-top: 1px solid var(--rule);
    }
    .copy-box code {
        font-size: 15px;
    }
}

/* Beside the Copy button, BUNDLEWATCH_GITHUB_TOKEN would break in two.
   The button goes under the value instead, as wide as the box. */
@media (max-width: 480px) {
    .copy-box {
        flex-wrap: wrap;
    }
    .copy-box code {
        flex-basis: 100%;
    }
    .copy-box button {
        flex: auto;
        padding: 11px 16px;
        border-left: 0;
        border-top: 1px solid #c4c4d8;
        border-radius: 0 0 3px 3px;
    }
}
`;
