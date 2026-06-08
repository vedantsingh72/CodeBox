import { db } from "@/lib/db";
import { isAdminUser } from "@/lib/access";
import { getCurrentUserData } from "@/modules/auth/actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserData();
    if (!user || !("id" in user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contestId } = await params;
    const admin = await isAdminUser();

    const contest = await db.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    if (!admin && !contest.isVisible) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const registration = await db.contestRegistration.upsert({
      where: {
        userId_contestId: {
          userId: user.id,
          contestId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        contestId,
      },
    });

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to register for contest" },
      { status: 500 },
    );
  }
}
