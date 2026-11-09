import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWeightForNice,
  calculateDeltaVruntime,
  calculateTimeSlice,
  createInitialSchedulerState,
  pickNextTask,
  stepSchedulerTick,
  addTask,
  NICE_0_LOAD,
} from './cfs';

test('getWeightForNice returns correct Linux kernel weights', () => {
  assert.equal(getWeightForNice(0), 1024);
  assert.equal(getWeightForNice(-20), 88761);
  assert.equal(getWeightForNice(19), 15);
  // Clamping check
  assert.equal(getWeightForNice(-25), 88761);
  assert.equal(getWeightForNice(30), 15);
});

test('calculateDeltaVruntime scales inversely with weight', () => {
  // Nice 0 (weight 1024): delta vruntime equals execution time
  assert.equal(calculateDeltaVruntime(10, NICE_0_LOAD), 10);

  // Nice -5 (weight 3121, higher priority): delta vruntime is smaller (advances slower)
  const weightHigh = getWeightForNice(-5);
  const deltaHigh = calculateDeltaVruntime(10, weightHigh);
  assert.ok(deltaHigh < 10, `Expected deltaHigh < 10 but got ${deltaHigh}`);

  // Nice 10 (weight 110, lower priority): delta vruntime is much higher (advances faster)
  const weightLow = getWeightForNice(10);
  const deltaLow = calculateDeltaVruntime(10, weightLow);
  assert.ok(deltaLow > 10, `Expected deltaLow > 10 but got ${deltaLow}`);
});

test('calculateTimeSlice distributes slices proportional to weight', () => {
  const w1 = getWeightForNice(0); // 1024
  const w2 = getWeightForNice(0); // 1024
  const totalWeight = w1 + w2;

  const slice = calculateTimeSlice(w1, totalWeight, 6);
  assert.equal(slice, 3);
});

test('pickNextTask chooses the task with minimum vruntime', () => {
  const state = createInitialSchedulerState();
  const next = pickNextTask(state.tasks);
  assert.ok(next !== null);
  // In initial tasks, pid 101 has vruntime 10.0, which is the lowest
  assert.equal(next.pid, 101);
  assert.equal(next.vruntime, 10.0);
});

test('stepSchedulerTick advances vruntime and switches tasks', () => {
  const state = createInitialSchedulerState();
  const nextState = stepSchedulerTick(state, 2);

  assert.equal(nextState.tickCount, 1);
  assert.equal(nextState.currentTaskPid, 101);
  const task101 = nextState.tasks.find((t) => t.pid === 101);
  assert.ok(task101);
  assert.equal(task101.state, 'RUNNING');
  assert.ok(task101.vruntime > 10.0);
  assert.equal(nextState.history.length, 1);
});

test('addTask initializes vruntime to min_vruntime to prevent starving', () => {
  const state = createInitialSchedulerState();
  const updated = addTask(state, 'new-worker', 0);
  const added = updated.tasks.find((t) => t.name === 'new-worker');
  assert.ok(added);
  assert.equal(added.vruntime, state.minVruntime);
  assert.equal(added.nice, 0);
});
