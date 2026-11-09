/**
 * Virtual Memory Management (MMU 4-Level Paging) & Buddy Allocator
 * Simulates x86-64 48-bit canonical page translation and Linux mm/ subsystem
 */

export interface PageTableIndices {
  rawHex: string;
  isCanonical: boolean;
  isKernelSpace: boolean;
  pgdIndex: number; // PML4: bits 47..39 (9 bits)
  pudIndex: number; // Page Upper Directory: bits 38..30 (9 bits)
  pmdIndex: number; // Page Middle Directory: bits 29..21 (9 bits)
  pteIndex: number; // Page Table Entry: bits 20..12 (9 bits)
  offset: number;   // Page offset: bits 11..0 (12 bits)
}

export interface PageFlags {
  present: boolean;
  writable: boolean;
  userAccessible: boolean;
  accessed: boolean;
  dirty: boolean;
  noExecute: boolean;
}

export interface PageWalkResult {
  indices: PageTableIndices;
  cr3: string;
  pgdEntry: { address: string; flags: PageFlags };
  pudEntry: { address: string; flags: PageFlags };
  pmdEntry: { address: string; flags: PageFlags };
  pteEntry: { address: string; frameAddress: string; flags: PageFlags };
  physicalAddress: string;
  status: 'SUCCESS' | 'PAGE_FAULT_NOT_PRESENT' | 'PAGE_FAULT_PROTECTION' | 'NON_CANONICAL';
  faultReason?: string;
}

export function parseVirtualAddress(hexStr: string): PageTableIndices {
  const cleanHex = hexStr.replace(/^0x/i, '').replace(/_/g, '').trim().padStart(16, '0');
  let addrBig: bigint;
  try {
    addrBig = BigInt('0x' + cleanHex);
  } catch {
    addrBig = 0n;
  }

  // Canonical address check for 48-bit VA:
  // Bit 47 is sign-extended to bits 48..63
  const bit47 = (addrBig >> 47n) & 1n;
  const upperBits = addrBig >> 48n;
  const isCanonical = bit47 === 0n ? upperBits === 0n : upperBits === 0xffffn;
  const isKernelSpace = bit47 === 1n;

  // Extract 9-bit indices
  const pgdIndex = Number((addrBig >> 39n) & 0x1ffn);
  const pudIndex = Number((addrBig >> 30n) & 0x1ffn);
  const pmdIndex = Number((addrBig >> 21n) & 0x1ffn);
  const pteIndex = Number((addrBig >> 12n) & 0x1ffn);
  const offset = Number(addrBig & 0xfffn);

  return {
    rawHex: '0x' + addrBig.toString(16).padStart(16, '0'),
    isCanonical,
    isKernelSpace,
    pgdIndex,
    pudIndex,
    pmdIndex,
    pteIndex,
    offset,
  };
}

