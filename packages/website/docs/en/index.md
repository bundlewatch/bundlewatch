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
      text: GitHub
      link: https://github.com/bundlewatch/bundlewatch

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
    details: Easily specify a custom path for your configuration file, making setup flexible for any project structure.
    link: /guide/using-a-config-file
    linkText: Learn about configuration file
  - icon: 🔀
    details: Compare bundle sizes across any branches, not just main, to keep all your development flows in check.
    link: /guide/diffing-against-branches-other-than-master
    linkText: Learn about comparing branches
  - icon: 🚨
    details: Seamlessly integrates with GitHub for automated checks and status updates on your pull requests.
    link: /guide/using-bundlewatch#adding-build-status-to-github-prs
    linkText: Learn about GitHub integration
  - icon: 🗄️
    details: Optionally use your own server for storing and retrieving bundle data, giving you full control over your data.
    link: /guide/using-a-custom-server
    linkText: Learn about using your own server
---
