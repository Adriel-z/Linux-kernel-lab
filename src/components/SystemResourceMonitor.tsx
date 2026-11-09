import React, { useState, useEffect, useRef } from 'react';
import {
  SystemResourceSnapshot,
  createInitialResourceSnapshot,
  sampleNextResourceSnapshot,
} from '../kernel/monitor';
import { Activity, ChevronUp, ChevronDown, X, Play, Pause, RefreshCw, Cpu, Database, Gauge } from 'lucide-react';

interface SystemResourceMonitorProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SystemResourceMonitor: React.FC<SystemResourceMonitorProps> = ({ isVisible, onClose }) => {
  const [snapshot, setSnapshot] = useState<SystemResourceSnapshot>(createInitialResourceSnapshot);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState<number>(2000);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isVisible || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSnapshot((prev) => sampleNextResourceSnapshot(prev));
    }, refreshIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isVisible, isPaused, refreshIntervalMs]);

  if (!isVisible) return null;

  const usedRamGb = (snapshot.memory.usedMb / 1024).toFixed(1);
  const totalRamGb = (snapshot.memory.totalMb / 1024).toFixed(0);
  const ramPercent = Math.round((snapshot.memory.usedMb / snapshot.memory.totalMb) * 100);

  return (
    <div
      data-testid="system-resource-monitor-widget"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0e17]/95 backdrop-blur-md border-t border-slate-800 shadow-2xl transition-all font-mono"
    >
      {/* Top Bar of the Widget (Header / Compact Strip) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-slate-800/80 text-xs">
        {/* Left: Summary telemetry */}
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-white tracking-wide">SYSTEM RESOURCE MONITOR</span>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">CPU:</span>
              <span className={`font-semibold tabular-nums ${snapshot.overallCpuPercent > 70 ? 'text-rose-400' : 'text-cyan-400'}`}>
                {snapshot.overallCpuPercent.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">RAM:</span>
              <span className="font-semibold text-emerald-400 tabular-nums">
                {usedRamGb}G/{totalRamGb}G ({ramPercent}%)
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-slate-400">PSI CPU:</span>
              <span className="text-amber-400 font-semibold tabular-nums">
                {snapshot.cpuPressure.some10.toFixed(2)}%
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-slate-400">PSI MEM:</span>
              <span className="text-amber-400 font-semibold tabular-nums">
                {snapshot.memory.pressure.some10.toFixed(2)}%
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5">
              <span className="text-slate-400">Load:</span>
              <span className="text-slate-200 tabular-nums">
                {snapshot.loadAverage[0].toFixed(2)}, {snapshot.loadAverage[1].toFixed(2)}, {snapshot.loadAverage[2].toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls (Pause/Resume, Interval, Expand/Collapse, Close) */}
        <div className="flex items-center gap-2">
          {/* Refresh interval selector */}
          <select
            value={refreshIntervalMs}
            onChange={(e) => setRefreshIntervalMs(parseInt(e.target.value, 10))}
            className="hidden sm:block px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] focus:outline-none focus:border-cyan-400"
            title="Sampling rate"
          >
            <option value={1000}>1s tick</option>
            <option value={2000}>2s tick</option>
            <option value={5000}>5s tick</option>
          </select>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isPaused ? 'Resume monitoring' : 'Pause monitoring'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
            title="Hide monitor"
            aria-label="Close resource monitor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Metrics Details Drawer */}
      {isExpanded && (
        <div className="px-4 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[380px] overflow-y-auto">
          {/* Column 1: CPU Utilization & Per-Core Breakdown */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                <Cpu className="w-3.5 h-3.5" />
                <span>CPU CORES (4x AMD EPYC)</span>
              </div>
              <span className="text-slate-400 tabular-nums">{snapshot.overallCpuPercent.toFixed(1)}% Total</span>
            </div>

            {/* Per-Core Bars */}
            <div className="space-y-2">
              {snapshot.cores.map((core) => {
                const activePercent = Math.min(100, core.user + core.system);
                return (
                  <div key={core.coreId} className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span>Core {core.coreId} ({core.frequencyMhz}MHz)</span>
                      <span className="tabular-nums text-slate-400">
                        usr {core.user}% · sys {core.system}%
                      </span>
                    </div>
                    {/* Visual bar */}
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-cyan-400 transition-all duration-300"
                        style={{ width: `${core.user}%` }}
                        title={`User: ${core.user}%`}
                      />
                      <div
                        className="bg-indigo-400 transition-all duration-300"
                        style={{ width: `${core.system}%` }}
                        title={`System: ${core.system}%`}
                      />
                      <div
                        className="bg-amber-500 transition-all duration-300"
                        style={{ width: `${core.iowait}%` }}
                        title={`IO Wait: ${core.iowait}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Context Switches & Interrupts */}
            <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[10px] text-slate-400">
              <span>Ctx Switches: <strong className="text-slate-200">{snapshot.contextSwitchesPerSec}/s</strong></span>
              <span>Interrupts: <strong className="text-slate-200">{snapshot.interruptsPerSec}/s</strong></span>
            </div>
          </div>

          {/* Column 2: Memory Breakdown (VFS Page Cache, Anon, Slab) */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Database className="w-3.5 h-3.5" />
                <span>MEMORY BREAKDOWN (/proc/meminfo)</span>
              </div>
              <span className="text-slate-400 tabular-nums">{ramPercent}% Used</span>
            </div>

            {/* Memory Composition Bar */}
            <div className="space-y-1 text-[11px]">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-400 transition-all duration-300"
                  style={{ width: `${(snapshot.memory.usedMb / snapshot.memory.totalMb) * 100}%` }}
                  title={`Anon/Used: ${snapshot.memory.usedMb} MB`}
                />
                <div
                  className="bg-cyan-500 transition-all duration-300"
                  style={{ width: `${(snapshot.memory.cachedMb / snapshot.memory.totalMb) * 100}%` }}
                  title={`Cached: ${snapshot.memory.cachedMb} MB`}
                />
                <div
                  className="bg-purple-500 transition-all duration-300"
                  style={{ width: `${(snapshot.memory.slabMb / snapshot.memory.totalMb) * 100}%` }}
                  title={`Slab: ${snapshot.memory.slabMb} MB`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span className="text-emerald-400">■ Anon: {snapshot.memory.usedMb}MB</span>
                <span className="text-cyan-400">■ Cached: {snapshot.memory.cachedMb}MB</span>
                <span className="text-purple-400">■ Slab: {snapshot.memory.slabMb}MB</span>
              </div>
            </div>

            {/* Memory Table */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">MemAvailable</div>
                <div className="text-white font-bold tabular-nums">{(snapshot.memory.availableMb / 1024).toFixed(1)} GB</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">MemFree</div>
                <div className="text-white font-bold tabular-nums">{(snapshot.memory.freeMb / 1024).toFixed(1)} GB</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Dirty Pages</div>
                <div className="text-slate-300 tabular-nums">{snapshot.memory.dirtyMb} MB</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                <div className="text-[10px] text-slate-500">Swap Used</div>
                <div className="text-slate-300 tabular-nums">{snapshot.memory.swapUsedMb} / {snapshot.memory.swapTotalMb} MB</div>
              </div>
            </div>
          </div>

          {/* Column 3: PSI (Pressure Stall Information) */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Gauge className="w-3.5 h-3.5" />
                <span>PSI PRESSURE STALLS (/proc/pressure)</span>
              </div>
              <span className="text-[10px] text-slate-500">Kernel 4.20+</span>
            </div>

            {/* CPU Pressure Box */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span className="font-semibold text-white">/proc/pressure/cpu</span>
                <span className="text-amber-400 font-bold tabular-nums">some: {snapshot.cpuPressure.some10}%</span>
              </div>
              <div className="text-[10px] text-slate-400">
                avg10: {snapshot.cpuPressure.some10}% · avg60: {snapshot.cpuPressure.some60}% · avg300: {snapshot.cpuPressure.some300}%
              </div>
              <div className="text-[9px] text-slate-500">
                Total CPU stall time: {snapshot.cpuPressure.totalStallUs.toLocaleString()} µs
              </div>
            </div>

            {/* Memory Pressure Box */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span className="font-semibold text-white">/proc/pressure/memory</span>
                <span className="text-amber-400 font-bold tabular-nums">some: {snapshot.memory.pressure.some10}%</span>
              </div>
              <div className="text-[10px] text-slate-400">
                avg10: {snapshot.memory.pressure.some10}% · full10: {snapshot.memory.pressure.full10 ?? 0}%
              </div>
              <div className="text-[9px] text-slate-500">
                Tasks stalled on page reclaim / swap: {snapshot.memory.pressure.totalStallUs.toLocaleString()} µs
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
