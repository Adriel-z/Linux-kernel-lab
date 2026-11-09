import React, { useState } from 'react';
import {
  parseVirtualAddress,
  walkPageTable,
  createInitialBuddySystem,
  allocateBuddyBlock,
  freeBuddyBlock,
  PageWalkResult,
  BuddySystemState,
} from '../kernel/mmu';
import { Binary, ArrowRight, AlertTriangle, CheckCircle, Database, RefreshCw, Plus, Trash2 } from 'lucide-react';

const PRESET_ADDRESSES = [
  { label: 'User Stack', address: '0x00007ffd9a204100', scenario: 'NORMAL_USER' as const, desc: 'High canonical user memory for local variables and frame pointers' },
  { label: 'Heap Anonymous', address: '0x00007f9b20001000', scenario: 'DEMAND_ZERO' as const, desc: 'Allocated via malloc/mmap, not yet backed by physical RAM' },
  { label: 'COW Shared Page', address: '0x00007f9b30002000', scenario: 'COW_READONLY' as const, desc: 'Shared with child process post-fork with Write-Protect bit set' },
  { label: 'Kernel Direct Map', address: '0xffff888012345000', scenario: 'KERNEL_DIRECT' as const, desc: '1:1 linear physical RAM mapping in privileged higher canonical space' },
  { label: 'Kernel vmalloc', address: '0xffffc90000a43000', scenario: 'KERNEL_DIRECT' as const, desc: 'Non-contiguous physical pages mapped contiguous in kernel space' },
];

