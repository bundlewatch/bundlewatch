// Copied from the 0.x service (src/static/results-styles.css), embedded so
// the Lambda bundle is self-contained. Changes: no Google Fonts import (the
// page makes no third-party requests; the font stacks fall back to system
// fonts), and sizing for the inline SVG icons that replace Material Icons.

export const RESULTS_CSS = `
* {
    -webkit-font-smoothing: antialiased;
    -webkit-overflow-scrolling: touch;
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
    -webkit-text-size-adjust: none;
    -webkit-touch-callout: none;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
}
html {
    box-sizing: border-box;
}
*,
*:before,
*:after {
    box-sizing: inherit;
}
html,
body {
    margin: 0;
    padding: 0;
}
body {
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    color: #222;
    font-family: 'Inter', 'Source Sans Pro', 'system-ui', 'Helvetica Neue',
        Arial, sans-serif;
    font-size: 16px;
    background: #f7f8fa;
}
table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    background: transparent;
    border-radius: 12px;
    overflow: hidden;
    font-size: 15px;
}
th,
td {
    padding: 12px 10px;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
}
th {
    background: #f7f8fa;
    font-weight: 600;
    color: #222;
}
tr:last-child td {
    border-bottom: none;
}
tr:nth-child(even) td {
    background: #fafbfc;
}
.logo {
    text-align: center;
    display: block;
    margin: 0 auto 32px auto;
    text-align: center;
}
.container {
    margin: 32px auto 0 auto;
    max-width: 1600px;
    padding: 32px 16px 16px 16px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.06);
    min-height: 80vh;
}
@media (max-width: 1100px) {
    .container {
        max-width: 98vw;
        padding: 16px 2vw 0 2vw;
    }
}
header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
}
.github-button-container {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 1;
}
.github-button {
    display: inline-flex;
    align-items: center;
    background: #fff;
    color: #0057ff;
    font-weight: 600;
    border-radius: 8px;
    padding: 10px 20px;
    text-decoration: none;
    font-size: 16px;
    box-shadow: 0 2px 8px 0 rgba(0, 87, 255, 0.08);
    border: 1.5px solid #0057ff;
    outline: none;
    gap: 8px;
    transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}
.github-button:hover {
    background: #0057ff;
    color: #fff;
    box-shadow: 0 4px 16px 0 rgba(0, 87, 255, 0.15);
}
.card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.07);
    margin-top: 32px;
    padding: 0;
    overflow-x: auto;
}
.table-wrapper {
    width: 100%;
}
@media (max-width: 700px) {
    .card {
        min-width: unset;
        margin-top: 16px;
        padding: 0 0 8px 0;
    }
}
.build-info {
    background: #f7f8fa;
    border-radius: 8px;
    margin-bottom: 16px;
    padding: 16px 24px;
    min-width: unset;
    min-height: unset;
    font-size: 18px;
    font-weight: 500;
    color: #222;
}
.build-info-text {
    display: flex;
    align-items: center;
    gap: 8px;
}
.repo-info {
    padding: 0 0 16px 4px;
    font-size: 15px;
    color: #666;
}
a {
    color: #d54400;
}
.column-header {
    text-align: left;
}
.column-status {
    text-align: center;
    width: 7.5%;
}
.column-file {
    width: 37.5%;
}
.column-bundle {
    width: 25%;
}
.column-now {
    width: 10%;
}
.column-diff {
    width: 10%;
}
.column-max {
    width: 10%;
}
.row-header {
    background-color: #fafafa;
    height: 50px;
}
.cell-status {
    padding: 12px;
    text-align: center;
}
.cell-pass {
    color: #38c099;
}
.cell-warn {
    color: #ffcd52;
}
.cell-fail {
    color: #d54400;
}
.cell-removed {
    color: #4a81ea;
}
.dark {
    color: #192235;
}
.light {
    color: #969fa5;
}
footer {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: auto;
    margin: 32px 0 0 0;
    background: none;
}
.footer {
    color: #0057ff;
    font-size: 15px;
    margin-bottom: 8px;
}
.footer a {
    margin: 0 8px;
    color: #d54400;
    text-decoration: underline;
    font-weight: 500;
    transition: color 0.2s;
}
.footer a:hover {
    color: #a83200;
}
.server-commit-sha a {
    color: #999;
    text-decoration: none;
    font-size: 13px;
}
.server-commit-sha a:hover {
    color: #0057ff;
}
.progress-bar-container {
    background-color: #f0f4fa;
    height: 12px;
    border-radius: 6px;
    overflow: hidden;
}
.progress-bar {
    float: left;
    height: 12px;
}
.progress-bar-last-size {
    background-color: #0057ff;
    opacity: 0.3;
}
.progress-bar-pass {
    background-color: #38c099;
}
.progress-bar-pass-negative {
    background-color: #0057ff;
    opacity: 0.5;
}
.progress-bar-warn {
    background-color: #ffcd52;
}
.progress-bar-fail {
    background-color: #d54400;
}
@media (max-width: 700px) {
    th,
    td {
        padding: 8px 4px;
        font-size: 13px;
    }
    .build-info {
        padding: 10px 8px;
        font-size: 15px;
    }
    .footer {
        font-size: 13px;
    }
}
.file-path-cell {
    max-width: 340px;
    word-break: break-all;
    white-space: normal;
    overflow-wrap: anywhere;
}
.material-icons {
    display: inline-block;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    fill: currentColor;
    vertical-align: middle;
}
`;
