import React, { useState } from 'react';
import { TopBar, ActiveTab } from './components/TopBar';
import { ArchitectureView } from './components/ArchitectureView';
import { CfsSimulatorView } from './components/CfsSimulatorView';
import { VirtualMemoryView } from './components/VirtualMemoryView';
import { SyscallTracerView } from './components/SyscallTracerView';
import { EbpfLabView } from './components/EbpfLabView';
import { KernelShellView } from './components/KernelShellView';
import { KernelDmesgConsole } from './components/KernelDmesgConsole';
import { HistoricalTelemetryGraph } from './components/HistoricalTelemetryGraph';
import { KernelTourModal } from './components/KernelTourModal';
import { SystemResourceMonitor } from './components/SystemResourceMonitor';
import { Activity } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('architecture');
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isMonitorVisible, setIsMonitorVisible] = useState<boolean>(true);

  return (
    <div className={`min-h-screen bg-[#070a10] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 ${
      isMonitorVisible ? 'pb-24' : ''
    }`}>
      {/* Top Bar adhering to 3-zone Top Bar Contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickTour={() => setIsTourOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Historical Context Graph injected when Architecture or Syscall tab is active */}
        {(activeTab === 'architecture' || activeTab === 'syscall') && (
          <HistoricalTelemetryGraph
            contextName={activeTab === 'architecture' ? 'Architecture' : 'Syscall'}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureView onSelectSimulator={(simId) => setActiveTab(simId)} />
        )}
        {activeTab === 'cfs' && <CfsSimulatorView />}
        {activeTab === 'mmu' && <VirtualMemoryView />}
        {activeTab === 'syscall' && <SyscallTracerView />}
        {activeTab === 'ebpf' && <EbpfLabView />}
        {activeTab === 'shell' && <KernelShellView />}
        {activeTab === 'dmesg' && <KernelDmesgConsole />}
      </main>

      {/* Concept Tour Modal */}
      <KernelTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onJumpToTab={(tab) => setActiveTab(tab)}
      />

      {/* Real-time System Resource Monitor Widget (toggled to appear in footer) */}
      <SystemResourceMonitor
        isVisible={isMonitorVisible}
        onClose={() => setIsMonitorVisible(false)}
      />

      {/* Dashboard Footer with Resource Monitor Toggle */}
      <footer className="mt-auto border-t border-slate-900 bg-[#05070c] py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span>Linux Kernel Architecture Lab</span>
            <span aria-hidden="true">·</span>
            <span>Kernel 6.11 Reference</span>
            <span aria-hidden="true">·</span>
            <span>GPLv2 Licensed Principles</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-slate-500">
              x86-64 · MMU · CFS · PSI
            </span>

            {/* Toggle button for System Resource Monitor */}
            <button
              onClick={() => setIsMonitorVisible(!isMonitorVisible)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                isMonitorVisible
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Toggle System Resource Monitor widget in dashboard footer"
            >
              <Activity className={`w-3.5 h-3.5 ${isMonitorVisible ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
              <span>Resource Monitor: {isMonitorVisible ? 'Active' : 'Hidden'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
