/**
 * Linux System Resource Monitor & PSI (Pressure Stall Information) Engine
 * Models real Linux kernel /proc/pressure metrics, CPU per-core utilization, and memory breakdown
 */

export interface CpuCoreMetrics {
  coreId: number;
  user: number;    // %
  system: number;  // %
  idle: number;    // %
  iowait: number;  // %
  frequencyMhz: number;
}

export interface PsiPressure {
  some10: number;  // avg10 in %
  some60: number;  // avg60 in %
  some300: number; // avg300 in %
  totalStallUs: number; // microseconds
  full10?: number;
  full60?: number;
}

export interface MemoryMetrics {
  totalMb: number;
  usedMb: number;
  freeMb: number;
  cachedMb: number;
  buffersMb: number;
  availableMb: number;
  dirtyMb: number;
  slabMb: number;
  swapTotalMb: number;
  swapUsedMb: number;
  pressure: PsiPressure;
}

export interface SystemResourceSnapshot {
  timestamp: number;
  loadAverage: [number, number, number]; // 1m, 5m, 15m
  overallCpuPercent: number;
  cores: CpuCoreMetrics[];
  cpuPressure: PsiPressure;
  memory: MemoryMetrics;
  contextSwitchesPerSec: number;
  interruptsPerSec: number;
}

export function createInitialResourceSnapshot(): SystemResourceSnapshot {
  return {
    timestamp: Date.now(),
    loadAverage: [0.34, 0.28, 0.19],
    overallCpuPercent: 8.4,
    cores: [
      { coreId: 0, user: 6.2, system: 3.1, idle: 90.5, iowait: 0.2, frequencyMhz: 2445 },
      { coreId: 1, user: 4.8, system: 2.4, idle: 92.6, iowait: 0.2, frequencyMhz: 2445 },
      { coreId: 2, user: 7.5, system: 4.0, idle: 88.2, iowait: 0.3, frequencyMhz: 2445 },
      { coreId: 3, user: 5.1, system: 2.1, idle: 92.7, iowait: 0.1, frequencyMhz: 2445 },
    ],
    cpuPressure: {
      some10: 0.12,
      some60: 0.08,
      some300: 0.04,
      totalStallUs: 14280,
    },
    memory: {
      totalMb: 16000,
      usedMb: 3436,
      freeMb: 8224,
      cachedMb: 4000,
      buffersMb: 340,
      availableMb: 12564,
      dirtyMb: 64,
      slabMb: 512,
      swapTotalMb: 4096,
      swapUsedMb: 0,
      pressure: {
        some10: 0.02,
        some60: 0.01,
        some300: 0.00,
        full10: 0.00,
        full60: 0.00,
        totalStallUs: 3410,
      },
    },
    contextSwitchesPerSec: 1840,
    interruptsPerSec: 920,
  };
}

export function sampleNextResourceSnapshot(prev: SystemResourceSnapshot): SystemResourceSnapshot {
  // Drift CPU slightly with natural smoothing
  const randomShift = (range: number) => (Math.random() - 0.5) * range;

  const newCores: CpuCoreMetrics[] = prev.cores.map((core) => {
    const rawUser = Math.max(1, Math.min(60, core.user + randomShift(4)));
    const rawSys = Math.max(0.5, Math.min(30, core.system + randomShift(2)));
    const rawIowait = Math.max(0, Math.min(10, core.iowait + randomShift(0.5)));
    const idle = Math.max(0, 100 - rawUser - rawSys - rawIowait);

    return {
      coreId: core.coreId,
      user: Math.round(rawUser * 10) / 10,
      system: Math.round(rawSys * 10) / 10,
      iowait: Math.round(rawIowait * 10) / 10,
      idle: Math.round(idle * 10) / 10,
      frequencyMhz: Math.round(2400 + Math.random() * 80),
    };
  });

  const avgUser = newCores.reduce((sum, c) => sum + c.user, 0) / newCores.length;
  const avgSys = newCores.reduce((sum, c) => sum + c.system, 0) / newCores.length;
  const overallCpu = Math.round((avgUser + avgSys) * 10) / 10;

  // Drift memory slightly (used +/- 20MB)
  const usedDelta = Math.round(randomShift(25));
  const newUsed = Math.max(2000, Math.min(14000, prev.memory.usedMb + usedDelta));
  const newFree = prev.memory.totalMb - newUsed - prev.memory.cachedMb - prev.memory.buffersMb;

  // Calculate memory pressure from ratio of used to total
  const usedRatio = newUsed / prev.memory.totalMb;
  const memSome10 = Math.round(Math.max(0, (usedRatio > 0.7 ? (usedRatio - 0.7) * 20 : 0.02 + Math.random() * 0.05)) * 100) / 100;

  // Drift load average smoothly
  const targetLoad = overallCpu / 20;
  const load1m = Math.round((prev.loadAverage[0] * 0.95 + targetLoad * 0.05) * 100) / 100;
  const load5m = Math.round((prev.loadAverage[1] * 0.98 + targetLoad * 0.02) * 100) / 100;
  const load15m = Math.round((prev.loadAverage[2] * 0.99 + targetLoad * 0.01) * 100) / 100;

  return {
    timestamp: Date.now(),
    loadAverage: [load1m, load5m, load15m],
    overallCpuPercent: overallCpu,
    cores: newCores,
    cpuPressure: {
      some10: Math.round(Math.max(0, (overallCpu > 50 ? (overallCpu - 50) * 0.3 : 0.1) + Math.random() * 0.08) * 100) / 100,
      some60: prev.cpuPressure.some60,
      some300: prev.cpuPressure.some300,
      totalStallUs: prev.cpuPressure.totalStallUs + Math.floor(Math.random() * 120),
    },
    memory: {
      ...prev.memory,
      usedMb: newUsed,
      freeMb: Math.max(0, newFree),
      availableMb: Math.max(0, newFree + Math.round(prev.memory.cachedMb * 0.8)),
      pressure: {
        some10: memSome10,
        some60: prev.memory.pressure.some60,
        some300: prev.memory.pressure.some300,
        totalStallUs: prev.memory.pressure.totalStallUs + Math.floor(Math.random() * 40),
      },
    },
    contextSwitchesPerSec: Math.round(1600 + Math.random() * 600),
    interruptsPerSec: Math.round(800 + Math.random() * 300),
  };
}
