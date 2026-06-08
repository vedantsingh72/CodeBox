export const MIN_SCORE_RATIO = 0.5;
export const SCORE_DECAY_RATIO = 0.01;

export function calculateDynamicScore(
  basePoints: number,
  acceptedCountBeforeSolve: number,
) {
  const floor = basePoints * MIN_SCORE_RATIO;
  const decayed =
    basePoints - acceptedCountBeforeSolve * basePoints * SCORE_DECAY_RATIO;

  return Math.max(floor, decayed);
}
