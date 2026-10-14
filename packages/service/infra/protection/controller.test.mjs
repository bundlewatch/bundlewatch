import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createController } from './controller.mjs';

function setup() {
  let state;
  const limits = { current: 30, legacy: 10 };
  const calls = [];
  const io = {
    budget: async () => ({ amount: 5, limit: 20 }),
    configuredTargets: () => [
      { name: 'current', limit: 30 },
      { name: 'legacy', limit: 10 },
    ],
    stages: () => [],
    read: async () => structuredClone(state),
    write: async (value) => {
      state = structuredClone(value);
    },
    targets: async () =>
      Object.keys(limits).map((name) => ({ name, limit: name === 'current' ? 30 : 10 })),
    getConcurrency: async (name) => limits[name],
    setConcurrency: async (name, limit) => {
      assert.ok(state, 'intent must be durable before mutation');
      limits[name] = limit;
      calls.push([name, limit]);
    },
    notify: async () => {},
  };
  const handler = createController(io, { tripTopicArn: 'trip', now: () => '2026-10-15T00:00:00Z' });
  return { io, handler, limits, calls, state: () => state };
}

test('duplicate trips and reconciliation preserve the original recovery settings', async () => {
  const f = setup();
  await f.handler({ action: 'trip' });
  await f.handler({ action: 'trip' });
  await f.handler({ action: 'reconcile' });
  assert.deepEqual(f.state().saved, { current: 30, legacy: 10 });
  assert.deepEqual(f.limits, { current: 0, legacy: 0 });
  await assert.rejects(f.handler({ action: 'restore' }), /RESTORE/);
  await f.handler({ action: 'restore', confirm: 'RESTORE' });
  assert.deepEqual(f.limits, { current: 30, legacy: 10 });
  assert.equal(f.state().status, 'running');
});

test('one failing backend does not prevent shutting down the other; retry completes', async () => {
  const f = setup();
  const set = f.io.setConcurrency;
  f.io.setConcurrency = async (name, limit) => {
    if (name === 'current') throw new Error('temporary failure');
    return set(name, limit);
  };
  await assert.rejects(f.handler({ action: 'trip' }), /temporary failure/);
  assert.equal(f.limits.legacy, 0);
  assert.equal(f.state().status, 'tripped');
  f.io.setConcurrency = set;
  await f.handler({ action: 'reconcile' });
  assert.equal(f.limits.current, 0);
  assert.deepEqual(f.state().saved, { current: 30, legacy: 10 });
});

test('no concurrency mutation when saving the shutdown intent fails', async () => {
  const f = setup();
  f.io.write = async () => {
    throw new Error('storage unavailable');
  };
  await assert.rejects(f.handler({ action: 'trip' }), /storage unavailable/);
  assert.deepEqual(f.calls, []);
});

test('delayed notifications from before manual recovery do not trip again', async () => {
  const f = setup();
  await f.handler({ action: 'trip' });
  await f.handler({ action: 'restore', confirm: 'RESTORE' });
  await f.handler({ Records: [{ Sns: { TopicArn: 'trip', Timestamp: '2026-10-14T23:00:00Z' } }] });
  assert.equal(f.state().status, 'running');
  await assert.rejects(f.handler({ Records: [{ Sns: { TopicArn: 'untrusted' } }] }), /source/);
});

test('new/replaced functions are also disabled while latched', async () => {
  const f = setup();
  await f.handler({ action: 'trip' });
  f.limits.replacement = undefined;
  await f.handler({ action: 'reconcile' });
  assert.equal(f.limits.replacement, 0);
  assert.equal(f.state().saved.replacement, null);
});

test('partial restoration remains durable and is completed by reconciliation', async () => {
  const f = setup();
  await f.handler({ action: 'trip' });
  const set = f.io.setConcurrency;
  f.io.setConcurrency = async (name, limit) => {
    if (name === 'legacy') throw new Error('retry');
    return set(name, limit);
  };
  await assert.rejects(f.handler({ action: 'restore', confirm: 'RESTORE' }), /retry/);
  assert.equal(f.state().status, 'restoring');
  f.io.setConcurrency = set;
  await f.handler({ action: 'reconcile' });
  assert.equal(f.state().status, 'running');
});

test('initialization failures do not advertise running protection to deployments', async () => {
  const f = setup();
  f.io.limitStore = async () => {
    throw new Error('database unavailable');
  };
  await assert.rejects(f.handler({ action: 'reconcile' }), /database unavailable/);
  assert.equal(f.state().status, 'initializing');
  f.io.limitStore = async () => {};
  await f.handler({ action: 'reconcile' });
  assert.equal(f.state().status, 'running');
});

test('normal reconciliation never re-enables an already disabled backend', async () => {
  const f = setup();
  f.limits.legacy = 0;
  await f.handler({ action: 'reconcile' });
  assert.equal(f.limits.legacy, 0);
  await f.handler({ action: 'trip' });
  await f.handler({ action: 'restore', confirm: 'RESTORE' });
  await f.handler({ action: 'reconcile' });
  assert.equal(f.limits.legacy, 0);
});

