// Copied from the 0.x service (src/static/setup-github-styles.css), embedded
// so the Lambda bundle is self-contained. Source Sans Pro comes from the
// service instead of Google Fonts, so the page makes no third-party requests.

import { FONT_FACES } from './fonts.ts';

export const SETUP_GITHUB_CSS: string = `${FONT_FACES}
* {
  -webkit-font-smoothing: antialiased;
  -webkit-overflow-scrolling: touch;
  -webkit-tap-highlight-color: rgba(0,0,0,0);
  -webkit-text-size-adjust: none;
  -webkit-touch-callout: none;
  -webkit-box-sizing: border-box;
          box-sizing: border-box;
}
html {
  box-sizing: border-box;
}
*, *:before, *:after {
  box-sizing: inherit;
}
html, body {
    margin: 0;
    padding: 0;
}
body {
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    color: #36454f;
    font-family: 'Source Sans Pro', 'Helvetica Neue', Arial, sans-serif;
    font-size: 15px;
    letter-spacing: 0;
    background: #f7f7f7;
}
.logo {
    display: block;
    margin: 50px auto;
    text-align: center;
}
.container {
    margin: 0 12px;
}
@media(min-width: 1000px) {
    .container {
        margin: 0 auto;
        width: 70%;
    }
}
.card {
    text-align: center;
    margin-bottom: 24px;
    padding: 24px;
    background: #FFF;
    box-shadow: 0px 3px 5px 2px rgba(201, 214, 255, 0.15);
}

.btn {
    position: relative;
    display: inline-block;
    padding: 1.2em 2em;
    text-decoration: none;
    text-align: center;
    cursor: pointer;
    user-select: none;
    color: white;
}

.btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: #d54400;
    border-radius: 4px;
    transition: all .5s ease, transform .2s ease;
    box-shadow: 0 2px 5px rgba(0, 0, 0, .2);
}

.btn:hover::before {
    opacity: 0.8;
}

.btn::after {
    position: relative;
    display: inline-block;
    content: attr(data-title);
    transition: transform .2s ease;
    font-weight: bold;
    letter-spacing: .01em;
}


footer {
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: 80px;
    margin: 24px;
}

.footer {
    color: #d54400;
}

.footer a {
    margin: 0 8px;
}

`;
