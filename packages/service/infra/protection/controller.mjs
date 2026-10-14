// Reserved concurrency must be 1: intent and snapshots precede mutations.
/* eslint-disable no-await-in-loop -- Persist each snapshot before its mutation. */
export function createController(io, { tripTopicArn, now = () => new Date().toISOString() }) {
  return async function handler(event) {
    let state = await io.read();
    let action = event.action;
    let reason = event.reason ?? 'Operator request';
    if (event.Records) {
      const messages = event.Records.map((record) => record.Sns);
      if (messages.some((message) => message?.TopicArn !== tripTopicArn)) {
        throw new Error('Unexpected notification source');
      }
      if (messages.some((message) => !Number.isFinite(Date.parse(message.Timestamp)))) {
        throw new Error('Invalid notification timestamp');
      }
      const cutoff = state?.restoreRequestedAt ?? state?.restoredAt;
      const fresh = messages.filter(
        (message) => !cutoff || Date.parse(message.Timestamp) > Date.parse(cutoff),
      );
      if (!fresh.length) return state;
      // Budget notices are hints to check actual spend, respecting an explicitly
      // acknowledged ceiling. Traffic alarms must still trip during an override.
      const traffic = fresh.some((message) => {
        try {
          const alarm = JSON.parse(message.Message);
          return typeof alarm.AlarmName === 'string' && alarm.NewStateValue === 'ALARM';
        } catch {
          return false;
        }
      });
      action = traffic ? 'trip' : 'reconcile';
      reason = traffic ? 'Traffic alarm' : 'Budget notification';
    }
    if (!['reconcile', 'trip', 'restore', 'status'].includes(action)) {
      throw new Error('Expected reconcile, trip, restore, or status');
    }
    if (action === 'status') return state ?? { status: 'uninitialized' };
    if (action === 'restore' && event.confirm !== 'RESTORE') {
      throw new Error('Manual restoration requires confirm: RESTORE');
    }
    if (!state) {
      state = { status: 'initializing', saved: {} };
      await io.write(state);
    }
    const failures = [];
    // A lost SNS delivery is recovered by the next scheduled spend check.
    // Never let a billing API outage delay an already requested shutdown.
    if (action === 'restore' || (action !== 'trip' && state.status !== 'tripped')) {
      try {
        const budget = await io.budget();
        if (
          ![budget.amount, budget.limit].every(Number.isFinite) ||
          budget.limit <= 0 ||
          budget.amount < 0
        ) {
          throw new Error('Invalid budget response');
        }
        const month = now().slice(0, 7);
        if (action === 'restore') {
          let override;
          if (event.acceptSpendUntil !== undefined) {
            if (
              !Number.isFinite(event.acceptSpendUntil) ||
              event.acceptSpendUntil <= Math.max(budget.amount, budget.limit) ||
              event.budgetMonth !== month
            ) {
              throw new Error(
                'acceptSpendUntil must exceed current spend and budget; budgetMonth must be the current UTC month',
              );
            }
            override = { month, limit: event.acceptSpendUntil };
          }
          if (budget.amount > budget.limit && !override) {
            throw new Error(
              'Over budget: explicitly acknowledge a higher ceiling with acceptSpendUntil and budgetMonth',
            );
          }
          state.budgetOverride = override;
        }
        const limit =
          state.budgetOverride?.month === month ? state.budgetOverride.limit : budget.limit;
        if (budget.amount > limit) {
          action = 'trip';
          reason = `Budget spend ${budget.amount} USD exceeds ${limit} USD (${month})`;
        }
      } catch (error) {
        if (action === 'restore' || state.status === 'restoring') throw error; // Never resume without a fresh budget check.
        failures.push(`Budget check: ${error.message}`);
      }
    }
    if (action === 'trip' && state.status !== 'tripped') {
      state = {
        ...state,
        status: 'tripped',
        reason,
        trippedAt: now(),
        initiatedNotified: false,
        notified: false,
      };
      await io.write(state);
    }
    if (action === 'restore' && ['tripped', 'restoring'].includes(state.status)) {
      state = {
        ...state,
        status: 'restoring',
        restoreRequestedAt: state.status === 'restoring' ? state.restoreRequestedAt : now(),
        notified: false,
      };
      await io.write(state);
    }
    if (state.status === 'tripped' && state.initiatedNotified !== true) {
      try {
        await io.notify(
          'BundleWatch shutdown initiated',
          JSON.stringify({ reason: state.reason, trippedAt: state.trippedAt }),
        );
        state.initiatedNotified = true;
        await io.write(state);
      } catch (error) {
        failures.push(`Shutdown notification: ${error.message}`);
      }
    }

    // Static fallbacks, remembered replacements and saved snapshots survive
    // CloudFormation outages. Discovery failure never prevents trying legacy.
    const targets = new Map(
      (state.lastKnownTargets ?? []).map((target) => [target.name, { ...target, optional: true }]),
    );
    for (const target of io.configuredTargets()) targets.set(target.name, target);
    try {
      const discovered = await io.targets();
      if (!discovered.length) throw new Error('ServiceFunction missing from service stack');
      for (const target of discovered) targets.set(target.name, target);
    } catch (error) {
      failures.push(`Discovery: ${error.message}`);
    }
    for (const name of Object.keys(state.saved)) {
      if (!targets.has(name)) targets.set(name, { name, limit: 1, optional: true });
    }
    const known = [...targets.values()];
    if (!known.length) failures.push('No service functions configured');
    if (JSON.stringify(state.lastKnownTargets) !== JSON.stringify(known)) {
      state.lastKnownTargets = known;
      await io.write(state);
    }
    for (const { name, limit, optional } of known) {
      try {
        const current = await io.getConcurrency(name);
        if (state.status === 'tripped') {
          if (!Object.hasOwn(state.saved, name)) {
            state.saved[name] = current ?? null;
            await io.write(state);
          }
          if (current !== 0) await io.setConcurrency(name, 0);
        } else if (state.status === 'restoring') {
          const desired = state.saved[name] == null ? limit : Math.min(state.saved[name], limit);
          if (current !== desired) await io.setConcurrency(name, desired);
        } else if (current === undefined || current > limit) {
          await io.setConcurrency(name, limit);
        }
      } catch (error) {
        if (optional && error.name === 'ResourceNotFoundException') continue;
        failures.push(`${name}: ${error.name}: ${error.message}`);
      }
    }
    for (const stage of io.stages()) {
      try {
        const current = await io.getStage(stage);
        state.savedStages ??= {};
        if (state.status === 'tripped' && !Object.hasOwn(state.savedStages, stage.key)) {
          state.savedStages[stage.key] = current;
          await io.write(state);
        }
        const source =
          state.status === 'restoring' ? (state.savedStages[stage.key] ?? current) : current;
        const desired = capStage(source, stage, state.status === 'tripped');
        if (JSON.stringify(current) !== JSON.stringify(desired)) await io.setStage(stage, desired);
      } catch (error) {
        if (stage.optional && error.name === 'NotFoundException') continue;
        failures.push(`${stage.key}: ${error.message}`);
      }
    }
    if (['running', 'initializing'].includes(state.status) && io.limitStore) {
      try {
        await io.limitStore();
      } catch (error) {
        failures.push(`Store limit: ${error.message}`);
      }
    }
    if (failures.length) throw new Error(failures.join('\n'));
    if (state.status === 'initializing') {
      state.status = 'running';
      await io.write(state);
    }
    if (state.status === 'restoring') {
      state = {
        status: 'running',
        saved: {},
        savedStages: {},
        lastKnownTargets: known,
        budgetOverride: state.budgetOverride,
        restoreRequestedAt: state.restoreRequestedAt,
        restoredAt: now(),
        notified: false,
      };
      await io.write(state);
    }
    if (state.notified === false) {
      await io.notify(
        `BundleWatch ${state.status === 'tripped' ? 'shutdown applied' : state.status}`,
        JSON.stringify(state, null, 2),
      );
      state.notified = true;
      await io.write(state);
    }
    return state;
  };
}

export function capStage(settings, stage, tripped) {
  const cap = (value) => ({
    rate: tripped ? 0 : Math.min(value.rate ?? stage.rate, stage.rate),
    burst: tripped ? 0 : Math.min(value.burst ?? stage.burst, stage.burst),
  });
  return {
    defaults: cap(settings.defaults),
    routes: Object.fromEntries(
      Object.entries(settings.routes).map(([key, value]) => [key, cap(value)]),
    ),
  };
}