test('scheduled budget checks recover a lost notification and require an explicit bounded override', async () => {
  const f = setup();
  f.io.budget = async () => ({ amount: 21, limit: 20 });
  await f.handler({ action: 'reconcile' });
  assert.equal(f.state().status, 'tripped');
  assert.deepEqual(f.limits, { current: 0, legacy: 0 });
  await assert.rejects(f.handler({ action: 'restore', confirm: 'RESTORE' }), /acknowledge/);
  await f.handler({
    action: 'restore',
    confirm: 'RESTORE',
    acceptSpendUntil: 25,
    budgetMonth: '2026-10',
  });
  await f.handler({ Records: [{ Sns: { TopicArn: 'trip', Timestamp: '2026-10-15T01:00:00Z' } }] });
  assert.equal(f.state().status, 'running');
  f.io.budget = async () => ({ amount: 26, limit: 20 });
  await f.handler({ action: 'reconcile' });
  assert.equal(f.state().status, 'tripped');
});

test('traffic alarms still trip while a budget override is active', async () => {
  const f = setup();
  await f.handler({ action: 'trip' });
  await f.handler({
    action: 'restore',
    confirm: 'RESTORE',
    acceptSpendUntil: 25,
    budgetMonth: '2026-10',
  });
  await f.handler({
    Records: [
      {
        Sns: {
          TopicArn: 'trip',
          Timestamp: '2026-10-15T01:00:00Z',
          Message: JSON.stringify({ AlarmName: 'traffic', NewStateValue: 'ALARM' }),
        },
      },
    ],
  });
  assert.equal(f.state().status, 'tripped');
});

test('discovery failure still shuts down configured and previously discovered backends', async () => {
  const f = setup();
  f.limits.replacement = 5;
  await f.handler({ action: 'reconcile' });
  f.io.targets = async () => {
    throw new Error('CloudFormation unavailable');
  };
  await assert.rejects(f.handler({ action: 'trip' }), /CloudFormation unavailable/);
  assert.deepEqual(f.limits, { current: 0, legacy: 0, replacement: 0 });
});

test('billing failure cannot prevent explicit shutdown but prevents restoration', async () => {
  const f = setup();
  f.io.budget = async () => {
    throw new Error('billing unavailable');
  };
  await f.handler({ action: 'trip' });
  await f.handler({ action: 'reconcile' });
  await assert.rejects(f.handler({ action: 'restore', confirm: 'RESTORE' }), /billing unavailable/);
  assert.deepEqual(f.limits, { current: 0, legacy: 0 });
});

test('shutdown initiation is notified once even when a backend fails repeatedly', async () => {
  const f = setup();
  const notifications = [];
  f.io.notify = async (subject) => notifications.push(subject);
  f.io.setConcurrency = async () => {
    throw new Error('unavailable');
  };
  await assert.rejects(f.handler({ action: 'trip' }), /unavailable/);
  await assert.rejects(f.handler({ action: 'reconcile' }), /unavailable/);
  assert.deepEqual(notifications, ['BundleWatch shutdown initiated']);
});

test('API stages are snapshotted, zeroed, retried and restored to bounded previous limits', async () => {
  const f = setup();
  let settings = {
    defaults: { rate: 10000, burst: 5000 },
    routes: { 'POST /write': { rate: 2, burst: 20 } },
  };
  f.io.stages = () => [{ key: 'HTTP:api:$default', rate: 10, burst: 50 }];
  f.io.getStage = async () => structuredClone(settings);
  f.io.setStage = async (_stage, value) => {
    assert.ok(f.state().savedStages['HTTP:api:$default']);
    settings = structuredClone(value);
  };
  await f.handler({ action: 'trip' });
  assert.deepEqual(settings, {
    defaults: { rate: 0, burst: 0 },
    routes: { 'POST /write': { rate: 0, burst: 0 } },
  });
  await f.handler({ action: 'reconcile' });
  assert.equal(f.state().savedStages['HTTP:api:$default'].defaults.rate, 10000);
  await f.handler({ action: 'restore', confirm: 'RESTORE' });
  assert.deepEqual(settings, {
    defaults: { rate: 10, burst: 50 },
    routes: { 'POST /write': { rate: 2, burst: 20 } },
  });
});

test('a failed budget check during partial recovery never resumes another backend', async () => {
  const f = setup();
  await f.handler({ action: 'trip' });
  const set = f.io.setConcurrency;
  f.io.setConcurrency = async () => {
    throw new Error('retry');
  };
  await assert.rejects(f.handler({ action: 'restore', confirm: 'RESTORE' }), /retry/);
  f.io.setConcurrency = set;
  f.io.budget = async () => {
    throw new Error('billing unavailable');
  };
  await assert.rejects(f.handler({ action: 'reconcile' }), /billing unavailable/);
  assert.deepEqual(f.limits, { current: 0, legacy: 0 });
});

test('budget overrides expire at UTC month rollover without automatically restoring a latch', async () => {
  const f = setup();
  let date = '2026-10-31T23:00:00Z';
  const handler = createController(f.io, { tripTopicArn: 'trip', now: () => date });
  f.io.budget = async () => ({ amount: 21, limit: 20 });
  await handler({ action: 'reconcile' });
  await handler({
    action: 'restore',
    confirm: 'RESTORE',
    acceptSpendUntil: 25,
    budgetMonth: '2026-10',
  });
  date = '2026-11-01T01:00:00Z';
  await handler({ action: 'reconcile' });
  assert.equal(f.state().status, 'tripped');
  f.io.budget = async () => ({ amount: 0, limit: 20 });
  await handler({ action: 'reconcile' });
  assert.equal(f.state().status, 'tripped');
});
