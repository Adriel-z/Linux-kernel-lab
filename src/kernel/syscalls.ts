/**
 * Linux x86_64 System Call Transition and Execution Emulation
 */

export interface SyscallArg {
  name: string;
  reg: '%rdi' | '%rsi' | '%rdx' | '%r10' | '%r8' | '%r9';
  defaultVal: string;
  desc: string;
}

export interface SyscallDef {
  nr: number;
  name: string;
  signature: string;
  subsystem: 'VFS' | 'Memory' | 'Process' | 'Network' | 'eBPF';
  kernelFile: string;
  description: string;
  args: SyscallArg[];
  cSourceSnippet: string;
}

export interface TraceStep {
  stage: 'RING3_SETUP' | 'CPU_TRAP' | 'ENTRY_ASM' | 'DISPATCH' | 'KERNEL_EXEC' | 'SYSRET';
  ring: 'Ring 3 (User)' | 'Ring 0 (Kernel)';
  title: string;
  details: string;
  registers: Record<string, string>;
  cCodeRef?: string;
}

export const LINUX_SYSCALLS: SyscallDef[] = [
  {
    nr: 0,
    name: 'read',
    signature: 'ssize_t ksys_read(unsigned int fd, char __user *buf, size_t count);',
    subsystem: 'VFS',
    kernelFile: 'fs/read_write.c:647',
    description: 'Read bytes from a file descriptor into a user space buffer via VFS and block layer.',
    args: [
      { name: 'fd', reg: '%rdi', defaultVal: '3', desc: 'File descriptor (e.g., 3 = /etc/passwd)' },
      { name: 'buf', reg: '%rsi', defaultVal: '0x7ffd892b1000', desc: 'User-space memory destination buffer pointer' },
      { name: 'count', reg: '%rdx', defaultVal: '1024', desc: 'Maximum number of bytes to read' },
    ],
    cSourceSnippet: `SYSCALL_DEFINE3(read, unsigned int, fd, char __user *, buf, size_t, count)
{
    struct fd f = fdget_pos(fd);
    ssize_t ret = -EBADF;
    if (f.file) {
        loff_t pos = file_pos_read(f.file);
        ret = vfs_read(f.file, buf, count, &pos);
        if (ret >= 0)
            file_pos_write(f.file, pos);
        fdput_pos(f);
    }
    return ret;
}`,
  },
  {
    nr: 1,
    name: 'write',
    signature: 'ssize_t ksys_write(unsigned int fd, const char __user *buf, size_t count);',
    subsystem: 'VFS',
    kernelFile: 'fs/read_write.c:662',
    description: 'Write bytes from a user space buffer to a file or stream descriptor.',
    args: [
      { name: 'fd', reg: '%rdi', defaultVal: '1', desc: 'File descriptor (1 = STDOUT)' },
      { name: 'buf', reg: '%rsi', defaultVal: '0x7ffd892b2000', desc: 'User-space memory source buffer pointer' },
      { name: 'count', reg: '%rdx', defaultVal: '14', desc: 'Bytes to write' },
    ],
    cSourceSnippet: `SYSCALL_DEFINE3(write, unsigned int, fd, const char __user *, buf, size_t, count)
{
    struct fd f = fdget_pos(fd);
    ssize_t ret = -EBADF;
    if (f.file) {
        loff_t pos = file_pos_read(f.file);
        ret = vfs_write(f.file, buf, count, &pos);
        if (ret >= 0)
            file_pos_write(f.file, pos);
        fdput_pos(f);
    }
    return ret;
}`,
  },
  {
    nr: 9,
    name: 'mmap',
    signature: 'unsigned long ksys_mmap_pgoff(unsigned long addr, unsigned long len, unsigned long prot, unsigned long flags, unsigned long fd, unsigned long pgoff);',
    subsystem: 'Memory',
    kernelFile: 'mm/mmap.c:1584',
    description: 'Map files or anonymous memory into the virtual address space of the calling process.',
    args: [
      { name: 'addr', reg: '%rdi', defaultVal: '0x0', desc: 'Requested starting address hint (0 = kernel chooses)' },
      { name: 'length', reg: '%rsi', defaultVal: '4096', desc: 'Mapping length in bytes (page aligned)' },
      { name: 'prot', reg: '%rdx', defaultVal: '0x3', desc: 'PROT_READ | PROT_WRITE (0x1 | 0x2)' },
      { name: 'flags', reg: '%r10', defaultVal: '0x22', desc: 'MAP_PRIVATE | MAP_ANONYMOUS (0x02 | 0x20)' },
    ],
    cSourceSnippet: `SYSCALL_DEFINE6(mmap, unsigned long, addr, unsigned long, len,
                unsigned long, prot, unsigned long, flags,
                unsigned long, fd, unsigned long, off)
{
    if (offset_in_page(off))
        return -EINVAL;
    return ksys_mmap_pgoff(addr, len, prot, flags, fd, off >> PAGE_SHIFT);
}`,
  },
  {
    nr: 56,
    name: 'clone',
    signature: 'long _do_fork(struct kernel_clone_args *args);',
    subsystem: 'Process',
    kernelFile: 'kernel/fork.c:2670',
    description: 'Create a new child process or thread with shared address space (CLONE_VM) or file descriptors.',
    args: [
      { name: 'clone_flags', reg: '%rdi', defaultVal: '0x00010011', desc: 'SIGCHLD | CLONE_CHILD_CLEARTID' },
      { name: 'newsp', reg: '%rsi', defaultVal: '0x0', desc: 'New stack pointer (0 = copy parent stack)' },
      { name: 'parent_tid', reg: '%rdx', defaultVal: '0x0', desc: 'Parent TID pointer in user space' },
    ],
    cSourceSnippet: `SYSCALL_DEFINE5(clone, unsigned long, clone_flags, unsigned long, newsp,
                int __user *, parent_tidptr, int __user *, child_tidptr,
                unsigned long, tls)
{
    struct kernel_clone_args args = {
        .flags      = (lower_32_bits(clone_flags) & ~CSIGNAL),
        .pidfd      = parent_tidptr,
        .child_tid  = child_tidptr,
        .parent_tid = parent_tidptr,
        .exit_signal= (lower_32_bits(clone_flags) & CSIGNAL),
        .stack      = newsp,
        .tls        = tls,
    };
    return kernel_clone(&args);
}`,
  },
  {
    nr: 321,
    name: 'bpf',
    signature: 'int __sys_bpf(int cmd, union bpf_attr *attr, unsigned int size);',
    subsystem: 'eBPF',
    kernelFile: 'kernel/bpf/syscall.c:4870',
    description: 'Perform operations on eBPF maps and verify/load eBPF bytecode programs.',
    args: [
      { name: 'cmd', reg: '%rdi', defaultVal: '5', desc: 'BPF_PROG_LOAD (5 = load and verify eBPF bytecode)' },
      { name: 'attr', reg: '%rsi', defaultVal: '0x7ffd90a01040', desc: 'Pointer to union bpf_attr configuration struct' },
      { name: 'size', reg: '%rdx', defaultVal: '128', desc: 'Size of union bpf_attr in bytes' },
    ],
    cSourceSnippet: `SYSCALL_DEFINE3(bpf, int, cmd, union bpf_attr __user *, uattr, unsigned int, size)
{
    union bpf_attr attr;
    int err;
    if (copy_from_user(&attr, uattr, size))
        return -EFAULT;
    switch (cmd) {
    case BPF_PROG_LOAD:
        err = bpf_prog_load(&attr, uattr, size);
        break;
    case BPF_MAP_CREATE:
        err = map_create(&attr);
        break;
    ...
    }
    return err;
}`,
  },
];

