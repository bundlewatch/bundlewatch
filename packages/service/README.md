# @bundlewatch/service

The service behind `https://service.bundlewatch.io`. It:

- stores the latest file sizes (the baseline) of each tracked branch, so the CLI can compare a build against its base branch;
- renders results pages, from the data packed into a `/results?d=…` link or from a stored short link (`/r/{id}`);
- hands out GitHub tokens for the bundlewatch OAuth app (`/setup-github`).

It runs on AWS Lambda behind an API Gateway HTTP API, with two DynamoDB tables. [CONTRACT.md](../../CONTRACT.md) lists what must stay compatible with 0.x CLIs and self-hosted 0.x services.

## Routes

| Route                                                                   | Auth | Responses                                                                                             |
| ----------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| `GET /`                                                                 |      | `200 {"message":"hello world"}`                                                                       |
| `POST /store`                                                           | yes  | Saves a baseline. `200` with the stored item, `401`, `413`, `422`, `500`                              |
| `POST /store/lookup`                                                    | yes  | `200 { fileDetailsByPath }`, `404` (empty body) when there is no baseline, `401`, `413`, `422`, `500` |
| `GET /results?d=…`                                                      |      | Results page (HTML). `400` when `d` is missing or not jsonpack, `422` when it isn't results data      |
| `POST /results`                                                         | yes  | Creates a short link. `201 { id, url }`, `400`, `401`, `413`, `422`, `500`                            |
| `GET /r/{id}`                                                           |      | Results page of a short link. `404` page for unknown or expired ids                                   |
| `GET /setup-github[?code=]`                                             |      | OAuth authorize button, or the token for `code`. `500 { error }` when the exchange fails              |
| `POST /analyze`                                                         | yes  | Analyzes on the server and posts commit statuses. `202`, `401`, `413`, `422`, `500`. No known callers |
| `GET /static/results-styles.css`, `GET /static/setup-github-styles.css` |      | Stylesheets                                                                                           |

Anything else is `404 {"error":"Not found"}`. `HEAD` works wherever `GET` does.

