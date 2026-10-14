# Spending protection

The independent protection stack combines a configurable account-wide budget,
usage alarms, backend concurrency limits, and a durable shutdown latch.
Billing data is delayed: a budget trigger is not a hard spending ceiling.
Incoming requests, stored data, and protection resources can still incur costs
after backend execution stops.

Keep deployment-specific values in a private operator runbook: notification
recipients, budget and alarm thresholds, resource inventories, rollout status,
and outstanding operational findings. Do not commit production parameter files.

## Ownership and deployment safety

| Owner                     | Responsibility                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `template.yaml`           | Application routes, per-route throttles, and results-table throughput limits                   |
| `infra/protection.yaml`   | Controller, retained state, notifications, budget, alarms, and configured concurrency ceilings |
| `infra/bootstrap.yaml`    | CI state-read access and execution-role restrictions on concurrency changes                    |
| Controller reconciliation | Budget checks, concurrency and API-stage limits, and baseline-table throughput limits          |

The controller is administrator-deployed, separately from application CI.
Reserved concurrency must remain exactly one to serialize its operations.
Shutdown intent and recovery snapshots are persisted before backend mutations.
Reconciliation retries partial operations; configured and remembered targets
remain available if stack discovery fails. Scheduled budget checks provide a
fallback for missed notifications.

CI requires `running` state before deployment. Ordinary application updates
cannot overwrite concurrency. Function or API replacement requires maintenance
planning: update the configured target names, stage inventory, stage ARNs, and
alarm dimensions. Restrict all other deployment paths consistently.

Limits preserve stricter existing settings. Recovery restores saved values
bounded by configured ceilings; it never restores unlimited concurrency.
API throttles are **per-route/method and best-effort**, not an aggregate quota or
an immediate ingress block. Lambda concurrency provides the backend execution
shutoff. Review caller compatibility before retiring endpoints.

## Deploy (administrator)

1. Run the service tests, `node --test packages/service/infra/protection/*.test.mjs`,
   and the repository's CloudFormation checks. Review security-policy findings
   against your deployment requirements and retain the assessment privately.
2. Zip only `index.mjs` and `controller.mjs` from `infra/protection/`. The controller
   uses the Lambda runtime's AWS SDK. Upload with an immutable content-hashed key.
3. Deploy `infra/protection.yaml` with explicit deployment parameters:
   - `CodeBucket`, `CodeKey`, `ServiceStackName`, and `ServiceFunctionName`.
   - `LegacyFunctionName` and `StoreTableName` for the referenced backend/data.
   - `AlertEmail`, `MonthlyBudget`, and `WarningAmount` (below the budget).
   - `ServiceConcurrency`, `LegacyConcurrency`, `InvocationThreshold`, and
     `DurationThreshold`, chosen from workload measurements.
   - `ApiStages`: a JSON array of objects with `type` (`HTTP` or `REST`), `api`,
     `name`, and optional `optional` fields. Supply matching exact `ApiStageArns`.
     HTTP stage ARNs use `/apis/ID/stages/NAME`; REST stage ARNs use
     `/restapis/ID/stages/NAME`, under `arn:aws:apigateway:REGION::`.
     An empty stage inventory protects Lambda only. Mark a stage optional only
     when its absence is acceptable; permission and other errors still alert.
4. Confirm the operational SNS email subscription. Budget email notifications
   are separate. Invoke `{"action":"reconcile"}` and verify state, backend limits,
   stage settings, and table ceilings. Test email delivery using the alert topic.
5. Configure bootstrap's `ProtectionStateTableName` and the GitHub environment
   variable `PROTECTION_STATE_TABLE` to match the protection stack's output.
   Deploy bootstrap and application changes with all existing parameters preserved.
6. Start traffic alarms in notification-only mode for baseline evaluation. Record
   the selected rollout mode privately. Before enabling automatic shutdown, review
   thresholds and existing alarm states: adding an action to an already-active
   alarm does not guarantee a new notification.

Use reviewed CloudFormation change sets for updates and preserve existing
parameter values explicitly. Removing or changing template defaults does not
change deployed stack parameters. For infrastructure-only application updates,
reuse deployed code and preserve configuration, including secrets and commit ID.

Never clear the retained state during an incident or manually raise concurrency
while latched. If creation rolls back with retained resources, recover those
resources through CloudFormation import rather than deleting their state.

## Manual operations

Obtain `ControllerName` from stack outputs. Invoke synchronously with authorized
AWS credentials; inspect both `FunctionError` and the returned JSON.

```json
{"action":"status"}
```

```json
{"action":"trip","reason":"Operator-requested shutdown"}
```

```json
{"action":"restore","confirm":"RESTORE"}
```

Restoration requires a fresh budget read. Above budget, also supply
`acceptSpendUntil` (a numeric ceiling greater than current spend and the budget)
and `budgetMonth` (the current UTC month in `YYYY-MM` format). This explicit
override expires at month rollover; traffic alarms remain effective. There is
no automatic restoration on month rollover or alarm recovery.

`tripped` records durable intent, not proof that every mutation succeeded.
Verify target limits and controller health. Partial restoration stays
`restoring` until reconciliation finishes. Shutdown-start and completion
notifications are separate; notification failure does not erase the latch.

Monitor controller errors, missing invocations, and the failed-event queue.
Exhausted asynchronous events are retained at `FailedEventsQueueUrl`; inspect
and replay unresolved events before retention expires, then delete processed
messages. Avoid repeated failure emails by relying on alarm state transitions.

## Validation

Use isolated resources to verify shutdown and recovery, including:

- Real Budget → encrypted SNS → Lambda delivery with reconciliation disabled.
- Budget-check recovery when notification delivery is disconnected.
- Partial backend failure, discovery failure, and duplicate or delayed events.
- Saved concurrency/stage limits, bounded recovery, and expiring overrides.

Control-plane stage settings alone do not prove immediate request rejection.
Repeat integration checks after SDK, IAM, or notification-policy changes.
Never lower a production budget merely to test shutdown.
