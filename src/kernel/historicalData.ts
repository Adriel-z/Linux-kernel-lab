/**
 * Historical Linux telemetry generator for CPU load, memory usage, and PSI metrics
 */

export interface TelemetryDataPoint {
  timestamp: number;
  timeLabel: string;
  cpuPercent: number;
  load1m: number;
  load5m: number;
  load15m: number;
  usedRamGb: number;
  cachedRamGb: number;
  freeRamGb: number;
  totalRamGb: number;
  cpuPressure: number;
  memPressure: number;
}

export interface TelemetrySummary {
  peakCpuPercent: number;
  avgCpuPercent: number;
  peakLoad1m: number;
  currentUsedRamGb: number;
  avgRamGb: number;
  totalDataPoints: number;
}

export function generateHistoricalTelemetry(pointsCount: number = 30): TelemetryDataPoint[] {
  const points: TelemetryDataPoint[] = [];
  const now = Date.now();
  const stepMs = 60 * 1000; // 1 minute intervals

  let cpuVal = 12.0;
  let load1m = 0.42;
  let load5m = 0.35;
  let load15m = 0.28;
  let usedRam = 3.2;

  for (let i = pointsCount - 1; i >= 0; i--) {
    const t = now - i * stepMs;
    const date = new Date(t);
    const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    // Natural random walk with mean-reversion
    const deltaCpu = (Math.random() - 0.5) * 6;
    cpuVal = Math.max(4, Math.min(65, cpuVal + deltaCpu));

    const targetLoad = cpuVal / 25;
    load1m = Math.round((load1m * 0.9 + targetLoad * 0.1) * 100) / 100;
    load5m = Math.round((load5m * 0.95 + targetLoad * 0.05) * 100) / 100;
    load15m = Math.round((load15m * 0.98 + targetLoad * 0.02) * 100) / 100;

    const deltaRam = (Math.random() - 0.5) * 0.15;
    usedRam = Math.max(2.4, Math.min(8.0, usedRam + deltaRam));

    const cachedRam = 4.0;
    const totalRam = 16.0;
    const freeRam = Math.max(0.5, totalRam - usedRam - cachedRam);

    const cpuPressure = Math.round((cpuVal > 40 ? (cpuVal - 40) * 0.25 : 0.08 + Math.random() * 0.05) * 100) / 100;
    const memPressure = Math.round((0.02 + Math.random() * 0.04) * 100) / 100;

    points.push({
      timestamp: t,
      timeLabel,
      cpuPercent: Math.round(cpuVal * 10) / 10,
      load1m,
      load5m,
      load15m,
      usedRamGb: Math.round(usedRam * 100) / 100,
      cachedRamGb: cachedRam,
      freeRamGb: Math.round(freeRam * 100) / 100,
      totalRamGb: totalRam,
      cpuPressure,
      memPressure,
    });
  }

  return points;
}

export function computeTelemetrySummary(data: TelemetryDataPoint[]): TelemetrySummary {
  if (data.length === 0) {
    return {
      peakCpuPercent: 0,
      avgCpuPercent: 0,
      peakLoad1m: 0,
      currentUsedRamGb: 0,
      avgRamGb: 0,
      totalDataPoints: 0,
    };
  }

  const peakCpu = Math.max(...data.map((d) => d.cpuPercent));
  const avgCpu = Math.round((data.reduce((sum, d) => sum + d.cpuPercent, 0) / data.length) * 10) / 10;
  const peakLoad = Math.max(...data.map((d) => d.load1m));
  const currentRam = data[data.length - 1].usedRamGb;
  const avgRam = Math.round((data.reduce((sum, d) => sum + d.usedRamGb, 0) / data.length) * 100) / 100;

  return {
    peakCpuPercent: peakCpu,
    avgCpuPercent: avgCpu,
    peakLoad1m: peakLoad,
    currentUsedRamGb: currentRam,
    avgRamGb: avgRam,
    totalDataPoints: data.length,
  };
}
