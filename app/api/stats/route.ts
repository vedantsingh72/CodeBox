import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [visibleProblems, totalUsers, totalSubmissions, acceptedSubmissions, languages] =
      await Promise.all([
        db.problem.count({ where: { isVisible: true } }),
        db.user.count(),
        db.submission.count(),
        db.submission.count({ where: { verdict: "ACCEPTED" } }),
        db.submission.findMany({
          select: { language: true },
          distinct: ["language"],
        }),
      ]);

    const hasData =
      visibleProblems > 0 || totalUsers > 0 || totalSubmissions > 0;

    return NextResponse.json({
      hasData,
      totalProblems: visibleProblems,
      totalUsers,
      totalSubmissions,
      acceptedSubmissions,
      languageCount: languages.length,
      successRate:
        totalSubmissions > 0
          ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
          : 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ hasData: false }, { status: 500 });
  }
}
