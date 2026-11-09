/**
 * eBPF (Extended Berkeley Packet Filter) subsystem and verifier simulation
 */

export interface EbpfProgram {
  id: string;
  name: string;
  type: 'BPF_PROG_TYPE_XDP' | 'BPF_PROG_TYPE_TRACEPOINT' | 'BPF_PROG_TYPE_LSM';
  hookPoint: string;
  description: string;
  cCode: string;
  bytecodeInstructions: {
    idx: number;
    opcode: string;
    insn: string;
    comment: string;
  }[];
  verifierLog: string[];
  jitCompiledSize: number; // bytes
}

export const EBPF_PROGRAMS: EbpfProgram[] = [
  {
    id: 'xdp-syn-filter',
    name: 'xdp_drop_syn_flood.c',
    type: 'BPF_PROG_TYPE_XDP',
    hookPoint: 'NIC Driver RX Ring (xdp_rxq_info)',
    description: 'High-speed in-kernel packet filtering directly in the network card driver before allocating sk_buff. Drops malicious SYN floods at 14.8M pps line rate.',
    cCode: `#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/tcp.h>
#include <bpf/bpf_helpers.h>

struct {
    __uint(type, BPF_MAP_TYPE_PERCPU_ARRAY);
    __type(key, __u32);
    __type(value, __u64);
    __uint(max_entries, 2);
} pkt_stats SEC(".maps");

SEC("xdp")
int xdp_drop_syn(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != __bpf_constant_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end)
        return XDP_PASS;

    if (ip->protocol != IPPROTO_TCP)
        return XDP_PASS;

    struct tcphdr *tcp = (void *)((__u32 *)ip + ip->ihl);
    if ((void *)(tcp + 1) > data_end)
        return XDP_PASS;

    /* Drop TCP SYN packets without ACK flag */
    if (tcp->syn && !tcp->ack) {
        __u32 key = 1; /* Drop counter */
        __u64 *val = bpf_map_lookup_elem(&pkt_stats, &key);
        if (val) __sync_fetch_and_add(val, 1);
        return XDP_DROP;
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";`,
    bytecodeInstructions: [
      { idx: 0, opcode: 'r1 = *(u32 *)(r1 + 4)', insn: 'BPF_LDX_MEM', comment: 'Load ctx->data_end' },
      { idx: 1, opcode: 'r2 = *(u32 *)(r1 + 0)', insn: 'BPF_LDX_MEM', comment: 'Load ctx->data' },
      { idx: 2, opcode: 'r3 = r2; r3 += 14', insn: 'BPF_ALU64_IMM', comment: 'eth + sizeof(struct ethhdr)' },
      { idx: 3, opcode: 'if r3 > r1 goto +18', insn: 'BPF_JGT_REG', comment: 'Bounds check: data_end' },
      { idx: 4, opcode: 'r4 = *(u16 *)(r2 + 12)', insn: 'BPF_LDX_MEM', comment: 'Load eth->h_proto' },
      { idx: 5, opcode: 'if r4 != 0x0800 goto +16', insn: 'BPF_JNE_IMM', comment: 'Check ETH_P_IP (IPv4)' },
      { idx: 6, opcode: 'r5 = *(u8 *)(r3 + 9)', insn: 'BPF_LDX_MEM', comment: 'Load ip->protocol' },
      { idx: 7, opcode: 'if r5 != 6 goto +14', insn: 'BPF_JNE_IMM', comment: 'Check IPPROTO_TCP (6)' },
      { idx: 8, opcode: 'r6 = *(u8 *)(r3 + 33)', insn: 'BPF_LDX_MEM', comment: 'Load tcp->flags (syn & ack)' },
      { idx: 9, opcode: 'r0 = 1', insn: 'BPF_MOV64_IMM', comment: 'Return XDP_DROP (1)' },
      { idx: 10, opcode: 'exit', insn: 'BPF_EXIT_INSN', comment: 'Terminate eBPF program' },
    ],
    verifierLog: [
      '0: R1=ctx(off=0,imm=0) R10=fp0',
      '0: (61) r2 = *(u32 *)(r1 +4)          ; R2_w=pkt_end(off=0,imm=0)',
      '1: (61) r1 = *(u32 *)(r1 +0)          ; R1_w=pkt(off=0,r=14,imm=0)',
      '2: (bf) r3 = r1                       ; R3_w=pkt(off=0,r=14,imm=0)',
      '3: (07) r3 += 14                      ; R3_w=pkt(off=14,r=14,imm=0)',
      '4: (2d) if r3 > r2 goto pc+18         ; R3_w=pkt(off=14,r=14,imm=0) R2=pkt_end()',
      '5: (69) r4 = *(u16 *)(r1 +12)         ; R4_w=scalar(umax=65535,var_off=(0x0; 0xffff))',
      '6: (55) if r4 != 0x8 goto pc+16',
      '7: (71) r5 = *(u8 *)(r3 +9)           ; R5_w=scalar(umax=255)',
      '8: (55) if r5 != 0x6 goto pc+14',
      '9: (71) r6 = *(u8 *)(r3 +33)',
      '10: (b7) r0 = 1                       ; XDP_DROP',
      '11: (95) exit',
      'processed 18 insns (limit 1000000) max_states_per_insn 0 total_states 2 peak_states 2 mark_read 1',
      'VERIFIER SUCCESS: Program safe to run in kernel context. No memory leaks or illegal dereferences detected.',
    ],
    jitCompiledSize: 148,
  },
  {
    id: 'trace-execve',
    name: 'trace_sys_execve.c',
    type: 'BPF_PROG_TYPE_TRACEPOINT',
    hookPoint: 'tracepoint/syscalls/sys_enter_execve',
    description: 'Kernel tracepoint auditor: intercepts every binary execution in real-time, extracting binary pathname, process ID, parent PID, and UID.',
    cCode: `#include <vmlinux.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

struct event {
    u32 pid;
    u32 uid;
    char comm[16];
    char filename[128];
};

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} rb SEC(".maps");

SEC("tracepoint/syscalls/sys_enter_execve")
int trace_exec(struct trace_event_raw_sys_enter *ctx) {
    struct event *e;
    e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;

    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->uid = bpf_get_current_uid_gid();
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    bpf_probe_read_user_str(&e->filename, sizeof(e->filename), (void *)ctx->args[0]);

    bpf_ringbuf_submit(e, 0);
    return 0;
}

char LICENSE[] SEC("license") = "Dual BSD/GPL";`,
    bytecodeInstructions: [
      { idx: 0, opcode: 'r1 = &rb', insn: 'BPF_LD_MAP_FD', comment: 'Reference ring buffer map' },
      { idx: 1, opcode: 'r2 = 152; r3 = 0', insn: 'BPF_MOV64_IMM', comment: 'sizeof(struct event)' },
      { idx: 2, opcode: 'call bpf_ringbuf_reserve#131', insn: 'BPF_CALL', comment: 'Allocate ring buffer slot' },
      { idx: 3, opcode: 'if r0 == 0 goto +8', insn: 'BPF_JEQ_IMM', comment: 'Null check allocation' },
      { idx: 4, opcode: 'call bpf_get_current_pid_tgid#14', insn: 'BPF_CALL', comment: 'Get PID/TGID' },
      { idx: 5, opcode: '*(u32 *)(r7 + 0) = r0', insn: 'BPF_STX_MEM', comment: 'Store pid into event' },
      { idx: 6, opcode: 'call bpf_ringbuf_submit#132', insn: 'BPF_CALL', comment: 'Commit event to user space' },
      { idx: 7, opcode: 'r0 = 0; exit', insn: 'BPF_EXIT_INSN', comment: 'Return 0' },
    ],
    verifierLog: [
      '0: R1=ctx(off=0,imm=0) R10=fp0',
      '1: (18) r1 = 0xffff888102a90000        ; Map pointer verified',
      '3: (85) call pc+131                   ; bpf_ringbuf_reserve()',
      '4: (15) if r0 == 0x0 goto pc+8        ; Non-null check satisfied',
      '5: (85) call pc+14                    ; bpf_get_current_pid_tgid()',
      '6: (85) call pc+114                   ; bpf_probe_read_user_str()',
      '7: (85) call pc+132                   ; bpf_ringbuf_submit()',
      '8: (95) exit',
      'processed 22 insns (limit 1000000) max_states_per_insn 0 total_states 2 peak_states 2',
      'VERIFIER SUCCESS: Safe memory dereferences. Stack usage: 32 bytes (limit 512 bytes).',
    ],
    jitCompiledSize: 184,
  },
];
