import React, { useState, useRef, useEffect } from 'react';
import { executeKernelShellCommand } from '../kernel/vfsAndProc';
import { Terminal, CornerDownLeft, Sparkles, Trash2 } from 'lucide-react';

interface TerminalEntry {
  id: number;
  command: string;
  stdout: string;
  stderr?: string;
}

const QUICK_COMMANDS = [
  'uname -a',
  'cat /proc/version',
  'dmesg',
  'cat /proc/cpuinfo',
  'cat /proc/meminfo',
  'cat /proc/sched_debug',
  'slabtop',
  'ps aux',
  'free -m',
  'vmstat',
  'top',
  'sysctl -a',
];

export const KernelShellView: React.FC = () => {
  const [history, setHistory] = useState<TerminalEntry[]>([
    {
      id: 0,
      command: 'uname -a',
      stdout: 'Linux kernel-lab-node 6.11.0-generic #11-Ubuntu SMP PREEMPT_DYNAMIC Wed Oct 23 15:42:19 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux\n',
    },
    {
      id: 1,
      command: 'cat /proc/version',
      stdout: 'Linux version 6.11.0-generic (buildd@lcy02-amd64-001) (gcc (Ubuntu 13.2.0-23ubuntu4) 13.2.0, GNU ld 2.42) #11-Ubuntu SMP PREEMPT_DYNAMIC Wed Oct 23 15:42:19 UTC 2024\n',
    },
  ]);
  const [inputCmd, setInputCmd] = useState<string>('');
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const runCommand = (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

    if (trimmed === 'clear') {
      setHistory([]);
      setInputCmd('');
      return;
    }

    const res = executeKernelShellCommand(trimmed);
    const newEntry: TerminalEntry = {
      id: Date.now(),
      command: trimmed,
      stdout: res.stdout,
      stderr: res.stderr,
    };

    setHistory((prev) => [...prev, newEntry]);
    setInputCmd('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand(inputCmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInputCmd(history[nextIdx].command);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= history.length) {
        setHistoryIndex(-1);
        setInputCmd('');
      } else {
        setHistoryIndex(nextIdx);
        setInputCmd(history[nextIdx].command);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <span>PROCFS & DIAGNOSTIC SHELL</span>
              <span aria-hidden="true">·</span>
              <span>PSEUDO-FILESYSTEM /PROC & /SYS</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Interactive Kernel Diagnostic Terminal
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              Inspect kernel runtime state directly using standard Linux diagnostic utilities.
              Files in <code className="text-cyan-300 font-mono">/proc</code> are dynamic synthetic files generated on-the-fly by kernel subsystems.
            </p>
          </div>

          <button
            onClick={() => setHistory([])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg transition-colors shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Screen</span>
          </button>
        </div>

        {/* Quick Command Chips */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 mr-1">Quick run:</span>
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => runCommand(cmd)}
              className="px-2.5 py-1 text-xs font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 rounded transition-all"
            >
              {cmd}
            </button>
          ))}
        </div>
      </section>

      {/* Terminal Window */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="rounded-2xl bg-[#070b12] border border-slate-800 font-mono text-xs overflow-hidden shadow-2xl cursor-text"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-slate-400 text-xs">root@kernel-lab-node: ~</span>
          </div>
          <div className="text-[11px] text-slate-500">xterm-256color · UTF-8</div>
        </div>

        {/* Console Log Area */}
        <div className="p-5 space-y-4 max-h-[560px] overflow-y-auto">
          {history.map((entry) => (
            <div key={entry.id} className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-emerald-400 font-semibold">root@kernel-node</span>
                <span className="text-slate-500">:</span>
                <span className="text-cyan-400">~#</span>
                <span className="text-white font-bold">{entry.command}</span>
              </div>
              {entry.stdout && (
                <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed pl-2 border-l border-slate-800">
                  {entry.stdout}
                </pre>
              )}
              {entry.stderr && (
                <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed pl-2 border-l border-rose-900/60">
                  {entry.stderr}
                </pre>
              )}
            </div>
          ))}

          {/* Active Command Input Line */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-emerald-400 font-semibold">root@kernel-node</span>
            <span className="text-slate-500">:</span>
            <span className="text-cyan-400">~#</span>
            <input
              ref={inputRef}
              type="text"
              value={inputCmd}
              onChange={(e) => setInputCmd(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="type 'help' or any command (e.g., dmesg, free -m, cat /proc/meminfo)..."
              className="flex-1 bg-transparent border-none text-white focus:outline-none font-mono text-xs"
            />
          </div>
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
