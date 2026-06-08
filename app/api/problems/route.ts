import { db } from "@/lib/db";
import { isAdminUser } from "@/lib/access";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await isAdminUser();

    const problems = await db.problem.findMany({
      where: admin ? undefined : { isVisible: true },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        difficulty: true,
        problemType: true,
        tags: true,
        isVisible: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ problems, isAdmin: admin }, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch problems" },
      { status: 500 },
    );
  }
}
