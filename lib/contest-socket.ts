import { prisma as db } from "@/lib/prisma";
import { computeLeaderboard } from "@/lib/leaderboard";
import {
  readRedisLeaderboard,
  syncRedisLeaderboard,
} from "@/lib/redis-leaderboard";
import { getContestTiming } from "@/lib/contest";
import {
  SOCKET_EVENTS,
  type ContestTimerPayload,
  type LeaderboardUpdatePayload,
} from "@/lib/socket-events";
import type { Server } from "socket.io";

declare global {
  var socketIo: Server | undefined;
}

export function getSocketServer(): Server | undefined {
  return globalThis.socketIo;
}

export async function getContestLeaderboard(
  contestId: string,
  options: { preferRedis?: boolean } = { preferRedis: true },
) {
  const redisLeaderboard = options.preferRedis
    ? await readRedisLeaderboard(contestId)
    : null;
  if (redisLeaderboard && redisLeaderboard.length > 0) {
    const contest = await db.contest.findUnique({ where: { id: contestId } });
    if (!contest) return null;
    return {
      contest,
      leaderboard: redisLeaderboard,
    };
  }

  const contest = await db.contest.findUnique({
    where: { id: contestId },
    include: {
      problems: { select: { problemId: true } },
      submissions: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { submittedAt: "asc" },
      },
    },
  });

  if (!contest) return null;

  const problemIds = contest.problems.map(
    (p: (typeof contest.problems)[number]) => p.problemId,
  );
  const leaderboard = computeLeaderboard(
    contest.submissions,
    contest.contestStartTime,
    problemIds,
  );

  return {
    contest,
    leaderboard,
  };
}

export async function broadcastLeaderboardUpdate(contestId: string) {
  const io = getSocketServer();
  if (!io) return;

  const data = await getContestLeaderboard(contestId, { preferRedis: false });
  if (!data) return;

  await syncRedisLeaderboard(contestId, data.leaderboard);

  const payload: LeaderboardUpdatePayload = {
    contestId,
    leaderboard: data.leaderboard,
  };

  io.to(`contest:${contestId}`).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, payload);
}

export function buildTimerPayload(
  contestId: string,
  startTime: Date,
  endTime: Date,
): ContestTimerPayload {
  const now = new Date();
  const timing = getContestTiming(startTime, endTime, now);
  const remainingMs =
    timing === "ACTIVE"
      ? Math.max(0, endTime.getTime() - now.getTime())
      : timing === "UPCOMING"
        ? Math.max(0, startTime.getTime() - now.getTime())
        : 0;

  return {
    contestId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    serverTime: now.toISOString(),
    timing,
    remainingMs,
  };
}

export function emitContestTimer(
  io: Server,
  contestId: string,
  startTime: Date,
  endTime: Date,
) {
  io.to(`contest:${contestId}`).emit(
    SOCKET_EVENTS.CONTEST_TIMER,
    buildTimerPayload(contestId, startTime, endTime),
  );
}
