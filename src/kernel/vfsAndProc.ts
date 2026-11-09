/**
 * VFS, procfs, sysfs emulation and Linux diagnostic shell engine
 */

export interface VirtualFile {
  path: string;
  isDir: boolean;
  content?: string;
  size?: number;
  permissions: string;
  owner: string;
}

export const VFS_ROOT: Record<string, VirtualFile> = {
  '/': { path: '/', isDir: true, permissions: 'drwxr-xr-x', owner: 'root:root' },
  '/proc': { path: '/proc', isDir: true, permissions: 'dr-xr-xr-x', owner: 'root:root' },
  '/sys': { path: '/sys', isDir: true, permissions: 'drwxr-xr-x', owner: 'root:root' },
  '/etc': { path: '/etc', isDir: true, permissions: 'drwxr-xr-x', owner: 'root:root' },
  '/dev': { path: '/dev', isDir: true, permissions: 'drwxr-xr-x', owner: 'root:root' },
  '/var': { path: '/var', isDir: true, permissions: 'drwxr-xr-x', owner: 'root:root' },

  '/proc/version': {
    path: '/proc/version',
    isDir: false,
    permissions: '-r--r--r--',
    owner: 'root:root',
    content: `Linux version 6.11.0-generic (buildd@lcy02-amd64-001) (gcc (Ubuntu 13.2.0-23ubuntu4) 13.2.0, GNU ld 2.42) #11-Ubuntu SMP PREEMPT_DYNAMIC Wed Oct 23 15:42:19 UTC 2024`,
  },

  '/proc/cpuinfo': {
    path: '/proc/cpuinfo',
    isDir: false,
    permissions: '-r--r--r--',
    owner: 'root:root',
    content: `processor\t: 0
vendor_id\t: AuthenticAMD
cpu family\t: 25
model\t\t: 1
model name\t: AMD EPYC 7B13 64-Core Processor
stepping\t: 1
cpu MHz\t\t: 2445.404
cache size\t: 512 KB
physical id\t: 0
siblings\t: 4
core id\t\t: 0
cpu cores\t: 4
flags\t\t: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ht syscall nx mmxext fxsr_opt pdpe1gb rdtscp lm constant_tsc rep_good nopl nonstop_tsc cpuid extd_apicid tsc_known_freq pni pclmulqdq ssse3 fma cx16 sse4_1 sse4_2 x2apic movbe popcnt aes xsave avx f16c rdrand hypervisor lahf_lm cmp_legacy cr8_legacy abm sse4a misalignsse 3dnowprefetch osvw topoext ssbd ibrs ibpb stibp vmmcall fsgsbase bmi1 avx2 smep bmi2 erms invpcid rdseed adx smap clflushopt clwb sha_ni xsaveopt xsavec xgetbv1 xsaves clzero xsaveerptr arat umip vaes vpclmulqdq rdpid
bogomips\t: 4890.80
TLB size\t: 2560 4K pages
clflush size\t: 64
cache_alignment\t: 64
address sizes\t: 48 bits physical, 48 bits virtual`,
  },

  '/proc/meminfo': {
    path: '/proc/meminfo',
    isDir: false,
    permissions: '-r--r--r--',
    owner: 'root:root',
    content: `MemTotal:       16384216 kB
MemFree:         8421092 kB
MemAvailable:   12948120 kB
Buffers:          341208 kB
Cached:          4512984 kB
SwapCached:            0 kB
Active:          4128912 kB
Inactive:        2981024 kB
Active(anon):    2281900 kB
Inactive(anon):   129840 kB
Active(file):    1847012 kB
Inactive(file):  2851184 kB
Unevictable:           0 kB
Mlocked:               0 kB
SwapTotal:       4194300 kB
SwapFree:        4194300 kB
Dirty:                64 kB
Writeback:             0 kB
AnonPages:       2258412 kB
Mapped:           412096 kB
Shmem:            153328 kB
KReclaimable:     384102 kB
Slab:             512400 kB
SReclaimable:     384102 kB
SUnreclaim:       128298 kB
KernelStack:       18920 kB
PageTables:        42108 kB
SecPageTables:         0 kB
NFS_Unstable:          0 kB
Bounce:                0 kB
WritebackTmp:          0 kB
CommitLimit:    12386408 kB
Committed_AS:    7891204 kB
VmallocTotal:   34359738367 kB
VmallocUsed:       48912 kB
VmallocChunk:          0 kB
Percpu:             8960 kB
DirectMap4k:      212892 kB
DirectMap2M:     6078464 kB
DirectMap1G:    10485760 kB`,
  },

  '/proc/sched_debug': {
    path: '/proc/sched_debug',
    isDir: false,
    permissions: '-r--r--r--',
    owner: 'root:root',
    content: `Sched Debug, Linux 6.11.0-generic
ktime                                   : 14829104.921841
sched_clk                               : 14829105.109823
cpu_clk                                 : 14829105.109823
sysctl_sched_latency                    : 6.000000 ms
sysctl_sched_min_granularity            : 0.750000 ms
sysctl_sched_wakeup_granularity         : 1.000000 ms

cpu#0, nr_running: 4
  .cfs_rq[0]:
  .cfs_rq[0]->exec_clock                : 129410.821948
  .cfs_rq[0]->min_vruntime              : 129380.129411
  .cfs_rq[0]->load                      : 4096
  .cfs_rq[0]->nr_running                : 4
  .cfs_rq[0]->h_nr_running              : 4
  .cfs_rq[0]->leftmost                  : task 101 (kworker/0:1)
  .cfs_rq[0]->spread                    : 4.829102 ms`,
  },

  '/proc/slabinfo': {
    path: '/proc/slabinfo',
    isDir: false,
    permissions: '-r--r--r--',
    owner: 'root:root',
    content: `slabinfo - version: 2.1
# name            <active_objs> <num_objs> <objsize> <objperslab> <pagesperslab> : tunables <limit> <batchcount> <sharedfactor> : slabdata <active_slabs> <num_slabs> <sharedavail>
kmalloc-32               4210       4210         32          128              1 : tunables    0    0    0 : slabdata     33     33      0
kmalloc-64               8192       8192         64           64              1 : tunables    0    0    0 : slabdata    128    128      0
kmalloc-128              3072       3072        128           32              1 : tunables    0    0    0 : slabdata     96     96      0
kmalloc-512              1024       1024        512            8              1 : tunables    0    0    0 : slabdata    128    128      0
task_struct               142        144       5952            4              6 : tunables    0    0    0 : slabdata     36     36      0
mm_struct                  88         96       1088            7              2 : tunables    0    0    0 : slabdata     14     14      0
dentry                  48120      48120        192           21              1 : tunables    0    0    0 : slabdata   2291   2291      0
inode_cache             21400      21400        608           13              2 : tunables    0    0    0 : slabdata   1646   1646      0
skbuff_head_cache        2048       2048        256           16              1 : tunables    0    0    0 : slabdata    128    128      0`,
  },

  '/proc/sys/kernel/osrelease': {
    path: '/proc/sys/kernel/osrelease',
    isDir: false,
    permissions: '-r--r--r--',
    owner: 'root:root',
    content: '6.11.0-generic\n',
  },

  '/proc/sys/vm/swappiness': {
    path: '/proc/sys/vm/swappiness',
    isDir: false,
    permissions: '-rw-r--r--',
    owner: 'root:root',
    content: '60\n',
  },

  '/proc/sys/kernel/sched_latency_ns': {
    path: '/proc/sys/kernel/sched_latency_ns',
    isDir: false,
    permissions: '-rw-r--r--',
    owner: 'root:root',
    content: '6000000\n',
  },
};

