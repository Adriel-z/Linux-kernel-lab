/**
 * Linux Kernel Panic & Oops Event Simulator and Diagnostic Analyzer
 * Generates authentic kernel panic logs, call traces, and troubleshooting metadata
 */

import { KernelLogEvent, createKernelLogEvent } from './eventBus';

export type PanicScenarioType = 'NULL_POINTER_DEREF' | 'SOFT_LOCKUP' | 'OUT_OF_MEMORY';

export interface PanicDiagnostics {
  title: string;
  scenarioType: PanicScenarioType;
  subsystem: string;
  faultingSymbol: string;
  faultingAddress: string;
  cpuId: number;
  pid: number;
  comm: string;
  errorDescription: string;
  troubleshootingSteps: string[];
}

export function generateKernelPanicLogs(
  scenario: PanicScenarioType,
  currentUptime: number
): { logs: KernelLogEvent[]; diagnostics: PanicDiagnostics } {
  const logs: KernelLogEvent[] = [];
  let t = currentUptime;

  if (scenario === 'NULL_POINTER_DEREF') {
    const lines: [number, string][] = [
      [0.000, 'BUG: kernel NULL pointer dereference, address: 0000000000000018'],
      [0.001, '#PF: supervisor read access in kernel mode'],
      [0.002, '#PF: error_code(0x0000) - not-present page'],
      [0.003, 'PGD 0 P4D 0'],
      [0.004, 'Oops: 0000 [#1] PREEMPT SMP NOPTI'],
      [0.005, 'CPU: 2 PID: 1842 Comm: kworker/u8:2 Tainted: G        W         6.11.0-generic #11'],
      [0.006, 'Hardware name: AMD EPYC 7B13 / KVM Virtual Machine, BIOS 1.16.2 04/01/2014'],
      [0.007, 'RIP: 0010:vfs_read+0x42/0x1e0 [kernel]'],
      [0.008, 'Code: 48 89 54 24 08 48 89 74 24 10 48 8b 47 28 48 85 c0 74 1c 48 8b 40 18 <48> 8b 78 18 48 85 ff 74 0c 48 8b 07 48 85 c0 74 05 ff d0 48 89'],
      [0.009, 'RSP: 0018:ffffc90001a43d90 EFLAGS: 00010246'],
      [0.010, 'RAX: 0000000000000000 RBX: ffff888102a40000 RCX: 0000000000000001'],
      [0.011, 'RDX: 0000000000000400 RSI: 00007ffd90a01000 RDI: ffff888104b20000'],
      [0.012, 'RBP: ffffc90001a43dd0 R08: 0000000000000000 R09: 0000000000000000'],
      [0.013, 'R10: 0000000000000000 R11: 0000000000000246 R12: 00007ffd90a01000'],
      [0.014, 'R13: 0000000000000400 R14: 0000000000000003 R15: ffffc90001a43f58'],
      [0.015, 'FS:  0000000000000000(0000) GS:ffff88843fd00000(0000) knlGS:0000000000000000'],
      [0.016, 'CS:  0010 DS: 0000 ES: 0000 CR0: 0000000080050033'],
      [0.017, 'CR2: 0000000000000018 CR3: 0000000102914000 CR4: 0000000000350ef0'],
      [0.018, 'Call Trace:'],
      [0.019, ' <TASK>'],
      [0.020, ' ? __die_body.cold+0x1a/0x20'],
      [0.021, ' ? no_context+0x180/0x3a0'],
      [0.022, ' ? do_page_fault+0x240/0x7c0'],
      [0.023, ' ? async_page_fault+0x34/0x40'],
      [0.024, ' ? vfs_read+0x42/0x1e0 [kernel]'],
      [0.025, ' ksys_read+0x5f/0xe0'],
      [0.026, ' __x64_sys_read+0x1a/0x20'],
      [0.027, ' do_syscall_64+0x5b/0x110'],
      [0.028, ' entry_SYSCALL_64_after_hwframe+0x44/0xa9'],
      [0.029, ' </TASK>'],
      [0.030, 'Kernel panic - not syncing: Fatal exception in interrupt'],
      [0.031, 'Kernel Offset: disabled'],
      [0.032, '---[ end Kernel panic - not syncing: Fatal exception in interrupt ]---'],
    ];

    for (const [dt, msg] of lines) {
      logs.push(createKernelLogEvent(t + dt, 'mm', dt > 0.029 ? 'KERN_EMERG' : 'KERN_ALERT', msg));
    }

    return {
      logs,
      diagnostics: {
        title: 'Kernel Oops: NULL Pointer Dereference (#PF)',
        scenarioType: 'NULL_POINTER_DEREF',
        subsystem: 'VFS / Memory Management',
        faultingSymbol: 'vfs_read+0x42/0x1e0',
        faultingAddress: '0x0000000000000018',
        cpuId: 2,
        pid: 1842,
        comm: 'kworker/u8:2',
        errorDescription:
          'A kernel function attempted to read memory offset 0x18 from a NULL pointer (struct file* or struct file_operations* was 0x0). In Ring 0, accessing unmapped low addresses causes an immediate page fault and Oops.',
        troubleshootingSteps: [
          'Locate assembly instruction: addr2line -e vmlinux vfs_read+0x42 to find source file line in fs/read_write.c.',
          'Verify struct pointer validity: check if fdget_pos(fd) returned a NULL f.file pointer before accessing f.file->f_op.',
          'Inspect CR2 register: CR2 holds the exact faulting linear address (0x0000000000000018). Offset 0x18 matches member f_op in struct file.',
          'Analyze kdump vmcore: load crash vmlinux vmcore and run "bt" (backtrace) and "dis -l vfs_read+0x42".',
        ],
      },
    };
  }

  if (scenario === 'SOFT_LOCKUP') {
    const lines: [number, string][] = [
      [0.000, 'watchdog: BUG: soft lockup - CPU#1 stuck for 26s! [postgres:512]'],
      [0.001, 'Modules linked in: autofs4 xfs ext4 crc32c_generic'],
      [0.002, 'irq event stamp: 14892011'],
      [0.003, 'CPU: 1 PID: 512 Comm: postgres Tainted: G        W         6.11.0-generic'],
      [0.004, 'RIP: 0010:native_queued_spin_lock_slowpath+0x8a/0x220'],
      [0.005, 'RSP: 0018:ffffc900009c3d40 EFLAGS: 00000202'],
      [0.006, 'RAX: 0000000000000101 RBX: ffff888103421100 RCX: 0000000000000000'],
      [0.007, 'Call Trace:'],
      [0.008, ' <TASK>'],
      [0.009, ' queued_spin_lock_slowpath+0x9/0x10'],
      [0.010, ' _raw_spin_lock+0x28/0x40'],
      [0.011, ' cfs_rq_clock_pelt_update+0x18/0x40'],
      [0.012, ' update_load_avg+0x84/0x6b0'],
      [0.013, ' scheduler_tick+0xbb/0x2c0'],
      [0.014, ' </TASK>'],
      [0.015, 'Kernel panic - not syncing: softlockup: hung tasks detected'],
      [0.016, '---[ end Kernel panic - not syncing: softlockup: hung tasks detected ]---'],
    ];

    for (const [dt, msg] of lines) {
      logs.push(createKernelLogEvent(t + dt, 'sched', dt > 0.014 ? 'KERN_EMERG' : 'KERN_ERR', msg));
    }

    return {
      logs,
      diagnostics: {
        title: 'Kernel Panic: CPU Soft Lockup (Spinlock Deadlock)',
        scenarioType: 'SOFT_LOCKUP',
        subsystem: 'CFS Scheduler & Locking',
        faultingSymbol: 'native_queued_spin_lock_slowpath+0x8a',
        faultingAddress: 'ffff888103421100 (&rq->lock)',
        cpuId: 1,
        pid: 512,
        comm: 'postgres',
        errorDescription:
          'CPU#1 was stuck spinning on a queued spinlock for over 20 seconds with interrupts disabled. The kernel watchdog timer detected zero context switches, triggering a soft lockup panic.',
        troubleshootingSteps: [
          'Identify conflicting CPU holding spinlock: inspect other CPU backtraces in vmcore using crash command "mach".',
          'Check lock acquisition ordering: verify whether another thread acquired rq->lock while holding an inverted mutex or disabling IRQs.',
          'Tune watchdog threshold: sysctl kernel.watchdog_thresh=30 or disable panic on softlockup: sysctl kernel.panic_on_softlockup=0.',
          'Enable Lockdep in debug kernel: boot with CONFIG_PROVE_LOCKING=y and CONFIG_LOCKDEP=y to detect recursive spinlock acquisitions.',
        ],
      },
    };
  }

  // OUT_OF_MEMORY scenario
  const lines: [number, string][] = [
    [0.000, 'invoked oom-killer: gfp_mask=0x1100cca(GFP_HIGHUSER_MOVABLE), order=0, oom_score_adj=0'],
    [0.001, 'CPU: 3 PID: 880 Comm: stress-ng Tainted: G        W         6.11.0-generic'],
    [0.002, 'Mem-Info:'],
    [0.003, 'active_anon:3891402 inactive_anon:142010 isolated_anon:0 active_file:1240 inactive_file:1800'],
    [0.004, 'Node 0 DMA: 1*4kB 0*8kB 0*16kB 0*32kB 0*64kB = 4kB'],
    [0.005, 'Node 0 Normal: 2*4kB 0*8kB 0*16kB = 8kB free'],
    [0.006, 'Out of memory: Killed process 880 (stress-ng) total-vm:15840210kB, anon-rss:15421000kB'],
    [0.007, 'Kernel panic - not syncing: Out of memory and no killable processes (panic_on_oom is set)'],
    [0.008, '---[ end Kernel panic - not syncing: Out of memory and no killable processes ]---'],
  ];

  for (const [dt, msg] of lines) {
    logs.push(createKernelLogEvent(t + dt, 'mm', dt > 0.006 ? 'KERN_EMERG' : 'KERN_ALERT', msg));
  }

  return {
    logs,
    diagnostics: {
      title: 'Kernel Panic: Out of Memory (panic_on_oom)',
      scenarioType: 'OUT_OF_MEMORY',
      subsystem: 'Memory Allocator (mm/page_alloc.c)',
      faultingSymbol: 'out_of_memory+0x240/0x520',
      faultingAddress: 'Order 0 page frame exhaustion',
      cpuId: 3,
      pid: 880,
      comm: 'stress-ng',
      errorDescription:
        'All physical RAM zones (DMA, Normal) and swap spaces were completely depleted. Because sysctl vm.panic_on_oom is enabled, the kernel halted execution instead of continuing.',
      troubleshootingSteps: [
        'Check memory pressure metrics: inspect /proc/pressure/memory and /proc/meminfo to see dirty page buildup.',
        'Configure cgroups v2 limits: set memory.max and memory.high on container workloads to throttle runaway allocations.',
        'Disable panic_on_oom: sysctl vm.panic_on_oom=0 to allow OOM-killer to terminate the top score task without halting the node.',
        'Tune swappiness & overcommit: inspect sysctl vm.overcommit_memory and vm.swappiness.',
      ],
    },
  };
}
