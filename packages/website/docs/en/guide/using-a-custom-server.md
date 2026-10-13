---
title: Using a custom server
description: How to run your own BundleWatch service and configure your project to use it.
---

# Using a custom server {#using-a-custom-server-with-bundlewatch}

The BundleWatch service stores the baselines your builds are compared with, creates short results links and renders the results pages. You can run your own instance instead of using `https://service.bundlewatch.io`.

Point BundleWatch at your service in package.json:

```json
{
  "bundlewatch": {
    "files": [
      {
        "path": "./dist/*.js",
        "maxSize": "100kB"
      }
    ],
    "bundlewatchServiceHost": "https://bundlewatch.example.com"
  }
}
```

See [bundlewatchServiceHost](../reference/configuration.md#bundlewatchservicehost) for the URL format, and to run without a service.

## Deploying the service

The service lives in the BundleWatch repository, in [`packages/service`](https://github.com/bundlewatch/bundlewatch/tree/main/packages/service). It runs on AWS Lambda, stores its data in DynamoDB, and is deployed with AWS SAM from [`template.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/template.yaml).

1. Deploy [`infra/bootstrap.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/infra/bootstrap.yaml) in your AWS account and region, as described in [Running your own service](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#running-your-own-service). Set `GitHubRepository` to your fork, and give it the same `StoreTableName` and `ResultsTableName` that you give template.yaml in step 3.

   Set `ServiceStackName` to your application stack's name. If your account already has a GitHub OIDC provider, pass its ARN as `ExistingOidcProviderArn`.

2. Create a GitHub OAuth app for `/setup-github`, with the callback URL `<your service>/setup-github`.
3. Deploy [`template.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/template.yaml) with your service's URL, OAuth app and table names, as described in [Running your own service](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#running-your-own-service).

`template.yaml` also has these two parameters:

- `WriteAuthorization`: `enforce` to apply the stricter check for saving baselines and creating short links from the start. The default, `report`, authorizes like 0.x and only logs where the stricter check would decide differently. See [Service changes](./migrating-to-v1.md#service-changes).
- `ResultsRetentionDays`: how many days to keep short links. The default, `0`, keeps them forever.

## GitHub Enterprise

- Commit statuses go to the GitHub API at `GITHUB_API_URL` when it is set; GitHub Actions on GitHub Enterprise Server sets it automatically.
- service.bundlewatch.io only accepts github.com tokens. On GitHub Enterprise it can't compare with baselines, save them or create short links: each run logs `401` errors and prints a long results link.
- For comparisons, deploy your own service with `GitHubApiUrl` set to your API URL, such as `https://github.example.com/api/v3`, and set `bundlewatchServiceHost` to its URL.
- Otherwise set `bundlewatchServiceHost: null`, so that your token and file names aren't sent to service.bundlewatch.io.

## Services from before 1.0

A service forked from the old `bundlewatch/service` repository keeps working with the 1.0 CLI. It doesn't support short links, so the CLI prints long `/results?d=…` links instead. See [Migrating to 1.0](./migrating-to-v1.md#service-changes) for what changed in the service.
