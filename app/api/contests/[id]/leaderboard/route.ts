import { getContestLeaderboard } from "@/lib/contest-socket";
import { isAdminUser } from "@/lib/access";
import { getCurrentUserData } from "@/modules/auth/actions";
import { db } from "@/lib/db";
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
      select: { isVisible: true },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    if (!admin && !contest.isVisible) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const data = await getContestLeaderboard(id);
    if (!data) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const userRank =
      user && "id" in user
        ? data.leaderboard.find((entry) => entry.userId === user.id) ?? null
        : null;

    return NextResponse.json({
      leaderboard: data.leaderboard,
      userRank,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
