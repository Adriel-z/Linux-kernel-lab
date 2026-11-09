import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  generateHistoricalTelemetry,
  computeTelemetrySummary,
  TelemetryDataPoint,
} from '../kernel/historicalData';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Gauge,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface HistoricalTelemetryGraphProps {
  contextName: 'Architecture' | 'Syscall';
  onDismiss?: () => void;
}

export const HistoricalTelemetryGraph: React.FC<HistoricalTelemetryGraphProps> = ({
  contextName,
  onDismiss,
}) => {
  const [dataPointsCount, setDataPointsCount] = useState<number>(30);
  const [activeMetric, setActiveMetric] = useState<'combined' | 'cpu_load' | 'memory' | 'pressure'>('combined');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Generate deterministic dataset based on points count
  const telemetryData = useMemo(() => {
    return generateHistoricalTelemetry(dataPointsCount);
  }, [dataPointsCount]);

  const summary = useMemo(() => {
    return computeTelemetrySummary(telemetryData);
  }, [telemetryData]);

  // Custom dark-mode Recharts Tooltip
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="p-3 rounded-xl bg-slate-950/95 border border-slate-700 shadow-xl font-mono text-xs space-y-1.5 backdrop-blur-md">
        <div className="text-[11px] text-slate-400 font-semibold border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
          <span>Time: {label}</span>
          <span className="text-cyan-400 text-[10px]">Linux Telemetry</span>
        </div>
        {payload.map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 text-[11px]">
            <span style={{ color: item.color }} className="font-medium">
              {item.name}:
            </span>
            <span className="text-white font-bold tabular-nums">
              {typeof item.value === 'number' ? (item.value % 1 === 0 ? item.value : item.value.toFixed(2)) : item.value}
              {item.unit || ''}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      data-testid="historical-telemetry-graph-widget"
      className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 font-mono shadow-xl transition-all"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-cyan-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-white tracking-wide">HISTORICAL RESOURCE CONTEXT</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-cyan-400 text-[11px] font-semibold">
                Injected for {contextName} Tab
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
              Historical multi-minute telemetry showing CPU utilization, runqueue load averages, and memory pressure.
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Time range selector */}
          <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setDataPointsCount(15)}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                dataPointsCount === 15 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              15m
            </button>
            <button
              onClick={() => setDataPointsCount(30)}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                dataPointsCount === 30 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              30m
            </button>
            <button
              onClick={() => setDataPointsCount(60)}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                dataPointsCount === 60 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              1h
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title={isCollapsed ? 'Expand graph' : 'Collapse graph'}
            aria-label={isCollapsed ? 'Expand graph' : 'Collapse graph'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-4">
          {/* Top KPI Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[10px] text-slate-400">Peak CPU Util</div>
              <div className="text-sm font-bold text-cyan-400 tabular-nums mt-0.5">
                {summary.peakCpuPercent.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Avg: {summary.avgCpuPercent.toFixed(1)}%</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[10px] text-slate-400">Peak 1m Load</div>
              <div className="text-sm font-bold text-amber-400 tabular-nums mt-0.5">
                {summary.peakLoad1m.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Target: &lt; 4.0 (4 cores)</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[10px] text-slate-400">Memory RSS (Anon)</div>
              <div className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">
                {summary.currentUsedRamGb.toFixed(2)} GB
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Avg: {summary.avgRamGb.toFixed(2)} GB</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[10px] text-slate-400">Total System RAM</div>
              <div className="text-sm font-bold text-white tabular-nums mt-0.5">16.0 GB</div>
              <div className="text-[10px] text-slate-500 mt-0.5">4.0 GB Page Cache</div>
            </div>
          </div>

          {/* Metric View Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveMetric('combined')}
              className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                activeMetric === 'combined'
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Combined CPU &amp; RAM
            </button>
            <button
              onClick={() => setActiveMetric('cpu_load')}
              className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                activeMetric === 'cpu_load'
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Load Averages (1m, 5m, 15m)
            </button>
            <button
              onClick={() => setActiveMetric('memory')}
              className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                activeMetric === 'memory'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Memory Composition (GB)
            </button>
            <button
              onClick={() => setActiveMetric('pressure')}
              className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                activeMetric === 'pressure'
                  ? 'bg-purple-950/60 border-purple-500/50 text-purple-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              PSI Pressure Stalls (%)
            </button>
          </div>

          {/* Recharts Canvas */}
          <div className="h-[240px] w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5">
            <ResponsiveContainer width="100%" height="100%">
              {activeMetric === 'combined' ? (
                <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#22d3ee" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                  <YAxis yAxisId="right" orientation="right" stroke="#34d399" tick={{ fontSize: 10 }} domain={[0, 16]} unit="G" />
                  <Tooltip content={renderCustomTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="cpuPercent"
                    name="CPU Utilization"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCpu)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="usedRamGb"
                    name="RAM In-Use"
                    stroke="#34d399"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRam)"
                  />
                </AreaChart>
              ) : activeMetric === 'cpu_load' ? (
                <LineChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#f59e0b" tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                  <Tooltip content={renderCustomTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Line
                    type="monotone"
                    dataKey="load1m"
                    name="Load 1m"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="load5m"
                    name="Load 5m"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="load15m"
                    name="Load 15m"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              ) : activeMetric === 'memory' ? (
                <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAnon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorCached" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 16]} unit="G" />
                  <Tooltip content={renderCustomTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Area
                    type="monotone"
                    dataKey="usedRamGb"
                    name="Anonymous RAM"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorAnon)"
                  />
                  <Area
                    type="monotone"
                    dataKey="cachedRamGb"
                    name="Page Cache"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#colorCached)"
                  />
                </AreaChart>
              ) : (
                <LineChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#c084fc" tick={{ fontSize: 10 }} unit="%" domain={[0, 'auto']} />
                  <Tooltip content={renderCustomTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Line
                    type="monotone"
                    dataKey="cpuPressure"
                    name="CPU PSI Stalls (%)"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="memPressure"
                    name="Memory PSI Stalls (%)"
                    stroke="#c084fc"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
