import { db } from "@/lib/db";
import { canSubmitInContest } from "@/lib/contest-visibility";
import {
  getContestProblemExecutionData,
  getProblemExecutionData,
} from "@/lib/problem-cache";
import { normalizeLanguage } from "@/lib/starter-code-manager";
import { evaluateSubmission } from "@/lib/submission-evaluator";
import { getCurrentUserData } from "@/modules/auth/actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserData();
    if (!user || !("id" in user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { problemId, language, code, sourceCode, customInput, contestId } =
      await request.json();
    const submittedSource = String(sourceCode ?? code ?? "");

    if (!problemId || !language || !submittedSource.trim()) {
      return NextResponse.json(
        { error: "problemId, language, and sourceCode are required" },
        { status: 400 },
      );
    }

    const problem = await getProblemExecutionData(problemId);
    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    if (contestId) {
      const contestData = await getContestProblemExecutionData(contestId, problemId);

      if (!contestData || !contestData.contest.isVisible) {
        return NextResponse.json({ error: "Contest problem not found" }, { status: 404 });
      }

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
          { error: "Register for the contest before running code." },
          { status: 403 },
        );
      }

      if (!canSubmitInContest(contestData.contest.startTime, contestData.contest.endTime)) {
        return NextResponse.json(
          { error: "Contest problems can only be run while the contest is active." },
          { status: 403 },
        );
      }
    }

    const evaluation = await evaluateSubmission({
      problem: {
        ...problem,
        hiddenTestCases: [],
        publicTestCases: customInput
          ? []
          : problem.publicTestCases.slice(0, 1),
      },
      language: normalizeLanguage(language),
      sourceCode: submittedSource,
      customInput,
    });

    return NextResponse.json({
      ok: evaluation.verdict === "ACCEPTED",
      verdict: evaluation.verdict,
      message:
        evaluation.verdict === "ACCEPTED"
          ? customInput
            ? "Code executed successfully"
            : "Sample test passed"
          : evaluation.verdict,
      publicResults: evaluation.publicResults,
      firstFailure: evaluation.firstFailure,
      ranCustomInput: Boolean(customInput),
    });
  } catch (error) {
    console.error("Run error:", error);
    return NextResponse.json({ error: "Failed to run code" }, { status: 500 });
  }
}
