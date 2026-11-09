import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKernelPanicLogs } from './panicSimulator';

test('generateKernelPanicLogs for NULL_POINTER_DEREF outputs realistic call trace and registers', () => {
  const result = generateKernelPanicLogs('NULL_POINTER_DEREF', 14.5);
  assert.ok(result.logs.length > 20);

  const bugLog = result.logs.find((l) => l.message.includes('kernel NULL pointer dereference'));
  assert.ok(bugLog);
  assert.equal(bugLog.level, 'KERN_ALERT');

  const panicLog = result.logs.find((l) => l.message.includes('Kernel panic - not syncing'));
  assert.ok(panicLog);
  assert.equal(panicLog.level, 'KERN_EMERG');

  assert.equal(result.diagnostics.scenarioType, 'NULL_POINTER_DEREF');
  assert.equal(result.diagnostics.faultingSymbol, 'vfs_read+0x42/0x1e0');
  assert.equal(result.diagnostics.faultingAddress, '0x0000000000000018');
  assert.ok(result.diagnostics.troubleshootingSteps.length >= 3);
});

test('generateKernelPanicLogs for SOFT_LOCKUP generates watchdog hang traces', () => {
  const result = generateKernelPanicLogs('SOFT_LOCKUP', 22.0);
  assert.ok(result.logs.some((l) => l.message.includes('soft lockup - CPU#1 stuck')));
  assert.equal(result.diagnostics.scenarioType, 'SOFT_LOCKUP');
  assert.ok(result.diagnostics.troubleshootingSteps.some((step) => step.includes('CONFIG_LOCKDEP')));
});

test('generateKernelPanicLogs for OUT_OF_MEMORY outputs OOM panic sequence', () => {
  const result = generateKernelPanicLogs('OUT_OF_MEMORY', 30.0);
  assert.ok(result.logs.some((l) => l.message.includes('invoked oom-killer')));
  assert.ok(result.logs.some((l) => l.message.includes('panic_on_oom is set')));
  assert.equal(result.diagnostics.scenarioType, 'OUT_OF_MEMORY');
});