export function runSyscallTrace(def: SyscallDef, userArgs: Record<string, string>): TraceStep[] {
  const arg1 = userArgs[def.args[0]?.name] || def.args[0]?.defaultVal || '0';
  const arg2 = userArgs[def.args[1]?.name] || def.args[1]?.defaultVal || '0';
  const arg3 = userArgs[def.args[2]?.name] || def.args[2]?.defaultVal || '0';
  const arg4 = userArgs[def.args[3]?.name] || def.args[3]?.defaultVal || '0';

  const raxSyscall = def.nr.toString();
  const returnRax = def.nr === 0 ? arg3 : def.nr === 1 ? arg3 : def.nr === 9 ? '0x7f9a_4000_0000' : def.nr === 56 ? '18420' : '3';

  return [
    {
      stage: 'RING3_SETUP',
      ring: 'Ring 3 (User)',
      title: '1. User Space Argument Staging',
      details: `The C library (glibc/musl) puts syscall number ${def.nr} into register %rax and populates argument registers according to System V AMD64 ABI conventions.`,
      registers: {
        '%rax': raxSyscall,
        '%rdi': arg1,
        '%rsi': arg2,
        '%rdx': arg3,
        '%r10': arg4,
        '%rip': '0x7ffff7eb108c',
        '%rsp': '0x7ffd90a01f80',
        'CPL': '3 (User)',
      },
    },
    {
      stage: 'CPU_TRAP',
      ring: 'Ring 0 (Kernel)',
      title: '2. CPU Privilege Transition via syscall instruction',
      details: `CPU executes 'syscall'. Hardware switches Current Privilege Level (CPL) 3 -> 0. %rip is saved to %rcx, %rflags to %r11. CPU jumps to handler address stored in MSR_LSTAR.`,
      registers: {
        '%rip': '0xffffffff81c00000 (entry_SYSCALL_64)',
        '%rcx': '0x7ffff7eb108e (saved user %rip)',
        '%r11': '0x00000246 (saved user %rflags)',
        '%rsp': '0xffffc90001a43f58 (Kernel Stack)',
        'CPL': '0 (Kernel Ring 0)',
      },
    },
    {
      stage: 'ENTRY_ASM',
      ring: 'Ring 0 (Kernel)',
      title: '3. Kernel Entry Assembly (arch/x86/entry/entry_64.S)',
      details: `'swapgs' switches to per-CPU kernel GS base. Pushes all registers onto the kernel stack, creating 'struct pt_regs' so user state is completely preserved.`,
      registers: {
        'pt_regs->rax': raxSyscall,
        'pt_regs->rdi': arg1,
        'pt_regs->rsi': arg2,
        'pt_regs->rdx': arg3,
        'pt_regs->cs': '0x0010 (Kernel Code Segment)',
        'pt_regs->ss': '0x0018 (Kernel Stack Segment)',
      },
      cCodeRef: 'arch/x86/entry/entry_64.S: SYM_CODE_START(entry_SYSCALL_64)',
    },
    {
      stage: 'DISPATCH',
      ring: 'Ring 0 (Kernel)',
      title: `4. Syscall Table Lookup: sys_call_table[${def.nr}]`,
      details: `Kernel indexes sys_call_table[%rax]. Points to implementation symbol '${def.signature.split('(')[0].trim()}'. Parameters forwarded to C function.`,
      registers: {
        'sys_call_table[NR]': `&__x64_sys_${def.name}`,
        'handler': def.kernelFile,
      },
      cCodeRef: `arch/x86/entry/syscall_64.c`,
    },
    {
      stage: 'KERNEL_EXEC',
      ring: 'Ring 0 (Kernel)',
      title: `5. Subsystem Execution (${def.subsystem})`,
      details: `Executing ${def.kernelFile}. Validates pointers with access_ok(), enforces LSM/capability permissions, interacts with virtual memory, VFS, or process scheduler.`,
      registers: {
        'status': 'SUCCESS',
        'subsystem': def.subsystem,
        'return_val': returnRax,
      },
      cCodeRef: def.kernelFile,
    },
    {
      stage: 'SYSRET',
      ring: 'Ring 3 (User)',
      title: '6. sysretq & Return to Ring 3',
      details: `Kernel places return value in %rax, executes 'swapgs', and runs 'sysretq'. CPU restores CPL 3, loads %rip from %rcx, and continues user process.`,
      registers: {
        '%rax': returnRax,
        '%rip': '0x7ffff7eb108e',
        '%rsp': '0x7ffd90a01f80',
        'CPL': '3 (User)',
      },
    },
  ];
}
