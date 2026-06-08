import { db } from "@/lib/db";
import { getContestTiming } from "@/lib/contest";
import { isAdminUser } from "@/lib/access";
import { currentUserRole, getCurrentUserData } from "@/modules/auth/actions";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await isAdminUser();
    const user = await getCurrentUserData();
    const userId = user && "id" in user ? user.id : null;

    const contests = await db.contest.findMany({
      where: admin ? undefined : { isVisible: true },
      include: {
        problems: {
          include: {
            problem: {
              select: { id: true, title: true, difficulty: true },
            },
          },
          orderBy: { order: "asc" },
        },
        createdBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        _count: { select: { registrations: true } },
      },
      orderBy: { contestStartTime: "desc" },
    });

    const now = new Date();
    const registrations = userId
      ? await db.contestRegistration.findMany({
          where: {
            userId,
            contestId: { in: contests.map((c) => c.id) },
          },
          select: { contestId: true },
        })
      : [];
    const registeredContestIds = new Set(registrations.map((r) => r.contestId));

    const enriched = contests.map((c: (typeof contests)[number]) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      startTime: c.contestStartTime,
      endTime: c.contestEndTime,
      isVisible: c.isVisible,
      timing: getContestTiming(c.contestStartTime, c.contestEndTime, now),
      problemCount: c.problems.length,
      registrationCount: c._count.registrations,
      isRegistered: registeredContestIds.has(c.id),
      problems: c.problems.map((cp: (typeof c.problems)[number]) => cp.problem),
      createdBy: c.createdBy,
    }));

    return NextResponse.json({ contests: enriched, isAdmin: admin });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userRole = await currentUserRole();
    const user = await getCurrentUserData();

    if (!user || !("id" in user) || userRole !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, startTime, endTime, problemIds, problemPoints, isVisible } =
      await request.json();

    if (!title || !description || !startTime || !endTime) {
      return NextResponse.json(
        { error: "title, description, startTime, and endTime are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one problem for the contest" },
        { status: 400 },
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 },
      );
    }

    const contest = await db.contest.create({
      data: {
        title,
        description,
        contestStartTime: start,
        contestEndTime: end,
        isVisible: Boolean(isVisible),
        createdById: user.id,
        problems: {
          create: problemIds.map((problemId: string, order: number) => {
            const points = Number(problemPoints?.[problemId] ?? 100);
            return {
              problemId,
              order,
              basePoints: Math.min(1000, Math.max(100, points || 100)),
            };
          }),
        },
      },
      include: {
        problems: {
          include: { problem: { select: { id: true, title: true } } },
        },
      },
    });

    return NextResponse.json({ contest }, { status: 201 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to create contest" },
      { status: 500 },
    );
  }
}
