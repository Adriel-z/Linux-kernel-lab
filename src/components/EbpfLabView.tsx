import React, { useState } from 'react';
import { EBPF_PROGRAMS, EbpfProgram } from '../kernel/ebpf';
import { Code2, Play, ShieldAlert, Cpu, CheckCircle2, Zap, RefreshCw } from 'lucide-react';

export const EbpfLabView: React.FC = () => {
  const [selectedProgId, setSelectedProgId] = useState<string>('xdp-syn-filter');
  const [activeTab, setActiveTab] = useState<'c_source' | 'bytecode' | 'verifier'>('c_source');

  // Traffic / event simulator stats
  const [packetsTotal, setPacketsTotal] = useState<number>(1420);
  const [packetsDropped, setPacketsDropped] = useState<number>(380);
  const [packetsPassed, setPacketsPassed] = useState<number>(1040);
  const [eventLog, setEventLog] = useState<{ id: number; text: string; verdict: 'PASS' | 'DROP' }[]>([
    { id: 1, text: 'TCP 192.168.1.45:443 -> ACK (Normal)', verdict: 'PASS' },
    { id: 2, text: 'TCP 10.0.0.12:80 -> SYN (Malicious Flood)', verdict: 'DROP' },
    { id: 3, text: 'TCP 172.16.0.4:80 -> SYN (Malicious Flood)', verdict: 'DROP' },
    { id: 4, text: 'UDP 8.8.8.8:53 -> DNS Query', verdict: 'PASS' },
  ]);

  const currentProg: EbpfProgram = EBPF_PROGRAMS.find((p) => p.id === selectedProgId) || EBPF_PROGRAMS[0];

  const handleInjectPacket = (type: 'NORMAL' | 'SYN_FLOOD') => {
    const isFlood = type === 'SYN_FLOOD';
    const nextId = packetsTotal + 1;
    const verdict = isFlood ? 'DROP' : 'PASS';

    setPacketsTotal((prev) => prev + 1);
    if (isFlood) setPacketsDropped((prev) => prev + 1);
    else setPacketsPassed((prev) => prev + 1);

    const logEntry = {
      id: nextId,
      text: isFlood
        ? `TCP 203.0.113.${Math.floor(Math.random() * 254)}:80 -> SYN without ACK`
        : `TCP 192.168.1.${Math.floor(Math.random() * 254)}:443 -> PSH+ACK HTTP Data`,
      verdict: verdict as 'PASS' | 'DROP',
    };

    setEventLog((prev) => [logEntry, ...prev.slice(0, 9)]);
  };

  const handleResetCounters = () => {
    setPacketsTotal(0);
    setPacketsDropped(0);
    setPacketsPassed(0);
    setEventLog([]);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span>EBPF (EXTENDED BERKELEY PACKET FILTER)</span>
            <span aria-hidden="true">·</span>
            <span>IN-KERNEL JIT ENGINE</span>
            <span aria-hidden="true">·</span>
            <span>KERNEL/BPF/VERIFIER.C</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Safe In-Kernel Programmability, Verifier & XDP Filtering
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
            eBPF turns the Linux kernel into a programmable operating system. Programs attach to hooks (XDP, kprobes, tracepoints, LSM)
            and run with near-zero overhead after the in-kernel verifier proves mathematically that they cannot crash or hang the system.
          </p>
        </div>
      </section>

      {/* Program Selector Tabs */}
      <div className="flex items-center gap-3">
        {EBPF_PROGRAMS.map((prog) => (
          <button
            key={prog.id}
            onClick={() => setSelectedProgId(prog.id)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all border ${
              selectedProgId === prog.id
                ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <div className="font-bold">{prog.name}</div>
            <div className="text-[10px] text-slate-400">{prog.type}</div>
          </button>
        ))}
      </div>

      {/* Main Grid: Code / Verifier on Left, Live In-Kernel Simulator on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code, Bytecode, Verifier Log */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white font-mono">{currentProg.name}</h3>
              <div className="text-[11px] text-slate-400 font-mono">Hook: {currentProg.hookPoint}</div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('c_source')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'c_source' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                C Source
              </button>
              <button
                onClick={() => setActiveTab('bytecode')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'bytecode' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                eBPF Bytecode
              </button>
              <button
                onClick={() => setActiveTab('verifier')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'verifier' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Verifier Log
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-300 font-mono leading-relaxed">
            {currentProg.description}
          </p>

          {/* Tab 1: C Source */}
          {activeTab === 'c_source' && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed bg-[#06090e]">
                <code>{currentProg.cCode}</code>
              </pre>
            </div>
          )}

          {/* Tab 2: Bytecode Instructions */}
          {activeTab === 'bytecode' && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
              <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-400 font-mono flex justify-between">
                <span>Disassembled 64-bit eBPF Instructions</span>
                <span className="text-cyan-400">JIT Size: {currentProg.jitCompiledSize} B</span>
              </div>
              <div className="divide-y divide-slate-800/60 font-mono text-xs max-h-[360px] overflow-y-auto">
                {currentProg.bytecodeInstructions.map((insn) => (
                  <div key={insn.idx} className="p-2.5 flex items-start gap-4 hover:bg-slate-900/40">
                    <span className="text-slate-500 w-6 shrink-0">{insn.idx}:</span>
                    <span className="text-cyan-300 font-semibold w-28 shrink-0">{insn.insn}</span>
                    <span className="text-white flex-1">{insn.opcode}</span>
                    <span className="text-slate-400 text-[11px] shrink-0">// {insn.comment}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: In-Kernel Verifier Log */}
          {activeTab === 'verifier' && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
              <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-400 font-mono flex justify-between">
                <span>Linux In-Kernel Static Safety Analyzer</span>
                <span className="text-emerald-400 font-semibold">VERIFIED SAFE</span>
              </div>
              <div className="p-4 font-mono text-xs text-slate-300 space-y-1 bg-[#06090e] max-h-[360px] overflow-y-auto leading-relaxed">
                {currentProg.verifierLog.map((line, idx) => (
                  <div
                    key={idx}
                    className={line.includes('VERIFIER SUCCESS') ? 'text-emerald-400 font-bold pt-2' : ''}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live XDP Driver & Filter Simulator */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Live In-Driver Filter Simulation
            </h3>
            <button
              onClick={handleResetCounters}
              className="p-1 text-slate-400 hover:text-white"
              title="Reset Counters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Packet Counters Strip */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Total Packets</div>
              <div className="text-base font-bold text-white tabular-nums mt-0.5">{packetsTotal}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-900/40">
              <div className="text-[10px] text-emerald-400">XDP_PASS</div>
              <div className="text-base font-bold text-emerald-400 tabular-nums mt-0.5">{packetsPassed}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-rose-900/40">
              <div className="text-[10px] text-rose-400">XDP_DROP</div>
              <div className="text-base font-bold text-rose-400 tabular-nums mt-0.5">{packetsDropped}</div>
            </div>
          </div>

          {/* Interactive Injection Controls */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-mono">Simulate Incoming Network Ingress:</label>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <button
                onClick={() => handleInjectPacket('NORMAL')}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Inject Normal Packet</span>
              </button>
              <button
                onClick={() => handleInjectPacket('SYN_FLOOD')}
                className="py-2 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold border border-rose-700/60 transition-colors flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Inject SYN Flood</span>
              </button>
            </div>
          </div>

          {/* Live Packet Log */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400 font-mono">Live NIC Driver Ingress Verdict:</div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/60 font-mono text-xs overflow-hidden">
              {eventLog.map((ev) => (
                <div key={ev.id} className="p-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 truncate max-w-[240px]">{ev.text}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ev.verdict === 'DROP'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {ev.verdict === 'DROP' ? 'XDP_DROP' : 'XDP_PASS'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
