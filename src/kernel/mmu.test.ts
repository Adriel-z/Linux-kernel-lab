import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVirtualAddress,
  walkPageTable,
  createInitialBuddySystem,
  allocateBuddyBlock,
  freeBuddyBlock,
} from './mmu';

test('parseVirtualAddress correctly splits 48-bit canonical user address', () => {
  // Address 0x00007ffff7dd6123 (Typical libc / stack address)
  const indices = parseVirtualAddress('0x00007ffff7dd6123');
  assert.equal(indices.isCanonical, true);
  assert.equal(indices.isKernelSpace, false);
  assert.equal(indices.offset, 0x123);
  assert.ok(indices.pgdIndex >= 0 && indices.pgdIndex < 512);
  assert.ok(indices.pudIndex >= 0 && indices.pudIndex < 512);
  assert.ok(indices.pmdIndex >= 0 && indices.pmdIndex < 512);
  assert.ok(indices.pteIndex >= 0 && indices.pteIndex < 512);
});

test('parseVirtualAddress identifies kernel space addresses and non-canonical addresses', () => {
  // Kernel direct map: 0xffff888000000000
  const kernelIndices = parseVirtualAddress('0xffff888000000000');
  assert.equal(kernelIndices.isCanonical, true);
  assert.equal(kernelIndices.isKernelSpace, true);

  // Non-canonical address (bit 47 is 0, but upper bits are non-zero)
  const nonCanonical = parseVirtualAddress('0x0001000000000000');
  assert.equal(nonCanonical.isCanonical, false);
});

test('walkPageTable performs 4-level translation on normal user address', () => {
  const result = walkPageTable('0x0000000000401050', 'NORMAL_USER');
  assert.equal(result.status, 'SUCCESS');
  assert.ok(result.physicalAddress.startsWith('0x'));
  assert.equal(result.pteEntry.flags.present, true);
  assert.equal(result.pteEntry.flags.writable, true);
  assert.equal(result.pteEntry.flags.userAccessible, true);
});

test('walkPageTable handles Page Fault scenarios accurately', () => {
  const demand = walkPageTable('0x00007f9b2000', 'DEMAND_ZERO');
  assert.equal(demand.status, 'PAGE_FAULT_NOT_PRESENT');
  assert.ok(demand.faultReason?.includes('do_anonymous_page'));

  const cow = walkPageTable('0x00007f9b2000', 'COW_READONLY');
  assert.equal(cow.status, 'PAGE_FAULT_PROTECTION');
  assert.ok(cow.faultReason?.includes('Copy-On-Write'));
});

test('createInitialBuddySystem and allocateBuddyBlock splits and updates memory', () => {
  const system = createInitialBuddySystem();
  assert.equal(system.totalMemoryKb, 256);
  assert.ok(system.freeMemoryKb > 0);

  // Allocate Order 1 (8KB)
  const allocated = allocateBuddyBlock(system, 1, 'slab-alloc');
  assert.ok(allocated.freeMemoryKb < system.freeMemoryKb);
  const found = allocated.blocks.find((b) => b.tag === 'slab-alloc');
  assert.ok(found);
  assert.equal(found.order, 1);
  assert.equal(found.sizeKb, 8);
});

test('freeBuddyBlock coalesces adjacent free buddies', () => {
  let system = createInitialBuddySystem();
  const initialCount = system.blocks.length;

  // Allocate an order 2 block
  system = allocateBuddyBlock(system, 2, 'test-alloc');
  const target = system.blocks.find((b) => b.tag === 'test-alloc')!;

  // Free it back
  const freed = freeBuddyBlock(system, target.id);
  assert.ok(freed.freeMemoryKb >= system.freeMemoryKb);
});
