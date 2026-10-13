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

features:
  - title: Size limits
    details: Give each file a maxSize. A file over its limit fails the build.
    link: /reference/configuration#files
    linkText: Set limits
  - title: Pull request statuses
    details: Posts a bundlewatch commit status when your CI token can write statuses. Make it a required check to block merges when a file is too big.
    link: /guide/using-bundlewatch#github-statuses
    linkText: GitHub statuses
  - title: Results page
    details: Shows each file's size, limit and change from the baseline.
    link: /guide/using-bundlewatch#viewing-the-results-breakdown
    linkText: Read the results
  - title: Any CI
    details: Works on GitHub Actions without a token to manage, and on GitLab CI, CircleCI, Travis CI, Drone and other providers.
    link: /guide/using-bundlewatch#github-actions
    linkText: Set up CI
  - title: Branches
    details: Pull requests are compared with the branch they target, where your CI provides it. You choose which branches save a baseline.
    link: /guide/diffing-against-branches-other-than-master
    linkText: Base and tracked branches
  - title: Your own server
    details: Run the service that stores baselines yourself, or run without one.
    link: /guide/using-a-custom-server
    linkText: Use a custom server
---
