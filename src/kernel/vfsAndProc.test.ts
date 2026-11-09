import test from 'node:test';
import assert from 'node:assert/strict';
import { executeKernelShellCommand, VFS_ROOT, DMESG_RING_BUFFER } from './vfsAndProc';

test('VFS_ROOT includes canonical Linux kernel /proc files', () => {
  assert.ok(VFS_ROOT['/proc/cpuinfo']);
  assert.ok(VFS_ROOT['/proc/meminfo']);
  assert.ok(VFS_ROOT['/proc/version']);
  assert.ok(VFS_ROOT['/proc/sched_debug']);
  assert.ok(VFS_ROOT['/proc/slabinfo']);
  assert.ok(VFS_ROOT['/proc/meminfo'].content?.includes('MemTotal'));
});

test('DMESG_RING_BUFFER contains realistic boot timestamps and kernel subsystems', () => {
  assert.ok(DMESG_RING_BUFFER.length > 10);
  assert.ok(DMESG_RING_BUFFER[0].includes('Linux version'));
  assert.ok(DMESG_RING_BUFFER.some((line) => line.includes('CFS: Completely Fair Scheduler')));
});

test('executeKernelShellCommand handles uname, cat, free, and help', () => {
  const unameRes = executeKernelShellCommand('uname -a');
  assert.equal(unameRes.exitCode, 0);
  assert.ok(unameRes.stdout.includes('6.11.0-generic'));

  const catRes = executeKernelShellCommand('cat /proc/version');
  assert.equal(catRes.exitCode, 0);
  assert.ok(catRes.stdout.includes('Linux version 6.11.0'));

  const freeRes = executeKernelShellCommand('free -m');
  assert.equal(freeRes.exitCode, 0);
  assert.ok(freeRes.stdout.includes('Mem:'));

  const helpRes = executeKernelShellCommand('help');
  assert.equal(helpRes.exitCode, 0);
  assert.ok(helpRes.stdout.includes('dmesg'));

  const invalidRes = executeKernelShellCommand('nonexistentcmd');
  assert.equal(invalidRes.exitCode, 127);
  assert.ok(invalidRes.stderr?.includes('command not found'));
});
