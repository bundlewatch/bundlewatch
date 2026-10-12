---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  image:
    src: /logo-large.svg
    alt: BundleWatch
  name: BundleWatch
  text: Keep watch of your bundle size
  tagline: Notice when files drastically increase. Ensure you don't serve huge files to customers. Block builds when files get too big.

  actions:
    - theme: brand
      text: What is BundleWatch?
      link: /guide/what-is-it
    - theme: alt
      text: Quickstart
      link: /guide/getting-started
    - theme: alt
      text: Set up with an AI agent
      link: /guide/getting-started#set-up-with-an-ai-agent

features:
  - icon: 🚫
    details: Set thresholds to ensure you never accidentally serve oversized files to your customers.
    link: /reference/configuration#files
    linkText: Learn about custom thresholds
  - icon: 📊
    details: Get a clear, comprehensive breakdown of your bundle analysis results, making it easy to spot issues and improvements.
    link: /guide/using-bundlewatch#viewing-the-results-breakdown
    linkText: Learn about results breakdown
  - icon: ✨
    details: Works on GitHub Actions without a token to manage, and on GitLab CI, CircleCI, Travis CI, Drone and other providers.
    link: /guide/using-bundlewatch#github-actions
    linkText: Learn about CI setup
  - icon: 🔀
    details: Compare bundle sizes across any branches, not just main, to keep all your development flows in check.
    link: /guide/diffing-against-branches-other-than-master
    linkText: Learn about comparing branches
  - icon: 🚨
    details: Reports a status on every pull request, and blocks merges when a file gets too big.
    link: /guide/using-bundlewatch#github-statuses
    linkText: Learn about GitHub statuses
  - icon: 🗄️
    details: Optionally use your own server for storing and retrieving bundle data, giving you full control over your data.
    link: /guide/using-a-custom-server
    linkText: Learn about using your own server
---
