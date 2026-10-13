---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  image:
    src: /logo-large.svg
    alt: BundleWatch
  name: BundleWatch
  text: Keep watch of your bundle size
  tagline: Fail the build when a file gets too big, and see on each pull request how much every file changed.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: What is BundleWatch?
      link: /guide/what-is-it
    - theme: alt
      text: Set up with an AI agent
      link: /guide/getting-started#set-up-with-an-ai-agent

# The icons are inline SVG, so that their navy parts (currentColor) follow the theme
# in dark mode. They are drawn from the logo and the results page.
features:
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><rect x="4" y="7" width="22" height="8" rx="1.5" fill="currentColor"/><rect x="4" y="20" width="30" height="8" rx="1.5" fill="currentColor"/><rect x="34" y="20" width="10" height="8" rx="1.5" fill="#d54400"/><rect x="4" y="33" width="14" height="8" rx="1.5" fill="#ffcd52"/><path d="M34 3v42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
    title: Size limits
    details: Give each file a maxSize. A file over its limit fails the build.
    link: /reference/configuration#files
    linkText: Set limits
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><polygon points="24.00,6.50 38.74,15.10 38.74,32.90 24.00,41.50 9.26,32.90 9.26,15.10" fill="currentColor" stroke="currentColor" stroke-width="3.50" stroke-linejoin="round"/><path d="M16 24.5l5.5 5.5 10.5-11.5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--vp-c-bg-soft)"/></svg>'
    title: Pull request statuses
    details: Posts a bundlewatch commit status when your CI token can write statuses. Make it a required check to block merges when a file is too big.
    link: /guide/using-bundlewatch#github-statuses
    linkText: GitHub statuses
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><path d="M22 3v42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/><rect x="22" y="6" width="22" height="9" rx="1.5" fill="#d54400"/><rect x="5" y="19.5" width="17" height="9" rx="1.5" fill="currentColor"/><rect x="22" y="33" width="10" height="9" rx="1.5" fill="#d54400"/></svg>'
    title: Results page
    details: Shows each file's size, limit and change from the baseline.
    link: /guide/using-bundlewatch#viewing-the-results-breakdown
    linkText: Read the results
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><path d="M10 9v30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/><polygon points="10.00,3.00 15.05,5.95 15.05,12.05 10.00,15.00 4.95,12.05 4.95,5.95" fill="#ffcd52" stroke="#ffcd52" stroke-width="1.20" stroke-linejoin="round"/><polygon points="10.00,18.00 15.05,20.95 15.05,27.05 10.00,30.00 4.95,27.05 4.95,20.95" fill="#d54400" stroke="#d54400" stroke-width="1.20" stroke-linejoin="round"/><polygon points="10.00,33.00 15.05,35.95 15.05,42.05 10.00,45.00 4.95,42.05 4.95,35.95" fill="currentColor" stroke="currentColor" stroke-width="1.20" stroke-linejoin="round"/><rect x="21" y="6" width="22" height="6" rx="1.5" fill="currentColor" opacity="0.35"/><rect x="21" y="21" width="16" height="6" rx="1.5" fill="currentColor" opacity="0.35"/><rect x="21" y="36" width="24" height="6" rx="1.5" fill="currentColor"/></svg>'
    title: Any CI
    details: Works on GitHub Actions without a token to manage, and on GitLab CI, CircleCI, Travis CI, Drone and other providers.
    link: /guide/using-bundlewatch#github-actions
    linkText: Set up CI
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><path d="M14 14v30" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M14 37c0-12 20-9 20-21" stroke="#d54400" stroke-width="3.5" stroke-linecap="round"/><polygon points="14.00,2.00 19.89,5.44 19.89,12.56 14.00,16.00 8.11,12.56 8.11,5.44" fill="currentColor" stroke="currentColor" stroke-width="1.40" stroke-linejoin="round"/><polygon points="34.00,4.00 39.89,7.44 39.89,14.56 34.00,18.00 28.11,14.56 28.11,7.44" fill="#d54400" stroke="#d54400" stroke-width="1.40" stroke-linejoin="round"/></svg>'
    title: Branches
    details: Pull requests are compared with the branch they target, where your CI provides it. You choose which branches save a baseline.
    link: /guide/diffing-against-branches-other-than-master
    linkText: Base and tracked branches
  - icon: '<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none"><polygon points="4,10 13,5.5 35,5.5 44,10 35,14.5 13,14.5" fill="#ffcd52" stroke="#ffcd52" stroke-width="2" stroke-linejoin="round"/><polygon points="4,24 13,19.5 35,19.5 44,24 35,28.5 13,28.5" fill="#d54400" stroke="#d54400" stroke-width="2" stroke-linejoin="round"/><polygon points="4,38 13,33.5 35,33.5 44,38 35,42.5 13,42.5" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
    title: Your own server
    details: Run the service that stores baselines yourself, or run without one.
    link: /guide/using-a-custom-server
    linkText: Use a custom server
---
