import { db } from "@/lib/db";

export type ContestPhase = "BEFORE_START" | "LIVE" | "ARCHIVED";

export function getContestPhase(start: Date, end: Date, now = new Date()): ContestPhase {
  if (now < start) return "BEFORE_START";
  if (now <= end) return "LIVE";
  return "ARCHIVED";
}

export async function canViewContestStatement(options: {
  contestId: string;
  userId: string | null;
  isAdmin: boolean;
  start: Date;
  end: Date;
}) {
  if (options.isAdmin) return true;

  const phase = getContestPhase(options.start, options.end);
  if (phase === "BEFORE_START") return false;
  if (phase === "ARCHIVED") return true;
  if (!options.userId) return false;

  const registration = await db.contestRegistration.findUnique({
    where: {
      userId_contestId: {
        userId: options.userId,
        contestId: options.contestId,
      },
    },
    select: { id: true },
  });

  return Boolean(registration);
}

export function canSubmitInContest(start: Date, end: Date, now = new Date()) {
  return getContestPhase(start, end, now) === "LIVE";
}
