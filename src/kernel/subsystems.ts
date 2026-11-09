/**
 * Linux Kernel Architecture Subsystems and Data Structures
 */

export interface KernelSubsystem {
  id: string;
  name: string;
  layer: 'User Space' | 'System Call Interface' | 'Core Kernel' | 'Hardware Abstraction';
  brief: string;
  description: string;
  sourceDirectories: string[];
  keyDataStructures: {
    name: string;
    definedIn: string;
    description: string;
    codeSnippet: string;
  }[];
  primaryAlgorithms: string[];
  interactiveSimId?: 'cfs' | 'mmu' | 'syscall' | 'ebpf' | 'shell';
}

export const KERNEL_SUBSYSTEMS: KernelSubsystem[] = [
  {
    id: 'process-cfs',
    name: 'Process Management & CFS Scheduler',
    layer: 'Core Kernel',
    brief: 'Preemptive multitasking, task lifecycle, Completely Fair Scheduler (CFS), and cgroups resource limits.',
    description: 'Manages CPU execution across threads and processes. Linux uses the Completely Fair Scheduler (CFS) which models an "ideal multi-tasking CPU" using a Red-Black Tree sorted by virtual runtime (vruntime). Low vruntime processes get scheduled first, with time slices proportional to task nice values.',
    sourceDirectories: ['kernel/sched/', 'kernel/fork.c', 'kernel/exit.c'],
    interactiveSimId: 'cfs',
    keyDataStructures: [
      {
        name: 'struct task_struct',
        definedIn: 'include/linux/sched.h:748',
        description: 'The central Process Control Block (PCB) representing every thread in the operating system.',
        codeSnippet: `struct task_struct {
    struct thread_info thread_info;
    unsigned int       __state;
    void               *stack;
    refcount_t         usage;
    int                prio, static_prio, normal_prio;
    struct sched_entity se;
    struct mm_struct   *mm, *active_mm;
    pid_t              pid, tgid;
    struct task_struct __rcu *real_parent;
    struct files_struct *files;
    struct fs_struct   *fs;
    struct signal_struct *signal;
    ...
};`,
      },
      {
        name: 'struct sched_entity',
        definedIn: 'include/linux/sched.h:552',
        description: 'CFS scheduling entity embedded in task_struct, containing vruntime and RB-tree links.',
        codeSnippet: `struct sched_entity {
    struct load_weight load;
    struct rb_node     run_node;
    struct list_head   group_node;
    unsigned int       on_rq;
    u64                exec_start;
    u64                sum_exec_runtime;
    u64                vruntime;
    u64                prev_sum_exec_runtime;
    ...
};`,
      },
    ],
    primaryAlgorithms: [
      'Red-Black Tree lookup for min vruntime task: O(1) leftmost cache',
      'Virtual runtime update: delta_vruntime = delta_exec * (1024 / task_weight)',
      'Load balancing across CPU runqueues via domain scheduling',
    ],
  },
  {
    id: 'memory-mm',
    name: 'Memory Management (MM & MMU)',
    layer: 'Core Kernel',
    brief: 'Virtual memory translation, 4-level x86_64 paging, Buddy page allocator, and SLUB object caching.',
    description: 'Translates 48-bit/52-bit virtual addresses into physical RAM frames through CR3 and page table levels (PGD -> PUD -> PMD -> PTE). Manages physical page allocation via the Buddy Allocator (orders 0 to 10), small object caching via the SLUB allocator, and handles demand paging, Copy-on-Write (COW), and swap.',
    sourceDirectories: ['mm/', 'arch/x86/mm/', 'include/linux/mm.h'],
    interactiveSimId: 'mmu',
    keyDataStructures: [
      {
        name: 'struct mm_struct',
        definedIn: 'include/linux/mm_types.h:580',
        description: 'Encapsulates the entire virtual address space of a user process, referencing page tables.',
        codeSnippet: `struct mm_struct {
    struct {
        struct maple_tree mm_mt;      /* VMA maple tree */
        unsigned long     mmap_base;
        unsigned long     task_size;
        pgd_t             *pgd;       /* Page Global Directory (CR3) */
        atomic_t          mm_users;
        atomic_t          mm_count;
        unsigned long     hiwater_rss;
        unsigned long     total_vm;   /* Total allocated pages */
        unsigned long     locked_vm;
        unsigned long     start_code, end_code;
        unsigned long     start_data, end_data;
        unsigned long     start_brk, brk, start_stack;
    };
};`,
      },
      {
        name: 'struct page',
        definedIn: 'include/linux/mm_types.h:74',
        description: 'Physical RAM page descriptor (4KB per instance) tracked in the mem_map array.',
        codeSnippet: `struct page {
    unsigned long flags;
    union {
        struct {
            struct list_head lru;
            struct address_space *mapping;
            pgoff_t index;
            unsigned long private;
        };
        struct {
            void *freelist;     /* SLUB freelist */
            union {
                unsigned long counters;
                struct {
                    unsigned inuse:16;
                    unsigned objects:15;
                    unsigned frozen:1;
                };
            };
        };
    };
    atomic_t _refcount;
};`,
      },
    ],
    primaryAlgorithms: [
      '4-Level x86_64 Page Walk (PGD -> PUD -> PMD -> PTE + 12-bit offset)',
      'Binary Buddy Allocator (Order 0..10 block splitting and buddy address coalescing)',
      'Copy-On-Write (COW) Page Fault handling via do_wp_page()',
    ],
  },
  {
    id: 'vfs-fs',
    name: 'Virtual File System (VFS)',
    layer: 'Core Kernel',
    brief: 'Polymorphic file abstraction unifying ext4, btrfs, XFS, procfs, sysfs, and socket descriptors.',
    description: 'Provides a clean POSIX interface (open, read, write, close, stat) decoupled from specific storage media. Employs an in-memory Dentry Cache (dcache) and Inode Cache for sub-microsecond pathname resolution, and backs file I/O with the Page Cache for unified buffer management.',
    sourceDirectories: ['fs/', 'fs/ext4/', 'fs/proc/', 'include/linux/fs.h'],
    interactiveSimId: 'shell',
    keyDataStructures: [
      {
        name: 'struct inode',
        definedIn: 'include/linux/fs.h:608',
        description: 'Represents a concrete filesystem object on disk, holding metadata and block pointers.',
        codeSnippet: `struct inode {
    umode_t           i_mode;
    unsigned short    i_opflags;
    kuid_t            i_uid;
    kgid_t            i_gid;
    unsigned int      i_flags;
    const struct inode_operations *i_op;
    struct super_block *i_sb;
    struct address_space *i_mapping;
    dev_t             i_rdev;
    loff_t            i_size;
    struct timespec64 i_atime, i_mtime, i_ctime;
    const struct file_operations *i_fop;
    atomic_t          i_count;
};`,
      },
      {
        name: 'struct dentry',
        definedIn: 'include/linux/dcache.h:92',
        description: 'Directory Entry linking string file path components to underlying inodes in the dcache.',
        codeSnippet: `struct dentry {
    unsigned int      d_flags;
    seqcount_spinlock_t d_seq;
    struct hlist_bl_node d_hash;
    struct dentry     *d_parent;
    struct qstr       d_name;
    struct inode      *d_inode;
    unsigned char     d_iname[DNAME_INLINE_LEN];
    struct lockref    d_lockref;
    const struct dentry_operations *d_op;
    struct super_block *d_sb;
    struct list_head  d_child;
    struct list_head  d_subdirs;
};`,
      },
    ],
    primaryAlgorithms: [
      'RCU-walk path lookup in dcache: lockless directory traversal',
      'Page Cache radix/xarray writeback flusher threads (wb_workfn)',
      'Pseudo-filesystem generator for /proc and /sys kernel telemetry',
    ],
  },
  {
    id: 'syscall-trap',
    name: 'System Call & Trap Interface',
    layer: 'System Call Interface',
    brief: 'Hardware boundary between unprivileged Ring 3 and privileged Ring 0 kernel mode.',
    description: 'The CPU privilege gate where user code enters kernel mode via the x86-64 syscall instruction. CPU loads RIP from MSR_LSTAR, switches stacks, saves user registers into struct pt_regs, and jumps into sys_call_table to execute the appropriate kernel service before executing sysretq.',
    sourceDirectories: ['arch/x86/entry/', 'arch/x86/kernel/', 'kernel/sys.c'],
    interactiveSimId: 'syscall',
    keyDataStructures: [
      {
        name: 'struct pt_regs',
        definedIn: 'arch/x86/include/asm/ptrace.h:58',
        description: 'Complete user-space CPU register snapshot saved on the kernel stack during syscall or interrupt entry.',
        codeSnippet: `struct pt_regs {
    unsigned long r15, r14, r13, r12;
    unsigned long rbp, rbx, r11, r10;
    unsigned long r9,  r8,  rax, rcx;
    unsigned long rdx, rsi, rdi, orig_rax;
    unsigned long rip, cs,  eflags;
    unsigned long rsp, ss;
};`,
      },
    ],
    primaryAlgorithms: [
      'MSR_LSTAR entry point dispatch',
      'swapgs instruction to locate per-CPU kernel data',
      'Fast system return via sysretq without full IRET stack teardown',
    ],
  },
  {
    id: 'ebpf-subsystem',
    name: 'eBPF & In-Kernel Virtual Machine',
    layer: 'Core Kernel',
    brief: 'Safe in-kernel programmable bytecode engine for networking, observability, and security.',
    description: 'Extends the Linux kernel dynamically without modifying source code or rebooting. Bytecode programs are mathematically verified for safety (preventing infinite loops, memory corruption, and illegal pointer access) by the in-kernel verifier, JIT-compiled into native machine instructions, and hooked to network devices (XDP) or tracepoints.',
    sourceDirectories: ['kernel/bpf/', 'net/core/filter.c', 'include/linux/bpf.h'],
    interactiveSimId: 'ebpf',
    keyDataStructures: [
      {
        name: 'struct bpf_prog',
        definedIn: 'include/linux/filter.h:548',
        description: 'Verified and JIT-compiled eBPF program ready for execution at kernel hooks.',
        codeSnippet: `struct bpf_prog {
    u16               pages;
    u16               jited:1,
                      jit_requested:1,
                      gpl_compatible:1,
                      cb_access:1;
    enum bpf_prog_type type;
    u32               len;          /* Number of instructions */
    struct bpf_prog_aux *aux;
    struct sock_fprog_kern *orig_prog;
    unsigned int      (*bpf_func)(const void *ctx, const struct bpf_insn *insn);
    union {
        struct sock_filter insns[0];
        struct bpf_insn    insnsi[0];
    };
};`,
      },
    ],
    primaryAlgorithms: [
      'Abstract interpretation and Directed Acyclic Graph (DAG) state exploration in kernel verifier',
      'Just-In-Time (JIT) compilation: 64-bit eBPF registers to AMD64 native opcodes',
      'Lockless ring buffers and per-CPU hash maps for zero-overhead metrics delivery',
    ],
  },
  {
    id: 'network-stack',
    name: 'Networking Subsystem & Socket Layer',
    layer: 'Core Kernel',
    brief: 'High-throughput TCP/IP stack, sk_buff packet buffers, netfilter hooks, and socket state machine.',
    description: 'Transfers packets between hardware Network Interface Cards (NICs) and application sockets. Utilizes NAPI polling to eliminate interrupt storms, wraps all packet data and headers inside struct sk_buff, processes IP routing and Netfilter firewall chains, and drives the TCP sliding window state machine.',
    sourceDirectories: ['net/ipv4/', 'net/core/', 'net/netfilter/'],
    keyDataStructures: [
      {
        name: 'struct sk_buff (Socket Buffer)',
        definedIn: 'include/linux/skbuff.h:730',
        description: 'The universal network packet container in the Linux kernel spanning L2, L3, and L4 layers.',
        codeSnippet: `struct sk_buff {
    union {
        struct {
            struct sk_buff *next, *prev;
            union {
                struct net_device *dev;
                unsigned long     dev_scratch;
            };
        };
    };
    struct sock       *sk;
    ktime_t           tstamp;
    unsigned int      len, data_len;
    __u16             mac_len, hdr_len, queue_mapping;
    sk_buff_data_t    tail, end, head, data;
    unsigned int      truesize;
    refcount_t        users;
};`,
      },
    ],
    primaryAlgorithms: [
      'NAPI (New API) interrupt mitigation: switches from IRQ to poll under high packet load',
      'TCP Cubic / BBR congestion control rate estimation algorithms',
      'Netfilter hook traversal: PREROUTING -> INPUT / FORWARD -> OUTPUT -> POSTROUTING',
    ],
  },
];
