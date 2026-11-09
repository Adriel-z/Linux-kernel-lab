/**
 * Linux Kernel printk Ring Buffer & Live Event Streamer
 * Simulates the in-kernel log_buf ring buffer and KERN_* log levels
 */

export type KernelLogLevel = 'KERN_EMERG' | 'KERN_ALERT' | 'KERN_CRIT' | 'KERN_ERR' | 'KERN_WARNING' | 'KERN_NOTICE' | 'KERN_INFO' | 'KERN_DEBUG';

export type KernelSubsystemTag = 'sched' | 'mm' | 'syscall' | 'bpf' | 'vfs' | 'net' | 'rcu' | 'driver';

export interface KernelLogEvent {
  id: string;
  uptimeSeconds: number;
  level: KernelLogLevel;
  subsystem: KernelSubsystemTag;
  message: string;
  rawFormatted: string;
}

const MAX_RING_BUFFER_ENTRIES = 250;

export function formatPrintkTimestamp(seconds: number): string {
  return `[${seconds.toFixed(6).padStart(12, ' ')}]`;
}

export function createKernelLogEvent(
  uptimeSeconds: number,
  subsystem: KernelSubsystemTag,
  level: KernelLogLevel,
  message: string
): KernelLogEvent {
  const ts = formatPrintkTimestamp(uptimeSeconds);
  const rawFormatted = `${ts} ${subsystem}: ${message}`;
  return {
    id: `klog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    uptimeSeconds,
    level,
    subsystem,
    message,
    rawFormatted,
  };
}

export function filterKernelLogs(
  logs: KernelLogEvent[],
  subsystemFilter: 'all' | KernelSubsystemTag,
  levelFilter: 'all' | KernelLogLevel,
  searchQuery: string
): KernelLogEvent[] {
  const query = searchQuery.trim().toLowerCase();

  return logs.filter((log) => {
    if (subsystemFilter !== 'all' && log.subsystem !== subsystemFilter) {
      return false;
    }
    if (levelFilter !== 'all' && log.level !== levelFilter) {
      return false;
    }
    if (query && !log.rawFormatted.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });
}

export function createInitialKernelRingBuffer(): KernelLogEvent[] {
  const bootEvents: [number, KernelSubsystemTag, KernelLogLevel, string][] = [
    [0.000000, 'driver', 'KERN_NOTICE', 'Linux version 6.11.0-generic (buildd@lcy02-amd64-001) SMP PREEMPT_DYNAMIC'],
    [0.000010, 'driver', 'KERN_INFO', 'Command line: BOOT_IMAGE=/vmlinuz-6.11.0 root=UUID=7f82b8a0 ro quiet splash'],
    [0.048910, 'mm', 'KERN_INFO', 'Memory: 16384216K/16777216K available (14336K code, 3210K data, 4096K rodata)'],
    [0.082100, 'mm', 'KERN_INFO', 'SLUB: HWalign=64, Order=0-3, MinObjects=0, CPUs=4, Nodes=1'],
    [0.104200, 'rcu', 'KERN_INFO', 'rcu: Preemptible hierarchical RCU implementation.'],
    [0.124900, 'sched', 'KERN_INFO', 'CFS: Completely Fair Scheduler initialized (sched_latency=6.0ms, min_granularity=0.75ms)'],
    [0.284100, 'sched', 'KERN_INFO', 'smp: Brought up 1 node, 4 CPUs (x86_64 AuthenticAMD)'],
    [0.518200, 'vfs', 'KERN_INFO', 'VFS: Mounted root (ext4 filesystem) on device 259:2 readonly'],
    [0.689100, 'net', 'KERN_INFO', 'NET: Registered PF_INET protocol family (IPv4/TCP/UDP)'],
    [0.891200, 'bpf', 'KERN_INFO', 'BPF: JIT compiler is enabled (x86_64 native bytecode acceleration)'],
    [1.104200, 'driver', 'KERN_INFO', 'systemd[1]: Inserted module \'autofs4\''],
    [1.492100, 'sched', 'KERN_INFO', 'sched: CPU#0 rq load balanced (4 tasks, nr_running=4)'],
    [2.108420, 'syscall', 'KERN_INFO', 'entry_SYSCALL_64: sys_call_table initialized with 452 handlers'],
  ];

  return bootEvents.map(([sec, sub, lvl, msg]) => createKernelLogEvent(sec, sub, lvl, msg));
}

// Push to circular ring buffer
export function appendKernelLog(ringBuffer: KernelLogEvent[], newLog: KernelLogEvent): KernelLogEvent[] {
  if (ringBuffer.length >= MAX_RING_BUFFER_ENTRIES) {
    return [...ringBuffer.slice(ringBuffer.length - MAX_RING_BUFFER_ENTRIES + 1), newLog];
  }
  return [...ringBuffer, newLog];
}

// Background event generator pool
const BACKGROUND_EVENT_TEMPLATES: { sub: KernelSubsystemTag; lvl: KernelLogLevel; msg: (sec: number) => string }[] = [
  { sub: 'sched', lvl: 'KERN_INFO', msg: () => `cfs_rq: load balance tick complete on CPU#${Math.floor(Math.random() * 4)} (spread=${(Math.random() * 3).toFixed(2)}ms)` },
  { sub: 'mm', lvl: 'KERN_INFO', msg: () => `kswapd0: zone Normal balanced, ${Math.floor(Math.random() * 64 + 16)} pages scanned` },
  { sub: 'vfs', lvl: 'KERN_DEBUG', msg: () => `dcache: shrink dentry cache hash entries freed: ${Math.floor(Math.random() * 12)}` },
  { sub: 'net', lvl: 'KERN_INFO', msg: () => `tcp: [eth0] connection tracking table synced (${Math.floor(Math.random() * 40 + 10)} active sockets)` },
  { sub: 'rcu', lvl: 'KERN_DEBUG', msg: () => `rcu: grace period completed (seq ${Math.floor(Math.random() * 9000 + 1000)})` },
  { sub: 'bpf', lvl: 'KERN_INFO', msg: () => `bpf: prog id=${Math.floor(Math.random() * 20 + 1)} invoked kprobe hook (execution time: ${Math.floor(Math.random() * 400 + 80)}ns)` },
];

export function generateRandomBackgroundEvent(currentUptime: number): KernelLogEvent {
  const tmpl = BACKGROUND_EVENT_TEMPLATES[Math.floor(Math.random() * BACKGROUND_EVENT_TEMPLATES.length)];
  return createKernelLogEvent(currentUptime, tmpl.sub, tmpl.lvl, tmpl.msg(currentUptime));
}
