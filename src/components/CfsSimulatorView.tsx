import React, { useState, useEffect, useRef } from 'react';
import {
  SchedulerState,
  createInitialSchedulerState,
  stepSchedulerTick,
  addTask,
  toggleTaskSleep,
  getWeightForNice,
  calculateDeltaVruntime,
  calculateTimeSlice,
  KernelTask,
} from '../kernel/cfs';
import { Play, Pause, SkipForward, Plus, RotateCcw, Moon, Sun, ArrowDown } from 'lucide-react';

export const CfsSimulatorView: React.FC = () => {
  const [scheduler, setScheduler] = useState<SchedulerState>(createInitialSchedulerState());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(800);
  const [newTaskName, setNewTaskName] = useState<string>('node-worker');
  const [newTaskNice, setNewTaskNice] = useState<number>(0);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setScheduler((prev) => stepSchedulerTick(prev, 2));
      }, speedMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speedMs]);

  const handleStep = () => {
    setScheduler((prev) => stepSchedulerTick(prev, 2));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setScheduler(createInitialSchedulerState());
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    setScheduler((prev) => addTask(prev, newTaskName, newTaskNice));
    setNewTaskName('');
    setIsAddOpen(false);
  };

  // Find currently running task or leftmost
  const currentTask = scheduler.tasks.find((t) => t.pid === scheduler.currentTaskPid) || null;
  const runnableTasks = [...scheduler.tasks.filter((t) => t.state !== 'SLEEPING')].sort((a, b) => a.vruntime - b.vruntime);
  const leftmostTask = runnableTasks[0] || null;

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <span>CFS (COMPLETELY FAIR SCHEDULER)</span>
              <span aria-hidden="true">·</span>
              <span>KERNEL/SCHED/FAIR.C</span>
              <span aria-hidden="true">·</span>
              <span>O(LOG N) RED-BLACK TREE</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              CFS Scheduling & Virtual Runtime (vruntime) Simulator
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              CFS assigns CPU time based on task priority (nice value -20 to +19). Lower priority tasks advance their{' '}
              <code className="text-cyan-300 font-mono">vruntime</code> faster, causing the scheduler to pick the leftmost tree node (lowest vruntime) on each context switch.
            </p>
          </div>

          {/* Interactive controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors shadow-sm ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Auto Tick'}</span>
            </button>

            <button
              onClick={handleStep}
              disabled={isPlaying}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 rounded-lg transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Step Tick (2ms)</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg transition-colors"
              title="Reset Scheduler"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Formula Banner */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[11px]">min_vruntime</div>
            <div className="text-cyan-400 font-bold text-sm tabular-nums">{scheduler.minVruntime.toFixed(2)} ms</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Total Load Weight</div>
            <div className="text-white font-bold text-sm tabular-nums">{scheduler.totalWeight.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Scheduler Ticks</div>
            <div className="text-white font-bold text-sm tabular-nums">#{scheduler.tickCount}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Formula</div>
            <div className="text-amber-400 text-[11px] truncate">Δvruntime = Δexec × (1024 / weight)</div>
          </div>
        </div>
      </section>

      {/* Main visualizer: RB Tree & Tasks Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Red-Black Tree Visualization */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Runqueue Red-Black Tree (cfs_rq.rb_root)
            </h3>
            <span className="text-xs font-mono text-cyan-400">
              Leftmost: PID {leftmostTask ? leftmostTask.pid : 'None'}
            </span>
          </div>

          <div className="min-h-[260px] p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Visual RB tree nodes */}
            <div className="w-full space-y-6">
              {/* Top pointer to leftmost */}
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
                  <ArrowDown className="w-3 h-3 text-cyan-400 animate-bounce" />
                  rb_leftmost candidate: {leftmostTask ? `${leftmostTask.name} (${leftmostTask.vruntime.toFixed(2)}ms)` : 'empty'}
                </span>
              </div>

              {/* Tree node tiers */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {runnableTasks.map((task, idx) => {
                  const isCurrent = task.pid === scheduler.currentTaskPid;
                  const isLeft = idx === 0;
                  return (
                    <div
                      key={task.pid}
                      className={`p-3 rounded-xl border text-center font-mono transition-all duration-200 min-w-[130px] ${
                        isCurrent
                          ? 'bg-cyan-500/10 border-cyan-400 ring-2 ring-cyan-500 shadow-md shadow-cyan-950'
                          : isLeft
                          ? 'bg-amber-500/10 border-amber-400/80'
                          : task.color === 'red'
                          ? 'bg-rose-950/20 border-rose-700/60'
                          : 'bg-slate-800/80 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                        <span
                          className={`w-2 h-2 rounded-full ${task.color === 'red' ? 'bg-rose-500' : 'bg-slate-400'}`}
                          title={`RB-tree ${task.color} node`}
                        />
                        <span>PID {task.pid}</span>
                      </div>
                      <div className="text-xs font-bold text-white truncate max-w-[120px]">{task.name}</div>
                      <div className="mt-1 text-[11px] text-cyan-300 tabular-nums font-semibold">
                        {task.vruntime.toFixed(2)} ms
                      </div>
                      <div className="text-[10px] text-slate-400">nice: {task.nice}</div>
                      {isCurrent && (
                        <div className="mt-1 px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 text-[9px] font-bold uppercase tracking-wider">
                          RUNNING ON CPU
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed">
            Nodes ordered from left to right by ascending <code className="text-slate-300 font-mono">vruntime</code>.
            When a task runs, its virtual runtime advances at a rate inverse to its weight. High priority tasks (nice &lt; 0) advance slower, granting them higher CPU proportion.
          </div>
        </div>

        {/* Right: Task Table & Dynamic Management */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Task Entities (struct sched_entity)
            </h3>
            <button
              onClick={() => setIsAddOpen(!isAddOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 rounded-md hover:bg-cyan-900/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Process</span>
            </button>
          </div>

          {/* Add Process Form Drawer */}
          {isAddOpen && (
            <form onSubmit={handleAddTask} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-white">Create New Task</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Process Name</label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="e.g. redis-server"
                    className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Nice Priority: {newTaskNice}</span>
                    <span className="text-cyan-400">weight: {getWeightForNice(newTaskNice)}</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="19"
                    value={newTaskNice}
                    onChange={(e) => setNewTaskNice(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>-20 (Highest)</span>
                    <span>0 (Normal)</span>
                    <span>+19 (Lowest)</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded"
                >
                  Insert Task
                </button>
              </div>
            </form>
          )}

          {/* Tasks Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">PID</th>
                    <th className="py-2.5 px-3">Command</th>
                    <th className="py-2.5 px-3">Nice</th>
                    <th className="py-2.5 px-3">Weight</th>
                    <th className="py-2.5 px-3 text-right">vruntime</th>
                    <th className="py-2.5 px-3 text-right">Exec Time</th>
                    <th className="py-2.5 px-3 text-center">State</th>
                    <th className="py-2.5 px-3 text-center">I/O Wait</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {scheduler.tasks.map((task) => {
                    const isRunning = task.state === 'RUNNING';
                    const isSleeping = task.state === 'SLEEPING';
                    return (
                      <tr
                        key={task.pid}
                        className={`hover:bg-slate-900/50 transition-colors ${
                          isRunning ? 'bg-cyan-950/30' : isSleeping ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-300">{task.pid}</td>
                        <td className="py-2.5 px-3 text-white font-medium">{task.name}</td>
                        <td className="py-2.5 px-3 text-amber-400">{task.nice}</td>
                        <td className="py-2.5 px-3 text-slate-300 tabular-nums">{task.weight}</td>
                        <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold tabular-nums">
                          {task.vruntime.toFixed(2)} ms
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">
                          {task.execRuntime.toFixed(1)} ms
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              isRunning
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : isSleeping
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-slate-800/60 text-slate-300'
                            }`}
                          >
                            {task.state}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => setScheduler((prev) => toggleTaskSleep(prev, task.pid))}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title={isSleeping ? 'Wake task (I/O complete)' : 'Block task (sleep on I/O wait queue)'}
                          >
                            {isSleeping ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Execution History Timeline */}
          <div className="space-y-2 pt-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Recent CPU Context Switches
            </h4>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {scheduler.history.length === 0 ? (
                <div className="text-xs text-slate-500 py-1">No scheduler ticks yet. Click &quot;Step Tick&quot; or &quot;Auto Tick&quot;.</div>
              ) : (
                scheduler.history.map((h, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-slate-950 border border-slate-800 shrink-0 font-mono text-[10px] min-w-[95px]"
                  >
                    <div className="text-cyan-400 font-semibold truncate">#{h.tick} {h.name}</div>
                    <div className="text-slate-400 tabular-nums">+{h.deltaVruntime.toFixed(2)} ms vr</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
