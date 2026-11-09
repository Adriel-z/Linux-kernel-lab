import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialResourceSnapshot, sampleNextResourceSnapshot } from './monitor';

test('createInitialResourceSnapshot returns valid Linux system metrics', () => {
  const initial = createInitialResourceSnapshot();
  assert.equal(initial.cores.length, 4);
  assert.equal(initial.memory.totalMb, 16000);
  assert.ok(initial.overallCpuPercent >= 0 && initial.overallCpuPercent <= 100);
  assert.ok(initial.cpuPressure.some10 >= 0);
  assert.ok(initial.memory.pressure.some10 >= 0);
  assert.equal(initial.loadAverage.length, 3);
});

test('sampleNextResourceSnapshot maintains bounds and updates metrics', () => {
  const initial = createInitialResourceSnapshot();
  const next = sampleNextResourceSnapshot(initial);

  assert.ok(next.timestamp >= initial.timestamp);
  assert.ok(next.overallCpuPercent >= 0 && next.overallCpuPercent <= 100);

  // Check cores sum to 100%
  for (const core of next.cores) {
    const total = core.user + core.system + core.idle + core.iowait;
    assert.ok(Math.abs(total - 100) < 0.5, `Core ${core.coreId} sum was ${total}`);
  }

  // Memory bounds check
  assert.ok(next.memory.usedMb > 0);
  assert.ok(next.memory.usedMb <= next.memory.totalMb);
  assert.ok(next.memory.availableMb > 0);
  assert.ok(next.memory.pressure.some10 >= 0);
});
