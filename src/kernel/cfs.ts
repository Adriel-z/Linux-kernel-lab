/**
 * Completely Fair Scheduler (CFS) core logic emulation
 * Based on Linux kernel kernel/sched/fair.c
 */

// sched_prio_to_weight array from Linux kernel (kernel/sched/core.c)
// Indices 0..39 corresponding to nice -20 to +19
export const SCHED_PRIO_TO_WEIGHT: number[] = [
  /* -20 */ 88761, 71755, 56483, 46273, 36291,
  /* -15 */ 29154, 23254, 18705, 14949, 11916,
  /* -10 */ 9548, 7620, 6100, 4904, 3906,
  /*  -5 */ 3121, 2501, 1991, 1586, 1277,
  /*   0 */ 1024, 820, 655, 526, 423,
  /*   5 */ 335, 272, 215, 172, 137,
  /*  10 */ 110, 87, 70, 56, 45,
  /*  15 */ 36, 29, 23, 18, 15,
];

export const NICE_0_LOAD = 1024;
export const DEFAULT_LATENCY_NS = 6; // Target latency in ms (simplified from 6000000ns)
export const MIN_GRANULARITY_NS = 1; // Min granularity in ms

export interface KernelTask {
  pid: number;
  name: string;
  nice: number; // -20 to 19
  weight: number;
  vruntime: number; // virtual runtime in ms
  execRuntime: number; // actual wall-clock execution in ms
  state: 'RUNNING' | 'RUNNABLE' | 'SLEEPING';
  color: 'red' | 'black'; // for RB-Tree visualization
  switches: number;
}

export interface SchedulerState {
  tasks: KernelTask[];
  currentTaskPid: number | null;
  minVruntime: number;
  totalWeight: number;
  tickCount: number;
  history: {
    tick: number;
    pid: number;
    name: string;
    vruntime: number;
    deltaVruntime: number;
  }[];
}

export function getWeightForNice(nice: number): number {
  const clampedNice = Math.max(-20, Math.min(19, Math.round(nice)));
  const index = clampedNice + 20;
  return SCHED_PRIO_TO_WEIGHT[index];
}

export function calculateDeltaVruntime(execTimeMs: number, weight: number): number {
  if (weight <= 0) return execTimeMs;
  // delta_vruntime = exec_time * (NICE_0_LOAD / weight)
  return Math.round((execTimeMs * (NICE_0_LOAD / weight)) * 100) / 100;
}

export function calculateTimeSlice(taskWeight: number, totalWeight: number, latencyTargetMs: number = DEFAULT_LATENCY_NS): number {
  if (totalWeight <= 0) return MIN_GRANULARITY_NS;
  const slice = (taskWeight / totalWeight) * latencyTargetMs;
  return Math.max(MIN_GRANULARITY_NS, Math.round(slice * 10) / 10);
}

export function createInitialSchedulerState(): SchedulerState {
  const initialTasks: KernelTask[] = [
    {
      pid: 101,
      name: 'kworker/0:1',
      nice: -5,
      weight: getWeightForNice(-5),
      vruntime: 10.0,
      execRuntime: 8.0,
      state: 'RUNNABLE',
      color: 'black',
      switches: 4,
    },
    {
      pid: 142,
      name: 'systemd-journal',
      nice: 0,
      weight: getWeightForNice(0),
      vruntime: 12.0,
      execRuntime: 12.0,
      state: 'RUNNABLE',
      color: 'red',
      switches: 3,
    },
    {
      pid: 305,
      name: 'nginx-worker',
      nice: 0,
      weight: getWeightForNice(0),
      vruntime: 11.5,
      execRuntime: 11.5,
      state: 'RUNNABLE',
      color: 'red',
      switches: 5,
    },
    {
      pid: 512,
      name: 'postgres-query',
      nice: -2,
      weight: getWeightForNice(-2),
      vruntime: 10.8,
      execRuntime: 9.2,
      state: 'RUNNABLE',
      color: 'black',
      switches: 2,
    },
    {
      pid: 880,
      name: 'rsync-backup',
      nice: 10,
      weight: getWeightForNice(10),
      vruntime: 14.0,
      execRuntime: 4.0,
      state: 'RUNNABLE',
      color: 'red',
      switches: 1,
    },
  ];

  const totalWeight = initialTasks.reduce((sum, t) => sum + (t.state !== 'SLEEPING' ? t.weight : 0), 0);
  const minVruntime = Math.min(...initialTasks.map((t) => t.vruntime));

  return {
    tasks: initialTasks,
    currentTaskPid: null,
    minVruntime,
    totalWeight,
    tickCount: 0,
    history: [],
  };
}

