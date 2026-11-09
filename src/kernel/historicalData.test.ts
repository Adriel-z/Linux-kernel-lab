import test from 'node:test';
import assert from 'node:assert/strict';
import { generateHistoricalTelemetry, computeTelemetrySummary } from './historicalData';

test('generateHistoricalTelemetry generates requested count of chronologically ordered points', () => {
  const points = generateHistoricalTelemetry(25);
  assert.equal(points.length, 25);

  for (let i = 0; i < points.length - 1; i++) {
    assert.ok(points[i].timestamp < points[i + 1].timestamp);
  }

  const sample = points[0];
  assert.ok(sample.cpuPercent >= 0 && sample.cpuPercent <= 100);
  assert.ok(sample.usedRamGb > 0 && sample.usedRamGb <= sample.totalRamGb);
  assert.ok(sample.load1m >= 0);
  assert.ok(sample.timeLabel.includes(':'));
});

test('computeTelemetrySummary computes accurate statistics across data points', () => {
  const points = generateHistoricalTelemetry(30);
  const summary = computeTelemetrySummary(points);

  assert.equal(summary.totalDataPoints, 30);
  assert.ok(summary.peakCpuPercent >= summary.avgCpuPercent);
  assert.ok(summary.peakLoad1m >= 0);
  assert.ok(summary.currentUsedRamGb > 0);
  assert.ok(summary.avgRamGb > 0);
});