export function walkPageTable(
  virtualAddressHex: string,
  scenario: 'NORMAL_USER' | 'KERNEL_DIRECT' | 'DEMAND_ZERO' | 'COW_READONLY' | 'UNMAPPED' = 'NORMAL_USER'
): PageWalkResult {
  const indices = parseVirtualAddress(virtualAddressHex);

  if (!indices.isCanonical) {
    return {
      indices,
      cr3: '0x00000001_80000000',
      pgdEntry: { address: '0x0', flags: { present: false, writable: false, userAccessible: false, accessed: false, dirty: false, noExecute: false } },
      pudEntry: { address: '0x0', flags: { present: false, writable: false, userAccessible: false, accessed: false, dirty: false, noExecute: false } },
      pmdEntry: { address: '0x0', flags: { present: false, writable: false, userAccessible: false, accessed: false, dirty: false, noExecute: false } },
      pteEntry: { address: '0x0', frameAddress: '0x0', flags: { present: false, writable: false, userAccessible: false, accessed: false, dirty: false, noExecute: false } },
      physicalAddress: '0x0',
      status: 'NON_CANONICAL',
      faultReason: 'General Protection Fault (#GP): Address bits 48..63 are not a canonical sign extension of bit 47.',
    };
  }

  const cr3 = '0x00000001_a2000000';
  const isKernel = indices.isKernelSpace;

  if (scenario === 'UNMAPPED') {
    return {
      indices,
      cr3,
      pgdEntry: {
        address: '0x00000001_a2400000',
        flags: { present: true, writable: true, userAccessible: !isKernel, accessed: true, dirty: false, noExecute: false },
      },
      pudEntry: {
        address: '0x00000000_00000000',
        flags: { present: false, writable: false, userAccessible: false, accessed: false, dirty: false, noExecute: false },
      },
      pmdEntry: {
        address: '0x00000000_00000000',
        flags: { present: false, writable: false, userAccessible: false, accessed: false, dirty: false, noExecute: false },
      },
      pteEntry: {
        address: '0x00000000_00000000',
        frameAddress: '0x00000000_00000000',
        flags: { present: false, writable: false, userAccessible: false, accessed: false, dirty: false, noExecute: false },
      },
      physicalAddress: 'None (Unmapped)',
      status: 'PAGE_FAULT_NOT_PRESENT',
      faultReason: 'Page Fault (#PF, Error Code 0x0000): PUD entry has Present=0. Page is unmapped in task mm_struct.',
    };
  }

  if (scenario === 'DEMAND_ZERO') {
    return {
      indices,
      cr3,
      pgdEntry: {
        address: '0x00000001_a2400000',
        flags: { present: true, writable: true, userAccessible: true, accessed: true, dirty: false, noExecute: false },
      },
      pudEntry: {
        address: '0x00000001_a3100000',
        flags: { present: true, writable: true, userAccessible: true, accessed: true, dirty: false, noExecute: false },
      },
      pmdEntry: {
        address: '0x00000001_a3800000',
        flags: { present: true, writable: true, userAccessible: true, accessed: true, dirty: false, noExecute: false },
      },
      pteEntry: {
        address: '0x00000000_00000000',
        frameAddress: 'None',
        flags: { present: false, writable: true, userAccessible: true, accessed: false, dirty: false, noExecute: true },
      },
      physicalAddress: 'Pending Allocation',
      status: 'PAGE_FAULT_NOT_PRESENT',
      faultReason: 'Demand Paging (#PF, Error Code 0x0004): VMA exists in vm_area_struct (anonymous mapping). Kernel will allocate a zeroed physical page frame via do_anonymous_page().',
    };
  }

  // Realistic deterministic physical frame synthesis
  const baseFrame = isKernel ? 0x00000000_40000000n : 0x00000001_10000000n;
  const pteOffset = BigInt((indices.pteIndex * 4096) + (indices.pmdIndex * 32));
  const frameBig = baseFrame + pteOffset;
  const physicalAddrBig = frameBig + BigInt(indices.offset);

  const isCow = scenario === 'COW_READONLY';

  return {
    indices,
    cr3,
    pgdEntry: {
      address: '0x00000001_a2400000',
      flags: { present: true, writable: true, userAccessible: !isKernel, accessed: true, dirty: false, noExecute: false },
    },
    pudEntry: {
      address: '0x00000001_a3100000',
      flags: { present: true, writable: true, userAccessible: !isKernel, accessed: true, dirty: false, noExecute: false },
    },
    pmdEntry: {
      address: '0x00000001_a3800000',
      flags: { present: true, writable: true, userAccessible: !isKernel, accessed: true, dirty: false, noExecute: false },
    },
    pteEntry: {
      address: '0x' + frameBig.toString(16).padStart(16, '0'),
      frameAddress: '0x' + frameBig.toString(16).padStart(16, '0'),
      flags: {
        present: true,
        writable: !isCow,
        userAccessible: !isKernel,
        accessed: true,
        dirty: true,
        noExecute: !isKernel,
      },
    },
    physicalAddress: '0x' + physicalAddrBig.toString(16).padStart(16, '0'),
    status: isCow ? 'PAGE_FAULT_PROTECTION' : 'SUCCESS',
    faultReason: isCow
      ? 'Copy-On-Write (#PF, Error Code 0x0007): User attempted write to write-protected shared COW page. Kernel do_wp_page() will duplicate page.'
      : undefined,
  };
}

// Buddy Allocator Emulation
export interface BuddyBlock {
  id: string;
  order: number;
  sizeKb: number;
  baseAddress: number;
  isFree: boolean;
  tag: string;
}

export interface BuddySystemState {
  totalMemoryKb: number;
  freeMemoryKb: number;
  blocks: BuddyBlock[];
}