Error bodies are JSON: `401 {"error":"Not allowed"}`, `422 {"errors":{"details":[{ message, path, type, context }]}}` (Joi's format, as in 0.x), and `{"error": "…"}` otherwise. Request bodies are parsed as JSON whatever their content type; an empty body is `{}`, invalid JSON is a `400`, and bodies over 1 MB are a `413`.

The request bodies of `/store`, `/store/lookup` and `/analyze` are unchanged from 0.x; see CONTRACT.md. Their validation ports the 0.x Joi schemas, so unknown keys are rejected, strings must be non-empty, and baselines containing error entries (`{ error }`) are rejected.

### `POST /results`

Stores a results page and returns a short link to it. The CLI calls this when it has a GitHub token, and falls back to a long `/results?d=…` link when the call fails or the service predates it.

```json
{
  "repoOwner": "bundlewatch",
  "repoName": "bundlewatch",
  "commitSha": "3b63e5c0a5d1f0e6c9f1b0e2d6a7c8b9e0f1a2b3",
  "githubAccessToken": "…",
  "payload": {
    "details": {
      "repoOwner": "bundlewatch",
      "repoName": "bundlewatch",
      "repoCurrentBranch": "feat/smaller",
      "repoBranchBase": "main",
      "commitSha": "3b63e5c0a5d1f0e6c9f1b0e2d6a7c8b9e0f1a2b3"
    },
    "results": {
      "status": "pass",
      "summary": "Everything is in check (+1.41KB, -0B, +4.8%)",
      "fullResults": [
        {
          "filePath": "./dist/main.js",
          "status": "pass",
          "size": 31448,
          "baseBranchSize": 30000,
          "maxSize": 102400
        },
        {
          "filePath": "./dist/vendor.js",
          "status": "pass",
          "size": 1000,
          "baseBranchSize": 0,
          "maxSize": null
        },
        {
          "filePath": "./dist/*.map",
          "status": "fail",
          "error": "There is no matching file for ./dist/*.map"
        }
      ]
    }
  }
}
```

- `repoOwner`, `repoName`, `commitSha` and `githubAccessToken` are required non-empty strings. The token goes through the [authorization check](#authorization) for `repoOwner/repoName` and is not stored.
- `payload` is what core's `createResultsPayload(results, details)` returns, the same data a `d` parameter holds. It is validated like a decoded `d`:
  - `details`: optional strings `repoOwner`, `repoName`, `repoCurrentBranch`, `repoBranchBase`, `commitSha`.
  - `results`: `status` and `summary` (non-empty strings), and `fullResults`, an array of `{ filePath, status }` (required, non-empty) with optional `size`, `baseBranchSize`, `maxSize` (number or `null`; `null` means unlimited), `error`, `message` and `compression`.
  - Any other key is a `422`.
- No other top-level keys are accepted.
- `payload.details.repoOwner` and `repoName`, when present, must name the repository the token was checked against (case-insensitively). Otherwise it's a `422`.

Response:

```http
HTTP/1.1 201 Created
content-type: application/json; charset=utf-8
location: https://service.bundlewatch.io/r/AbxBAzAlLgSQ

{"id":"AbxBAzAlLgSQ","url":"https://service.bundlewatch.io/r/AbxBAzAlLgSQ"}
```

`id` is 12 random base62 characters. `url` is built from `PUBLIC_URL`, or from the request's origin when it isn't set.

### Authorization

Every route marked "Auth" needs a GitHub token for the repository. The check runs before validation, as in 0.x. A missing `repoOwner`, `repoName`, `commitSha` or `githubAccessToken` is a `401`.

**Reading** (`/store/lookup`) uses the 0.x check: the token must be able to read the commit's statuses (`GET /repos/{owner}/{repo}/statuses/{commitSha}`).

**Writing** (`/store`, `POST /results`, `/analyze`) depends on `WRITE_AUTHORIZATION`:

- `report`, the default, decides like 0.x and also runs the stricter check below. When the two disagree it logs a `write-authorization-differs` event, so you can see who `enforce` would affect before switching to it. If the stricter check fails or times out, it logs `write-authorization-check-failed` and the independent 0.x check still decides.
- `enforce` applies the stricter check.

The stricter check:

1. `GET /repos/{owner}/{repo}` with the token. If the response's `permissions` grant `push`, `maintain` or `admin`, the token is allowed.
2. Otherwise, `GET /installation/repositories`:
   - Installation tokens, such as the `GITHUB_TOKEN` of GitHub Actions, get a list. GitHub reports every permission as `false` for these tokens, which is why this step exists. The token is allowed only if the repository is in its installation (all pages, names compared case-insensitively).
   - Other tokens get a `401` or `403` here. A user without push access is refused. A response without `permissions` goes to the 0.x check.
   - If the list can't be read in time, the 0.x check decides.
3. If `GET /repos/{owner}/{repo}` answers `403` or `404`, for example for a `repo:status` OAuth token on a private repository, the 0.x check decides.

All GitHub requests of one check share a 6-second budget; installation listing stops with 2 seconds reserved for the statuses fallback. 0.x CLIs wait 10 seconds for the service. Network errors, timeouts, rate limits and GitHub `5xx` answers from the deciding check are a `503`; errors in the report-only shadow check are logged without rejecting the request.

Logged events are single-line JSON with the repository and the token's kind, from its prefix (`installation`, `oauth`, `classic-pat`, `fine-grained-pat`, `app-user`, `legacy` or `other`). Tokens are never logged or stored.

Known gaps, because GitHub has no API that shows what an installation token may do:

- A fork pull request's `GITHUB_TOKEN` is a read-only installation token for the base repository, so it passes step 2. The 1.0 CLI never saves from pull requests. A 0.x CLI running on a fork whose branch has a tracked name, such as `master`, still can.
- On private repositories, read-only collaborators pass the 0.x check.

## Environment variables

| Variable                                   |                                                                                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STORE_TABLE`                              | Baseline table (`bundlewatch-service-store-table-prod`). Required on Lambda.                                                                                                                                                 |
| `RESULTS_TABLE`                            | Short link table. Required on Lambda.                                                                                                                                                                                        |
| `RESULTS_RETENTION_DAYS`                   | Optional. A positive integer keeps short links for that many days (`expiresAt` is written for DynamoDB TTL); otherwise they are kept forever.                                                                                |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | The OAuth app behind `/setup-github` (client id `04fcf325dd26ca2a159f`).                                                                                                                                                     |
| `GIT_SHA1`                                 | Deployed commit, linked in the results page footer.                                                                                                                                                                          |
| `PUBLIC_URL`                               | Base of short links, e.g. `https://service.bundlewatch.io`. Defaults to the request's origin. `template.yaml` sets it from `PublicUrl`, whose default is `https://service.bundlewatch.io`: override it for your own service. |
| `GITHUB_API_URL`                           | Default `https://api.github.com`. Set it for GitHub Enterprise or a fake GitHub in tests. The OAuth host is derived from it (`api.github.com` → `github.com`, `<host>/api/v3` → `<host>`).                                   |
| `WRITE_AUTHORIZATION`                      | `report` (default) or `enforce`; see [Authorization](#authorization).                                                                                                                                                        |
| `DYNAMODB_ENDPOINT`                        | Optional, e.g. `http://localhost:8000` for DynamoDB Local.                                                                                                                                                                   |

## Local development

```sh
pnpm --filter @bundlewatch/service dev
```

This serves the app on `http://localhost:3000` (set `PORT` to change it) with in-memory stores, restarting on changes. To use DynamoDB Local instead:

```sh
docker run --rm -p 8000:8000 amazon/dynamodb-local
DYNAMODB_ENDPOINT=http://localhost:8000 pnpm --filter @bundlewatch/service dev
```

The dev server creates the tables if they don't exist, named by `STORE_TABLE` and `RESULTS_TABLE` (default `bundlewatch-store-local` and `bundlewatch-results-local`), with the same keys and index as production.

Authorized routes call GitHub. Point `GITHUB_API_URL` at a fake GitHub to run without real tokens.

## Tests

```sh
pnpm --filter @bundlewatch/service test
pnpm --filter @bundlewatch/service typecheck
```

Tests use a local fake GitHub server and in-memory or faked DynamoDB clients. `src/stores/dynamodb.integration.test.ts` also runs against a real DynamoDB when `DYNAMODB_ENDPOINT` is set:

```sh
DYNAMODB_ENDPOINT=http://localhost:8000 pnpm --filter @bundlewatch/service test
```

## Build

```sh
pnpm --filter @bundlewatch/service build
```

This writes `packages/service/dist/lambda.mjs`, one self-contained ES module with the AWS SDK, `@bundlewatch/core` and the stylesheets bundled in. Its `handler` export takes API Gateway HTTP API events in payload format 2.0, so the Lambda function needs runtime `nodejs24.x` and handler `lambda.handler`. `src/app.ts` is a plain `(Request) => Promise<Response>` function; `src/lambda.ts` and `src/dev-server.ts` adapt it.

## Data

The function needs `dynamodb:GetItem` and `dynamodb:PutItem` on both tables.

### Baseline table (`STORE_TABLE`)

Created by the 0.x Serverless stack and kept in place. Hash key `repo`, range key `repoBranch`, local secondary index `timestamp` (hash `repo`, range `timestamp`, `KEYS_ONLY`). One item per branch, overwritten on each save.

| Attribute           | Type | Value                                                                                 |
| ------------------- | ---- | ------------------------------------------------------------------------------------- |
| `repo`              | S    | `owner/name`                                                                          |
| `repoBranch`        | S    | Branch name                                                                           |
| `repoOwner`         | S    |                                                                                       |
| `repoName`          | S    |                                                                                       |
| `commitSha`         | S    |                                                                                       |
| `fileDetailsByPath` | S    | JSON: `{ "<path>": { "size": 123, "maxSize": 1024 or null, "compression": "gzip" } }` |
| `timestamp`         | S    | Epoch milliseconds, e.g. `"1791829883284"`                                            |

Items were written by dynamoose 1.11.1, and old deployments of the service may still read and write the table. dynamoose stored `fileDetailsByPath` (schema type `Object`) as a JSON string, not a map, and cannot read a map back. `timestamp` must be a string, because the index declares it as `S`. This service writes exactly that format, checked against items written by dynamoose (`src/stores/dynamodb-baseline-store.test.ts`). It also reads a map or a numeric timestamp, should one exist.

### Results table (`RESULTS_TABLE`)

Hash key `id` (S), no range key. Enable TTL on `expiresAt`.

| Attribute   | Type | Value                                                            |
| ----------- | ---- | ---------------------------------------------------------------- |
| `id`        | S    | 12 base62 characters                                             |
| `repo`      | S    | `owner/name` the token was checked against                       |
| `createdAt` | S    | ISO 8601                                                         |
| `expiresAt` | N    | Epoch seconds. Only written when `RESULTS_RETENTION_DAYS` is set |
| `payload`   | B    | gzip-compressed JSON of the results payload                      |

Items are written with `attribute_not_exists(id)`, and a taken id is retried with a new one. Expired items are treated as missing even before DynamoDB deletes them.

## Differences from the 0.x service

- Stricter authorization for writes, in report-only mode until `WRITE_AUTHORIZATION=enforce` (above). Lookups keep the 0.x check.
- GitHub failures during the check are a `503`, not a `401` or `500`.
- Baselines too big for DynamoDB (over 350 KB) are a `413`, not a `500`. Size strings such as `"100KB"`, which 0.x CLIs sent for a numeric `maxSize` in their config, are read as bytes; 0.x rejected those baselines and links.
- `/setup-github` sends a `state` to GitHub and checks it on the way back, and the token page can't be framed. 0.x had neither.
- Responses are gzipped for clients that accept it, so pages of very large projects stay under Lambda's 6 MB response limit.
- `/store` waits for the write and answers `500` if it fails. 0.x answered `200` before writing.
- Results links where a file has no `maxSize` render. 0.x CLIs pack `Infinity` there and the 0.x schema rejected it with a `422`, so those links never rendered. Unlimited sizes show as `Infinity`. Empty `details` strings are accepted too.
- Malformed `d` is a `400`, not a `500`.
- `422` bodies leave out Joi's `_original`, which echoed the request including the token.
- Bodies up to 1 MB are accepted (0.x: 100 kB).
- Pages make no third-party requests: inline SVG icons replace Material Icons, the Google Fonts import is gone, and the logo and favicon come from bundlewatch.io. HTML responses carry a Content-Security-Policy.
- Unknown routes are JSON `404`s.

## Running your own service

The CLI talks to any service that answers the routes above. Point `bundlewatchServiceHost` at yours.

First deploy [`infra/bootstrap.yaml`](infra/bootstrap.yaml) in the same AWS account and region, following [One-time setup](#one-time-setup). The application template requires its `bundlewatch-service-function-role-arn` export. Set bootstrap's `GitHubRepository` to your fork's `owner/repo` for GitHub Actions, and use the same `StoreTableName` and `ResultsTableName` in both stacks so the function role can access your tables. Set `ServiceStackName` to your application stack's name. If your account already has a GitHub OIDC provider, pass its ARN as `ExistingOidcProviderArn`.

Then deploy [`template.yaml`](template.yaml), overriding these parameters:

- `PublicUrl`: your service's URL. Otherwise short links point at service.bundlewatch.io, where they don't exist.
- `GitHubClientId` and `GitHubClientSecret`: your own GitHub OAuth app, for `/setup-github`. Its callback URL is `<your service>/setup-github`.
- `ResultsTableName`: your short-link table name, matching bootstrap. The application template creates this table.
- `StoreTableName`: your baseline table.
  - The template doesn't create it.
  - Reuse the table of your 0.x deployment, or create one with hash key `repo` (S) and range key `repoBranch` (S); see [Baseline table](#baseline-table-store_table).
- `GitHubApiUrl`: for GitHub Enterprise, your API URL, such as `https://github.example.com/api/v3`.

## Deployment

Production runs as the CloudFormation stack `bundlewatch-service` in `us-east-1`. [`template.yaml`](template.yaml) describes it:

- an HTTP API with throttling;
- the function, on `nodejs24.x` and arm64;
- a log group that keeps 30 days;
- the short-link table `bundlewatch-service-results`.

The baseline table `bundlewatch-service-store-table-prod` is only referenced by name, and no stack from this repository manages it.

The [Deploy service workflow](../../.github/workflows/deploy-service.yml) runs on every change to `main` that touches the service, `packages/core` or the workspace setup, and can also be started by hand. It:

1. runs the service tests;
2. builds `dist/lambda.mjs`;
3. deploys with `sam deploy`;
4. checks that `GET /` answers.

It authenticates with GitHub's OIDC token, so no AWS keys are stored in GitHub. [`infra/bootstrap.yaml`](infra/bootstrap.yaml) defines three roles:

- **The deploy role**, which GitHub Actions assumes. It can only start CloudFormation deployments of this stack.
- **The execution role**, which CloudFormation uses. It can manage the stack's function, API, table and log group, and can't create IAM roles.
- **The function's own role**, with only `GetItem` and `PutItem` on the two tables and access to its log group.

Parameters that the workflow doesn't pass keep the value of the first deploy (`PublicUrl`, `ResultsRetentionDays`, `GitHubApiUrl` and the table names). Changing their defaults in `template.yaml` doesn't change the running stack; pass them with `--parameter-overrides` instead.

### One-time setup

You need administrator access to the AWS account. Do the GitHub steps before the workflows reach `main`: GitHub creates an unprotected environment the first time a workflow names one.

1. In the repository settings, create the environment `production` and allow deployments from `main` only.
   - A required reviewer makes every deploy wait for approval, including during the cutover.
   - Under Actions settings, consider keeping the default `GITHUB_TOKEN` read-only and not letting Actions approve pull requests.

2. Check whether the account already has a GitHub OIDC provider:

   ```sh
   aws iam list-open-id-connect-providers
   ```

3. Deploy the bootstrap stack. If a provider already exists, add `--parameter-overrides ExistingOidcProviderArn=<its ARN>`.

   ```sh
   aws cloudformation deploy \
     --region us-east-1 \
     --stack-name bundlewatch-deploy-access \
     --template-file packages/service/infra/bootstrap.yaml \
     --capabilities CAPABILITY_IAM
   ```

4. Copy the GitHub OAuth app's client secret from the 0.x function. Its environment is the only place it can be read, and it disappears with the 0.x stack.

   ```sh
   aws lambda get-function-configuration --region us-east-1 \
     --function-name bundlewatch-service-prod-expressRouter \
     --query Environment.Variables.GITHUB_CLIENT_SECRET --output text
   ```

5. Add to the `production` environment:
   - **Variables:**
     - `AWS_DEPLOY_ROLE_ARN`, `CFN_EXECUTION_ROLE_ARN` and `SAM_ARTIFACT_BUCKET`, from the bootstrap stack outputs (`aws cloudformation describe-stacks --stack-name bundlewatch-deploy-access`).
     - Optionally `WRITE_AUTHORIZATION`; leave it unset (`report`) for now. See [Enforcing the stricter write check](#enforcing-the-stricter-write-check).
   - **Secret:** `OAUTH_CLIENT_SECRET`, from step 4.

6. Create an AWS Budgets alert for the account, for example at twice the usual monthly cost. Short links are stored per request, and the API is throttled to 100 requests per second overall, so a misbehaving client shows up as cost and throttling first.

7. Run the Deploy service workflow. It creates the stack next to the 0.x one, which keeps serving `service.bundlewatch.io`.
   - If this first deploy fails, the stack is left in `ROLLBACK_COMPLETE` and can't be updated.
   - Delete it with `aws cloudformation delete-stack --stack-name bundlewatch-service` (administrator), then run the workflow again.

8. Try the new API on its own URL, the `ApiUrl` stack output:
   - **`GET /`** should answer.
   - **A long results link** copied from a GitHub status should render.
   - **Short links:** create one with the 1.0 CLI, with `bundlewatchServiceHost` set to `ApiUrl`. The link it prints uses `PublicUrl` (service.bundlewatch.io), so swap in `ApiUrl` to open it.
   - **`/setup-github`** can't be tested here. GitHub sends the browser back to the OAuth app's registered callback, which is the 0.x service until the cutover.
   - **Real tokens:** run the checks in [Enforcing the stricter write check](#enforcing-the-stricter-write-check).

### Moving service.bundlewatch.io to the new stack

The custom domain `service.bundlewatch.io` was created outside CloudFormation by the 0.x setup, and stays. Only its API mapping is pointed at the new API, in one call, with no downtime.

1. **Protect the baseline table.** Check that the deployed 0.x template still keeps it, back it up, and switch it to on-demand capacity: it was provisioned with 1 read and 1 write unit, which throttles under load.

   ```sh
   aws cloudformation get-template --stack-name bundlewatch-service-prod \
     --query 'TemplateBody.Resources.StoreTable.DeletionPolicy'   # must print "Retain"
   aws dynamodb create-backup --table-name bundlewatch-service-store-table-prod --backup-name before-1.0
   aws dynamodb update-continuous-backups --table-name bundlewatch-service-store-table-prod \
     --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
   aws dynamodb update-table --table-name bundlewatch-service-store-table-prod \
     --deletion-protection-enabled
   aws dynamodb update-table --table-name bundlewatch-service-store-table-prod \
     --billing-mode PAY_PER_REQUEST
   ```

2. **Stop 0.x deploys.** Disable the CircleCI project of `bundlewatch/service`: its deploy would recreate the old mapping.

3. **Note the mapping** and both API IDs: the 0.x one from the mapping, the new one from `ApiUrl`.

   ```sh
   aws apigatewayv2 get-api-mappings --domain-name service.bundlewatch.io
   ```

4. **Point the mapping at the new API:**

   ```sh
   aws apigatewayv2 update-api-mapping --domain-name service.bundlewatch.io \
     --api-mapping-id <mapping ID> --api-id <new API ID> --stage '$default'
   ```

5. **Check:**
   - `https://service.bundlewatch.io/`
   - an old long link
   - an old `ja2r7.app.goo.gl` link that redirects to `service.bundlewatch.io`
   - the full `/setup-github` flow
   - a real CI run that saves a baseline and gets a short link

To roll back, run the same `update-api-mapping` command with the 0.x API ID.

### Enforcing the stricter write check

The service starts with `WRITE_AUTHORIZATION=report`: saving baselines and creating short links are authorized exactly like 0.x. The stricter check only logs where it would decide differently. Switch to `enforce` only after both of these:

1. **Real tokens behave as expected.** Before the cutover, call `POST /store` on `ApiUrl` with each of these, then read what `enforce` would have decided in the logs:

   | Token                                                                         | Repository           | `enforce` should                                         |
   | ----------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------- |
   | A workflow's `GITHUB_TOKEN` (`contents: read`, `statuses: write`)             | public, then private | allow                                                    |
   | The same token from a fork pull request                                       | public               | allow (a known gap, see [Authorization](#authorization)) |
   | A `repo:status` token from `/setup-github`, as a user with push access        | public, then private | allow                                                    |
   | A classic or fine-grained personal access token of a user without push access | public               | refuse                                                   |

   With `report`, every call is allowed.

2. **Production traffic agrees.** After at least two weeks on service.bundlewatch.io, look for disagreements with CloudWatch Logs Insights on `/bundlewatch/service`:

   ```
   fields @timestamp, @message
   | filter @message like /write-authorization-differs/
   | parse @message '"repo":"*"' as repo
   | parse @message '"token":"*"' as token
   | parse @message '"enforcedVia":"*"' as via
   | stats count() by repo, token, via
   ```

   Every row is a repository that `enforce` would stop saving baselines for. Expect tokens of users without push access. Investigate anything else, especially `installation` tokens, before switching.

To switch, set the `production` variable `WRITE_AUTHORIZATION` to `enforce` and run the Deploy service workflow. To switch back, set it to `report` and deploy again.

### Cleaning up the 0.x stack

Once the new stack has served traffic for a while:

1. Export any 0.x logs you want to keep.
2. Empty the Serverless deployment bucket; CloudFormation can't delete a bucket that still holds objects.

   ```sh
   bucket=$(aws cloudformation describe-stack-resource --stack-name bundlewatch-service-prod \
     --logical-resource-id ServerlessDeploymentBucket \
     --query StackResourceDetail.PhysicalResourceId --output text)
   aws s3 rm "s3://$bucket" --recursive
   ```

3. Delete the stack with CloudFormation, not `serverless remove`, which would also touch the custom domain:

   ```sh
   aws cloudformation delete-stack --stack-name bundlewatch-service-prod
   ```

   The baseline table has `DeletionPolicy: Retain` (checked during the cutover) and deletion protection, so it stays. Confirm it still exists. The custom domain and its Route 53 record were never part of that stack.

4. Delete the AWS access keys CircleCI used, and archive `bundlewatch/service`.

### Updating the Node.js runtime

The runtime appears in three places, which should move together:

- `Runtime` in `template.yaml`
- the build target in `tsdown.config.ts`
- `.nvmrc` at the repository root

Move to the next even-numbered Node.js release once Lambda supports it outside preview.
