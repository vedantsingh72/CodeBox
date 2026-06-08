import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { canAttemptContest, getContestTiming } from '@/lib/contest';
import { isAdminUser } from '@/lib/access';
import { SolveProblem } from '@/modules/problems/components/solve-problem';
import { getCurrentUserData } from '@/modules/auth/actions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ProblemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contestId?: string }>;
}) {
  const { id } = await params;
  const { contestId } = await searchParams;
  const admin = await isAdminUser();
  const user = await getCurrentUserData();

  const isContestProblem = Boolean(contestId);
  let canAttempt = true;
  let contestProblem:
    | {
        basePoints: number;
        acceptedCount: number;
      }
    | null = null;
  let contestEndTime: string | undefined;
  let alreadySolved = false;

  if (contestId) {
    const contest = await db.contest.findUnique({
      where: { id: contestId },
      include: { problems: { where: { problemId: id } } },
    });

    if (!contest || contest.problems.length === 0) notFound();
    if (!admin && !contest.isVisible) notFound();
    contestProblem = contest.problems[0];
    contestEndTime = contest.contestEndTime.toISOString();
    const timing = getContestTiming(contest.contestStartTime, contest.contestEndTime);

    if (!admin && timing === "UPCOMING") {
      notFound();
    }

    if (!admin && timing === "ACTIVE" && user && 'id' in user) {
      const registration = await db.contestRegistration.findUnique({
        where: {
          userId_contestId: {
            userId: user.id,
            contestId,
          },
        },
      });
      if (!registration) notFound();
    } else if (!admin && timing === "ACTIVE" && !user) {
      notFound();
    }

    if (user && 'id' in user) {
      const attempt = await db.contestAttempt.findUnique({
        where: {
          userId_contestId_problemId: {
            userId: user.id,
            contestId,
            problemId: id,
          },
        },
        select: { solvedAt: true },
      });
      alreadySolved = Boolean(attempt?.solvedAt);
    }

    canAttempt = canAttemptContest(contest.contestStartTime, contest.contestEndTime);
  }

  const problem = await db.problem.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      examples: true,
      publicTestCases: true,
      constraints: true,
      hints: true,
      starterCode: true,
      isVisible: true,
    },
  });

  if (!problem) notFound();
  if (!admin && !isContestProblem && !problem.isVisible) notFound();
  const publicTestCases = problem.publicTestCases as Array<{ input: string; output: string }>;

  return (
    <section className='flex flex-col mx-4 my-4 max-w-[1600px] w-full mx-auto'>
      <div className='flex flex-row justify-between items-center mb-4'>
        <Link href={contestId ? `/contests/${contestId}` : '/problems'}>
          <Button variant='outline' size='icon'>
            <ArrowLeft className='size-4' />
          </Button>
        </Link>
        <h1 className='text-lg font-bold text-primary'>GFGCodeBox</h1>
        <ModeToggle />
      </div>

      <SolveProblem
        problem={{
          ...problem,
          examples: problem.examples as Array<{ input: string; output: string }>,
          publicTestCases: publicTestCases.slice(0, 1),
          starterCode: problem.starterCode as Record<string, string>,
        }}
        contestId={contestId}
        canAttempt={canAttempt}
        alreadySolved={alreadySolved}
        contestEndTime={contestEndTime}
        contestProblem={contestProblem}
      />
    </section>
  );
}
