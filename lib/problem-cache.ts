import { db } from "@/lib/db";
import { getRedisClient } from "@/lib/redis";
import type {
  StarterCode,
  TestCase,
} from "@/lib/platform-types";

const PROBLEM_TTL_SECONDS = 60 * 10;
const CONTEST_PROBLEM_TTL_SECONDS = 60 * 5;

export type CachedProblemExecution = {
  id: string;
  problemType: "STDIN";
  isVisible: boolean;
  starterCode: StarterCode;
  publicTestCases: TestCase[];
  hiddenTestCases: TestCase[];
  timeLimit: number;
  memoryLimit: number;
  supportedLanguages: string[];
};

export type CachedContestProblemExecution = {
  contest: {
    id: string;
    isVisible: boolean;
    startTime: Date;
    endTime: Date;
  };
  contestProblem: {
    basePoints: number;
    acceptedCount: number;
  };
};

function problemExecutionKey(problemId: string) {
  return `problem:${problemId}:execution`;
}

function contestProblemExecutionKey(contestId: string, problemId: string) {
  return `contest:${contestId}:problem:${problemId}:execution`;
}

export async function getProblemExecutionData(problemId: string) {
  const redis = await getRedisClient();
  const key = problemExecutionKey(problemId);

  if (redis) {
    const cached = await redis.get(key);
    if (cached) {
      console.info("[redis] problem execution cache hit", { problemId });
      return JSON.parse(cached) as CachedProblemExecution;
    }
  }

  console.info("[redis] problem execution cache miss", { problemId });
  const problem = await db.problem.findUnique({
    where: { id: problemId },
    select: {
      id: true,
      problemType: true,
      isVisible: true,
      starterCode: true,
      publicTestCases: true,
      hiddenTestCases: true,
      timeLimit: true,
      memoryLimit: true,
      supportedLanguages: true,
    },
  });

  if (!problem) return null;

  const payload: CachedProblemExecution = {
    id: problem.id,
    problemType: problem.problemType,
    isVisible: problem.isVisible,
    starterCode: problem.starterCode as StarterCode,
    publicTestCases: problem.publicTestCases as TestCase[],
    hiddenTestCases: problem.hiddenTestCases as TestCase[],
    timeLimit: problem.timeLimit,
    memoryLimit: problem.memoryLimit,
    supportedLanguages: problem.supportedLanguages,
  };

  if (redis) {
    await redis.set(key, JSON.stringify(payload), { EX: PROBLEM_TTL_SECONDS });
  }

  return payload;
}

export async function getContestProblemExecutionData(
  contestId: string,
  problemId: string,
) {
  const redis = await getRedisClient();
  const key = contestProblemExecutionKey(contestId, problemId);

  if (redis) {
    const cached = await redis.get(key);
    if (cached) {
      console.info("[redis] contest problem cache hit", { contestId, problemId });
      const parsed = JSON.parse(cached) as {
        contest: Omit<CachedContestProblemExecution["contest"], "startTime" | "endTime"> & {
          startTime: string;
          endTime: string;
        };
        contestProblem: CachedContestProblemExecution["contestProblem"];
      };
      return {
        contest: {
          ...parsed.contest,
          startTime: new Date(parsed.contest.startTime),
          endTime: new Date(parsed.contest.endTime),
        },
        contestProblem: parsed.contestProblem,
      } satisfies CachedContestProblemExecution;
    }
  }

  console.info("[redis] contest problem cache miss", { contestId, problemId });
  const contest = await db.contest.findUnique({
    where: { id: contestId },
    select: {
      id: true,
      isVisible: true,
      contestStartTime: true,
      contestEndTime: true,
      problems: {
        where: { problemId },
        select: {
          basePoints: true,
          acceptedCount: true,
        },
      },
    },
  });

  if (!contest || contest.problems.length === 0) return null;

  const payload: CachedContestProblemExecution = {
    contest: {
      id: contest.id,
      isVisible: contest.isVisible,
      startTime: contest.contestStartTime,
      endTime: contest.contestEndTime,
    },
    contestProblem: contest.problems[0],
  };

  if (redis) {
    await redis.set(
      key,
      JSON.stringify({
        contest: {
          ...payload.contest,
          startTime: payload.contest.startTime.toISOString(),
          endTime: payload.contest.endTime.toISOString(),
        },
        contestProblem: payload.contestProblem,
      }),
      { EX: CONTEST_PROBLEM_TTL_SECONDS },
    );
  }

  return payload;
}

export async function invalidateProblemExecutionCache(problemId: string) {
  const redis = await getRedisClient();
  if (!redis) return;

  await redis.del(problemExecutionKey(problemId));
}

export async function invalidateContestProblemExecutionCache(
  contestId: string,
  problemId: string,
) {
  const redis = await getRedisClient();
  if (!redis) return;

  await redis.del(contestProblemExecutionKey(contestId, problemId));
}
