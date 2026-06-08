import { SubmissionStatus } from "@prisma/client";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  solvedCount: number;
  score: number;
  penaltyMinutes: number;
  lastSubmissionAt: string | null;
};

type SubmissionRow = {
  userId: string;
  problemId: string;
  verdict: SubmissionStatus;
  submittedAt: Date;
  scoreAwarded?: number;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

const PENALTY_PER_WRONG = 20;

export function computeLeaderboard(
  submissions: SubmissionRow[],
  contestStartTime: Date,
  problemIds: string[],
): LeaderboardEntry[] {
  const byUser = new Map<
    string,
    {
      displayName: string;
      problems: Map<
        string,
        {
          solved: boolean;
          penalty: number;
          score: number;
          solveTime: Date | null;
        }
      >;
    }
  >();

  const sorted = [...submissions].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime(),
  );

  for (const sub of sorted) {
    if (!problemIds.includes(sub.problemId)) continue;

    if (!byUser.has(sub.userId)) {
      const name =
        [sub.user.firstName, sub.user.lastName].filter(Boolean).join(" ") ||
        sub.user.email.split("@")[0];
      byUser.set(sub.userId, {
        displayName: name,
        problems: new Map(),
      });
    }

    const userStats = byUser.get(sub.userId)!;
    if (!userStats.problems.has(sub.problemId)) {
      userStats.problems.set(sub.problemId, {
        solved: false,
        penalty: 0,
        score: 0,
        solveTime: null,
      });
    }

    const problemStats = userStats.problems.get(sub.problemId)!;
    if (problemStats.solved) continue;

    if (sub.verdict === SubmissionStatus.ACCEPTED) {
      const minutesFromStart = Math.floor(
        (sub.submittedAt.getTime() - contestStartTime.getTime()) / 60000,
      );
      problemStats.solved = true;
      problemStats.penalty += minutesFromStart;
      problemStats.score = sub.scoreAwarded ?? 1;
      problemStats.solveTime = sub.submittedAt;
    } else {
      problemStats.penalty += PENALTY_PER_WRONG;
    }
  }

  const entries: Omit<LeaderboardEntry, "rank">[] = [];

  for (const [userId, data] of byUser) {
    let solvedCount = 0;
    let score = 0;
    let penaltyMinutes = 0;
    let lastSubmissionAt: Date | null = null;

    for (const stats of data.problems.values()) {
      if (stats.solved) {
        solvedCount += 1;
        score += stats.score;
        penaltyMinutes += stats.penalty;
        if (
          stats.solveTime &&
          (!lastSubmissionAt || stats.solveTime > lastSubmissionAt)
        ) {
          lastSubmissionAt = stats.solveTime;
        }
      }
    }

    entries.push({
      userId,
      displayName: data.displayName,
      solvedCount,
      score,
      penaltyMinutes,
      lastSubmissionAt: lastSubmissionAt?.toISOString() ?? null,
    });
  }

  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    if (a.penaltyMinutes !== b.penaltyMinutes) {
      return a.penaltyMinutes - b.penaltyMinutes;
    }
    const aTime = a.lastSubmissionAt
      ? new Date(a.lastSubmissionAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const bTime = b.lastSubmissionAt
      ? new Date(b.lastSubmissionAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
