import { db } from "@/lib/db";
import { isAdminUser } from "@/lib/access";
import { invalidateProblemExecutionCache } from "@/lib/problem-cache";
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

    const problem = await db.problem.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        difficulty: true,
        problemType: true,
        tags: true,
        examples: true,
        constraints: true,
        hints: true,
        starterCode: true,
        publicTestCases: true,
        timeLimit: true,
        memoryLimit: true,
        supportedLanguages: true,
        isVisible: true,
        createdAt: true,
      },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    if (!admin && !problem.isVisible) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json({ problem });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch problem" },
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

    const problem = await db.problem.update({
      where: { id },
      data: { isVisible },
      select: { id: true, title: true, isVisible: true },
    });
    await invalidateProblemExecutionCache(id);

    return NextResponse.json({ problem });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to update problem visibility" },
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

    await db.problem.delete({
      where: { id },
    });
    await invalidateProblemExecutionCache(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to delete problem" },
      { status: 500 },
    );
  }
}
