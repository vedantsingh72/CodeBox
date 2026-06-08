import { db } from "@/lib/db";
import { getContestTiming, canAttemptContest } from "@/lib/contest";
import { isAdminUser } from "@/lib/access";
import { getCurrentUserData } from "@/modules/auth/actions";
import { UserRole } from "@prisma/client";
import { currentUserRole } from "@/modules/auth/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = await isAdminUser();
    const user = await getCurrentUserData();

    const contest = await db.contest.findUnique({
      where: { id },
      include: {
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                tags: true,
                description: true,
                isVisible: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    if (!admin && !contest.isVisible) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const now = new Date();
    const timing = getContestTiming(contest.contestStartTime, contest.contestEndTime, now);

    let isRegistered = false;
    if (user && "id" in user) {
      const registration = await db.contestRegistration.findUnique({
        where: {
          userId_contestId: {
            userId: user.id,
            contestId: id,
          },
        },
      });
      isRegistered = Boolean(registration);
    }

    return NextResponse.json({
      contest: {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        startTime: contest.contestStartTime,
        endTime: contest.contestEndTime,
        isVisible: contest.isVisible,
        timing,
        canAttempt: canAttemptContest(contest.contestStartTime, contest.contestEndTime, now),
        registrationCount: contest._count.registrations,
        isRegistered,
        problems: contest.problems.map((cp: (typeof contest.problems)[number]) => ({
          order: cp.order,
          basePoints: cp.basePoints,
          acceptedCount: cp.acceptedCount,
          ...cp.problem,
        })),
        createdBy: contest.createdBy,
      },
      isAdmin: admin,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const role = await currentUserRole();
    if (role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { isVisible } = await request.json();

    if (typeof isVisible !== "boolean") {
      return NextResponse.json(
        { error: "isVisible must be a boolean" },
        { status: 400 },
      );
    }

    const contest = await db.contest.update({
      where: { id },
      data: { isVisible },
      select: { id: true, title: true, isVisible: true },
    });

    return NextResponse.json({ contest });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to update contest visibility" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const role = await currentUserRole();
    if (role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db.contest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to delete contest" },
      { status: 500 },
    );
  }
}
