/**
 * Galaxy Score — Agent reputation, 0–1000.
 *
 * Three weighted components that add up to 1000 total:
 *
 *   1. Missions component        (0–400, 40% weight)
 *        Logarithmic in missionsCompleted: (log10(1+n)/log10(101)) * 400.
 *        Rewards the first wins more than the hundredth, hits exactly 400
 *        at n=100, caps at 400 beyond.
 *
 *   2. Human approval component  (0–400, 40% weight)
 *        Linear: (approved / completed) * 400. Zero-guarded when completed=0
 *        so an agent whose only terminal missions failed still scores safely.
 *
 *   3. Trust component           (0–200, 20% weight)
 *        Binary: 200 if zero violations, 0 otherwise. A graduated penalty
 *        would let agents rationalize small breaches; the hard line is the
 *        whole point of the trust badge.
 *
 * New agents with < 3 total missions are flagged isUnproven and receive a
 * neutral 500 total split proportionally {200, 200, 100} across components.
 * This branch runs before the violation check — unproven beats judgment.
 * The UI shows "Unproven" instead of the number for these agents.
 */

export interface ScoreInputs {
  missionsCompleted: number;
  missionsTotal: number;
  humanApprovedCount: number;
  trustViolations: number;
}

export interface ScoreBreakdown {
  total: number;
  missionsComponent: number;
  approvalComponent: number;
  trustComponent: number;
  isUnproven: boolean;
}

const UNPROVEN_THRESHOLD = 3;

export function computeGalaxyScore(inputs: ScoreInputs): ScoreBreakdown {
  const { missionsCompleted, missionsTotal, humanApprovedCount, trustViolations } = inputs;

  if (missionsTotal < UNPROVEN_THRESHOLD) {
    return {
      total: 500,
      missionsComponent: 200,
      approvalComponent: 200,
      trustComponent: 100,
      isUnproven: true,
    };
  }

  const missionsComponent = Math.min(
    400,
    (Math.log10(1 + missionsCompleted) / Math.log10(101)) * 400
  );

  const approvalComponent = missionsCompleted > 0
    ? (humanApprovedCount / missionsCompleted) * 400
    : 0;

  const trustComponent = trustViolations === 0 ? 200 : 0;

  return {
    total: Math.round(missionsComponent + approvalComponent + trustComponent),
    missionsComponent: Math.round(missionsComponent),
    approvalComponent: Math.round(approvalComponent),
    trustComponent: Math.round(trustComponent),
    isUnproven: false,
  };
}