export const DMESG_RING_BUFFER: string[] = [
  '[    0.000000] Linux version 6.11.0-generic (buildd@lcy02-amd64-001) (gcc 13.2.0) #11-Ubuntu SMP PREEMPT_DYNAMIC',
  '[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-6.11.0-generic root=UUID=7f82b8a0 ro quiet splash vt.handoff=7',
  '[    0.000000] x86/fpu: Supporting XSAVE feature 0x001: \'x87 floating point registers\'',
  '[    0.000000] x86/fpu: Supporting XSAVE feature 0x002: \'SSE registers\'',
  '[    0.000000] x86/fpu: Supporting XSAVE feature 0x004: \'AVX registers\'',
  '[    0.000000] BIOS-provided physical RAM map:',
  '[    0.000000] BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable',
  '[    0.000000] BIOS-e820: [mem 0x0000000000100000-0x000000007ffeffff] usable',
  '[    0.000000] BIOS-e820: [mem 0x0000000100000000-0x000000047fffffff] usable',
  '[    0.002812] Zone ranges:',
  '[    0.002813]   DMA      [mem 0x0000000000001000-0x0000000000ffffff]',
  '[    0.002814]   DMA32    [mem 0x0000000001000000-0x00000000ffffffff]',
  '[    0.002815]   Normal   [mem 0x0000000100000000-0x000000047fffffff]',
  '[    0.004910] smpboot: Allowing 4 CPUs, 0 hotplug CPUs',
  '[    0.012480] setup_percpu: NR_CPUS:4 nr_cpumask_bits:4 nr_cpu_ids:4 nr_node_ids:1',
  '[    0.048910] Memory: 16384216K/16777216K available (14336K kernel code, 3210K rwdata, 4096K rodata, 2048K init, 3840K bss)',
  '[    0.082100] SLUB: HWalign=64, Order=0-3, MinObjects=0, CPUs=4, Nodes=1',
  '[    0.104200] rcu: Preemptible hierarchical RCU implementation.',
  '[    0.104201] rcu: RCU event tracing is available.',
  '[    0.124900] CFS: Completely Fair Scheduler initialized (sched_latency=6ms, min_granularity=0.75ms)',
  '[    0.284100] smp: Brought up 1 node, 4 CPUs',
  '[    0.341200] ACPI: Core revision 20240322',
  '[    0.412800] PCI: Using configuration type 1 for base access',
  '[    0.518200] VFS: Disk quotas dquot_6.6.0',
  '[    0.518201] VFS: Dquot-cache hash table entries: 512 (order 0, 4096 bytes)',
  '[    0.689100] NET: Registered PF_INET protocol family',
  '[    0.710200] IP idents hash table entries: 262144 (order: 9, 2097152 bytes, linear)',
  '[    0.754100] TCP established hash table entries: 131072 (order: 8, 1048576 bytes, linear)',
  '[    0.801200] TCP bind hash table entries: 65536 (order: 8, 1048576 bytes, linear)',
  '[    0.891200] BPF: JIT compiler is enabled (x86_64)',
  '[    0.942100] EXT4-fs (nvme0n1p2): mounted filesystem 7f82b8a0-41fa-4c91-9e81-a98e918231c2 r/w with ordered data mode',
  '[    1.104200] systemd[1]: Inserted module \'autofs4\'',
  '[    1.218900] systemd[1]: Detected architecture x86-64.',
  '[    1.492100] systemd[1]: Reached target Basic System.',
  '[    1.821000] systemd[1]: Started User Manager for UID 1000.',
];

