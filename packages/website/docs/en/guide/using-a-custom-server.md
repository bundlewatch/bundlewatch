---
title: Using a Custom Server
description: How to run your own Bundlewatch service and configure your project to use it.
---

# Using a Custom Server with Bundlewatch

The Bundlewatch service stores the baselines your builds are compared with, creates short results links and renders the results pages. You can run your own instance instead of using `https://service.bundlewatch.io`.

The service lives in the Bundlewatch repository, in [`packages/service`](https://github.com/bundlewatch/bundlewatch/tree/main/packages/service). It runs on AWS Lambda, stores its data in DynamoDB, and is deployed with AWS SAM from [`template.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/template.yaml).

First deploy [`infra/bootstrap.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/infra/bootstrap.yaml) in the same AWS account and region, following the [one-time setup](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#one-time-setup). The application template requires its `bundlewatch-service-function-role-arn` export. Set `GitHubRepository` to your fork's `owner/repo`, and set `StoreTableName` and `ResultsTableName` identically in both stacks so the function role can access your tables. Set bootstrap's `ServiceStackName` to the application stack's name. For an existing GitHub OIDC provider, pass `ExistingOidcProviderArn`.

Then deploy the application template, overriding these parameters:

- `PublicUrl`: your service's URL. Otherwise short links point at service.bundlewatch.io, where they don't exist.
- `GitHubClientId` and `GitHubClientSecret`: your own GitHub OAuth app, for `/setup-github`. Its callback URL is `<your service>/setup-github`.
- `ResultsTableName`: your short-link table name, matching bootstrap. The application template creates it.
- `StoreTableName`: your baseline table. The template doesn't create it: reuse the table of your 0.x deployment, or create one with hash key `repo` (S) and range key `repoBranch` (S).
- `GitHubApiUrl`: for GitHub Enterprise, your API URL, such as `https://github.example.com/api/v3`. See [GitHub Enterprise](./migrating-to-v1.md#github-enterprise).
- `WriteAuthorization`: `enforce` to apply the stricter check for saving baselines and creating short links from the start. The default, `report`, authorizes like 0.x and only logs where the stricter check would decide differently. See [Service changes](./migrating-to-v1.md#service-changes).
- `ResultsRetentionDays`: how many days to keep short links. The default, `0`, keeps them forever.

See [Running your own service](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#running-your-own-service) in the service's README for details.

Then, update your Bundlewatch configuration to point to your custom server:

```js
module.exports = {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
  bundlewatchServiceHost: 'https://my-bundlewatch-service.example.com',
}
```

Set `bundlewatchServiceHost` to `null` to run without a service. Bundlewatch then only checks `maxSize`, without comparing with or saving a baseline, and prints no results link.

## Services from before 1.0

A service forked from the old `bundlewatch/service` repository keeps working with the 1.0 CLI. It doesn't support short links, so the CLI prints long `/results?d=…` links instead. See [Migrating to 1.0](./migrating-to-v1.md#service-changes) for what changed in the service.

For more configuration options, see the [Configuration Reference](../reference/configuration.md).
