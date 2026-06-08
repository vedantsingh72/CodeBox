import type { LeaderboardEntry } from "@/lib/leaderboard";
import { getLeaderboardKey, getRedisClient } from "@/lib/redis";

type LeaderboardMeta = Omit<LeaderboardEntry, "rank">;
const SCORE_SCALE = 1_000_000_000_000;

function metaKey(contestId: string, userId: string) {
  return `contest:${contestId}:leaderboard:meta:${userId}`;
}

function compositeScore(score: number, lastSubmissionAt?: string | null) {
  const time = lastSubmissionAt ? new Date(lastSubmissionAt).getTime() : Date.now();
  return score * SCORE_SCALE - time;
}

export async function updateRedisLeaderboard(
  contestId: string,
  entry: LeaderboardEntry,
) {
  const redis = await getRedisClient();
  if (!redis) return false;

  await redis.zAdd(getLeaderboardKey(contestId), {
    score: compositeScore(entry.score, entry.lastSubmissionAt),
    value: entry.userId,
  });
  await redis.set(metaKey(contestId, entry.userId), JSON.stringify({
    userId: entry.userId,
    displayName: entry.displayName,
    solvedCount: entry.solvedCount,
    score: entry.score,
    penaltyMinutes: entry.penaltyMinutes,
    lastSubmissionAt: entry.lastSubmissionAt,
  } satisfies LeaderboardMeta));

  return true;
}

export async function syncRedisLeaderboard(
  contestId: string,
  entries: LeaderboardEntry[],
) {
  const redis = await getRedisClient();
  if (!redis) return false;

  const key = getLeaderboardKey(contestId);
  await redis.del(key);

  if (entries.length === 0) return true;

  await redis.zAdd(
    key,
    entries.map((entry) => ({
      score: compositeScore(entry.score, entry.lastSubmissionAt),
      value: entry.userId,
    })),
  );

  await Promise.all(
    entries.map((entry) =>
      redis.set(metaKey(contestId, entry.userId), JSON.stringify({
        userId: entry.userId,
        displayName: entry.displayName,
        solvedCount: entry.solvedCount,
        score: entry.score,
        penaltyMinutes: entry.penaltyMinutes,
        lastSubmissionAt: entry.lastSubmissionAt,
      } satisfies LeaderboardMeta)),
    ),
  );

  return true;
}

export async function readRedisLeaderboard(contestId: string) {
  const redis = await getRedisClient();
  if (!redis) return null;

  const rows = await redis.zRangeWithScores(getLeaderboardKey(contestId), 0, -1, {
    REV: true,
  });

  if (rows.length === 0) return [];

  const entries = await Promise.all(
    rows.map(async (row, index) => {
      const rawMeta = await redis.get(metaKey(contestId, row.value));
      if (!rawMeta) return null;
      const meta = JSON.parse(rawMeta) as LeaderboardMeta;
      return {
        ...meta,
        rank: index + 1,
      } satisfies LeaderboardEntry;
    }),
  );

  return entries.filter((entry): entry is LeaderboardEntry => Boolean(entry));
}

export async function getRedisRank(contestId: string, userId: string) {
  const redis = await getRedisClient();
  if (!redis) return null;

  const rank = await redis.zRevRank(getLeaderboardKey(contestId), userId);
  return rank === null ? null : rank + 1;
}
