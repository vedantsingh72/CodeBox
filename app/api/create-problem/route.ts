import { db } from "@/lib/db";
import {
  buildStarterCode,
  createSlug,
} from "@/lib/starter-code-manager";
import { SUPPORTED_LANGUAGES, type TestCase } from "@/lib/platform-types";
import { currentUserRole, getCurrentUserData } from "@/modules/auth/actions";
import { Difficulty, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const userRole = await currentUserRole();
    const user = await getCurrentUserData();

    if (!user || !("id" in user) || userRole !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const slug = String(body.slug || createSlug(title)).trim();
    const description = String(body.description ?? "").trim();
    const constraints = String(body.constraints ?? "").trim();
    const publicTestCases = normalizeTestCases(body.publicTestCases ?? []);
    const hiddenTestCases = normalizeTestCases(body.hiddenTestCases ?? []);
    const starterCode = buildStarterCode(body.starterCode ?? {});
    const referenceSolution = body.referenceSolution ?? {};
    const supportedLanguages = Array.isArray(body.supportedLanguages)
      ? body.supportedLanguages
      : [...SUPPORTED_LANGUAGES];

    if (!title || !slug || !description || !body.difficulty) {
      return NextResponse.json(
        { error: "title, slug, description, and difficulty are required" },
        { status: 400 },
      );
    }

    if (publicTestCases.length === 0 && hiddenTestCases.length === 0) {
      return NextResponse.json(
        { error: "At least one public or hidden test case is required" },
        { status: 400 },
      );
    }

    const problem = await db.problem.create({
      data: {
        title,
        slug,
        description,
        difficulty: String(body.difficulty).toUpperCase() as Difficulty,
        tags: Array.isArray(body.tags) ? body.tags : [],
        problemType: "STDIN",
        isVisible: Boolean(body.isVisible),
        examples: body.examples ?? publicTestCases.slice(0, 2),
        constraints,
        publicTestCases,
        hiddenTestCases,
        starterCode,
        referenceSolution,
        timeLimit: Number(body.timeLimit ?? 2),
        memoryLimit: Number(body.memoryLimit ?? 128000),
        supportedLanguages,
        userId: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Problem created successfully",
        data: problem,
      },
      { status: 201 },
    );
  } 
  catch (error: any) {
  console.error("Problem create error:");
  console.error(error);

  return NextResponse.json(
    {
      error: error?.message || "Unknown error",
      code: error?.code,
    },
    { status: 500 }
  );
}
}

function normalizeTestCases(value: unknown): TestCase[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((testCase) => {
      if (!testCase || typeof testCase !== "object") return null;
      const raw = testCase as Record<string, unknown>;
      const input = String(raw.input ?? "");
      const output = String(raw.output ?? raw.expectedOutput ?? "");
      if (!input.trim() && !output.trim()) return null;
      return { input, output };
    })
    .filter((testCase): testCase is TestCase => Boolean(testCase));
}
