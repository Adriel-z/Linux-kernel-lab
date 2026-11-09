import React, { useState } from 'react';
import { KERNEL_SUBSYSTEMS, KernelSubsystem } from '../kernel/subsystems';
import { ActiveTab } from './TopBar';
import { Layers, ArrowRight, Code2, Cpu, HardDrive, Network, Binary, ShieldCheck, Terminal, FolderTree } from 'lucide-react';

interface ArchitectureViewProps {
  onSelectSimulator: (tab: ActiveTab) => void;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ onSelectSimulator }) => {
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string>('process-cfs');

  const selected = KERNEL_SUBSYSTEMS.find((s) => s.id === selectedSubsystemId) || KERNEL_SUBSYSTEMS[0];

  const getSubsystemIcon = (id: string) => {
    switch (id) {
      case 'process-cfs':
        return <Cpu className="w-5 h-5 text-amber-400" />;
      case 'memory-mm':
        return <Binary className="w-5 h-5 text-cyan-400" />;
      case 'vfs-fs':
        return <HardDrive className="w-5 h-5 text-emerald-400" />;
      case 'syscall-trap':
        return <ShieldCheck className="w-5 h-5 text-indigo-400" />;
      case 'ebpf-subsystem':
        return <Code2 className="w-5 h-5 text-purple-400" />;
      case 'network-stack':
        return <Network className="w-5 h-5 text-sky-400" />;
      default:
        return <Layers className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Intro hero banner */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800">
        <div className="max-w-4xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-wide">
            <span>LINUX 6.11 KERNEL ARCHITECTURE</span>
            <span aria-hidden="true">·</span>
            <span>MONOLITHIC DESIGN</span>
            <span aria-hidden="true">·</span>
            <span>LOADABLE KERNEL MODULES (LKM)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white text-balance">
            Interactive Subsystem Map & Kernel Call Flow
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-3xl">
            The Linux kernel bridges user applications and computer hardware through hardware privilege rings (Ring 3 vs Ring 0).
            Select any subsystem below to explore its data structures, source file paths, and live interactive algorithms.
          </p>
        </div>
      </section>

      {/* Main split: Architectural Stack on Left, Subsystem Deep-Dive on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Architecture Stack */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Privilege Levels & System Layers
          </h2>

          {/* Layer 1: User Space (Ring 3) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400 font-semibold">USER SPACE (CPL = 3)</span>
              <span className="text-slate-400">Unprivileged</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-800/80 border border-slate-700/60 text-slate-200 text-center font-mono">
                User Apps (Web, DB, CLI)
              </div>
              <div className="p-2 rounded bg-slate-800/80 border border-slate-700/60 text-slate-200 text-center font-mono">
                glibc / musl
              </div>
              <div className="p-2 rounded bg-slate-800/80 border border-slate-700/60 text-slate-200 text-center font-mono">
                System Daemons
              </div>
            </div>
          </div>

          {/* Boundary: System Call Interface */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="w-full border-t border-dashed border-cyan-500/40" />
            <button
              onClick={() => setSelectedSubsystemId('syscall-trap')}
              className={`absolute px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all shadow-sm ${
                selectedSubsystemId === 'syscall-trap'
                  ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400'
                  : 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-cyan-500/40'
              }`}
            >
              System Call Gate (syscall instruction / MSR_LSTAR)
            </button>
          </div>

          {/* Layer 2: Core Kernel (Ring 0) */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-semibold">KERNEL SPACE (CPL = 0)</span>
              <span className="text-slate-400">Monolithic Subsystems</span>
            </div>

            <div className="space-y-2">
              {KERNEL_SUBSYSTEMS.filter((s) => s.layer === 'Core Kernel').map((sub) => {
                const isSelected = sub.id === selectedSubsystemId;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubsystemId(sub.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-sm'
                        : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getSubsystemIcon(sub.id)}
                      <div>
                        <div className="text-xs font-semibold text-white">{sub.name}</div>
                        <div className="text-[11px] text-slate-400">{sub.brief}</div>
                      </div>
                    </div>
                    <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-cyan-400 translate-x-1' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layer 3: Hardware Abstraction & CPU Rings */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">HARDWARE PLATFORM</span>
              <span className="text-slate-400">x86-64 / ARM64</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[11px] font-mono text-center text-slate-300">
              <div className="p-2 rounded bg-slate-800/60 border border-slate-700/40">CPU Cores & TLB</div>
              <div className="p-2 rounded bg-slate-800/60 border border-slate-700/40">DRAM Memory</div>
              <div className="p-2 rounded bg-slate-800/60 border border-slate-700/40">NVMe / Disk</div>
              <div className="p-2 rounded bg-slate-800/60 border border-slate-700/40">NIC & Ethernet</div>
            </div>
          </div>
        </div>

        {/* Right Column: Subsystem Deep Dive & Code Inspector */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  {getSubsystemIcon(selected.id)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selected.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{selected.layer}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-cyan-400">{selected.sourceDirectories.join(', ')}</span>
                  </div>
                </div>
              </div>

              {selected.interactiveSimId && (
                <button
                  onClick={() => onSelectSimulator(selected.interactiveSimId!)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
                >
                  <span>Open Interactive Simulator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Architecture & Role</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
            </div>

            {/* Primary Algorithms */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Key Kernel Algorithms</h4>
              <div className="space-y-1.5">
                {selected.primaryAlgorithms.map((algo, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="text-cyan-400 font-mono mt-0.5">0{idx + 1}.</span>
                    <span>{algo}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Data Structures with real C code */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Core Kernel C Data Structures</h4>
              <div className="space-y-4">
                {selected.keyDataStructures.map((struct, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 text-xs font-mono">
                      <span className="text-cyan-300 font-semibold">{struct.name}</span>
                      <span className="text-slate-400">{struct.definedIn}</span>
                    </div>
                    <div className="p-3 text-xs text-slate-400 border-b border-slate-800/60">
                      {struct.description}
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed bg-[#06090e]">
                      <code>{struct.codeSnippet}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
