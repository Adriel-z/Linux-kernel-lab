import React, { useState, useEffect, useRef } from 'react';
import {
  KernelLogEvent,
  KernelLogLevel,
  KernelSubsystemTag,
  formatPrintkTimestamp,
  createInitialKernelRingBuffer,
  createKernelLogEvent,
  appendKernelLog,
  filterKernelLogs,
  generateRandomBackgroundEvent,
} from '../kernel/eventBus';
import {
  Terminal,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  Radio,
  ArrowDownCircle,
  PlusCircle,
  Zap,
} from 'lucide-react';

interface KernelDmesgConsoleProps {
  externalEvent?: KernelLogEvent | null;
  onClearExternalEvent?: () => void;
}

export const KernelDmesgConsole: React.FC<KernelDmesgConsoleProps> = ({
  externalEvent,
  onClearExternalEvent,
}) => {
  const [logs, setLogs] = useState<KernelLogEvent[]>(createInitialKernelRingBuffer);
  const [subsystemFilter, setSubsystemFilter] = useState<'all' | KernelSubsystemTag>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | KernelLogLevel>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [uptime, setUptime] = useState<number>(3.5);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle incoming external events from other simulators
  useEffect(() => {
    if (externalEvent) {
      setLogs((prev) => appendKernelLog(prev, externalEvent));
      onClearExternalEvent?.();
    }
  }, [externalEvent, onClearExternalEvent]);

  // Real-time simulated kernel background event loop
  useEffect(() => {
    if (!isStreaming) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setUptime((prev) => {
        const nextUptime = prev + 0.8 + Math.random() * 0.4;
        const newEvent = generateRandomBackgroundEvent(nextUptime);
        setLogs((currentLogs) => appendKernelLog(currentLogs, newEvent));
        return nextUptime;
      });
    }, 2400);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming]);

  // Auto-scroll to bottom when new logs arrive if enabled
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = filterKernelLogs(logs, subsystemFilter, levelFilter, searchQuery);

  const handleCopyLogs = () => {
    const text = filteredLogs.map((l) => l.rawFormatted).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInjectPreset = (preset: { sub: KernelSubsystemTag; lvl: KernelLogLevel; msg: string }) => {
    const nextUptime = uptime + 0.1;
    setUptime(nextUptime);
    const event = createKernelLogEvent(nextUptime, preset.sub, preset.lvl, preset.msg);
    setLogs((prev) => appendKernelLog(prev, event));
  };

  const getSubsystemColor = (sub: KernelSubsystemTag) => {
    switch (sub) {
      case 'sched':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
      case 'mm':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/50';
      case 'syscall':
        return 'text-indigo-400 bg-indigo-950/40 border-indigo-800/50';
      case 'bpf':
        return 'text-purple-400 bg-purple-950/40 border-purple-800/50';
      case 'vfs':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
      case 'net':
        return 'text-sky-400 bg-sky-950/40 border-sky-800/50';
      case 'rcu':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/50';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  const getLevelColor = (lvl: KernelLogLevel) => {
    switch (lvl) {
      case 'KERN_ERR':
      case 'KERN_CRIT':
      case 'KERN_ALERT':
      case 'KERN_EMERG':
        return 'text-rose-400 font-bold';
      case 'KERN_WARNING':
        return 'text-amber-400 font-semibold';
      case 'KERN_NOTICE':
        return 'text-cyan-300';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <span>DMESG KERNEL RING BUFFER</span>
              <span aria-hidden="true">·</span>
              <span>PRINTK(KERN_*) STREAM</span>
              <span aria-hidden="true">·</span>
              <span>LOG_BUF RING BUFFER (256 KB)</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Real-Time Kernel Diagnostic Event Stream
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              Streams simulated low-level Linux kernel messages in real time.
              Captures scheduler preemption, page allocation &amp; faults, system call entries, eBPF XDP verdicts, and RCU grace periods.
            </p>
          </div>

          {/* Quick Simulation Injector Chips */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                isStreaming
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
              }`}
            >
              {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isStreaming ? 'Pause Stream' : 'Resume Stream'}</span>
            </button>

            <button
              onClick={() => setLogs([])}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              title="Clear Buffer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors"
              title="Copy dmesg logs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Event Injection Strip */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1 mr-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            Inject event:
          </span>

          <button
            onClick={() =>
              handleInjectPreset({
                sub: 'sched',
                lvl: 'KERN_INFO',
                msg: 'CFS context switch: task 101 (kworker/0:1) -> task 512 (postgres-query) [vruntime=11.32ms, delta=0.66ms]',
              })
            }
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-amber-900/40 text-amber-300 text-[11px] transition-colors"
          >
            + CFS Switch
          </button>

          <button
            onClick={() =>
              handleInjectPreset({
                sub: 'mm',
                lvl: 'KERN_NOTICE',
                msg: 'Page Fault (#PF, Error 0x0004) at 0x7f9b20001000 - demand zero allocated order 0 page (do_anonymous_page)',
              })
            }
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-cyan-900/40 text-cyan-300 text-[11px] transition-colors"
          >
            + Demand Page Fault
          </button>

          <button
            onClick={() =>
              handleInjectPreset({
                sub: 'bpf',
                lvl: 'KERN_WARNING',
                msg: 'xdp_drop_syn: [eth0] Dropped TCP SYN flood from 198.51.100.84:80 (verdict=XDP_DROP)',
              })
            }
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-purple-900/40 text-purple-300 text-[11px] transition-colors"
          >
            + eBPF XDP Drop
          </button>

          <button
            onClick={() =>
              handleInjectPreset({
                sub: 'mm',
                lvl: 'KERN_ERR',
                msg: 'Out of Memory: Kill process 918 (stress-ng) score 840 or sacrifice child',
              })
            }
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-rose-900/40 text-rose-300 text-[11px] transition-colors"
          >
            + OOM Kill
          </button>

          <button
            onClick={() =>
              handleInjectPreset({
                sub: 'syscall',
                lvl: 'KERN_INFO',
                msg: 'entry_SYSCALL_64: sys_mmap(addr=0x0, len=4096, prot=0x3, flags=0x22) -> 0x7f9a40000000',
              })
            }
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-indigo-900/40 text-indigo-300 text-[11px] transition-colors"
          >
            + sys_mmap()
          </button>
        </div>
      </section>

      {/* Terminal Viewport */}
      <div className="rounded-2xl bg-[#06090e] border border-slate-800 font-mono text-xs overflow-hidden shadow-2xl">
        {/* Terminal Header Toolbar */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Subsystem Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-slate-500 text-[11px] mr-1">Subsystem:</span>
            {(['all', 'sched', 'mm', 'syscall', 'bpf', 'vfs', 'net', 'rcu'] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setSubsystemFilter(sub)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  subsystemFilter === sub
                    ? 'bg-cyan-400 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Search grep & Auto-scroll toggle */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="grep pattern..."
                className="pl-8 pr-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-white text-[11px] w-36 sm:w-44 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] transition-colors ${
                autoScroll
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Automatically follow incoming logs"
            >
              <ArrowDownCircle className="w-3 h-3" />
              <span>Follow</span>
            </button>
          </div>
        </div>

        {/* Ring Buffer Output Area */}
        <div
          ref={scrollContainerRef}
          className="p-4 space-y-1 max-h-[520px] overflow-y-auto leading-relaxed bg-[#05070c]"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-12">
              No kernel events match the current filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 hover:bg-slate-900/40 px-1.5 py-0.5 rounded transition-colors group"
              >
                {/* Timestamp */}
                <span className="text-slate-500 tabular-nums shrink-0 select-none">
                  {formatPrintkTimestamp(log.uptimeSeconds)}
                </span>

                {/* Subsystem Tag */}
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border shrink-0 ${getSubsystemColor(
                    log.subsystem
                  )}`}
                >
                  {log.subsystem}
                </span>

                {/* Log message */}
                <span className={`flex-1 break-all ${getLevelColor(log.level)}`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Terminal Footer Status Bar */}
        <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Radio className={`w-3 h-3 ${isStreaming ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
            <span>
              {isStreaming ? 'STREAM ACTIVE' : 'STREAM PAUSED'} · {filteredLogs.length} events displayed ({logs.length} in buffer)
            </span>
          </div>
          <div>Uptime: {uptime.toFixed(2)}s · /dev/kmsg</div>
        </div>
      </div>
    </div>
  );
};
