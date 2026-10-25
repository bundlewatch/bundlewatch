# Request logs

The service emits one JSON `request-completed` event at INFO level for each
repository API request whose parsed body supplies `repoOwner` and `repoName`.
It includes `repo` (bounded to 256 characters), `method`, `route`, HTTP `status`,
`durationMs`, `authorized`, and `requestId`. API Gateway's request ID is used on
Lambda; other callers receive a generated correlation ID. Authorization warnings
and errors share that ID. Custom loggers must implement `info` to receive outcomes.

`authorized` means the configured repository-access check passed, not that the
whole request succeeded. For example, an authorized baseline lookup can return 404. Repository names on unauthorized requests are client claims, not verified
usage. Count only `request-completed` events for request volume: warnings are
additional diagnostic events for the same request.

Failed GitHub HTTP operations and transport failures are collected in `github`
(at most eight entries), with `operation`, `access`, and either upstream `status`
or `failure` (`timeout`/`network`) plus a transport `causeCode` when available.
These include intermediate failures recovered by fallback and the report-mode
strict check; they do not necessarily mean the final request failed. A permissions
denial following HTTP 200 still uses the existing `not-allowed` warning's `via`.
No tokens, headers, query strings, bodies, or raw transport exception messages
are included in these new events.

Coverage starts when this version is deployed. These logs do not identify clients
of page/static routes, `/capabilities`, malformed/oversized JSON, requests missing
repository identifiers, or requests rejected before reaching the application.
They measure requests, not unique people or builds. Handled HTTP 401/503 responses
do not increment Lambda's `Errors` metric.

## CloudWatch Logs Insights

Select `/bundlewatch/service` and **Last 7 days** in the time picker.

Repositories that passed authorization (remove the authorization filter to include attempts):

```text
filter event = "request-completed" and authorized = true
| stats count(*) as requests, max(@timestamp) as lastSeen by repo
| sort requests desc
| limit 10000
```

Request outcomes by repository:

```text
filter event = "request-completed"
| stats count(*) as requests by repo, route, status, authorized
| sort requests desc
| limit 10000
```

GitHub HTTP failures during requests ultimately rejected with 401/503 (counts
upstream operations, which can exceed the request count). The JSON extraction
also handles Lambda's text prefix before the JSON message:

```text
filter event = "request-completed" and status in [401, 503]
| parse @message /(?<payload>\{.*\})/
| fields jsonParse(payload) as entry
| unnest entry.github into upstream
| filter ispresent(upstream.status)
| stats count(*) as failures by repo, upstream.operation, upstream.access, upstream.status
| sort failures desc
```

For transport failures, replace `ispresent(upstream.status)` with
`ispresent(upstream.failure)` and group by `upstream.failure` and
`upstream.causeCode` instead. GitHub 401 generally indicates invalid credentials;
403/404 alone cannot distinguish missing permissions from a hidden or missing
repository/commit. Use the operation and workflow context as well.