export const VirtualMemoryView: React.FC = () => {
  const [addressInput, setAddressInput] = useState<string>('0x00007ffd9a204100');
  const [scenario, setScenario] = useState<'NORMAL_USER' | 'KERNEL_DIRECT' | 'DEMAND_ZERO' | 'COW_READONLY' | 'UNMAPPED'>('NORMAL_USER');
  const [walkResult, setWalkResult] = useState<PageWalkResult>(() => walkPageTable('0x00007ffd9a204100', 'NORMAL_USER'));

  // Buddy allocator state
  const [buddySystem, setBuddySystem] = useState<BuddySystemState>(createInitialBuddySystem());
  const [allocTag, setAllocTag] = useState<string>('malloc(8KB)');
  const [allocOrder, setAllocOrder] = useState<number>(1);

  const handleWalk = (addr: string, scen = scenario) => {
    setAddressInput(addr);
    const res = walkPageTable(addr, scen);
    setWalkResult(res);
  };

  const handleSelectPreset = (preset: typeof PRESET_ADDRESSES[0]) => {
    setScenario(preset.scenario);
    handleWalk(preset.address, preset.scenario);
  };

  const handleAllocBuddy = (e: React.FormEvent) => {
    e.preventDefault();
    setBuddySystem((prev) => allocateBuddyBlock(prev, allocOrder, allocTag || `Alloc O${allocOrder}`));
  };

  const handleFreeBuddy = (id: string) => {
    setBuddySystem((prev) => freeBuddyBlock(prev, id));
  };

  const handleResetBuddy = () => {
    setBuddySystem(createInitialBuddySystem());
  };

  const indices = walkResult.indices;

  return (
    <div className="space-y-8">
      {/* Overview header */}
      <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span>VIRTUAL MEMORY SUBSYSTEM</span>
            <span aria-hidden="true">·</span>
            <span>X86_64 4-LEVEL PAGING</span>
            <span aria-hidden="true">·</span>
            <span>MM/PAGE_ALLOC.C</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            4-Level MMU Page Translation & Buddy Allocator
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Linux isolates every process with a private 48-bit canonical virtual address space.
            The hardware Memory Management Unit (MMU) translates virtual addresses to physical RAM frames using the CR3 register and 4 hierarchical page tables.
          </p>
        </div>
      </section>

      {/* Section 1: 4-Level Page Table Walk Simulator */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            x86-64 4-Level Page Walk Simulator
          </h2>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
            {PRESET_ADDRESSES.map((p) => (
              <button
                key={p.label}
                onClick={() => handleSelectPreset(p)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  addressInput === p.address
                    ? 'bg-cyan-400 text-slate-950 font-semibold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Address Input & Mode */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 space-y-1">
            <label className="text-xs text-slate-400 font-mono">64-bit Virtual Address (Hex)</label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0x00007ffd9a204100"
              className="w-full px-3 py-2 text-sm font-mono rounded bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="text-xs text-slate-400 font-mono">Simulation Mode / Page Fault Type</label>
            <select
              value={scenario}
              onChange={(e) => {
                const scen = e.target.value as any;
                setScenario(scen);
                handleWalk(addressInput, scen);
              }}
              className="w-full px-3 py-2 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="NORMAL_USER">Normal Present Page (Read/Write)</option>
              <option value="DEMAND_ZERO">Demand Zero Paging (Anonymous malloc)</option>
              <option value="COW_READONLY">Copy-On-Write (Post-Fork write protected)</option>
              <option value="KERNEL_DIRECT">Kernel Direct Map (Higher Canonical)</option>
              <option value="UNMAPPED">Unmapped Virtual Address (SIGSEGV)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              onClick={() => handleWalk(addressInput, scenario)}
              className="w-full py-2 px-3 text-xs font-semibold rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
            >
              Translate Address
            </button>
          </div>
        </div>

        {/* 48-bit Virtual Address Decomposition Grid */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>48-bit Virtual Address Bitfield Breakdown</span>
            <span className={indices.isKernelSpace ? 'text-amber-400' : 'text-cyan-400'}>
              {indices.isKernelSpace ? 'Kernel Canonical (Higher Half)' : 'User Canonical (Lower Half)'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Bits 47..39 (9b)</div>
              <div className="text-cyan-300 font-bold mt-1">PGD / PML4</div>
              <div className="text-xs text-white tabular-nums mt-0.5">Index: {indices.pgdIndex}</div>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Bits 38..30 (9b)</div>
              <div className="text-cyan-300 font-bold mt-1">PUD</div>
              <div className="text-xs text-white tabular-nums mt-0.5">Index: {indices.pudIndex}</div>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Bits 29..21 (9b)</div>
              <div className="text-cyan-300 font-bold mt-1">PMD</div>
              <div className="text-xs text-white tabular-nums mt-0.5">Index: {indices.pmdIndex}</div>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Bits 20..12 (9b)</div>
              <div className="text-cyan-300 font-bold mt-1">PTE</div>
              <div className="text-xs text-white tabular-nums mt-0.5">Index: {indices.pteIndex}</div>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Bits 11..0 (12b)</div>
              <div className="text-amber-400 font-bold mt-1">Page Offset</div>
              <div className="text-xs text-white tabular-nums mt-0.5">0x{indices.offset.toString(16)} ({indices.offset}B)</div>
            </div>
          </div>
        </div>

        {/* 4-Level Page Walk Pathway */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            MMU Hardware Walk Steps
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
            {/* Step 1: CR3 -> PGD */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400">1. CPU CR3 Register</div>
              <div className="text-cyan-400 font-semibold truncate">{walkResult.cr3}</div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                PML4 Table Base Address
              </div>
            </div>

            {/* Step 2: PGD Entry */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400">2. PGD[#{indices.pgdIndex}]</div>
              <div className="text-white font-semibold truncate">{walkResult.pgdEntry.address}</div>
              <div className="text-[10px] text-emerald-400 pt-1 border-t border-slate-800">
                P=1, R/W=1, U/S={walkResult.pgdEntry.flags.userAccessible ? '1' : '0'}
              </div>
            </div>

            {/* Step 3: PUD Entry */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400">3. PUD[#{indices.pudIndex}]</div>
              <div className="text-white font-semibold truncate">{walkResult.pudEntry.address}</div>
              <div className="text-[10px] text-emerald-400 pt-1 border-t border-slate-800">
                P={walkResult.pudEntry.flags.present ? '1' : '0'} (1GB Directory)
              </div>
            </div>

            {/* Step 4: PMD Entry */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400">4. PMD[#{indices.pmdIndex}]</div>
              <div className="text-white font-semibold truncate">{walkResult.pmdEntry.address}</div>
              <div className="text-[10px] text-emerald-400 pt-1 border-t border-slate-800">
                P={walkResult.pmdEntry.flags.present ? '1' : '0'} (2MB Directory)
              </div>
            </div>

            {/* Step 5: PTE & Physical Frame */}
            <div className={`p-3 rounded-lg border space-y-1 ${
              walkResult.status === 'SUCCESS' ? 'bg-cyan-950/30 border-cyan-500/50' : 'bg-rose-950/30 border-rose-600/50'
            }`}>
              <div className="text-[10px] text-slate-400">5. Physical Address</div>
              <div className={`font-semibold truncate ${walkResult.status === 'SUCCESS' ? 'text-cyan-300' : 'text-rose-400'}`}>
                {walkResult.physicalAddress}
              </div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                Status: {walkResult.status}
              </div>
            </div>
          </div>

          {/* Fault banner if present */}
          {walkResult.faultReason && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/50 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-amber-300">Kernel Trap / Page Fault Handler triggered:</span>
                <p className="text-slate-300 font-mono text-[11px]">{walkResult.faultReason}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Physical Memory Buddy Allocator */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Buddy Page Allocator Simulator (mm/page_alloc.c)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Linux manages physical RAM page frames using binary buddy orders (Order 0 = 4KB up to Order 10 = 4MB).
              Blocks split in half when smaller chunks are requested, and automatically coalesce with their buddy upon release.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400">
              Free RAM: {buddySystem.freeMemoryKb} KB / {buddySystem.totalMemoryKb} KB
            </span>
            <button
              onClick={handleResetBuddy}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700"
              title="Reset Memory"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Allocate Form */}
        <form onSubmit={handleAllocBuddy} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Allocation Tag:</label>
            <input
              type="text"
              value={allocTag}
              onChange={(e) => setAllocTag(e.target.value)}
              placeholder="e.g., ext4_inode"
              className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 w-36"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-400">Buddy Order:</label>
            <select
              value={allocOrder}
              onChange={(e) => setAllocOrder(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
            >
              <option value={0}>Order 0 (4 KB - 1 Page)</option>
              <option value={1}>Order 1 (8 KB - 2 Pages)</option>
              <option value={2}>Order 2 (16 KB - 4 Pages)</option>
              <option value={3}>Order 3 (32 KB - 8 Pages)</option>
              <option value={4}>Order 4 (64 KB - 16 Pages)</option>
              <option value={5}>Order 5 (128 KB - 32 Pages)</option>
            </select>
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>alloc_pages(order={allocOrder})</span>
          </button>
        </form>

        {/* Memory Blocks Visual Strip */}
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-mono flex justify-between">
            <span>256 KB Memory Zone Blocks:</span>
            <span>Click &apos;Free&apos; on any allocated block to watch buddy coalescing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
            {buddySystem.blocks.map((block) => (
              <div
                key={block.id}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  block.isFree
                    ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                    : 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-cyan-400 font-bold">Order {block.order} ({block.sizeKb} KB)</span>
                    <span className={block.isFree ? 'text-emerald-400' : 'text-amber-400'}>
                      {block.isFree ? 'FREE' : 'ALLOCATED'}
                    </span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-200 truncate">{block.tag}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Offset: 0x{block.baseAddress.toString(16).padStart(4, '0')}</div>
                </div>

                {!block.isFree && (
                  <button
                    onClick={() => handleFreeBuddy(block.id)}
                    className="mt-3 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>__free_pages()</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