export function pickNextTask(tasks: KernelTask[]): KernelTask | null {
  const runnable = tasks.filter((t) => t.state !== 'SLEEPING');
  if (runnable.length === 0) return null;
  // In Linux CFS, task with lowest vruntime (leftmost node in RB-tree) is chosen
  return runnable.reduce((min, curr) => (curr.vruntime < min.vruntime ? curr : min), runnable[0]);
}

export function stepSchedulerTick(state: SchedulerState, stepMs: number = 2): SchedulerState {
  const runnableTasks = state.tasks.filter((t) => t.state !== 'SLEEPING');
  if (runnableTasks.length === 0) {
    return { ...state, tickCount: state.tickCount + 1 };
  }

  // Pick task with lowest vruntime
  const nextTask = pickNextTask(state.tasks);
  if (!nextTask) return state;

  const totalWeight = runnableTasks.reduce((sum, t) => sum + t.weight, 0);
  const deltaVruntime = calculateDeltaVruntime(stepMs, nextTask.weight);

  const updatedTasks: KernelTask[] = state.tasks.map((t) => {
    if (t.pid === nextTask.pid) {
      return {
        ...t,
        state: 'RUNNING',
        vruntime: Math.round((t.vruntime + deltaVruntime) * 100) / 100,
        execRuntime: Math.round((t.execRuntime + stepMs) * 100) / 100,
        switches: t.pid !== state.currentTaskPid ? t.switches + 1 : t.switches,
      };
    }
    return {
      ...t,
      state: t.state === 'RUNNING' ? 'RUNNABLE' : t.state,
    };
  });

  // Rebalance/color nodes for RB-tree visualization
  const sorted = [...updatedTasks.filter((t) => t.state !== 'SLEEPING')].sort((a, b) => a.vruntime - b.vruntime);
  sorted.forEach((task, idx) => {
    // Root is black, alternates for clean visual RB-tree appearance
    task.color = idx === 0 ? 'black' : idx % 2 === 0 ? 'black' : 'red';
  });

  const newMinVruntime = Math.min(...sorted.map((t) => t.vruntime));

  const newHistory = [
    {
      tick: state.tickCount + 1,
      pid: nextTask.pid,
      name: nextTask.name,
      vruntime: Math.round((nextTask.vruntime + deltaVruntime) * 100) / 100,
      deltaVruntime,
    },
    ...state.history.slice(0, 19),
  ];

  return {
    ...state,
    tasks: updatedTasks,
    currentTaskPid: nextTask.pid,
    minVruntime: newMinVruntime,
    totalWeight,
    tickCount: state.tickCount + 1,
    history: newHistory,
  };
}

export function addTask(state: SchedulerState, name: string, nice: number): SchedulerState {
  const nextPid = Math.max(100, ...state.tasks.map((t) => t.pid)) + 1;
  const weight = getWeightForNice(nice);
  // Linux CFS initializes new task vruntime with min_vruntime so it does not starve existing tasks
  const initialVruntime = state.minVruntime;

  const newTask: KernelTask = {
    pid: nextPid,
    name: name.trim() || `process-${nextPid}`,
    nice,
    weight,
    vruntime: initialVruntime,
    execRuntime: 0,
    state: 'RUNNABLE',
    color: 'red',
    switches: 0,
  };

  const tasks = [...state.tasks, newTask];
  const totalWeight = tasks.reduce((sum, t) => sum + (t.state !== 'SLEEPING' ? t.weight : 0), 0);

  return {
    ...state,
    tasks,
    totalWeight,
  };
}

export function toggleTaskSleep(state: SchedulerState, pid: number): SchedulerState {
  const tasks: KernelTask[] = state.tasks.map((t) => {
    if (t.pid === pid) {
      const nextState = t.state === 'SLEEPING' ? 'RUNNABLE' : 'SLEEPING';
      // When waking up, Linux CFS caps vruntime to min_vruntime - sysctl_sched_latency/2
      const nextVruntime = nextState === 'RUNNABLE' ? Math.max(t.vruntime, state.minVruntime - 3) : t.vruntime;
      return {
        ...t,
        state: nextState,
        vruntime: nextVruntime,
      };
    }
    return t;
  });

  const runnable = tasks.filter((t) => t.state !== 'SLEEPING');
  const totalWeight = runnable.reduce((sum, t) => sum + t.weight, 0);
  const minVruntime = runnable.length > 0 ? Math.min(...runnable.map((t) => t.vruntime)) : state.minVruntime;

  return {
    ...state,
    tasks,
    totalWeight,
    minVruntime,
  };
}
