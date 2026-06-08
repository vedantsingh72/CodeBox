import { canAttemptContest } from "@/lib/contest";
import { db } from "@/lib/db";
import { getCurrentUserData } from "@/modules/auth/actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserData();
    if (!user || !("id" in user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contestId } = await params;
    const { problemId } = await request.json();

    if (!problemId) {
      return NextResponse.json({ error: "problemId is required" }, { status: 400 });
    }

    const contest = await db.contest.findUnique({
      where: { id: contestId },
      include: {
        problems: { where: { problemId } },
      },
    });

    if (!contest || !contest.isVisible || contest.problems.length === 0) {
      return NextResponse.json({ error: "Contest problem not found" }, { status: 404 });
    }

    if (!canAttemptContest(contest.contestStartTime, contest.contestEndTime)) {
      return NextResponse.json(
        { error: "Contest problems unlock only while the contest is running." },
        { status: 403 },
      );
    }

    const registration = await db.contestRegistration.findUnique({
      where: {
        userId_contestId: {
          userId: user.id,
          contestId,
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Register for the contest before attempting problems." },
        { status: 403 },
      );
    }

    const attempt = await db.contestAttempt.upsert({
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
      },
      update: {},
    });

    return NextResponse.json({
      attempt,
      url: `/problems/${problemId}?contestId=${contestId}`,
    });
  } catch (error) {
    console.error("Contest attempt error:", error);
    return NextResponse.json(
      { error: "Failed to start problem attempt" },
      { status: 500 },
    );
  }
}