export function createInitialBuddySystem(): BuddySystemState {
  // Let's model a 256 KB memory zone with Order 6 (256KB) initially split into realistic orders
  const blocks: BuddyBlock[] = [
    { id: 'b0', order: 2, sizeKb: 16, baseAddress: 0x0000, isFree: false, tag: 'task_struct (PID 101)' },
    { id: 'b1', order: 2, sizeKb: 16, baseAddress: 0x0010, isFree: false, tag: 'TCP sk_buff ring' },
    { id: 'b2', order: 3, sizeKb: 32, baseAddress: 0x0020, isFree: true, tag: 'Free' },
    { id: 'b3', order: 4, sizeKb: 64, baseAddress: 0x0040, isFree: false, tag: 'VFS dentry cache' },
    { id: 'b4', order: 5, sizeKb: 128, baseAddress: 0x0080, isFree: true, tag: 'Free' },
  ];

  const total = 256;
  const free = blocks.filter((b) => b.isFree).reduce((sum, b) => sum + b.sizeKb, 0);

  return {
    totalMemoryKb: total,
    freeMemoryKb: free,
    blocks,
  };
}

export function allocateBuddyBlock(state: BuddySystemState, order: number, tag: string = 'User alloc'): BuddySystemState {
  const reqSize = Math.pow(2, order) * 4; // Order 0 = 4KB
  const blocks = [...state.blocks];

  // Find exact order free block
  let index = blocks.findIndex((b) => b.isFree && b.order === order);

  if (index !== -1) {
    blocks[index] = { ...blocks[index], isFree: false, tag };
  } else {
    // Find higher order block to split
    let splitIndex = blocks.findIndex((b) => b.isFree && b.order > order);
    if (splitIndex === -1) {
      return state; // Out of memory for this order
    }

    // Split recursively down to target order
    while (blocks[splitIndex].order > order) {
      const parent = blocks[splitIndex];
      const newOrder = parent.order - 1;
      const halfSize = parent.sizeKb / 2;

      const left: BuddyBlock = {
        id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_L`,
        order: newOrder,
        sizeKb: halfSize,
        baseAddress: parent.baseAddress,
        isFree: true,
        tag: 'Free',
      };

      const right: BuddyBlock = {
        id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_R`,
        order: newOrder,
        sizeKb: halfSize,
        baseAddress: parent.baseAddress + halfSize,
        isFree: true,
        tag: 'Free',
      };

      blocks.splice(splitIndex, 1, left, right);
      // Now splitIndex points to left block, keep splitting if needed
    }

    // Allocate the leftmost child
    blocks[splitIndex] = { ...blocks[splitIndex], isFree: false, tag };
  }

  const freeMem = blocks.filter((b) => b.isFree).reduce((sum, b) => sum + b.sizeKb, 0);

  return {
    ...state,
    blocks,
    freeMemoryKb: freeMem,
  };
}

export function freeBuddyBlock(state: BuddySystemState, blockId: string): BuddySystemState {
  const blocks = [...state.blocks];
  const idx = blocks.findIndex((b) => b.id === blockId);
  if (idx === -1) return state;

  blocks[idx] = { ...blocks[idx], isFree: true, tag: 'Free' };

  // Attempt buddy coalescing
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < blocks.length - 1; i++) {
      const curr = blocks[i];
      const next = blocks[i + 1];

      // Buddies must have same order, both be free, and align to buddy boundary
      if (curr.isFree && next.isFree && curr.order === next.order) {
        const buddySize = curr.sizeKb;
        if (curr.baseAddress % (buddySize * 2) === 0 && next.baseAddress === curr.baseAddress + buddySize) {
          const merged: BuddyBlock = {
            id: `b_merged_${Date.now()}_${i}`,
            order: curr.order + 1,
            sizeKb: curr.sizeKb * 2,
            baseAddress: curr.baseAddress,
            isFree: true,
            tag: 'Free',
          };
          blocks.splice(i, 2, merged);
          changed = true;
          break;
        }
      }
    }
  }

  const freeMem = blocks.filter((b) => b.isFree).reduce((sum, b) => sum + b.sizeKb, 0);

  return {
    ...state,
    blocks,
    freeMemoryKb: freeMem,
  };
}
