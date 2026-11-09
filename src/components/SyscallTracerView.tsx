import React, { useState } from 'react';
import { LINUX_SYSCALLS, SyscallDef, runSyscallTrace, TraceStep } from '../kernel/syscalls';
import { ShieldCheck, Play, ArrowRight, ArrowLeft, RotateCcw, Cpu, CheckCircle2 } from 'lucide-react';

export const SyscallTracerView: React.FC = () => {
  const [selectedSyscallNr, setSelectedSyscallNr] = useState<number>(0);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [customArgs, setCustomArgs] = useState<Record<string, string>>({});

  const currentDef: SyscallDef = LINUX_SYSCALLS.find((s) => s.nr === selectedSyscallNr) || LINUX_SYSCALLS[0];

  const steps: TraceStep[] = runSyscallTrace(currentDef, customArgs);
  const activeStep = steps[currentStepIdx] || steps[0];

  const handleSelectSyscall = (nr: number) => {
    setSelectedSyscallNr(nr);
    setCurrentStepIdx(0);
    setCustomArgs({});
  };

  const handleArgChange = (argName: string, val: string) => {
    setCustomArgs((prev) => ({ ...prev, [argName]: val }));
  };

  const handleReset = () => {
    setCurrentStepIdx(0);
    setCustomArgs({});
  };

  return (
    <div className="space-y-8">
      {/* Overview header */}
      <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span>SYSTEM CALL TRACER</span>
            <span aria-hidden="true">·</span>
            <span>RING 3 TO RING 0 TRAP</span>
            <span aria-hidden="true">·</span>
            <span>ARCH/X86/ENTRY/ENTRY_64.S</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            x86-64 System Call Trap & Privilege Level Transition
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
            When a user program issues a syscall, hardware executes an atomic transition from unprivileged Ring 3 to Ring 0 kernel mode.
            Step through register snapshots, stack switches, <code className="text-cyan-300 font-mono">sys_call_table</code> dispatch, and kernel C implementation.
          </p>
        </div>
      </section>

      {/* Syscall Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {LINUX_SYSCALLS.map((s) => (
          <button
            key={s.nr}
            onClick={() => handleSelectSyscall(s.nr)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all border ${
              selectedSyscallNr === s.nr
                ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <span className="text-slate-500 mr-1.5">NR {s.nr}</span>
            <span>{s.name}()</span>
          </button>
        ))}
      </div>

      {/* Step Progress Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Transition Pipeline</span>
          <span className="text-cyan-400">Step {currentStepIdx + 1} of {steps.length}: {activeStep.ring}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <button
                key={idx}
                onClick={() => setCurrentStepIdx(idx)}
                className={`p-2.5 rounded-lg text-left text-[11px] border transition-all ${
                  isCurrent
                    ? 'bg-cyan-500/20 border-cyan-400 text-white ring-1 ring-cyan-400'
                    : isCompleted
                    ? 'bg-slate-950 border-cyan-800/40 text-cyan-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">0{idx + 1}</span>
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                </div>
                <div className="truncate font-semibold">{step.title.split('. ')[1]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Active Step Details & Register Snapshot vs Kernel C Code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stage Explanation & CPU Registers */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                activeStep.ring.includes('User')
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}>
                {activeStep.ring}
              </span>
              <h3 className="text-base font-bold text-white mt-1.5">{activeStep.title}</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStepIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentStepIdx === 0}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700"
                title="Previous Step"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1))}
                disabled={currentStepIdx === steps.length - 1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 transition-colors"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
                title="Reset Flow"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono">
            {activeStep.details}
          </div>

          {/* Active Registers Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              CPU Register State (AMD64 ABI)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              {Object.entries(activeStep.registers).map(([reg, val]) => (
                <div key={reg} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-cyan-400 font-semibold">{reg}</div>
                  <div className="text-white font-medium truncate mt-0.5" title={val}>
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Syscall Argument Overrides */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Syscall Parameters ({currentDef.args.length} Arguments)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              {currentDef.args.map((arg) => (
                <div key={arg.name} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-amber-400 font-semibold">{arg.name}</span>
                    <span className="text-slate-500">{arg.reg}</span>
                  </div>
                  <input
                    type="text"
                    value={customArgs[arg.name] ?? arg.defaultVal}
                    onChange={(e) => handleArgChange(arg.name, e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                  />
                  <div className="text-[10px] text-slate-400 truncate">{arg.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Linux Kernel C Source Cross-Reference */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              In-Kernel C Implementation
            </h3>
            <span className="text-xs font-mono text-cyan-400 truncate max-w-[200px]">
              {currentDef.kernelFile}
            </span>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            {currentDef.signature}
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed bg-[#06090e]">
              <code>{currentDef.cSourceSnippet}</code>
            </pre>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed font-mono">
            <span className="text-cyan-400 font-semibold">Security Boundary: </span>
            Before dereferencing user buffer pointers in kernel mode, the kernel runs <code className="text-slate-300">access_ok()</code> to prevent Meltdown or arbitrary kernel write attacks.
          </div>
        </div>
      </div>
    </div>
  );
};
