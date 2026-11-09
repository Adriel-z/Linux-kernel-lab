import React from 'react';
import { Cpu, Terminal, Play, Layers, Compass } from 'lucide-react';

export type ActiveTab = 'architecture' | 'cfs' | 'mmu' | 'syscall' | 'ebpf' | 'shell' | 'dmesg';

interface TopBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuickTour: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, setActiveTab, onOpenQuickTour }) => {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'architecture', label: 'Architecture Map' },
    { id: 'cfs', label: 'CFS Scheduler' },
    { id: 'mmu', label: 'Virtual Memory' },
    { id: 'syscall', label: 'Syscall Tracer' },
    { id: 'ebpf', label: 'eBPF Engine' },
    { id: 'shell', label: 'Kernel Shell' },
    { id: 'dmesg', label: 'dmesg Console' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        {/* Zone 1: Single text element Brand wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <button
            onClick={() => setActiveTab('architecture')}
            className="text-base font-bold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap text-left"
            aria-label="Linux Kernel Lab Home"
          >
            Linux Kernel Lab
          </button>
        </div>

        {/* Zone 2: Desktop 4-6 concise single-line nav links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                  isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenQuickTour}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-cyan-900/30"
            aria-label="Open Guided Architecture Tour"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Kernel Guide</span>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Navigation Strip */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto px-4 py-2 border-t border-slate-800/80 bg-slate-950/50 text-xs font-medium">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1 rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
