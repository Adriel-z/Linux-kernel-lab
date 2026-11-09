import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Shield, Cpu, Binary, Code2 } from 'lucide-react';
import { ActiveTab } from './TopBar';

interface KernelTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToTab: (tab: ActiveTab) => void;
}

const TOUR_STEPS: {
  title: string;
  subtitle: string;
  content: string;
  targetTab: ActiveTab;
  tabLabel: string;
}[] = [
  {
    title: '1. The Privilege Gate (Ring 3 vs Ring 0)',
    subtitle: 'Hardware Enforced Security Boundaries',
    content: 'The Linux kernel isolates unprivileged user applications (Ring 3) from raw hardware control (Ring 0). When an application needs to allocate RAM, read a file, or transmit a packet, it triggers a hardware trap via the syscall instruction. The CPU atomically elevates to Ring 0 and jumps to entry_SYSCALL_64.',
    targetTab: 'syscall',
    tabLabel: 'Open Syscall Tracer',
  },
  {
    title: '2. The Completely Fair Scheduler (CFS)',
    subtitle: 'kernel/sched/fair.c & Red-Black Tree',
    content: 'Linux models an ideal multi-tasking CPU where every process receives an equal share of processing time. The Completely Fair Scheduler (CFS) tracks virtual runtime (vruntime). On every clock tick, the task with the lowest vruntime (the leftmost node in the RB-tree) is chosen to run next.',
    targetTab: 'cfs',
    tabLabel: 'Open CFS Simulator',
  },
  {
    title: '3. Virtual Memory & 4-Level MMU Paging',
    subtitle: 'mm/ & arch/x86/mm/',
    content: 'Each process operates in an isolated 48-bit virtual address space. The CPU Memory Management Unit (MMU) translates virtual addresses to physical RAM frames via 4 hierarchical tables: PGD -> PUD -> PMD -> PTE. Unallocated memory uses Demand Zero Paging to conserve physical RAM.',
    targetTab: 'mmu',
    tabLabel: 'Open MMU Paging Visualizer',
  },
  {
    title: '4. eBPF: Programmable Kernel Engine',
    subtitle: 'kernel/bpf/',
    content: 'eBPF allows developers to run sandboxed bytecode inside the Linux kernel without rebooting or recompiling. The in-kernel verifier proves safety before execution, enabling ultra-fast line-rate packet drops (XDP) and zero-overhead observability.',
    targetTab: 'ebpf',
    tabLabel: 'Open eBPF Lab',
  },
  {
    title: '5. Virtual Filesystems (/proc & /sys)',
    subtitle: 'fs/proc/ & fs/sysfs/',
    content: 'In Unix and Linux, "everything is a file". The /proc and /sys trees are synthetic filesystems generated on-demand by kernel subsystems to expose CPU, memory, scheduler, and hardware telemetry without special ioctl syscalls.',
    targetTab: 'shell',
    tabLabel: 'Open Diagnostic Shell',
  },
];

export const KernelTourModal: React.FC<KernelTourModalProps> = ({ isOpen, onClose, onJumpToTab }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="text-[11px] font-mono text-cyan-400">LINUX KERNEL CONCEPTUAL GUIDE</div>
            <h2 className="text-lg font-bold text-white">{step.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle & Content */}
        <div className="space-y-3 font-mono text-xs">
          <div className="text-amber-400 font-semibold">{step.subtitle}</div>
          <p className="text-slate-300 leading-relaxed text-sm font-sans">
            {step.content}
          </p>
        </div>

        {/* Jump button */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Explore this subsystem live:</span>
          <button
            onClick={() => {
              onJumpToTab(step.targetTab);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors"
          >
            <span>{step.tabLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress & Nav */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-cyan-400 w-4' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-3 py-1.5 rounded text-slate-400 hover:text-white disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-1.5 font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded transition-colors"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish Guide' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
