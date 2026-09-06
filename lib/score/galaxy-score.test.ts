import { describe, it, expect } from 'vitest';
import { computeGalaxyScore } from './galaxy-score';

describe('computeGalaxyScore', () => {
  it('returns the unproven baseline (500) for brand-new agents', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 0, missionsTotal: 0, humanApprovedCount: 0, trustViolations: 0,
    });
    expect(result.total).toBe(500);
    expect(result.isUnproven).toBe(true);
    expect(result.missionsComponent).toBe(200);
    expect(result.approvalComponent).toBe(200);
    expect(result.trustComponent).toBe(100);
  });

  it('returns 500 unproven even with a violation (unproven branch wins)', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 1, missionsTotal: 1, humanApprovedCount: 1, trustViolations: 1,
    });
    expect(result.total).toBe(500);
    expect(result.isUnproven).toBe(true);
  });

  it('scores a clean perfect record of 100 missions at exactly 1000', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 100, missionsTotal: 100, humanApprovedCount: 100, trustViolations: 0,
    });
    expect(result.total).toBe(1000);
    expect(result.missionsComponent).toBe(400);
    expect(result.approvalComponent).toBe(400);
    expect(result.trustComponent).toBe(200);
    expect(result.isUnproven).toBe(false);
  });

  it('caps the missions component at 400 beyond 100 missions', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 500, missionsTotal: 500, humanApprovedCount: 500, trustViolations: 0,
    });
    expect(result.total).toBe(1000);
    expect(result.missionsComponent).toBe(400);
  });

  it('drops trust component to 0 on a single violation', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 100, missionsTotal: 100, humanApprovedCount: 100, trustViolations: 1,
    });
    expect(result.trustComponent).toBe(0);
    expect(result.total).toBe(800);
  });

  it('linearly reduces the approval component as approvals drop', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 10, missionsTotal: 10, humanApprovedCount: 9, trustViolations: 0,
    });
    expect(result.approvalComponent).toBe(360);
  });

  it('handles all-failed terminal missions without dividing by zero', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 0, missionsTotal: 5, humanApprovedCount: 0, trustViolations: 0,
    });
    expect(result.isUnproven).toBe(false);
    expect(result.approvalComponent).toBe(0);
    expect(result.missionsComponent).toBe(0);
    expect(result.trustComponent).toBe(200);
    expect(result.total).toBe(200);
  });
});