export interface ShellExecResult {
  stdout: string;
  stderr?: string;
  exitCode: number;
}

export function executeKernelShellCommand(cmdLine: string): ShellExecResult {
  const trimmed = cmdLine.trim();
  if (!trimmed) return { stdout: '', exitCode: 0 };

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  switch (cmd) {
    case 'help':
      return {
        stdout: `Available Linux Kernel diagnostics commands:
  uname -a / uname -r     Show kernel release, architecture & build timestamp
  cat <path>              Read virtual procfs/sysfs file (/proc/version, /proc/cpuinfo, /proc/meminfo, /proc/sched_debug, /proc/slabinfo)
  ls [path]               List directory entries in virtual VFS
  dmesg [-T]              Display kernel ring buffer boot & diagnostic messages
  free [-m|-h]            Display amount of free and used memory
  vmstat                  Report virtual memory, process, paging, block and CPU activity
  ps [aux]                Report current active kernel & user tasks
  top                     Quick interactive process snapshot
  sysctl [-a|<key>]       Inspect kernel runtime parameters (e.g., sysctl vm.swappiness)
  lscpu                   Display information on CPU architecture and caches
  slabtop                 Display kernel slab cache information in real time
  clear                   Clear terminal screen`,
        exitCode: 0,
      };

    case 'uname':
      if (args.includes('-r')) {
        return { stdout: '6.11.0-generic\n', exitCode: 0 };
      }
      return {
        stdout: 'Linux kernel-lab-node 6.11.0-generic #11-Ubuntu SMP PREEMPT_DYNAMIC Wed Oct 23 15:42:19 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux\n',
        exitCode: 0,
      };

    case 'cat': {
      if (args.length === 0) {
        return { stdout: '', stderr: 'cat: missing operand', exitCode: 1 };
      }
      const target = args[0];
      const normalized = target.startsWith('/') ? target : '/' + target;
      const file = VFS_ROOT[normalized];
      if (!file) {
        return { stdout: '', stderr: `cat: ${target}: No such file or directory`, exitCode: 1 };
      }
      if (file.isDir) {
        return { stdout: '', stderr: `cat: ${target}: Is a directory`, exitCode: 1 };
      }
      return { stdout: file.content || '', exitCode: 0 };
    }

    case 'ls': {
      const target = args[0] ? (args[0].startsWith('/') ? args[0] : '/' + args[0]) : '/';
      const cleanTarget = target.replace(/\/+$/, '') || '/';
      const entries = Object.keys(VFS_ROOT).filter((p) => {
        if (cleanTarget === '/') {
          return p !== '/' && p.split('/').filter(Boolean).length === 1;
        }
        return p.startsWith(cleanTarget + '/') && p.slice(cleanTarget.length + 1).indexOf('/') === -1;
      });

      if (entries.length === 0 && !VFS_ROOT[cleanTarget]) {
        return { stdout: '', stderr: `ls: cannot access '${target}': No such file or directory`, exitCode: 2 };
      }

      const formatted = entries
        .map((p) => {
          const item = VFS_ROOT[p];
          const name = p.split('/').pop();
          return item.isDir ? `${name}/` : name;
        })
        .join('  ');

      return { stdout: formatted + '\n', exitCode: 0 };
    }

    case 'dmesg': {
      return { stdout: DMESG_RING_BUFFER.join('\n') + '\n', exitCode: 0 };
    }

    case 'free': {
      return {
        stdout: `               total        used        free      shared  buff/cache   available
Mem:           16000        3436        8223         149        4340       12644
Swap:           4096           0        4096\n`,
        exitCode: 0,
      };
    }

    case 'vmstat': {
      return {
        stdout: `procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 2  0      0 8421092 341208 4512984    0    0     4    12   82  142  2  1 97  0  0\n`,
        exitCode: 0,
      };
    }

    case 'ps': {
      return {
        stdout: `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1 168420 12840 ?        Ss   09:00   0:01 /sbin/init splash
root           2  0.0  0.0      0     0 ?        S    09:00   0:00 [kthreadd]
root           3  0.0  0.0      0     0 ?        I<   09:00   0:00 [rcu_gp]
root           4  0.0  0.0      0     0 ?        I<   09:00   0:00 [rcu_par_gp]
root         101  0.2  0.0      0     0 ?        I    09:01   0:04 [kworker/0:1-events]
systemd      142  0.1  0.1  45120  9820 ?        Ss   09:01   0:00 /lib/systemd/systemd-journald
www-data     305  0.4  0.3  89420 24810 ?        S    09:02   0:02 nginx: worker process
postgres     512  0.8  0.8 214800 64200 ?        S    09:03   0:06 postgres: writer process
user        1840  1.2  0.2  22410 14890 pts/0    R+   09:12   0:00 ps aux\n`,
        exitCode: 0,
      };
    }

    case 'top': {
      return {
        stdout: `top - 11:52:14 up 2:52,  1 user,  load average: 0.12, 0.08, 0.05
Tasks: 142 total,   2 running, 140 sleeping,   0 stopped,   0 zombie
%Cpu(s):  1.8 us,  0.9 sy,  0.0 ni, 97.2 id,  0.1 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :  16000.2 total,   8223.7 free,   3436.4 used,   4340.1 buff/cache
MiB Swap:   4096.0 total,   4096.0 free,      0.0 used.  12644.8 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
    512 postgres  20   0  214800  64200  32100 S   0.8   0.8   0:06.12 postgres
    305 www-data  20   0   89420  24810  12400 S   0.4   0.3   0:02.40 nginx
    101 root      20   0       0      0      0 I   0.2   0.0   0:04.18 kworker/0:1
   1840 user      20   0   22410  14890   8120 R   0.2   0.2   0:00.08 top\n`,
        exitCode: 0,
      };
    }

    case 'sysctl': {
      if (args.length === 0 || args.includes('-a')) {
        return {
          stdout: `kernel.osrelease = 6.11.0-generic
kernel.sched_latency_ns = 6000000
kernel.sched_min_granularity_ns = 750000
kernel.sched_wakeup_granularity_ns = 1000000
vm.swappiness = 60
vm.dirty_ratio = 20
vm.dirty_background_ratio = 10
net.core.somaxconn = 4096
net.ipv4.tcp_syncookies = 1\n`,
          exitCode: 0,
        };
      }
      const key = args[0].replace(/\//g, '.');
      if (key === 'vm.swappiness') return { stdout: 'vm.swappiness = 60\n', exitCode: 0 };
      if (key === 'kernel.osrelease') return { stdout: 'kernel.osrelease = 6.11.0-generic\n', exitCode: 0 };
      return { stdout: `${key} = 1\n`, exitCode: 0 };
    }

    case 'lscpu': {
      return {
        stdout: `Architecture:            x86_64
  CPU op-mode(s):        32-bit, 64-bit
  Address sizes:         48 bits physical, 48 bits virtual
  Byte Order:            Little Endian
CPU(s):                  4
  On-line CPU(s) list:   0-3
Vendor ID:               AuthenticAMD
  Model name:            AMD EPYC 7B13 64-Core Processor
    CPU family:          25
    Model:               1
    Thread(s) per core:  1
    Core(s) per socket:  4
    Socket(s):           1
Virtualization features:
  Hypervisor vendor:     KVM
  Virtualization type:   full
Caches (sum of all):
  L1d:                   128 KiB (4 instances)
  L1i:                   128 KiB (4 instances)
  L2:                    2 MiB (4 instances)
  L3:                    16 MiB (1 instance)\n`,
        exitCode: 0,
      };
    }

    case 'slabtop': {
      return {
        stdout: ` Active / Total Objects (% used)    : 85210 / 85300 (99.9%)
 Active / Total Slabs (% used)      : 4402 / 4402 (100.0%)
 Active / Total Caches (% used)     : 84 / 120 (70.0%)
 Active / Total Size (% used)       : 28410K / 28900K (98.3%)

  OBJS ACTIVE  USE OBJ SIZE  SLABS OBJ/SLAB CACHE SIZE NAME
 48120  48120 100%    0.19K   2291       21      9164K dentry
 21400  21400 100%    0.60K   1646       13     13168K inode_cache
  8192   8192 100%    0.06K    128       64       512K kmalloc-64
  4210   4210 100%    0.03K     33      128       132K kmalloc-32
  3072   3072 100%    0.12K     96       32       384K kmalloc-128
  2048   2048 100%    0.25K    128       16       512K skbuff_head_cache
   142    144  98%    5.81K     36        4       864K task_struct\n`,
        exitCode: 0,
      };
    }

    default:
      return {
        stdout: '',
        stderr: `bash: ${cmd}: command not found. Type 'help' for available commands.`,
        exitCode: 127,
      };
  }
}
