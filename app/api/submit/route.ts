import { db } from "@/lib/db";
import { isAdminUser } from "@/lib/access";
import { canSubmitInContest } from "@/lib/contest-visibility";
import { broadcastLeaderboardUpdate, getSocketServer } from "@/lib/contest-socket";
import { calculateDynamicScore } from "@/lib/contest-scoring";
import {
  getContestProblemExecutionData,
  getProblemExecutionData,
  invalidateContestProblemExecutionCache,
} from "@/lib/problem-cache";
import { normalizeLanguage } from "@/lib/starter-code-manager";
import { evaluateSubmission } from "@/lib/submission-evaluator";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { getCurrentUserData } from "@/modules/auth/actions";
import { SubmissionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserData();
    if (!user || !("id" in user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { problemId, language, code, sourceCode, contestId } = await request.json();
    const submittedSource = String(sourceCode ?? code ?? "");

    if (!problemId || !language || !submittedSource.trim()) {
      return NextResponse.json(
        { error: "problemId, language, and sourceCode are required" },
        { status: 400 },
      );
    }

    const normalizedLanguage = normalizeLanguage(language);
    const problem = await getProblemExecutionData(problemId);

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    if (!problem.isVisible && !(await isAdminUser())) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    let contestProblem: { basePoints: number; acceptedCount: number } | null = null;

    if (contestId) {
      const contestData = await getContestProblemExecutionData(contestId, problemId);

      if (!contestData || !contestData.contest.isVisible) {
        return NextResponse.json({ error: "Contest not found" }, { status: 404 });
      }

      contestProblem = contestData.contestProblem;

      const registration = await db.contestRegistration.findUnique({
        where: {
          userId_contestId: {
            userId: user.id,
            contestId,
          },
        },
        select: { id: true },
      });

      if (!registration) {
        return NextResponse.json(
          { error: "You must register for this contest before submitting." },
          { status: 403 },
        );
      }

      if (!canSubmitInContest(contestData.contest.startTime, contestData.contest.endTime)) {
        return NextResponse.json(
          { error: "Contest is not active. You can only submit during the contest window." },
          { status: 403 },
        );
      }
    }

    const evaluation = await evaluateSubmission({
      problem,
      language: normalizedLanguage,
      sourceCode: submittedSource,
      contestMode: Boolean(contestId),
    });

    const verdict = evaluation.verdict as SubmissionStatus;
    const submission = await db.$transaction(async (tx) => {
      let scoreAwarded = 0;

      if (contestId) {
        await tx.contestAttempt.upsert({
          where: {
            userId_contestId_problemId: {
              userId: user.id,
              contestId,
              problemId,
            },
          },
          create: {
            userId: user.id,
            contestId,
            problemId,
            firstSubmissionAt: new Date(),
            solvedAt: verdict === SubmissionStatus.ACCEPTED ? new Date() : null,
          },
          update: {
            firstSubmissionAt: new Date(),
          },
        });

        const alreadyAccepted = await tx.submission.findFirst({
          where: {
            userId: user.id,
            contestId,
            problemId,
            verdict: SubmissionStatus.ACCEPTED,
          },
          select: { id: true },
        });

        if (
          verdict === SubmissionStatus.ACCEPTED &&
          !alreadyAccepted &&
          contestProblem
        ) {
          scoreAwarded = calculateDynamicScore(
            contestProblem.basePoints,
            contestProblem.acceptedCount,
          );

          await tx.contestProblem.update({
            where: {
              contestId_problemId: {
                contestId,
                problemId,
              },
            },
            data: { acceptedCount: { increment: 1 } },
          });

          await tx.contestAttempt.updateMany({
            where: {
              userId: user.id,
              contestId,
              problemId,
              solvedAt: null,
            },
            data: { solvedAt: new Date() },
          });
        }
      }

      return tx.submission.create({
        data: {
          userId: user.id,
          problemId,
          contestId: contestId || null,
          language: normalizedLanguage,
          sourceCode: submittedSource,
          verdict,
          runtime: evaluation.runtime,
          memory: evaluation.memory,
          passedTests: evaluation.passedTests,
          totalTests: evaluation.totalTests,
          scoreAwarded,
        },
      });
    });

    if (contestId) {
      if (submission.verdict === SubmissionStatus.ACCEPTED) {
        await invalidateContestProblemExecutionCache(contestId, problemId);
      }

      const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.email.split("@")[0];

      getSocketServer()?.to(`contest:${contestId}`).emit(SOCKET_EVENTS.SUBMISSION_UPDATE, {
        contestId,
        userId: user.id,
        displayName,
        problemId,
        status: submission.verdict,
        scoreAwarded: submission.scoreAwarded,
        timestamp: submission.submittedAt.toISOString(),
      });

      await broadcastLeaderboardUpdate(contestId);
    }

    return NextResponse.json({
      submission: {
        id: submission.id,
        verdict: submission.verdict,
        status: submission.verdict,
        passedTests: submission.passedTests,
        failedTests: evaluation.totalTests - evaluation.passedTests,
        totalTests: submission.totalTests,
        runtime: submission.runtime,
        memory: submission.memory,
        scoreAwarded: submission.scoreAwarded,
      },
      message: getSubmissionMessage(submission.verdict),
      publicResults: evaluation.publicResults,
      firstFailure: evaluation.firstFailure,
    });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit solution" },
      { status: 500 },
    );
  }
}

function getSubmissionMessage(verdict: SubmissionStatus) {
  if (verdict === SubmissionStatus.ACCEPTED) return "Accepted";
  if (verdict === SubmissionStatus.COMPILATION_ERROR) return "Compilation Error";
  if (verdict === SubmissionStatus.RUNTIME_ERROR) return "Runtime Error";
  if (verdict === SubmissionStatus.TIME_LIMIT_EXCEEDED) return "Time Limit Exceeded";
  if (verdict === SubmissionStatus.MEMORY_LIMIT_EXCEEDED) return "Memory Limit Exceeded";
  if (verdict === SubmissionStatus.WRONG_ANSWER) return "Wrong Answer";
  return "Internal Error";
}
