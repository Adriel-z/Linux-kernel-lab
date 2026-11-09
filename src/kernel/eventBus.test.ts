import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPrintkTimestamp,
  createKernelLogEvent,
  filterKernelLogs,
  createInitialKernelRingBuffer,
  appendKernelLog,
  generateRandomBackgroundEvent,
} from './eventBus';

test('formatPrintkTimestamp formats to standard 6-decimal dmesg format', () => {
  const ts = formatPrintkTimestamp(0.1249);
  assert.ok(ts.startsWith('['));
  assert.ok(ts.endsWith(']'));
  assert.ok(ts.includes('0.124900'));
});

test('createKernelLogEvent produces formatted printk message', () => {
  const event = createKernelLogEvent(12.345678, 'sched', 'KERN_INFO', 'test context switch');
  assert.equal(event.subsystem, 'sched');
  assert.equal(event.level, 'KERN_INFO');
  assert.ok(event.rawFormatted.includes('sched: test context switch'));
  assert.ok(event.rawFormatted.includes('12.345678'));
});

test('filterKernelLogs filters by subsystem, level, and search text', () => {
  const logs = createInitialKernelRingBuffer();
  assert.ok(logs.length > 5);

  const schedOnly = filterKernelLogs(logs, 'sched', 'all', '');
  for (const log of schedOnly) {
    assert.equal(log.subsystem, 'sched');
  }

  const mmOnly = filterKernelLogs(logs, 'mm', 'all', '');
  for (const log of mmOnly) {
    assert.equal(log.subsystem, 'mm');
  }

  const searchRes = filterKernelLogs(logs, 'all', 'all', 'Completely Fair');
  assert.equal(searchRes.length, 1);
  assert.ok(searchRes[0].message.includes('Completely Fair'));
});

test('appendKernelLog respects circular ring buffer maximum size', () => {
  let ring = createInitialKernelRingBuffer();
  const initialLen = ring.length;

  const newLog = createKernelLogEvent(3.0, 'driver', 'KERN_NOTICE', 'New module inserted');
  ring = appendKernelLog(ring, newLog);
  assert.equal(ring.length, initialLen + 1);

  // Fill beyond 250
  for (let i = 0; i < 300; i++) {
    ring = appendKernelLog(ring, createKernelLogEvent(4.0 + i, 'sched', 'KERN_INFO', `tick ${i}`));
  }
  assert.equal(ring.length, 250);
});

test('generateRandomBackgroundEvent returns valid kernel event', () => {
  const ev = generateRandomBackgroundEvent(10.5);
  assert.ok(ev.uptimeSeconds >= 10.5);
  assert.ok(ev.rawFormatted.length > 0);
  assert.ok(['sched', 'mm', 'vfs', 'net', 'rcu', 'bpf'].includes(ev.subsystem));
});
