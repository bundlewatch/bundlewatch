---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: BundleWatch — JavaScript bundle size checks for CI
titleTemplate: false
description: Check JavaScript and CSS bundle sizes in CI, enforce gzip or Brotli limits, and compare changes on GitHub pull requests. Free and open source.

hero:
  image:
    src: /logo-large.svg
    alt: BundleWatch
  name: BundleWatch
  tagline: Stay in control of your bundle size. Every pull request shows how it impacts your bundle, file by file, against the limits you set.
  actions:
    - theme: brand
      text: Set up BundleWatch
      link: /guide/getting-started
    - theme: alt
      text: What is BundleWatch?
      link: /guide/what-is-it
    - theme: alt
      text: Set up with an AI agent
      link: /guide/getting-started#set-up-with-an-ai-agent

# Shown between the hero and the features, by .vitepress/theme/HomeResults.vue.
results:
  src: /home-results-changes.png
  darkSrc: /home-results-changes-dark.png
  alt: "The changes on a pull request's results page: index.js grew by 17.08KB and is 14.58KB under its 160KB limit, vendor.js grew by 13.17KB and is 9.77KB over its 200KB limit, and charts.js shrank by 5.51KB."
  caption: "Each pull request's <code>bundlewatch</code> status links to its results page, which shows what the commit changed, file by file, next to each limit."

usedBy:
  title: Used by builders at
  pauseHint: Hover or focus here to pause the logos

# The icons are inline SVG, so that their navy parts (currentColor) follow the theme
# in dark mode. They are drawn from the logo and the results page. Their classes name
# the parts that move, in .vitepress/theme/feature-icons.css.
features:
  - icon: '<svg class="limits-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><rect class="row1" x="4" y="7" width="22" height="8" rx="1.5" fill="currentColor"/><rect class="row2" x="4" y="20" width="30" height="8" rx="1.5" fill="currentColor"/><rect class="row2 over" x="34" y="20" width="10" height="8" rx="1.5" fill="#d54400"/><rect class="row3" x="4" y="33" width="14" height="8" rx="1.5" fill="#ffcd52"/><path class="limit" pathLength="1" d="M34 3v42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
    title: Size limits
    details: Set a maxSize for each file, measured with gzip, Brotli or no compression. A file over its limit fails the build.
    link: /reference/configuration#files
    linkText: Set limits
  - icon: '<svg class="statuses-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><polygon class="hex" points="24.00,6.50 38.74,15.10 38.74,32.90 24.00,41.50 9.26,32.90 9.26,15.10" fill="currentColor" stroke="currentColor" stroke-width="3.50" stroke-linejoin="round"/><path class="check" pathLength="1" d="M16 24.5l5.5 5.5 10.5-11.5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--vp-c-bg-soft)"/></svg>'
    title: Pull request statuses
    details: Posts a bundlewatch commit status when your CI token can write statuses. Make it a required check to block merges when a file is too big.
    link: /guide/using-bundlewatch#github-statuses
    linkText: GitHub statuses
  - icon: '<svg class="results-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><path class="axis" pathLength="1" d="M22 3v42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/><rect class="row1 right" x="22" y="6" width="22" height="9" rx="1.5" fill="#d54400"/><rect class="row2 left" x="5" y="19.5" width="17" height="9" rx="1.5" fill="currentColor"/><rect class="row3 right" x="22" y="33" width="10" height="9" rx="1.5" fill="#d54400"/></svg>'
    title: Results page
    details: Shows each file's size, limit and change from the baseline.
    link: /guide/using-bundlewatch#viewing-the-results-breakdown
    linkText: Read the results
  - icon: '<svg class="ci-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><path class="spine" pathLength="1" d="M10 9v30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/><polygon class="row1 step" points="10.00,3.00 15.05,5.95 15.05,12.05 10.00,15.00 4.95,12.05 4.95,5.95" fill="#ffcd52" stroke="#ffcd52" stroke-width="1.20" stroke-linejoin="round"/><polygon class="row2 step" points="10.00,18.00 15.05,20.95 15.05,27.05 10.00,30.00 4.95,27.05 4.95,20.95" fill="#d54400" stroke="#d54400" stroke-width="1.20" stroke-linejoin="round"/><polygon class="row3 step" points="10.00,33.00 15.05,35.95 15.05,42.05 10.00,45.00 4.95,42.05 4.95,35.95" fill="currentColor" stroke="currentColor" stroke-width="1.20" stroke-linejoin="round"/><rect class="row1 bar" x="21" y="6" width="22" height="6" rx="1.5" fill="currentColor" opacity="0.35"/><rect class="row2 bar" x="21" y="21" width="16" height="6" rx="1.5" fill="currentColor" opacity="0.35"/><rect class="row3 bar" x="21" y="36" width="24" height="6" rx="1.5" fill="currentColor"/></svg>'
    title: Any CI
    details: Use GitHub Actions with its built-in token, or run on GitLab CI, CircleCI, Travis CI, Drone and other providers.
    link: /guide/using-bundlewatch#github-actions
    linkText: Set up CI
  - icon: '<svg class="branches-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><path class="main" d="M14 14v30" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path class="branch" pathLength="1" d="M14 37c0-12 20-9 20-21" stroke="#d54400" stroke-width="3.5" stroke-linecap="round"/><polygon class="base" points="14.00,2.00 19.89,5.44 19.89,12.56 14.00,16.00 8.11,12.56 8.11,5.44" fill="currentColor" stroke="currentColor" stroke-width="1.40" stroke-linejoin="round"/><polygon class="tip" points="34.00,4.00 39.89,7.44 39.89,14.56 34.00,18.00 28.11,14.56 28.11,7.44" fill="#d54400" stroke="#d54400" stroke-width="1.40" stroke-linejoin="round"/></svg>'
    title: Branches
    details: Pull requests are compared with the branch they target, where your CI provides it. You choose which branches save a baseline.
    link: /guide/diffing-against-branches-other-than-master
    linkText: Base and tracked branches
  - icon: '<svg class="server-icon" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" fill="none"><polygon class="row1" points="4,10 13,5.5 35,5.5 44,10 35,14.5 13,14.5" fill="#ffcd52" stroke="#ffcd52" stroke-width="2" stroke-linejoin="round"/><polygon class="row2" points="4,24 13,19.5 35,19.5 44,24 35,28.5 13,28.5" fill="#d54400" stroke="#d54400" stroke-width="2" stroke-linejoin="round"/><polygon class="row3" points="4,38 13,33.5 35,33.5 44,38 35,42.5 13,42.5" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
    title: Your own server
    details: Run the service that stores baselines yourself, or run without one.
    link: /guide/using-a-custom-server
    linkText: Use a custom server
---
