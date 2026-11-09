import test from 'node:test';
import assert from 'node:assert/strict';
import { LINUX_SYSCALLS, runSyscallTrace } from './syscalls';

test('LINUX_SYSCALLS contains essential Linux system calls', () => {
  const readSyscall = LINUX_SYSCALLS.find((s) => s.nr === 0);
  assert.ok(readSyscall);
  assert.equal(readSyscall.name, 'read');
  assert.equal(readSyscall.subsystem, 'VFS');

  const mmapSyscall = LINUX_SYSCALLS.find((s) => s.nr === 9);
  assert.ok(mmapSyscall);
  assert.equal(mmapSyscall.name, 'mmap');

  const bpfSyscall = LINUX_SYSCALLS.find((s) => s.nr === 321);
  assert.ok(bpfSyscall);
  assert.equal(bpfSyscall.name, 'bpf');
});

test('runSyscallTrace generates complete 6-stage Ring 3 to Ring 0 transition', () => {
  const readSyscall = LINUX_SYSCALLS.find((s) => s.nr === 0)!;
  const trace = runSyscallTrace(readSyscall, { fd: '3', buf: '0x7ffd892b1000', count: '512' });

  assert.equal(trace.length, 6);
  assert.equal(trace[0].stage, 'RING3_SETUP');
  assert.equal(trace[0].registers['%rax'], '0');
  assert.equal(trace[0].registers['%rdi'], '3');
  assert.equal(trace[0].registers['%rdx'], '512');

  assert.equal(trace[1].stage, 'CPU_TRAP');
  assert.equal(trace[1].ring, 'Ring 0 (Kernel)');

  assert.equal(trace[4].stage, 'KERNEL_EXEC');
  assert.equal(trace[4].registers['return_val'], '512');

  assert.equal(trace[5].stage, 'SYSRET');
  assert.equal(trace[5].ring, 'Ring 3 (User)');
  assert.equal(trace[5].registers['%rax'], '512');
});
