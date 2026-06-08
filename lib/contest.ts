export type ContestTiming = "UPCOMING" | "ACTIVE" | "ENDED";

export function getContestTiming(
  startTime: Date,
  endTime: Date,
  now: Date = new Date(),
): ContestTiming {
  if (now < startTime) return "UPCOMING";
  if (now > endTime) return "ENDED";
  return "ACTIVE";
}

export function canAttemptContest(
  startTime: Date,
  endTime: Date,
  now: Date = new Date(),
): boolean {
  return getContestTiming(startTime, endTime, now) === "ACTIVE";
}
