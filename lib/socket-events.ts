import type { LeaderboardEntry } from "./leaderboard";

export const SOCKET_EVENTS = {
  JOIN_CONTEST: "join-contest",
  LEAVE_CONTEST: "leave-contest",
  LEADERBOARD_UPDATE: "leaderboard-update",
  CONTEST_TIMER: "contest-timer",
  SUBMISSION_UPDATE: "submission-update",
} as const;

export type ContestTimerPayload = {
  contestId: string;
  startTime: string;
  endTime: string;
  serverTime: string;
  timing: "UPCOMING" | "ACTIVE" | "ENDED";
  remainingMs: number;
};

export type SubmissionUpdatePayload = {
  contestId: string;
  userId: string;
  displayName: string;
  problemId: string;
  status: string;
  timestamp: string;
};

export type LeaderboardUpdatePayload = {
  contestId: string;
  leaderboard: LeaderboardEntry[];
};
